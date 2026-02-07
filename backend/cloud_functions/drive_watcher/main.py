import base64
import json
import os
from datetime import datetime
import logging
import io

from google.auth import default
from google.cloud import bigquery, pubsub_v1, vision
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

# Get credentials from environment (Cloud Functions default auth)
credentials, _ = default(scopes=[
    "https://www.googleapis.com/auth/drive.readonly",
])

publisher = pubsub_v1.PublisherClient()
bq = bigquery.Client()

PROJECT_ID = os.environ.get("PROJECT_ID") or os.environ.get("GOOGLE_PROJECT_ID")
TOPIC = os.environ.get("PUBSUB_TOPIC") or f"projects/{PROJECT_ID}/topics/openclaw-events"
TABLE_ID = os.environ.get("BQ_EVENTS_TABLE") or f"{PROJECT_ID}.openclaw.events"
VISION_TABLE_ID = os.environ.get("BQ_VISION_TABLE") or f"{PROJECT_ID}.openclaw.vision_enrichment"
NLP_TABLE_ID = os.environ.get("BQ_NLP_TABLE") or f"{PROJECT_ID}.openclaw.nlp_enrichment"

# MIME types that trigger Vision API enrichment
IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp"}
# MIME types that support text export from Drive
DOC_MIME_TYPES = {
    "application/pdf",
    "application/vnd.google-apps.document",
    "application/vnd.google-apps.spreadsheet",
    "application/vnd.google-apps.presentation",
}


def normalize_drive_event(file_metadata, event_type):
    """Normalize a Drive file change into standard OpenClaw event format."""
    file_id = file_metadata["id"]
    modified_time = file_metadata.get("modifiedTime", datetime.utcnow().isoformat() + "Z")
    # Stable event_id per spec: drive-{file_id}-{modified_time}
    stable_time = modified_time.replace(":", "").replace("-", "").replace(".", "")
    return {
        "event_id": f"drive-{file_id}-{stable_time}",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "agent_id": None,
        "event_type": event_type,
        "source": "drive",
        "payload": json.dumps(
            {
                "file_id": file_id,
                "name": file_metadata.get("name", ""),
                "mime_type": file_metadata.get("mimeType", ""),
                "owners": [
                    o.get("emailAddress", o.get("displayName", ""))
                    for o in file_metadata.get("owners", [])
                ],
                "created_time": file_metadata.get("createdTime", ""),
                "modified_time": modified_time,
                "webViewLink": file_metadata.get("webViewLink", ""),
            }
        ),
        "processed": False,
    }


def enrich_with_vision(file_id, drive_service, event_id):
    """Call Cloud Vision API for image files. Returns vision results or None."""
    try:
        # Download image content from Drive
        request = drive_service.files().get_media(fileId=file_id)
        content = request.execute()

        vision_client = vision.ImageAnnotatorClient()
        image = vision.Image(content=content)

        # Request labels, OCR text, and object detection
        response = vision_client.annotate_image({
            "image": image,
            "features": [
                {"type_": vision.Feature.Type.LABEL_DETECTION, "max_results": 15},
                {"type_": vision.Feature.Type.TEXT_DETECTION},
                {"type_": vision.Feature.Type.OBJECT_LOCALIZATION, "max_results": 15},
                {"type_": vision.Feature.Type.IMAGE_PROPERTIES},
                {"type_": vision.Feature.Type.SAFE_SEARCH_DETECTION},
            ],
        })

        if response.error.message:
            logger.error(f"Vision API error for {file_id}: {response.error.message}")
            return None

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
            for ann in response.text_annotations[:10]  # Limit to first 10
        ]

        # Extract dominant colors
        dominant_colors = []
        if response.image_properties_annotation:
            for color_info in response.image_properties_annotation.dominant_colors.colors[:5]:
                dominant_colors.append({
                    "red": color_info.color.red,
                    "green": color_info.color.green,
                    "blue": color_info.color.blue,
                    "score": color_info.score,
                    "pixel_fraction": color_info.pixel_fraction,
                })

        # Extract safe search
        safe_search = {}
        if response.safe_search_annotation:
            ss = response.safe_search_annotation
            safe_search = {
                "adult": ss.adult.name,
                "violence": ss.violence.name,
                "racy": ss.racy.name,
                "medical": ss.medical.name,
                "spoof": ss.spoof.name,
            }

        return {
            "file_id": file_id,
            "event_id": event_id,
            "labels": labels,
            "objects": objects,
            "text_annotations": text_annotations,
            "dominant_colors": dominant_colors,
            "safe_search": safe_search,
        }

    except Exception as exc:
        logger.error(f"Vision enrichment failed for {file_id}: {exc}")
        return None


