"""
OpenClaw Orchestrator Cloud Function

Pub/Sub-triggered function that runs the full AI pipeline on incoming events.

Triggered by: openclaw-events Pub/Sub topic
Pipeline: Event -> Enrich -> Analyze -> Decide -> Act
Writes to: BigQuery (ai_analysis, ai_decisions, events, nlp_enrichment), Sheets

Deploy:
    gcloud functions deploy openclaw-orchestrator \
        --runtime python311 \
        --trigger-topic openclaw-events \
        --entry-point orchestrate_event \
        --set-env-vars PROJECT_ID=your-project,SHEET_ID=your-sheet-id \
        --memory 512MB \
        --timeout 120s
"""

import base64
import json
import logging
import os

from openclaw_orchestrator import OpenClawOrchestrator

logger = logging.getLogger(__name__)

PROJECT_ID = os.environ.get("PROJECT_ID") or os.environ.get("GOOGLE_PROJECT_ID")
SHEET_ID = os.environ.get("SHEET_ID") or os.environ.get("GOOGLE_SHEET_ID")
REGION = os.environ.get("VERTEX_REGION", "us-central1")


def orchestrate_event(event, context):
    """
    Pub/Sub Cloud Function entry point.

    Receives a Pub/Sub message containing an OpenClaw event,
    runs the full AI orchestration pipeline.
    """
    try:
        data = json.loads(base64.b64decode(event["data"]).decode())
        event_id = data.get("event_id", "unknown")
        source = data.get("source", "unknown")
        event_type = data.get("event_type", "unknown")

        logger.info(
            f"Orchestrator received event {event_id}: {source}/{event_type}"
        )

        # Skip events from the orchestrator itself to prevent loops
        if source == "orchestrator":
            logger.info(f"Skipping self-generated event {event_id}")
            return "OK"

        # Skip already-processed action events
        if event_type == "action_taken":
            logger.info(f"Skipping action event {event_id}")
            return "OK"

        orchestrator = OpenClawOrchestrator(PROJECT_ID, SHEET_ID, region=REGION)
        result = orchestrator.process_event(data)

        logger.info(
            f"Pipeline completed for {event_id}: outcome={result.get('outcome')}"
        )
        return "OK"

    except Exception as exc:
        logger.exception(f"Orchestrator failed: {exc}")
        raise
