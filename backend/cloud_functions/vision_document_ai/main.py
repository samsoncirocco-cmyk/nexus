import base64
import hashlib
import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, Iterable, List, Optional, Tuple

from google.auth import default
from google.cloud import bigquery, pubsub_v1, vision
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)


PROJECT_ID = os.environ.get("PROJECT_ID") or os.environ.get("GOOGLE_PROJECT_ID")
PUBSUB_TOPIC = os.environ.get("PUBSUB_TOPIC") or (
    f"projects/{PROJECT_ID}/topics/openclaw-events" if PROJECT_ID else None
)

BQ_VISION_TABLE = os.environ.get("BQ_VISION_TABLE") or (
    f"{PROJECT_ID}.openclaw.vision_enrichment" if PROJECT_ID else None
)

# Optional: if set, used to stage larger binaries (e.g., PDFs) for async OCR later.
GCS_STAGING_BUCKET = os.environ.get("GCS_STAGING_BUCKET")


# MIME types to treat as images for synchronous Vision annotate_image.
IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/bmp",
    "image/webp",
    "image/tiff",
}

DOC_MIME_TYPES = {
    "application/pdf",
}


def vision_document_ai(event, context):
    """
    Pub/Sub Cloud Function: Deep Vision for photos/documents + OCR publishing.

    Input: OpenClaw events published to `openclaw-events`.
    Output:
      - Inserts rows into BigQuery `openclaw.vision_enrichment` (best effort, non-blocking)
      - Publishes synthetic events containing extracted text (best effort, non-blocking)
    """
    if not PROJECT_ID:
        logger.error("PROJECT_ID/GOOGLE_PROJECT_ID not configured")
        return "Missing PROJECT_ID"
    if not PUBSUB_TOPIC:
        logger.error("PUBSUB_TOPIC not configured and PROJECT_ID missing")
        return "Missing PUBSUB_TOPIC"
    if not BQ_VISION_TABLE:
        logger.error("BQ_VISION_TABLE not configured and PROJECT_ID missing")
        return "Missing BQ_VISION_TABLE"

    try:
        data = json.loads(base64.b64decode(event["data"]).decode("utf-8"))
    except Exception as exc:
        logger.error(f"Failed to decode Pub/Sub payload: {exc}")
        return "Bad payload"

    event_id = data.get("event_id", "unknown")
    source = data.get("source")
    event_type = data.get("event_type")
    payload_obj = _parse_payload(data.get("payload"))

    logger.info(f"vision_document_ai received {event_id}: {source}/{event_type}")

    artifacts: List[Dict[str, Any]] = []

    if source == "drive":
        artifacts.extend(_extract_drive_artifacts(payload_obj))
    elif source == "gmail":
        artifacts.extend(_extract_gmail_attachments(payload_obj))
    else:
        # Future sources can be added here.
        return "OK"

    if not artifacts:
        logger.info(f"No vision artifacts for {event_id}, skipping")
        return "OK"

    bq = bigquery.Client()
    publisher = pubsub_v1.PublisherClient()
    vision_client = vision.ImageAnnotatorClient()

    # Credentials for Google APIs (Drive/Gmail) are pulled via ADC.
    # Keep scopes minimal but broad enough for Drive/Gmail read.
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
            _process_artifact(
                bq=bq,
                publisher=publisher,
                vision_client=vision_client,
                drive_service=drive_service,
                gmail_service=gmail_service,
                parent_event_id=event_id,
                parent_source=source,
                artifact=art,
            )
        except Exception as exc:
            logger.error(f"Artifact processing failed for {event_id}: {exc}")

    logger.info(f"vision_document_ai processed {processed} artifacts for {event_id}")
    return "OK"


