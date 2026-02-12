import base64
import json
import os
from datetime import datetime
import logging

from google.auth import default
from google.cloud import bigquery, tasks_v2, language_v1
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

bq = bigquery.Client()
PROJECT_ID = os.environ.get("PROJECT_ID") or os.environ.get("GOOGLE_PROJECT_ID")
SHEET_ID = os.environ.get("SHEET_ID") or os.environ.get("GOOGLE_SHEET_ID")
NLP_TABLE_ID = (
    os.environ.get("BQ_NLP_TABLE") or f"{PROJECT_ID}.openclaw.nlp_enrichment"
)


def insert_events_idempotent(table_id, rows):
    """Insert rows using event_id as BigQuery insertId for dedupe on retries."""
    row_ids = [r.get("event_id") or None for r in rows]
    return bq.insert_rows_json(table_id, rows, row_ids=row_ids)


def route_event(event, context):
    """
    Pub/Sub Cloud Function: Consumes events and routes to appropriate destinations.

    Triggered by: openclaw-events Pub/Sub topic
    Writes to: openclaw.events BigQuery table
    Routes to: Agent Cloud Functions via Cloud Tasks
    Writes to: agent_log sheet
    """
    try:
        data = json.loads(base64.b64decode(event["data"]).decode())

        event_id = data.get("event_id", "unknown")
        source = data.get("source")
        event_type = data.get("event_type")

        logger.info(f"Routing event {event_id}: {source}/{event_type}")

        # Ensure event is in BigQuery (idempotent - deduplication by event_id)
        errors = insert_events_idempotent(f"{PROJECT_ID}.openclaw.events", [data])
        if errors:
            logger.error(f"BigQuery insert errors for {event_id}: {errors}")
        else:
            logger.info(f"Inserted event {event_id} into BigQuery")

        # Best-effort NLP enrichment (non-blocking for routing)
        try:
            raw_text = extract_event_text(data)
            if raw_text:
                enrichment = analyze_text_with_nlp(raw_text)
                if enrichment:
                    nlp_row = {
                        "event_id": event_id,
                        "timestamp": data.get("timestamp")
                        or datetime.utcnow().isoformat() + "Z",
                        "source": source,
                        "entities": enrichment.get("entities", []),
                        "sentiment_score": enrichment.get("sentiment_score"),
                        "sentiment_magnitude": enrichment.get("sentiment_magnitude"),
                        "language": enrichment.get("language"),
                        "raw_text": raw_text,
                    }
                    nlp_errors = bq.insert_rows_json(
                        NLP_TABLE_ID, [nlp_row], row_ids=[f"{event_id}-nlp"]
                    )
                    if nlp_errors:
                        logger.error(
                            f"BigQuery NLP insert errors for {event_id}: {nlp_errors}"
                        )
                    else:
                        logger.info(f"Inserted NLP enrichment for {event_id}")
            else:
                logger.info(f"No text payload for NLP on {event_id}, skipping")
        except Exception as nlp_exc:
            logger.error(f"NLP enrichment failed for {event_id}: {nlp_exc}")

        # Route to agent triggers based on event type
        if source == "gmail" and event_type == "webhook_received":
            logger.info(f"Triggering triage agent for {event_id}")
            trigger_agent("triage", data)

        # Log routing decision to Sheets
        if SHEET_ID:
            try:
                append_to_sheet(
                    SHEET_ID,
                    "agent_log",
                    [
                        datetime.utcnow().isoformat() + "Z",
                        "router",
                        "ROUTE",
                        source,
                        event_id,
                        f"Routed {source}/{event_type}",
                        "",
                        f"Routed to downstream handlers",
                        "1.0",
                        "",
                    ],
                )
                logger.info(f"Logged routing decision for {event_id} to Sheets")
            except Exception as sheet_error:
                logger.error(f"Failed to log to Sheets: {sheet_error}")
        else:
            logger.warning("SHEET_ID not configured, skipping Sheets logging")

        return "OK"
    except Exception as exc:
        logger.exception(f"Unhandled error in route_event: {exc}")
        raise