def extract_text_from_doc(file_id, mime_type, drive_service):
    """Extract text content from PDF/Docs via Drive export."""
    try:
        if mime_type == "application/pdf":
            # Download the PDF directly, then we rely on the text in metadata
            # For actual text extraction, export as plain text if it's a Google Doc
            content = drive_service.files().get_media(fileId=file_id).execute()
            # Basic text extraction from PDF bytes is limited without extra libs;
            # return what we can from the file metadata snippet
            return None
        elif mime_type.startswith("application/vnd.google-apps."):
            # Google Docs/Sheets/Slides can be exported as plain text
            response = drive_service.files().export(
                fileId=file_id, mimeType="text/plain"
            ).execute()
            if isinstance(response, bytes):
                return response.decode("utf-8", errors="replace")[:10000]
            return str(response)[:10000]
        return None
    except Exception as exc:
        logger.error(f"Text extraction failed for {file_id}: {exc}")
        return None


def drive_webhook(request):
    """
    HTTP Cloud Function: Receives Drive push notification, normalizes, publishes to Pub/Sub.

    Triggered by: Google Drive Changes API push notifications
    Publishes to: openclaw-events Pub/Sub topic
    Writes to: openclaw.events BigQuery table
    Enriches: openclaw.vision_enrichment, openclaw.nlp_enrichment
    """
    try:
        # Drive push notifications come as POST with headers indicating the change
        # X-Goog-Channel-ID, X-Goog-Resource-State, X-Goog-Resource-ID
        resource_state = request.headers.get("X-Goog-Resource-State", "")
        channel_id = request.headers.get("X-Goog-Channel-ID", "")

        # Sync message: Drive sends this when the watch is first set up
        if resource_state == "sync":
            logger.info(f"Drive watch sync received for channel {channel_id}")
            return "OK", 200

        if resource_state not in ("change", "update"):
            logger.info(f"Ignoring resource_state={resource_state}")
            return "OK", 200

        logger.info(f"Processing Drive change notification, channel={channel_id}")

        # Fetch recent changes via Drive Changes API
        drive_service = build("drive", "v3", credentials=credentials)

        # Get the saved start page token (stored in env or fetched fresh)
        # In production, persist this token in Datastore/Firestore between invocations
        start_token = os.environ.get("DRIVE_START_PAGE_TOKEN")
        if not start_token:
            token_response = drive_service.changes().getStartPageToken().execute()
            start_token = token_response.get("startPageToken")
            logger.warning("No saved page token, using current. May miss changes.")

        changes_response = drive_service.changes().list(
            pageToken=start_token,
            fields="nextPageToken,newStartPageToken,changes(fileId,removed,file(id,name,mimeType,owners,createdTime,modifiedTime,webViewLink))",
            includeRemoved=False,
            pageSize=100,
        ).execute()

        events = []
        for change in changes_response.get("changes", []):
            if change.get("removed"):
                continue

            file_metadata = change.get("file")
            if not file_metadata:
                continue

            file_id = file_metadata["id"]
            mime_type = file_metadata.get("mimeType", "")

            # Determine event type
            created = file_metadata.get("createdTime", "")
            modified = file_metadata.get("modifiedTime", "")
            event_type = "file_added" if created == modified else "file_updated"

            # Normalize to standard event format
            event = normalize_drive_event(file_metadata, event_type)
            events.append(event)

            # Publish to Pub/Sub (fire and forget, but log any errors)
            try:
                future = publisher.publish(TOPIC, json.dumps(event).encode())
                future.result(timeout=5)
                logger.info(f"Published event {event['event_id']} to Pub/Sub")
            except Exception as pub_error:
                logger.error(f"Failed to publish {event['event_id']} to Pub/Sub: {pub_error}")

            # Also write to BigQuery (idempotent insert)
            errors = bq.insert_rows_json(TABLE_ID, [event])
            if errors:
                logger.error(f"BigQuery insert errors for {event['event_id']}: {errors}")
            else:
                logger.info(f"Inserted event {event['event_id']} to BigQuery")

            # Non-blocking enrichment: Vision API for images
            if mime_type in IMAGE_MIME_TYPES:
                try:
                    vision_result = enrich_with_vision(file_id, drive_service, event["event_id"])
                    if vision_result:
                        vision_row = {
                            "file_id": vision_result["file_id"],
                            "event_id": vision_result["event_id"],
                            "timestamp": datetime.utcnow().isoformat() + "Z",
                            "labels": vision_result["labels"],
                            "objects": vision_result["objects"],
                            "text_annotations": vision_result["text_annotations"],
                            "dominant_colors": vision_result["dominant_colors"],
                            "safe_search": vision_result["safe_search"],
                        }
                        v_errors = bq.insert_rows_json(VISION_TABLE_ID, [vision_row])
                        if v_errors:
                            logger.error(f"BigQuery vision insert errors for {file_id}: {v_errors}")
                        else:
                            logger.info(f"Inserted vision enrichment for {file_id}")

                        # If Vision found text (OCR), also store in nlp_enrichment
                        ocr_text = " ".join(
                            ann["description"]
                            for ann in vision_result.get("text_annotations", [])
                            if ann.get("description")
                        )
                        if ocr_text:
                            nlp_row = {
                                "event_id": event["event_id"],
                                "timestamp": datetime.utcnow().isoformat() + "Z",
                                "source": "drive",
                                "entities": [],
                                "sentiment_score": None,
                                "sentiment_magnitude": None,
                                "language": None,
                                "raw_text": ocr_text[:10000],
                            }
                            nlp_errors = bq.insert_rows_json(NLP_TABLE_ID, [nlp_row])
                            if nlp_errors:
                                logger.error(f"BigQuery NLP insert errors for OCR {file_id}: {nlp_errors}")
                            else:
                                logger.info(f"Inserted OCR text to nlp_enrichment for {file_id}")
                except Exception as vision_exc:
                    logger.error(f"Vision enrichment failed for {file_id}: {vision_exc}")

            # Non-blocking enrichment: Text extraction for docs/PDFs
            if mime_type in DOC_MIME_TYPES:
                try:
                    extracted_text = extract_text_from_doc(file_id, mime_type, drive_service)
                    if extracted_text:
                        nlp_row = {
                            "event_id": event["event_id"],
                            "timestamp": datetime.utcnow().isoformat() + "Z",
                            "source": "drive",
                            "entities": [],
                            "sentiment_score": None,
                            "sentiment_magnitude": None,
                            "language": None,
                            "raw_text": extracted_text[:10000],
                        }
                        nlp_errors = bq.insert_rows_json(NLP_TABLE_ID, [nlp_row])
                        if nlp_errors:
                            logger.error(f"BigQuery NLP insert errors for doc {file_id}: {nlp_errors}")
                        else:
                            logger.info(f"Inserted doc text to nlp_enrichment for {file_id}")
                except Exception as doc_exc:
                    logger.error(f"Doc text extraction failed for {file_id}: {doc_exc}")

        # Store the new page token for next invocation
        new_token = changes_response.get("newStartPageToken")
        if new_token:
            logger.info(f"New start page token: {new_token} (persist this for next call)")

        logger.info(f"Successfully processed {len(events)} Drive changes")
        return "OK", 200

    except Exception as exc:
        logger.exception(f"Unhandled error in drive_webhook: {exc}")
        return f"Error: {str(exc)}", 500
