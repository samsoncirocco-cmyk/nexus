import base64
import hashlib
import json
import logging
import os
import uuid
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional

from google.auth import default
from google.cloud import bigquery, pubsub_v1
from google.cloud import speech_v1 as speech
from google.cloud import storage
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)


PROJECT_ID = os.environ.get("PROJECT_ID") or os.environ.get("GOOGLE_PROJECT_ID")
PUBSUB_TOPIC = os.environ.get("PUBSUB_TOPIC") or (
    f"projects/{PROJECT_ID}/topics/openclaw-events" if PROJECT_ID else None
)

BQ_SPEECH_TABLE = os.environ.get("BQ_SPEECH_TABLE") or (
    f"{PROJECT_ID}.openclaw.speech_enrichment" if PROJECT_ID else None
)

GCS_STAGING_BUCKET = os.environ.get("GCS_STAGING_BUCKET")


AUDIO_MIME_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/webm",
    "audio/mp4",
    "audio/aac",
    "audio/flac",
    "audio/x-flac",
    "video/mp4",  # some meeting recordings are stored as mp4
}


def speech_transcriber(event, context):
    """
    Pub/Sub Cloud Function: transcribe audio artifacts (Drive files or Gmail attachments).

    Writes to: openclaw.speech_enrichment
    Publishes: synthetic event_type 'speech_transcribed' for downstream NLP/embeddings
    """
    if not PROJECT_ID or not PUBSUB_TOPIC or not BQ_SPEECH_TABLE:
        logger.error("Missing required configuration (PROJECT_ID, PUBSUB_TOPIC, BQ_SPEECH_TABLE)")
        return "Missing config"

    if not GCS_STAGING_BUCKET:
        logger.warning("GCS_STAGING_BUCKET not set; skipping transcription (needs GCS URI for long-running)")
        return "OK"

    try:
        data = json.loads(base64.b64decode(event["data"]).decode("utf-8"))
    except Exception as exc:
        logger.error(f"Failed to decode Pub/Sub payload: {exc}")
        return "Bad payload"

    parent_event_id = data.get("event_id", "unknown")
    source = data.get("source")
    payload_obj = _parse_payload(data.get("payload"))

    artifacts: List[Dict[str, Any]] = []
    if source == "drive":
        artifacts.extend(_extract_drive_audio(payload_obj))
    elif source == "gmail":
        artifacts.extend(_extract_gmail_message(payload_obj))
    else:
        return "OK"

    if not artifacts:
        return "OK"

    bq = bigquery.Client()
    publisher = pubsub_v1.PublisherClient()
    storage_client = storage.Client()
    speech_client = speech.SpeechClient()

    credentials, _ = default(
        scopes=[
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/gmail.readonly",
        ]
    )
    drive_service = build("drive", "v3", credentials=credentials, cache_discovery=False)
    gmail_service = build("gmail", "v1", credentials=credentials, cache_discovery=False)

    processed = 0
    for art in artifacts:
        try:
            processed += 1
            _process_audio_artifact(
                bq=bq,
                publisher=publisher,
                storage_client=storage_client,
                speech_client=speech_client,
                drive_service=drive_service,
                gmail_service=gmail_service,
                parent_event_id=parent_event_id,
                parent_source=source,
                artifact=art,
            )
        except Exception as exc:
            logger.error(f"Audio processing failed parent_event={parent_event_id}: {exc}")

    logger.info(f"speech_transcriber processed {processed} artifacts for {parent_event_id}")
    return "OK"