def _extract_drive_artifacts(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    file_id = payload.get("file_id")
    mime_type = payload.get("mime_type") or payload.get("mimeType")
    if not file_id or not mime_type:
        return []

    if mime_type in IMAGE_MIME_TYPES:
        return [{"kind": "drive_file", "file_id": file_id, "mime_type": mime_type}]

    if mime_type in DOC_MIME_TYPES:
        return [{"kind": "drive_file", "file_id": file_id, "mime_type": mime_type}]

    return []


def _extract_gmail_attachments(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Gmail events currently include message_id but not attachment metadata.
    We fetch the message and scan for image/pdf attachments.
    """
    message_id = payload.get("message_id")
    if not message_id:
        return []

    return [{"kind": "gmail_message", "message_id": message_id}]


def _process_artifact(
    *,
    bq: bigquery.Client,
    publisher: pubsub_v1.PublisherClient,
    vision_client: vision.ImageAnnotatorClient,
    drive_service,
    gmail_service,
    parent_event_id: str,
    parent_source: str,
    artifact: Dict[str, Any],
) -> None:
    if artifact["kind"] == "drive_file":
        file_id = artifact["file_id"]
        mime_type = artifact.get("mime_type", "")
        content = _download_drive_file_bytes(drive_service, file_id)
        if content is None:
            return
        _run_vision_and_persist(
            bq=bq,
            publisher=publisher,
            vision_client=vision_client,
            parent_event_id=parent_event_id,
            parent_source=parent_source,
            artifact_id=file_id,
            artifact_mime=mime_type,
            image_bytes=content,
        )
        return

    if artifact["kind"] == "gmail_message":
        msg_id = artifact["message_id"]
        for attachment in _iter_gmail_attachments(gmail_service, msg_id):
            att_id = attachment.get("attachment_id")
            filename = attachment.get("filename", "")
            mime_type = attachment.get("mime_type", "")
            body_bytes = attachment.get("bytes")
            if not body_bytes:
                continue

            # Only process image/pdf attachments.
            if (mime_type not in IMAGE_MIME_TYPES) and (mime_type not in DOC_MIME_TYPES):
                continue

            artifact_id = att_id or filename or _short_hash(body_bytes)
            _run_vision_and_persist(
                bq=bq,
                publisher=publisher,
                vision_client=vision_client,
                parent_event_id=parent_event_id,
                parent_source=parent_source,
                artifact_id=artifact_id,
                artifact_mime=mime_type,
                image_bytes=body_bytes,
            )
        return


def _run_vision_and_persist(
    *,
    bq: bigquery.Client,
    publisher: pubsub_v1.PublisherClient,
    vision_client: vision.ImageAnnotatorClient,
    parent_event_id: str,
    parent_source: str,
    artifact_id: str,
    artifact_mime: str,
    image_bytes: bytes,
) -> None:
    # PDFs require async batch annotate in Vision; we do best-effort skip for now.
    if artifact_mime in DOC_MIME_TYPES:
        logger.info(
            "Skipping PDF vision OCR (requires async_batch_annotate_files + GCS staging). "
            f"parent_event={parent_event_id} artifact={artifact_id} bucket={GCS_STAGING_BUCKET or 'unset'}"
        )
        return

    image = vision.Image(content=image_bytes)

    response = vision_client.annotate_image(
        {
            "image": image,
            "features": [
                {"type_": vision.Feature.Type.LABEL_DETECTION, "max_results": 15},
                {"type_": vision.Feature.Type.OBJECT_LOCALIZATION, "max_results": 15},
                {"type_": vision.Feature.Type.IMAGE_PROPERTIES},
                {"type_": vision.Feature.Type.SAFE_SEARCH_DETECTION},
                # Text extraction:
                {"type_": vision.Feature.Type.TEXT_DETECTION},
                {"type_": vision.Feature.Type.DOCUMENT_TEXT_DETECTION},
            ],
        }
    )

    if response.error.message:
        logger.error(
            f"Vision API error parent_event={parent_event_id} artifact={artifact_id}: {response.error.message}"
        )
        return

    labels = [
        {"description": label.description, "score": label.score}
        for label in response.label_annotations
    ]
    objects = [
        {"name": obj.name, "score": obj.score}
        for obj in response.localized_object_annotations
    ]

    text_annotations = [
        {"description": ann.description, "locale": ann.locale}
        for ann in response.text_annotations[:10]
    ]

    dominant_colors: List[Dict[str, Any]] = []
    if response.image_properties_annotation:
        for color_info in (
            response.image_properties_annotation.dominant_colors.colors[:5]
        ):
            dominant_colors.append(
                {
                    "red": color_info.color.red,
                    "green": color_info.color.green,
                    "blue": color_info.color.blue,
                    "score": color_info.score,
                    "pixel_fraction": color_info.pixel_fraction,
                }
            )

    safe_search: Dict[str, Any] = {}
    if response.safe_search_annotation:
        ss = response.safe_search_annotation
        safe_search = {
            "adult": ss.adult.name,
            "violence": ss.violence.name,
            "racy": ss.racy.name,
            "medical": ss.medical.name,
            "spoof": ss.spoof.name,
        }

    now = datetime.utcnow().isoformat() + "Z"

    # Persist to vision_enrichment (file_id is overloaded as artifact_id for Gmail attachments)
    vision_row = {
        "file_id": str(artifact_id),
        "event_id": parent_event_id,
        "timestamp": now,
        "labels": labels,
        "objects": objects,
        "text_annotations": text_annotations,
        "dominant_colors": dominant_colors,
        "safe_search": safe_search,
    }

    errors = bq.insert_rows_json(BQ_VISION_TABLE, [vision_row])
    if errors:
        logger.error(f"BigQuery vision insert errors artifact={artifact_id}: {errors}")
    else:
        logger.info(f"Inserted vision enrichment artifact={artifact_id}")

    # Publish extracted text as a synthetic event for downstream NLP + embeddings.
    extracted_text = ""
    if response.text_annotations:
        # First annotation usually contains full text for OCR.
        extracted_text = response.text_annotations[0].description or ""

    extracted_text = extracted_text.strip()
    if not extracted_text:
        return

    synth_event_id = f"visiontext-{parent_event_id}-{_short_hash(extracted_text.encode('utf-8'))}"
    synth_event = {
        "event_id": synth_event_id,
        "timestamp": now,
        "agent_id": "vision_document_ai",
        "event_type": "vision_text_extracted",
        "source": "vision",
        "payload": json.dumps(
            {
                "parent_event_id": parent_event_id,
                "parent_source": parent_source,
                "artifact_id": str(artifact_id),
                "mime_type": artifact_mime,
                "text": extracted_text[:20000],
            }
        ),
        "processed": False,
    }

    try:
        future = publisher.publish(PUBSUB_TOPIC, json.dumps(synth_event).encode("utf-8"))
        future.result(timeout=5)
        logger.info(f"Published vision_text_extracted event {synth_event_id}")
    except Exception as exc:
        logger.error(f"Failed to publish vision_text_extracted event {synth_event_id}: {exc}")


def _download_drive_file_bytes(drive_service, file_id: str) -> Optional[bytes]:
    try:
        request = drive_service.files().get_media(fileId=file_id)
        content = request.execute()
        if isinstance(content, bytes):
            return content
        # googleapiclient may return str in some cases
        return bytes(content)
    except Exception as exc:
        logger.error(f"Drive download failed file_id={file_id}: {exc}")
        return None


def _iter_gmail_attachments(gmail_service, message_id: str) -> Iterable[Dict[str, Any]]:
    """
    Yields dicts: {attachment_id, filename, mime_type, bytes}
    """
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

    # Depth-first traversal over parts to find attachments.
    stack = list(parts)
    while stack:
        part = stack.pop()
        if not isinstance(part, dict):
            continue

        filename = part.get("filename") or ""
        mime_type = part.get("mimeType") or ""
        body = part.get("body") or {}
        attachment_id = body.get("attachmentId")

        # Recurse into multipart.
        for child in part.get("parts", []) or []:
            stack.append(child)

        if not attachment_id:
            continue

        # Fetch attachment bytes.
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

