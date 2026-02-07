import base64
import json
import os
from datetime import datetime
import logging

from google.auth import default
from google.cloud import bigquery, language_v1
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig

logger = logging.getLogger(__name__)

bq = bigquery.Client()

PROJECT_ID = os.environ.get("PROJECT_ID") or os.environ.get("GOOGLE_PROJECT_ID")
NLP_TABLE_ID = (
    os.environ.get("BQ_NLP_TABLE") or f"{PROJECT_ID}.openclaw.nlp_enrichment"
)
AI_TABLE_ID = (
    os.environ.get("BQ_AI_TABLE") or f"{PROJECT_ID}.openclaw.ai_analysis"
)

# Initialize Vertex AI
VERTEX_REGION = os.environ.get("VERTEX_REGION", "us-central1")
VERTEX_MODEL = os.environ.get("VERTEX_MODEL", "gemini-2.0-flash")
vertexai.init(project=PROJECT_ID, location=VERTEX_REGION)

# Gemini prompt for email enrichment: intent classification + action items extraction
GMAIL_ENRICHMENT_PROMPT = (
    "You are an email analysis assistant. Analyze the following email and extract:\n"
    "1. intent: The primary intent (inquiry, request, update, notification, marketing, personal, spam)\n"
    "2. action_items: List of specific action items required from the recipient\n"
    "3. priority: Priority level (P0=urgent, P1=high, P2=medium, P3=low, P4=informational)\n"
    "4. category: One of (work, personal, finance, travel, shopping, social, newsletter, automated)\n"
    "5. summary: A 1-2 sentence summary\n"
    "6. key_entities: People, organizations, dates, amounts mentioned\n"
    "7. confidence: Your confidence in this analysis (0.0 to 1.0)\n\n"
    "Respond in JSON format with exactly these keys: intent, action_items, priority, "
    "category, summary, key_entities, confidence."
)


def enrich_gmail_event(event, context):
    """
    Pub/Sub Cloud Function: Enriches Gmail events with NLP and Gemini AI analysis.

    Triggered by: openclaw-events Pub/Sub topic (filtered for gmail source)
    Writes to: openclaw.nlp_enrichment BigQuery table
    Writes to: openclaw.ai_analysis BigQuery table
    """
    try:
        data = json.loads(base64.b64decode(event["data"]).decode())

        event_id = data.get("event_id", "unknown")
        source = data.get("source")
        event_type = data.get("event_type")

        # Only process Gmail events
        if source != "gmail":
            logger.info(f"Skipping non-gmail event {event_id} (source={source})")
            return "OK"

        logger.info(f"Enriching gmail event {event_id}: {event_type}")

        # Extract text from event payload
        raw_text = extract_event_text(data)
        if not raw_text:
            logger.info(f"No text payload for enrichment on {event_id}, skipping")
            return "OK"

        # Step 1: Cloud Natural Language API enrichment (entities + sentiment)
        try:
            nlp_result = analyze_text_with_nlp(raw_text)
            if nlp_result:
                nlp_row = {
                    "event_id": event_id,
                    "timestamp": data.get("timestamp") or datetime.utcnow().isoformat() + "Z",
                    "source": source,
                    "entities": nlp_result.get("entities", []),
                    "sentiment_score": nlp_result.get("sentiment_score"),
                    "sentiment_magnitude": nlp_result.get("sentiment_magnitude"),
                    "language": nlp_result.get("language"),
                    "raw_text": raw_text[:10000],
                }
                nlp_errors = bq.insert_rows_json(NLP_TABLE_ID, [nlp_row])
                if nlp_errors:
                    logger.error(f"BigQuery NLP insert errors for {event_id}: {nlp_errors}")
                else:
                    logger.info(f"Inserted NLP enrichment for {event_id}")
        except Exception as nlp_exc:
            logger.error(f"NLP enrichment failed for {event_id}: {nlp_exc}")

        # Step 2: Gemini AI analysis (intent, action items, priority, category)
        try:
            ai_result = analyze_with_gemini(event_id, data, raw_text)
            if ai_result:
                ai_errors = bq.insert_rows_json(AI_TABLE_ID, [ai_result])
                if ai_errors:
                    logger.error(f"BigQuery AI insert errors for {event_id}: {ai_errors}")
                else:
                    logger.info(f"Inserted AI analysis for {event_id}")
        except Exception as ai_exc:
            logger.error(f"Gemini AI analysis failed for {event_id}: {ai_exc}")

        logger.info(f"Successfully enriched gmail event {event_id}")
        return "OK"

    except Exception as exc:
        logger.exception(f"Unhandled error in enrich_gmail_event: {exc}")
        raise


def extract_event_text(event_data):
    """Extract a clean text string for NLP from common payload fields."""
    payload = event_data.get("payload")
    payload_obj = parse_payload(payload)

    candidates = [
        payload_obj.get("subject"),
        payload_obj.get("body_text"),
        payload_obj.get("snippet"),
        payload_obj.get("body"),
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


def analyze_with_gemini(event_id, event_data, raw_text):
    """
    Run Vertex AI Gemini analysis on an email event.

    Returns a row dict matching the openclaw.ai_analysis schema,
    or None on failure.
    """
    import hashlib
    import time
    import uuid

    analysis_id = f"ai-{uuid.uuid4().hex[:12]}"

    # Build the prompt with email context
    payload_obj = parse_payload(event_data.get("payload"))
    email_context = []
    for field in ("from", "to", "subject", "date"):
        val = payload_obj.get(field)
        if val:
            email_context.append(f"{field.title()}: {val}")
    email_context.append(f"\nBody:\n{raw_text[:5000]}")

    full_prompt = f"{GMAIL_ENRICHMENT_PROMPT}\n\n---\n" + "\n".join(email_context)
    prompt_hash = hashlib.sha256(full_prompt.encode()).hexdigest()[:16]

    start_time = time.time()
    error_msg = None
    raw_output = ""
    structured_output = {}
    confidence = 0.0
    input_tokens = 0
    output_tokens = 0

    try:
        model = GenerativeModel(VERTEX_MODEL)
        response = model.generate_content(
            full_prompt,
            generation_config=GenerationConfig(
                temperature=0.2,
                max_output_tokens=2048,
                response_mime_type="application/json",
            ),
        )

        raw_output = response.text
        structured_output = parse_json_response(raw_output)
        confidence = structured_output.get("confidence", 0.5)

        if hasattr(response, "usage_metadata") and response.usage_metadata:
            input_tokens = getattr(response.usage_metadata, "prompt_token_count", 0)
            output_tokens = getattr(response.usage_metadata, "candidates_token_count", 0)

    except Exception as exc:
        error_msg = str(exc)
        logger.error(f"Gemini analysis failed for {event_id}: {exc}")

    latency_ms = int((time.time() - start_time) * 1000)

    return {
        "analysis_id": analysis_id,
        "event_id": event_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "agent_id": "gmail_enricher",
        "model_id": VERTEX_MODEL,
        "analysis_type": "gmail_enrichment",
        "prompt_hash": prompt_hash,
        "input_summary": raw_text[:500],
        "output_raw": raw_output[:5000],
        "output_structured": json.dumps(structured_output),
        "confidence": confidence,
        "token_count_input": input_tokens,
        "token_count_output": output_tokens,
        "latency_ms": latency_ms,
        "error": error_msg,
    }


def parse_json_response(raw_text):
    """Parse JSON from Gemini response, handling common formatting issues."""
    if not raw_text:
        return {}

    text = raw_text.strip()

    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logger.warning("Failed to parse Gemini JSON response, returning raw text")
        return {"raw_response": raw_text, "confidence": 0.3}