def trigger_agent(agent_id, event_data):
    """
    Create a Cloud Task to invoke an agent Cloud Function.

    This is async and non-blocking. Cloud Tasks handles retry/backoff.
    """
    try:
        client = tasks_v2.CloudTasksClient()
        project = PROJECT_ID
        region = os.environ.get("TASKS_REGION", "us-central1")
        queue = os.environ.get("TASKS_QUEUE", "openclaw-agents")

        parent = client.queue_path(project, region, queue)

        task = {
            "http_request": {
                "http_method": tasks_v2.HttpMethod.POST,
                "url": f"https://{region}-{project}.cloudfunctions.net/agent-{agent_id}",
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps(event_data).encode(),
            }
        }

        response = client.create_task(request={"parent": parent, "task": task})
        logger.info(f"Created task for agent {agent_id}: {response.name}")
    except Exception as exc:
        logger.error(f"Failed to trigger agent {agent_id}: {exc}")


def append_to_sheet(sheet_id, sheet_name, values):
    """Append a row to a Google Sheet tab."""
    try:
        credentials, _ = default()
        service = build("sheets", "v4", credentials=credentials)

        body = {"values": [values]}
        response = service.spreadsheets().values().append(
            spreadsheetId=sheet_id,
            range=f"{sheet_name}!A:J",
            valueInputOption="USER_ENTERED",
            body=body,
        ).execute()

        logger.debug(f"Appended row to {sheet_name}: {response.get('updates', {}).get('updatedRows', 0)} rows")
    except Exception as exc:
        logger.error(f"Failed to append to Sheet {sheet_name}: {exc}")
        raise


def extract_event_text(event_data):
    """Extract a clean text string for NLP from common payload fields."""
    payload = event_data.get("payload")
    payload_obj = parse_payload(payload)

    candidates = [
        payload_obj.get("subject"),
        payload_obj.get("snippet"),
        payload_obj.get("body"),
        payload_obj.get("body_text"),
        payload_obj.get("text"),
        payload_obj.get("content"),
    ]

    cleaned = [c.strip() for c in candidates if isinstance(c, str) and c.strip()]
    if not cleaned:
        return None

    return "\n".join(cleaned)


def parse_payload(payload):
    """Normalize payload into a dict if possible."""
    if payload is None:
        return {}
    if isinstance(payload, dict):
        return payload
    if isinstance(payload, str):
        try:
            parsed = json.loads(payload)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            return {"text": payload}
    return {}


def analyze_text_with_nlp(raw_text):
    """Run Cloud Natural Language (entities + sentiment) on text."""
    try:
        client = language_v1.LanguageServiceClient()
        document = language_v1.Document(
            content=raw_text, type_=language_v1.Document.Type.PLAIN_TEXT
        )

        entity_response = client.analyze_entities(
            request={
                "document": document,
                "encoding_type": language_v1.EncodingType.UTF8,
            }
        )
        sentiment_response = client.analyze_sentiment(
            request={"document": document, "encoding_type": language_v1.EncodingType.UTF8}
        )

        entities = []
        for entity in entity_response.entities:
            entities.append(
                {
                    "name": entity.name,
                    "type": language_v1.Entity.Type(entity.type_).name,
                    "salience": entity.salience,
                    "metadata": dict(entity.metadata),
                    "mentions": [
                        {"text": mention.text.content, "type": mention.type_.name}
                        for mention in entity.mentions
                    ],
                }
            )

        return {
            "entities": entities,
            "sentiment_score": sentiment_response.document_sentiment.score,
            "sentiment_magnitude": sentiment_response.document_sentiment.magnitude,
            "language": entity_response.language or sentiment_response.language,
        }
    except Exception as exc:
        logger.error(f"Cloud NLP error: {exc}")
        return None
