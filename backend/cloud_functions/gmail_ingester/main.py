import base64
import json
import os
from datetime import datetime
import logging

from google.auth import default
from google.cloud import bigquery, pubsub_v1
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

# Get credentials from environment (Cloud Functions default auth)
credentials, _ = default(scopes=["https://www.googleapis.com/auth/gmail.readonly"])

publisher = pubsub_v1.PublisherClient()
bq = bigquery.Client()

PROJECT_ID = os.environ.get("PROJECT_ID") or os.environ.get("GOOGLE_PROJECT_ID")
TOPIC = os.environ.get("PUBSUB_TOPIC") or f"projects/{PROJECT_ID}/topics/openclaw-events"
TABLE_ID = os.environ.get("BQ_EVENTS_TABLE") or f"{PROJECT_ID}.openclaw.events"


def insert_events_idempotent(table_id, rows):
    """Insert rows using event_id as BigQuery insertId for dedupe on retries."""
    row_ids = [r.get("event_id") or None for r in rows]
    return bq.insert_rows_json(table_id, rows, row_ids=row_ids)


def extract_body_text(payload):
    """Recursively extract plain text body from Gmail message payload."""
    body_text = ""

    # Check if this part has a body with data
    body = payload.get("body", {})
    if body.get("data") and payload.get("mimeType") == "text/plain":
        body_text = base64.urlsafe_b64decode(body["data"]).decode("utf-8", errors="replace")

    # Recurse into multipart parts
    for part in payload.get("parts", []):
        part_text = extract_body_text(part)
        if part_text:
            body_text = part_text
            break  # Prefer the first text/plain part found

    return body_text


def normalize_gmail_event(msg_id, msg, headers, body_text=""):
    """Normalize a Gmail message into standard OpenClaw event format."""
    return {
        "event_id": f"gmail-{msg_id}",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "agent_id": None,
        "event_type": "webhook_received",
        "source": "gmail",
        "payload": json.dumps(
            {
                "message_id": msg_id,
                "from": headers.get("From", ""),
                "to": headers.get("To", ""),
                "subject": headers.get("Subject", ""),
                "date": headers.get("Date", ""),
                "labels": msg.get("labelIds", []),
                "snippet": msg.get("snippet", "")[:500],
                "thread_id": msg.get("threadId", ""),
                "body_text": body_text[:10000],
            }
        ),
        "processed": False,
    }


def gmail_webhook(request):
    """
    HTTP Cloud Function: Receives Gmail push notification, normalizes, publishes to Pub/Sub.

    Triggered by: Gmail API watch notifications via Pub/Sub
    Publishes to: openclaw-events Pub/Sub topic
    Writes to: openclaw.events BigQuery table
    """
    try:
        envelope = request.get_json()
        if not envelope:
            logger.warning("No JSON payload received")
            return "Bad Request", 400

        # Decode the Pub/Sub envelope
        message_data = base64.b64decode(envelope["message"]["data"]).decode()
        notification = json.loads(message_data)
        logger.info(f"Processing notification with historyId: {notification.get('historyId')}")

        # Fetch the actual messages via Gmail API
        service = build("gmail", "v1", credentials=credentials)
        history = (
            service.users()
            .history()
            .list(
                userId="me",
                startHistoryId=notification["historyId"],
                historyTypes=["messageAdded"],
            )
            .execute()
        )

        events = []
        for record in history.get("history", []):
            for msg_added in record.get("messagesAdded", []):
                msg_id = msg_added["message"]["id"]
                msg = (
                    service.users()
                    .messages()
                    .get(
                        userId="me",
                        id=msg_id,
                        format="full",
                    )
                    .execute()
                )

                headers = {
                    h["name"]: h["value"] for h in msg["payload"].get("headers", [])
                }

                # Extract full body text for downstream enrichment
                body_text = extract_body_text(msg.get("payload", {}))

                # Normalize to standard event format
                event = normalize_gmail_event(msg_id, msg, headers, body_text)
                events.append(event)

                # Publish to Pub/Sub (fire and forget, but log any errors)
                try:
                    future = publisher.publish(TOPIC, json.dumps(event).encode())
                    future.result(timeout=5)
                    logger.info(f"Published event {event['event_id']} to Pub/Sub")
                except Exception as pub_error:
                    logger.error(f"Failed to publish {event['event_id']} to Pub/Sub: {pub_error}")

                # Also write to BigQuery (idempotent insert)
                errors = insert_events_idempotent(TABLE_ID, [event])
                if errors:
                    logger.error(f"BigQuery insert errors for {event['event_id']}: {errors}")
                else:
                    logger.info(f"Inserted event {event['event_id']} to BigQuery")

        logger.info(f"Successfully processed {len(events)} new messages")
        return "OK", 200

    except Exception as exc:
        logger.exception(f"Unhandled error in gmail_webhook: {exc}")
        return f"Error: {str(exc)}", 500
