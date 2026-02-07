"""
OpenClaw AI Workflow Orchestrator

Implements the core pipeline: Event -> Enrich -> Analyze -> Decide -> Act

All state transitions are logged to BigQuery. The orchestrator is stateless;
it reads context from Google (Sheets + BigQuery) and writes results back.

Usage:
    orchestrator = OpenClawOrchestrator(project_id, sheet_id)
    result = orchestrator.process_event(event_data)
"""

import json
import logging
import os
import uuid
from datetime import datetime

from google.cloud import bigquery, language_v1
from google.auth import default

from agent_context import AgentContextBuilder, AgentStateWriter
from vertex_ai import GeminiAnalyzer

logger = logging.getLogger(__name__)

credentials, _ = default()

AGENT_ID = "orchestrator"


class OpenClawOrchestrator:
    """
    Orchestrates the full AI pipeline for incoming events.

    Pipeline stages:
    1. Receive - Accept normalized event
    2. Enrich  - Run NLP (entities, sentiment) on event text
    3. Analyze - Use Gemini to understand intent and extract structure
    4. Decide  - Use Gemini + context to choose an action
    5. Act     - Execute the chosen action (create task, label, etc.)
    """

    def __init__(self, project_id, sheet_id, region="us-central1"):
        self.project_id = project_id
        self.sheet_id = sheet_id
        self.bq = bigquery.Client()
        self.context = AgentContextBuilder(project_id, sheet_id)
        self.state = AgentStateWriter(project_id, sheet_id)
        self.analyzer = GeminiAnalyzer(project_id, sheet_id, region=region)

    def process_event(self, event_data):
        """
        Run the full pipeline on an event.

        Returns:
            dict with stage results and final outcome
        """
        event_id = event_data.get("event_id", "unknown")
        pipeline_id = f"pipe-{uuid.uuid4().hex[:12]}"
        logger.info(f"[{AGENT_ID}] Starting pipeline {pipeline_id} for event {event_id}")

        result = {
            "pipeline_id": pipeline_id,
            "event_id": event_id,
            "stages": {},
            "outcome": None,
            "error": None,
        }

        try:
            # Stage 1: Enrich
            enrichment = self._stage_enrich(event_data)
            result["stages"]["enrich"] = enrichment

            # Stage 2: Analyze
            analysis = self._stage_analyze(event_data, enrichment)
            result["stages"]["analyze"] = analysis

            # Stage 3: Decide
            decision = self._stage_decide(event_data, enrichment, analysis)
            result["stages"]["decide"] = decision

            # Stage 4: Act
            action_result = self._stage_act(event_data, decision)
            result["stages"]["act"] = action_result
            result["outcome"] = action_result.get("action_taken", "none")

        except Exception as exc:
            result["error"] = str(exc)
            logger.exception(f"[{AGENT_ID}] Pipeline {pipeline_id} failed: {exc}")

        # Log pipeline execution to BigQuery
        self._log_pipeline(result)

        logger.info(
            f"[{AGENT_ID}] Pipeline {pipeline_id} completed: outcome={result['outcome']}"
        )
        return result

    def _stage_enrich(self, event_data):
        """Stage 1: Extract text and run NLP enrichment."""
        event_id = event_data.get("event_id", "unknown")
        logger.info(f"[{AGENT_ID}] Enriching event {event_id}")

        raw_text = self._extract_event_text(event_data)
        if not raw_text:
            return {"text_found": False, "entities": [], "sentiment_score": None}

        try:
            client = language_v1.LanguageServiceClient()
            document = language_v1.Document(
                content=raw_text, type_=language_v1.Document.Type.PLAIN_TEXT
            )

            entity_resp = client.analyze_entities(
                request={"document": document, "encoding_type": language_v1.EncodingType.UTF8}
            )
            sentiment_resp = client.analyze_sentiment(
                request={"document": document, "encoding_type": language_v1.EncodingType.UTF8}
            )

            entities = [
                {
                    "name": e.name,
                    "type": language_v1.Entity.Type(e.type_).name,
                    "salience": e.salience,
                }
                for e in entity_resp.entities
            ]

            enrichment = {
                "text_found": True,
                "raw_text": raw_text[:1000],
                "entities": entities,
                "sentiment_score": sentiment_resp.document_sentiment.score,
                "sentiment_magnitude": sentiment_resp.document_sentiment.magnitude,
                "language": entity_resp.language,
            }

            # Store enrichment in BigQuery
            nlp_row = {
                "event_id": event_id,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "source": event_data.get("source"),
                "entities": entities,
                "sentiment_score": enrichment["sentiment_score"],
                "sentiment_magnitude": enrichment["sentiment_magnitude"],
                "language": enrichment["language"],
                "raw_text": raw_text[:2000],
            }
            self.bq.insert_rows_json(
                f"{self.project_id}.openclaw.nlp_enrichment", [nlp_row]
            )

            return enrichment

        except Exception as exc:
            logger.error(f"[{AGENT_ID}] NLP enrichment failed for {event_id}: {exc}")
            return {
                "text_found": True,
                "raw_text": raw_text[:1000],
                "entities": [],
                "sentiment_score": None,
                "error": str(exc),
            }

    def _stage_analyze(self, event_data, enrichment):
        """Stage 2: Use Gemini to analyze the event."""
        event_id = event_data.get("event_id", "unknown")
        source = event_data.get("source", "unknown")
        logger.info(f"[{AGENT_ID}] Analyzing event {event_id}")

        # Choose analysis type based on source
        analysis_type = {
            "gmail": "triage",
            "calendar": "summarize",
            "drive": "classify",
        }.get(source, "summarize")

        context = {}
        if enrichment.get("entities"):
            context["nlp_entities"] = enrichment["entities"][:10]
        if enrichment.get("sentiment_score") is not None:
            context["sentiment"] = {
                "score": enrichment["sentiment_score"],
                "magnitude": enrichment.get("sentiment_magnitude"),
            }

        result = self.analyzer.analyze_event(
            event_data,
            analysis_type=analysis_type,
            agent_id=AGENT_ID,
            context=context,
        )

        return result

    def _stage_decide(self, event_data, enrichment, analysis):
        """Stage 3: Use Gemini + context to make a decision."""
        event_id = event_data.get("event_id", "unknown")
        logger.info(f"[{AGENT_ID}] Making decision for event {event_id}")

        # Gather context from the data lake
        decision_context = {
            "enrichment_summary": {
                "sentiment": enrichment.get("sentiment_score"),
                "top_entities": [
                    e["name"] for e in enrichment.get("entities", [])[:5]
                ],
            },
            "analysis_summary": analysis.get("output_structured", {}),
        }

        # Add task workload context
        try:
            open_tasks = self.context.get_open_tasks()
            decision_context["current_workload"] = {
                "open_task_count": len(open_tasks),
                "high_priority_count": sum(
                    1 for t in open_tasks if t.get("priority") in ("P0", "P1")
                ),
            }
        except Exception:
            decision_context["current_workload"] = {"open_task_count": 0}

        # Add sender context for email events
        source = event_data.get("source")
        if source == "gmail":
            payload = event_data.get("payload", "{}")
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except json.JSONDecodeError:
                    payload = {}
            from_email = payload.get("from", "")
            if from_email:
                try:
                    contact = self.context.get_contact_info(from_email)
                    if contact:
                        decision_context["sender"] = {
                            "known": True,
                            "priority_score": contact.get("priority_score"),
                            "relationship": contact.get("relationship"),
                        }
                except Exception:
                    pass

        decision = self.analyzer.make_decision(
            event_data,
            context=decision_context,
            agent_id=AGENT_ID,
            decision_type="event_response",
        )

        return decision

    def _stage_act(self, event_data, decision):
        """Stage 4: Execute the chosen action."""
        event_id = event_data.get("event_id", "unknown")
        chosen_action = decision.get("chosen_action", "")
        confidence = decision.get("confidence", 0.0)
        logger.info(
            f"[{AGENT_ID}] Acting on event {event_id}: "
            f"action={chosen_action}, confidence={confidence}"
        )

        # Only auto-execute high-confidence actions
        if confidence < 0.6:
            logger.info(f"[{AGENT_ID}] Low confidence ({confidence}), logging for review")
            self.state.log_action(
                agent_id=AGENT_ID,
                action_type="REVIEW_NEEDED",
                entity_type=event_data.get("source", "unknown"),
                entity_id=event_id,
                summary=f"Low confidence decision: {chosen_action}",
                rationale=decision.get("reasoning", ""),
                confidence=confidence,
                parent_id=event_id,
            )
            return {"action_taken": "flagged_for_review", "reason": "low_confidence"}

        action_map = {
            "create_task": self._act_create_task,
            "archive": self._act_log_only,
            "ignore": self._act_log_only,
            "reply": self._act_flag_for_human,
            "forward": self._act_flag_for_human,
        }

        handler = action_map.get(chosen_action, self._act_log_only)
        result = handler(event_data, decision)

        # Mark decision as executed
        decision_id = decision.get("decision_id")
        if decision_id:
            self.analyzer.mark_decision_executed(
                decision_id, json.dumps(result, default=str)
            )

        return result

    def _act_create_task(self, event_data, decision):
        """Create a task based on the AI decision."""
        analysis = decision.get("output_structured", {}) if "output_structured" in decision else {}
        priority = analysis.get("priority", "P2") if analysis else "P2"
        reasoning = decision.get("reasoning", "AI-generated task")

        payload = event_data.get("payload", "{}")
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except json.JSONDecodeError:
                payload = {}

        subject = payload.get("subject", "Untitled")
        task_id = self.state.create_task(
            title=f"[AI] {subject[:80]}",
            priority=priority if priority in ("P0", "P1", "P2", "P3", "P4") else "P2",
            context_json={
                "event_id": event_data.get("event_id"),
                "source": event_data.get("source"),
                "decision_id": decision.get("decision_id"),
                "reasoning": reasoning,
            },
        )

        self.state.log_action(
            agent_id=AGENT_ID,
            action_type="CREATE_TASK",
            entity_type="task",
            entity_id=task_id,
            summary=f"Created task from {event_data.get('source')} event",
            rationale=reasoning,
            confidence=decision.get("confidence", 0.5),
            parent_id=event_data.get("event_id", ""),
        )

        return {"action_taken": "create_task", "task_id": task_id}

    def _act_log_only(self, event_data, decision):
        """Log the decision without taking further action."""
        self.state.log_action(
            agent_id=AGENT_ID,
            action_type="DECIDE",
            entity_type=event_data.get("source", "unknown"),
            entity_id=event_data.get("event_id", ""),
            summary=f"Decided: {decision.get('chosen_action', 'none')}",
            rationale=decision.get("reasoning", ""),
            confidence=decision.get("confidence", 0.5),
            parent_id=event_data.get("event_id", ""),
        )
        return {"action_taken": decision.get("chosen_action", "logged")}

    def _act_flag_for_human(self, event_data, decision):
        """Flag action that requires human intervention."""
        task_id = self.state.create_task(
            title=f"[Human needed] {decision.get('chosen_action', 'review')}: "
                  f"{event_data.get('event_id', '')[:40]}",
            priority="P1",
            context_json={
                "event_id": event_data.get("event_id"),
                "source": event_data.get("source"),
                "decision_id": decision.get("decision_id"),
                "action_needed": decision.get("chosen_action"),
                "reasoning": decision.get("reasoning"),
            },
        )

        self.state.log_action(
            agent_id=AGENT_ID,
            action_type="FLAG_HUMAN",
            entity_type=event_data.get("source", "unknown"),
            entity_id=event_data.get("event_id", ""),
            summary=f"Flagged for human: {decision.get('chosen_action')}",
            rationale=decision.get("reasoning", ""),
            confidence=decision.get("confidence", 0.5),
            parent_id=event_data.get("event_id", ""),
        )

        return {
            "action_taken": "flagged_for_human",
            "task_id": task_id,
            "action_needed": decision.get("chosen_action"),
        }

    def _extract_event_text(self, event_data):
        """Extract clean text from event payload for NLP."""
        payload = event_data.get("payload")
        if payload is None:
            return None
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except json.JSONDecodeError:
                return payload[:2000] if payload.strip() else None
        if not isinstance(payload, dict):
            return None

        candidates = [
            payload.get("subject"),
            payload.get("snippet"),
            payload.get("body"),
            payload.get("body_text"),
            payload.get("text"),
            payload.get("content"),
            payload.get("description"),
            payload.get("title"),
        ]

        cleaned = [c.strip() for c in candidates if isinstance(c, str) and c.strip()]
        return "\n".join(cleaned) if cleaned else None

    def _log_pipeline(self, result):
        """Log the full pipeline execution to BigQuery."""
        try:
            row = {
                "event_id": f"pipeline-{result['pipeline_id']}",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "agent_id": AGENT_ID,
                "event_type": "pipeline_executed",
                "source": "orchestrator",
                "payload": json.dumps(
                    {
                        "pipeline_id": result["pipeline_id"],
                        "event_id": result["event_id"],
                        "outcome": result["outcome"],
                        "error": result["error"],
                        "stages": {
                            k: {
                                "completed": v is not None,
                                "error": v.get("error") if isinstance(v, dict) else None,
                            }
                            for k, v in result.get("stages", {}).items()
                        },
                    },
                    default=str,
                ),
                "processed": True,
            }
            self.bq.insert_rows_json(
                f"{self.project_id}.openclaw.events", [row]
            )
        except Exception as exc:
            logger.error(f"[{AGENT_ID}] Failed to log pipeline: {exc}")
