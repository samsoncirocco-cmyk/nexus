"""
Sample Triage Agent Cloud Function

Demonstrates the complete OpenClaw agent flow:
1. Receive event from Cloud Tasks (event_router routed it)
2. Read context from BigQuery + Sheets (AgentContextBuilder)
3. Make decision based on context
4. Write decision to BigQuery + Sheets (AgentStateWriter)

Triggered by: Cloud Tasks queue (openclaw-agents)
Input: HTTP POST with event JSON payload
Output: Writes to BigQuery and Sheets
"""

import json
import os
import logging
from datetime import datetime

from google.cloud import bigquery
from google.auth import default
from agent_context import AgentContextBuilder, AgentStateWriter

logger = logging.getLogger(__name__)

# Global clients (reused across invocations)
bq = bigquery.Client()
credentials, _ = default()

PROJECT_ID = os.environ.get("PROJECT_ID") or os.environ.get("GOOGLE_PROJECT_ID")
SHEET_ID = os.environ.get("SHEET_ID") or os.environ.get("GOOGLE_SHEET_ID")
AGENT_ID = "triage"


class TriageAgent:
    """Triage agent: reads Gmail events, creates tasks, logs decisions."""

    def __init__(self, project_id, sheet_id):
        self.project_id = project_id
        self.sheet_id = sheet_id
        self.context = AgentContextBuilder(project_id, sheet_id)
        self.state = AgentStateWriter(project_id, sheet_id)

    def process_event(self, event_data):
        """
        Main entry point: process an event.

        1. Extract context (sender info, workload, config)
        2. Decide: should we create a task?
        3. Act: create task if decision is yes
        4. Log: write to BigQuery + Sheets
        """
        event_id = event_data.get("event_id", "unknown")
        logger.info(f"[{AGENT_ID}] Processing event {event_id}")

        # Step 1: Extract event data
        source = event_data.get("source")
        if source != "gmail":
            logger.warning(f"Ignoring non-Gmail event: {source}")
            return

        event_type = event_data.get("event_type")
        if event_type != "webhook_received":
            logger.warning(f"Ignoring non-webhook event: {event_type}")
            return

        # Extract payload
        try:
            payload = json.loads(event_data.get("payload", "{}"))
        except json.JSONDecodeError:
            logger.error(f"Failed to parse payload for {event_id}")
            return

        from_email = payload.get("from", "")
        subject = payload.get("subject", "")
        message_id = payload.get("message_id", "")

        logger.info(f"[{AGENT_ID}] Email from {from_email}: {subject[:50]}")

        # Step 2: Read context from data lake
        try:
            contact = self.context.get_contact_info(from_email)
            open_tasks = self.context.get_open_tasks()
            recent_emails = self.context.get_recent_emails(hours=24, from_email=from_email)

            logger.info(
                f"[{AGENT_ID}] Context: contact={contact is not None}, "
                f"open_tasks={len(open_tasks)}, recent_emails={len(recent_emails)}"
            )
        except Exception as e:
            logger.error(f"Failed to read context: {e}")
            contact = None
            open_tasks = []
            recent_emails = []

        # Step 3: Make decision - should we create a task?
        decision = self._make_decision(
            from_email=from_email,
            subject=subject,
            contact=contact,
            open_tasks=open_tasks,
            recent_emails=recent_emails,
        )

        logger.info(
            f"[{AGENT_ID}] Decision: create_task={decision['create_task']}, "
            f"priority={decision['priority']}, confidence={decision['confidence']}"
        )

        # Step 4: Act based on decision
        if decision["create_task"]:
            try:
                task_id = self.state.create_task(
                    title=f"Follow-up: {subject[:80]}",
                    priority=decision["priority"],
                    due_date=decision["due_date"],
                    context_json={
                        "from_email": from_email,
                        "message_id": message_id,
                        "reason": decision["reason"],
                    },
                )
                logger.info(f"[{AGENT_ID}] Created task {task_id}")
            except Exception as e:
                logger.error(f"Failed to create task: {e}")
                return

        # Step 5: Log action to BigQuery + Sheets
        try:
            action_id = self.state.log_action(
                agent_id=AGENT_ID,
                action_type="DECIDE" if not decision["create_task"] else "ACT",
                entity_type="email",
                entity_id=message_id,
                summary=f"Triaged email: {subject[:60]}",
                rationale=decision["reason"],
                confidence=decision["confidence"],
                parent_id=event_id,
            )
            logger.info(f"[{AGENT_ID}] Logged action {action_id}")
        except Exception as e:
            logger.error(f"Failed to log action: {e}")

    def _make_decision(self, from_email, subject, contact, open_tasks, recent_emails):
        """
        Decide whether to create a task for this email.

        Returns: dict with create_task, priority, due_date, reason, confidence
        """
        # Check for urgency signals in subject
        urgency_keywords = ["ASAP", "urgent", "critical", "blocking", "emergency", "important"]
        has_urgency = any(word in subject.upper() for word in urgency_keywords)

        # Check sender importance
        contact_priority_score = float(contact.get("priority_score", 0.5)) if contact else 0.5

        # Check workload (create task if < 5 open tasks)
        workload_ok = len(open_tasks) < 5

        # Decision logic
        create_task = has_urgency or (contact_priority_score > 0.8)
        priority = "P0" if has_urgency else ("P1" if contact_priority_score > 0.8 else "P2")
        confidence = 0.9 if has_urgency else 0.7

        # Determine due date
        from datetime import datetime, timedelta

        now = datetime.utcnow()
        due_days = 1 if has_urgency else (2 if contact_priority_score > 0.8 else 3)
        due_date = (now + timedelta(days=due_days)).strftime("%Y-%m-%d")

        reason = []
        if has_urgency:
            reason.append("Urgent keywords detected in subject")
        if contact_priority_score > 0.8:
            reason.append("High-priority contact")
        if not workload_ok:
            reason.append("Currently at capacity, task queued")

        return {
            "create_task": create_task,
            "priority": priority,
            "due_date": due_date,
            "confidence": confidence,
            "reason": "; ".join(reason) if reason else "Routine email",
        }


def agent_handler(request):
    """
    HTTP Cloud Function entry point for triage agent.

    Receives HTTP POST with event JSON.
    """
    try:
        # Parse request
        event_data = request.get_json()
        if not event_data:
            logger.warning("No JSON payload received")
            return "Bad Request", 400

        # Process event
        agent = TriageAgent(PROJECT_ID, SHEET_ID)
        agent.process_event(event_data)

        return "OK", 200

    except Exception as exc:
        logger.exception(f"Unhandled error in agent_handler: {exc}")
        return f"Error: {str(exc)}", 500
