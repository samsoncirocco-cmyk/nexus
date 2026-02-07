"""
Vertex AI Gemini Integration for OpenClaw

Provides AI analysis capabilities using Vertex AI Gemini models.
All results are stored in BigQuery for auditability.

Usage:
    analyzer = GeminiAnalyzer(project_id, sheet_id)
    result = analyzer.analyze_event(event_data, analysis_type="triage")
"""

import hashlib
import json
import logging
import os
import time
import uuid
from datetime import datetime

from google.cloud import bigquery
from google.auth import default
import vertexai
from vertexai.generative_models import GenerativeModel, GenerationConfig

logger = logging.getLogger(__name__)

credentials, _ = default()

# Default model - configurable via config sheet
DEFAULT_MODEL = "gemini-2.0-flash"

# Analysis type prompts
ANALYSIS_PROMPTS = {
    "triage": (
        "You are an email triage assistant. Analyze this email event and determine:\n"
        "1. Priority (P0-P4)\n"
        "2. Category (action_required, fyi, spam, newsletter, personal, work)\n"
        "3. Suggested action (reply, forward, archive, create_task, ignore)\n"
        "4. Key entities (people, orgs, dates, amounts)\n"
        "5. Brief summary (1-2 sentences)\n\n"
        "Respond in JSON format with keys: priority, category, suggested_action, "
        "entities, summary, confidence (0-1)."
    ),
    "summarize": (
        "Summarize the following event data concisely. Extract key facts, "
        "action items, and deadlines. Respond in JSON format with keys: "
        "summary, action_items (list), deadlines (list), key_facts (list)."
    ),
    "classify": (
        "Classify this event into one or more categories. Respond in JSON format "
        "with keys: primary_category, secondary_categories (list), confidence (0-1), "
        "reasoning (brief explanation)."
    ),
    "extract": (
        "Extract structured information from this event. Identify: people, "
        "organizations, dates, locations, monetary amounts, and action items. "
        "Respond in JSON format with keys: people (list), organizations (list), "
        "dates (list), locations (list), amounts (list), action_items (list)."
    ),
    "decide": (
        "Given the following event and context, recommend an action. Consider "
        "priority, sender importance, current workload, and deadlines. "
        "Respond in JSON format with keys: recommended_action, priority, "
        "reasoning, confidence (0-1), alternatives (list of other options)."
    ),
}