def _extract_drive_audio(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    file_id = payload.get("file_id")
    mime_type = payload.get("mime_type") or payload.get("mimeType")
    if not file_id or not mime_type:
        return []
    if mime_type not in AUDIO_MIME_TYPES:
        return []
    return [{"kind": "drive_file", "file_id": file_id, "mime_type": mime_type}]


def _extract_gmail_message(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    message_id = payload.get("message_id")
    if not message_id:
        return []
    return [{"kind": "gmail_message", "message_id": message_id}]


def _process_audio_artifact(
    *,
    bq: bigquery.Client,
    publisher: pubsub_v1.PublisherClient,
    storage_client: storage.Client,
    speech_client: speech.SpeechClient,
    drive_service,
    gmail_service,
    parent_event_id: str,
    parent_source: str,
    artifact: Dict[str, Any],
) -> None:
    if artifact["kind"] == "drive_file":
        file_id = artifact["file_id"]
        mime_type = artifact.get("mime_type", "")
        audio_bytes = _download_drive_bytes(drive_service, file_id)
        if not audio_bytes:
            return
        artifact_id = file_id
        _transcribe_and_persist(
            bq=bq,
            publisher=publisher,
            storage_client=storage_client,
            speech_client=speech_client,
            parent_event_id=parent_event_id,
            parent_source=parent_source,
            artifact_id=artifact_id,
            mime_type=mime_type,
            audio_bytes=audio_bytes,
            source_label="drive",
        )
        return

    if artifact["kind"] == "gmail_message":
        msg_id = artifact["message_id"]
        for att in _iter_gmail_attachments(gmail_service, msg_id):
            mime_type = att.get("mime_type", "")
            if mime_type not in AUDIO_MIME_TYPES:
                continue
            audio_bytes = att.get("bytes")
            if not audio_bytes:
                continue
            artifact_id = att.get("attachment_id") or att.get("filename") or _short_hash(audio_bytes)
            _transcribe_and_persist(
                bq=bq,
                publisher=publisher,
                storage_client=storage_client,
                speech_client=speech_client,
                parent_event_id=parent_event_id,
                parent_source=parent_source,
                artifact_id=str(artifact_id),
                mime_type=mime_type,
                audio_bytes=audio_bytes,
                source_label="gmail_attachment",
            )
        return


def _transcribe_and_persist(
    *,
    bq: bigquery.Client,
    publisher: pubsub_v1.PublisherClient,
    storage_client: storage.Client,
    speech_client: speech.SpeechClient,
    parent_event_id: str,
    parent_source: str,
    artifact_id: str,
    mime_type: str,
    audio_bytes: bytes,
    source_label: str,
) -> None:
    now = datetime.utcnow().isoformat() + "Z"

    gcs_uri = _upload_to_gcs(
        storage_client=storage_client,
        bucket_name=GCS_STAGING_BUCKET,
        object_name=f"openclaw/speech/{parent_event_id}/{artifact_id}-{_short_hash(audio_bytes)}",
        content=audio_bytes,
        content_type=mime_type or "application/octet-stream",
    )
    if not gcs_uri:
        return

    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED,
        enable_automatic_punctuation=True,
        enable_word_time_offsets=True,
        enable_word_confidence=True,
        language_code="en-US",
    )
    audio = speech.RecognitionAudio(uri=gcs_uri)

    try:
        operation = speech_client.long_running_recognize(config=config, audio=audio)
        response = operation.result(timeout=600)
    except Exception as exc:
        logger.error(f"Speech-to-Text failed parent_event={parent_event_id} artifact={artifact_id}: {exc}")
        return

    transcript, confidence, word_rows, duration_seconds = _extract_transcript(response)
    if not transcript:
        logger.info(f"No transcript returned parent_event={parent_event_id} artifact={artifact_id}")
        return

    transcription_id = f"spch-{uuid.uuid4().hex[:12]}"
    row = {
        "transcription_id": transcription_id,
        "file_id": artifact_id,
        "event_id": parent_event_id,
        "timestamp": now,
        "transcript": transcript,
        "confidence": confidence,
        "language_code": "en-US",
        "word_timestamps": word_rows,
        "duration_seconds": duration_seconds,
        "source": source_label,
    }

    errors = bq.insert_rows_json(BQ_SPEECH_TABLE, [row])
    if errors:
        logger.error(f"BigQuery speech insert errors artifact={artifact_id}: {errors}")
    else:
        logger.info(f"Inserted speech enrichment transcription_id={transcription_id}")

    synth_event_id = f"speech-{parent_event_id}-{_short_hash(transcript.encode('utf-8'))}"
    synth_event = {
        "event_id": synth_event_id,
        "timestamp": now,
        "agent_id": "speech_transcriber",
        "event_type": "speech_transcribed",
        "source": "speech",
        "payload": json.dumps(
            {
                "parent_event_id": parent_event_id,
                "parent_source": parent_source,
                "artifact_id": str(artifact_id),
                "mime_type": mime_type,
                "transcription_id": transcription_id,
                "confidence": confidence,
                "text": transcript[:20000],
            }
        ),
        "processed": False,
    }

    try:
        future = publisher.publish(PUBSUB_TOPIC, json.dumps(synth_event).encode("utf-8"))
        future.result(timeout=5)
        logger.info(f"Published speech_transcribed event {synth_event_id}")
    except Exception as exc:
        logger.error(f"Failed to publish speech_transcribed event {synth_event_id}: {exc}")


def _upload_to_gcs(
    *,
    storage_client: storage.Client,
    bucket_name: str,
    object_name: str,
    content: bytes,
    content_type: str,
) -> Optional[str]:
    try:
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(object_name)
        blob.upload_from_string(content, content_type=content_type)
        return f"gs://{bucket_name}/{object_name}"
    except Exception as exc:
        logger.error(f"GCS upload failed bucket={bucket_name} object={object_name}: {exc}")
        return None


def _extract_transcript(response) -> (str, Optional[float], List[Dict[str, Any]], Optional[float]):
    text_parts: List[str] = []
    confs: List[float] = []
    words: List[Dict[str, Any]] = []
    last_end: Optional[float] = None

    for result in getattr(response, "results", []) or []:
        if not result.alternatives:
            continue
        alt = result.alternatives[0]
        if alt.transcript:
            text_parts.append(alt.transcript.strip())
        if alt.confidence:
            confs.append(float(alt.confidence))
        for w in getattr(alt, "words", []) or []:
            start = _duration_to_seconds(w.start_time)
            end = _duration_to_seconds(w.end_time)
            if end is not None:
                last_end = end
            words.append(
                {
                    "word": w.word,
                    "start_time_s": start,
                    "end_time_s": end,
                    "confidence": float(w.confidence) if w.confidence else None,
                }
            )

    transcript = " ".join([t for t in text_parts if t]).strip()
    avg_conf = (sum(confs) / len(confs)) if confs else None
    return transcript, avg_conf, words, last_end


def _duration_to_seconds(duration) -> Optional[float]:
    if duration is None:
        return None
    # duration is protobuf Duration (seconds, nanos)
    try:
        return float(duration.seconds) + float(duration.nanos) / 1e9
    except Exception:
        return None


def _download_drive_bytes(drive_service, file_id: str) -> Optional[bytes]:
    try:
        req = drive_service.files().get_media(fileId=file_id)
        content = req.execute()
        if isinstance(content, bytes):
            return content
        return bytes(content)
    except Exception as exc:
        logger.error(f"Drive download failed file_id={file_id}: {exc}")
        return None


def _iter_gmail_attachments(gmail_service, message_id: str) -> Iterable[Dict[str, Any]]:
    try:
        msg = (
            gmail_service.users()
            .messages()
            .get(userId="me", id=message_id, format="full")
            .execute()
        )
    except Exception as exc:
        logger.error(f"Failed to fetch Gmail message {message_id}: {exc}")
        return []

    payload = msg.get("payload", {}) or {}
    parts = payload.get("parts", []) or []
    stack = list(parts)

    while stack:
        part = stack.pop()
        if not isinstance(part, dict):
            continue
        for child in part.get("parts", []) or []:
            stack.append(child)

        body = part.get("body") or {}
        attachment_id = body.get("attachmentId")
        if not attachment_id:
            continue

        filename = part.get("filename") or ""
        mime_type = part.get("mimeType") or ""

        try:
            att = (
                gmail_service.users()
                .messages()
                .attachments()
                .get(userId="me", messageId=message_id, id=attachment_id)
                .execute()
            )
            data_b64 = att.get("data")
            if not data_b64:
                continue
            content = base64.urlsafe_b64decode(data_b64.encode("utf-8"))
        except Exception as exc:
            logger.error(f"Failed to fetch attachment {attachment_id} for {message_id}: {exc}")
            continue

        yield {
            "attachment_id": attachment_id,
            "filename": filename,
            "mime_type": mime_type,
            "bytes": content,
        }


def _parse_payload(payload: Any) -> Dict[str, Any]:
    if payload is None:
        return {}
    if isinstance(payload, dict):
        return payload
    if isinstance(payload, str):
        try:
            parsed = json.loads(payload)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {"text": payload}
    return {}


def _short_hash(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()[:12]

