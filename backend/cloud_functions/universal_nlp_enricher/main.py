import base64
import json
import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional, Set, Tuple

from google.auth import default
from google.cloud import bigquery, language_v1
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)


PROJECT_ID = os.environ.get("PROJECT_ID") or os.environ.get("GOOGLE_PROJECT_ID")
SHEET_ID = os.environ.get("SHEET_ID") or os.environ.get("GOOGLE_SHEET_ID")
NLP_TABLE_ID = os.environ.get("BQ_NLP_TABLE") or (
    f"{PROJECT_ID}.openclaw.nlp_enrichment" if PROJECT_ID else None
)


def universal_nlp_enricher(event, context):
    """
    Pub/Sub Cloud Function: Apply Cloud Natural Language enrichment across all sources.

    - Dedupes by event_id in openclaw.nlp_enrichment (best effort).
    - Extracts text from common payload fields, including synthetic events:
        - vision_text_extracted.payload.text
        - speech_transcribed.payload.text
    - Writes entities + sentiment back to openclaw.nlp_enrichment.
    """
    if not PROJECT_ID or not NLP_TABLE_ID:
        logger.error("Missing required configuration (PROJECT_ID, NLP_TABLE_ID)")
        return "Missing config"

    try:
        data = json.loads(base64.b64decode(event["data"]).decode("utf-8"))
    except Exception as exc:
        logger.error(f"Failed to decode Pub/Sub payload: {exc}")
        return "Bad payload"

    event_id = data.get("event_id", "unknown")
    source = data.get("source")
    timestamp = data.get("timestamp") or datetime.utcnow().isoformat() + "Z"

    payload_obj = _parse_payload(data.get("payload"))
    raw_text = _extract_text(source=source, payload=payload_obj)

    if not raw_text:
        return "OK"

    bq = bigquery.Client()

    if _already_enriched(bq, event_id):
        logger.info(f"NLP enrichment already exists for event {event_id}, skipping")
        return "OK"

    known_emails, known_names = _load_known_contacts()

    enrichment = _analyze_text_with_nlp(raw_text)
    if not enrichment:
        return "OK"

    entities = enrichment.get("entities", [])
    if known_emails or known_names:
        entities = _annotate_known_contacts(entities, known_emails, known_names)

    row = {
        "event_id": event_id,
        "timestamp": timestamp,
        "source": source,
        "entities": entities,
        "sentiment_score": enrichment.get("sentiment_score"),
        "sentiment_magnitude": enrichment.get("sentiment_magnitude"),
        "language": enrichment.get("language"),
        "raw_text": raw_text[:10000],
    }

    errors = bq.insert_rows_json(NLP_TABLE_ID, [row])
    if errors:
        logger.error(f"BigQuery NLP insert errors for {event_id}: {errors}")
    else:
        logger.info(f"Inserted universal NLP enrichment for {event_id}")

    return "OK"


def _already_enriched(bq: bigquery.Client, event_id: str) -> bool:
    query = f"""
    SELECT COUNT(*) AS cnt
    FROM `{NLP_TABLE_ID}`
    WHERE event_id = @event_id
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[bigquery.ScalarQueryParameter("event_id", "STRING", event_id)]
    )
    try:
        rows = list(bq.query(query, job_config=job_config))
        return bool(rows and rows[0].cnt and rows[0].cnt > 0)
    except Exception as exc:
        logger.warning(f"NLP dedupe query failed for {event_id}: {exc}")
        return False


def _extract_text(*, source: Optional[str], payload: Dict[str, Any]) -> Optional[str]:
    candidates = [
        payload.get("subject"),
        payload.get("snippet"),
        payload.get("body"),
        payload.get("body_text"),
        payload.get("text"),  # synthetic events (vision/speech)
        payload.get("transcript"),
        payload.get("description"),
        payload.get("title"),
        payload.get("content"),
        payload.get("notes"),
        payload.get("location"),  # sometimes useful for entity extraction
    ]
    cleaned = [c.strip() for c in candidates if isinstance(c, str) and c.strip()]
    return "\n".join(cleaned) if cleaned else None


def _load_known_contacts() -> Tuple[Set[str], Set[str]]:
    """
    Best-effort contact loading from Sheets `contacts` tab.
    This does not block enrichment if Sheets is unavailable.
    """
    if not SHEET_ID:
        return set(), set()

    try:
        credentials, _ = default()
        service = build("sheets", "v4", credentials=credentials, cache_discovery=False)
        resp = (
            service.spreadsheets()
            .values()
            .get(spreadsheetId=SHEET_ID, range="contacts!A:Z")
            .execute()
        )
        values = resp.get("values", []) or []
        if len(values) < 2:
            return set(), set()

        emails: Set[str] = set()
        names: Set[str] = set()
        # Skip header row; collect strings that look like emails, and common name-ish values.
        for row in values[1:501]:
            for cell in row:
                if not isinstance(cell, str):
                    continue
                s = cell.strip()
                if not s:
                    continue
                if "@" in s and "." in s:
                    emails.add(s.lower())
                elif len(s) <= 80:
                    names.add(s)
        return emails, names
    except Exception as exc:
        logger.warning(f"Failed to load contacts from Sheets: {exc}")
        return set(), set()


def _annotate_known_contacts(
    entities: List[Dict[str, Any]],
    known_emails: Set[str],
    known_names: Set[str],
) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    for e in entities:
        name = (e.get("name") or "").strip()
        if not name:
            out.append(e)
            continue
        is_known = (name.lower() in known_emails) or (name in known_names)
        if is_known:
            meta = e.get("metadata") or {}
            if isinstance(meta, dict):
                meta = dict(meta)
                meta["known_contact"] = True
                e = dict(e)
                e["metadata"] = meta
        out.append(e)
    return out


def _analyze_text_with_nlp(raw_text: str) -> Optional[Dict[str, Any]]:
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

        entities: List[Dict[str, Any]] = []
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