class GeminiAnalyzer:
    """Analyze events using Vertex AI Gemini and store results in BigQuery."""

    def __init__(self, project_id, sheet_id=None, region="us-central1"):
        self.project_id = project_id
        self.sheet_id = sheet_id
        self.region = region
        self.bq = bigquery.Client()
        self.ai_table = f"{project_id}.openclaw.ai_analysis"
        self.decision_table = f"{project_id}.openclaw.ai_decisions"

        vertexai.init(project=project_id, location=region)

    def analyze_event(
        self,
        event_data,
        analysis_type="triage",
        agent_id=None,
        model_id=None,
        custom_prompt=None,
        context=None,
    ):
        """
        Analyze an event using Gemini and store the result in BigQuery.

        Args:
            event_data: Event dict (from openclaw.events)
            analysis_type: One of ANALYSIS_PROMPTS keys or custom
            agent_id: Agent requesting analysis
            model_id: Override model (default: gemini-2.0-flash)
            custom_prompt: Override the default prompt for analysis_type
            context: Additional context dict to include in the prompt

        Returns:
            dict with analysis_id, output_structured, confidence, etc.
        """
        model_id = model_id or DEFAULT_MODEL
        event_id = event_data.get("event_id", "unknown")
        analysis_id = f"ai-{uuid.uuid4().hex[:12]}"

        # Build prompt
        system_prompt = custom_prompt or ANALYSIS_PROMPTS.get(analysis_type, ANALYSIS_PROMPTS["summarize"])
        event_text = self._format_event_for_prompt(event_data)

        full_prompt = f"{system_prompt}\n\n---\nEvent Data:\n{event_text}"
        if context:
            full_prompt += f"\n\nAdditional Context:\n{json.dumps(context, indent=2, default=str)}"

        prompt_hash = hashlib.sha256(full_prompt.encode()).hexdigest()[:16]

        # Call Gemini
        start_time = time.time()
        error_msg = None
        raw_output = ""
        structured_output = {}
        confidence = 0.0
        input_tokens = 0
        output_tokens = 0

        try:
            model = GenerativeModel(model_id)
            response = model.generate_content(
                full_prompt,
                generation_config=GenerationConfig(
                    temperature=0.2,
                    max_output_tokens=2048,
                    response_mime_type="application/json",
                ),
            )

            raw_output = response.text
            structured_output = self._parse_json_response(raw_output)
            confidence = structured_output.get("confidence", 0.5)

            if hasattr(response, "usage_metadata") and response.usage_metadata:
                input_tokens = getattr(response.usage_metadata, "prompt_token_count", 0)
                output_tokens = getattr(response.usage_metadata, "candidates_token_count", 0)

        except Exception as exc:
            error_msg = str(exc)
            logger.error(f"Gemini analysis failed for {event_id}: {exc}")

        latency_ms = int((time.time() - start_time) * 1000)

        # Store result in BigQuery
        result = {
            "analysis_id": analysis_id,
            "event_id": event_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "agent_id": agent_id,
            "model_id": model_id,
            "analysis_type": analysis_type,
            "prompt_hash": prompt_hash,
            "input_summary": event_text[:500],
            "output_raw": raw_output[:5000],
            "output_structured": json.dumps(structured_output),
            "confidence": confidence,
            "token_count_input": input_tokens,
            "token_count_output": output_tokens,
            "latency_ms": latency_ms,
            "error": error_msg,
        }

        try:
            errors = self.bq.insert_rows_json(self.ai_table, [result])
            if errors:
                logger.error(f"BigQuery insert errors for analysis {analysis_id}: {errors}")
        except Exception as bq_exc:
            logger.error(f"Failed to write analysis to BigQuery: {bq_exc}")

        return {
            "analysis_id": analysis_id,
            "event_id": event_id,
            "analysis_type": analysis_type,
            "output_structured": structured_output,
            "confidence": confidence,
            "latency_ms": latency_ms,
            "error": error_msg,
        }

    def analyze_batch(self, events, analysis_type="triage", agent_id=None):
        """
        Analyze multiple events. Returns list of results.

        For large batches, consider using this with async patterns.
        """
        results = []
        for event in events:
            result = self.analyze_event(
                event, analysis_type=analysis_type, agent_id=agent_id
            )
            results.append(result)
        return results

    def make_decision(
        self,
        event_data,
        context,
        agent_id=None,
        decision_type="action",
    ):
        """
        Use Gemini to make a decision based on event + context.

        Stores both the analysis and the decision in BigQuery.

        Args:
            event_data: The triggering event
            context: Dict with relevant context (tasks, contacts, history, etc.)
            agent_id: Agent requesting the decision
            decision_type: Type of decision being made

        Returns:
            dict with decision_id, chosen_action, reasoning, confidence, alternatives
        """
        # First, analyze the event with full context
        analysis = self.analyze_event(
            event_data,
            analysis_type="decide",
            agent_id=agent_id,
            context=context,
        )

        decision_id = f"dec-{uuid.uuid4().hex[:12]}"
        output = analysis.get("output_structured", {})

        decision = {
            "decision_id": decision_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "agent_id": agent_id,
            "trigger_event_id": event_data.get("event_id"),
            "analysis_id": analysis.get("analysis_id"),
            "decision_type": decision_type,
            "input_context": json.dumps(context, default=str),
            "reasoning": output.get("reasoning", ""),
            "chosen_action": output.get("recommended_action", ""),
            "alternatives": json.dumps(output.get("alternatives", [])),
            "confidence": analysis.get("confidence", 0.0),
            "executed": False,
            "execution_result": None,
            "execution_timestamp": None,
        }

        # Store decision in BigQuery
        try:
            errors = self.bq.insert_rows_json(self.decision_table, [decision])
            if errors:
                logger.error(f"BigQuery insert errors for decision {decision_id}: {errors}")
        except Exception as bq_exc:
            logger.error(f"Failed to write decision to BigQuery: {bq_exc}")

        return {
            "decision_id": decision_id,
            "analysis_id": analysis.get("analysis_id"),
            "chosen_action": output.get("recommended_action", ""),
            "reasoning": output.get("reasoning", ""),
            "confidence": analysis.get("confidence", 0.0),
            "alternatives": output.get("alternatives", []),
            "error": analysis.get("error"),
        }

    def mark_decision_executed(self, decision_id, result_summary):
        """Update a decision row to mark it as executed."""
        query = """
        UPDATE `{project}.openclaw.ai_decisions`
        SET executed = TRUE,
            execution_result = @result,
            execution_timestamp = CURRENT_TIMESTAMP()
        WHERE decision_id = @decision_id
        """.format(project=self.project_id)

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("decision_id", "STRING", decision_id),
                bigquery.ScalarQueryParameter("result", "STRING", result_summary),
            ]
        )

        try:
            self.bq.query(query, job_config=job_config).result()
            logger.info(f"Marked decision {decision_id} as executed")
        except Exception as exc:
            logger.error(f"Failed to mark decision {decision_id} as executed: {exc}")

    def get_recent_analyses(self, event_id=None, analysis_type=None, limit=20):
        """Query recent AI analyses from BigQuery."""
        conditions = ["timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)"]
        params = []

        if event_id:
            conditions.append("event_id = @event_id")
            params.append(bigquery.ScalarQueryParameter("event_id", "STRING", event_id))
        if analysis_type:
            conditions.append("analysis_type = @analysis_type")
            params.append(bigquery.ScalarQueryParameter("analysis_type", "STRING", analysis_type))

        query = """
        SELECT analysis_id, event_id, timestamp, analysis_type, model_id,
               output_structured, confidence, latency_ms, error
        FROM `{project}.openclaw.ai_analysis`
        WHERE {conditions}
        ORDER BY timestamp DESC
        LIMIT @limit
        """.format(
            project=self.project_id,
            conditions=" AND ".join(conditions),
        )
        params.append(bigquery.ScalarQueryParameter("limit", "INT64", limit))

        job_config = bigquery.QueryJobConfig(query_parameters=params)
        return list(self.bq.query(query, job_config=job_config))

    def _format_event_for_prompt(self, event_data):
        """Format event data into readable text for the LLM prompt."""
        parts = []

        source = event_data.get("source", "unknown")
        event_type = event_data.get("event_type", "unknown")
        parts.append(f"Source: {source}")
        parts.append(f"Type: {event_type}")

        timestamp = event_data.get("timestamp")
        if timestamp:
            parts.append(f"Time: {timestamp}")

        payload = event_data.get("payload")
        if payload:
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except json.JSONDecodeError:
                    parts.append(f"Content: {payload[:1000]}")
                    return "\n".join(parts)

            if isinstance(payload, dict):
                for key in ["subject", "from", "to", "snippet", "body", "body_text",
                            "text", "content", "title", "description"]:
                    value = payload.get(key)
                    if value:
                        parts.append(f"{key.title()}: {str(value)[:500]}")

                # Include labels if present
                labels = payload.get("labels")
                if labels:
                    parts.append(f"Labels: {', '.join(labels) if isinstance(labels, list) else labels}")

        return "\n".join(parts)

    def _parse_json_response(self, raw_text):
        """Parse JSON from Gemini response, handling common formatting issues."""
        if not raw_text:
            return {}

        text = raw_text.strip()

        # Strip markdown code fences if present
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first and last lines (```json and ```)
            lines = [l for l in lines if not l.strip().startswith("```")]
            text = "\n".join(lines).strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse Gemini JSON response, returning raw text")
            return {"raw_response": raw_text, "confidence": 0.3}
