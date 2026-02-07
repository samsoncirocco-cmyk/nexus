#!/usr/bin/env python3
"""
OpenClaw BigQuery Setup and Testing Script

This script:
1. Creates external tables for Google Sheets data
2. Inserts sample test data
3. Runs verification queries
"""

import json
import os
import sys
from datetime import datetime, timedelta
from uuid import uuid4

from google.cloud import bigquery


def main():
    # Configuration
    project_id = os.environ.get("GOOGLE_PROJECT_ID") or os.environ.get("PROJECT_ID")
    sheet_id = os.environ.get("GOOGLE_SHEET_ID") or os.environ.get("SHEET_ID")

    if not project_id:
        print("ERROR: GOOGLE_PROJECT_ID or PROJECT_ID not set in environment")
        sys.exit(1)

    client = bigquery.Client(project=project_id)
    dataset_id = "openclaw"

    print(f"Project: {project_id}")
    print(f"Dataset: {dataset_id}")
    print()

    # ===========================================================================
    # STEP 1: Create External Tables (if SHEET_ID is configured)
    # ===========================================================================

    if sheet_id:
        print("=" * 70)
        print("STEP 1: Creating External Tables for Google Sheets")
        print("=" * 70)

        external_tables = {
            "sheets_agent_log": f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?sheet=agent_log",
            "sheets_tasks": f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?sheet=tasks",
            "sheets_contacts": f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?sheet=contacts",
            "sheets_config": f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?sheet=config",
        }

        for table_name, uri in external_tables.items():
            try:
                # Check if table exists
                client.get_table(f"{project_id}.{dataset_id}.{table_name}")
                print(f"✓ External table '{table_name}' already exists")
            except Exception:
                # Create external table
                external_config = bigquery.ExternalConfig("GOOGLE_SHEETS")
                external_config.source_uris = [uri]
                external_config.skip_leading_rows = 1

                table_ref = f"{project_id}.{dataset_id}.{table_name}"
                table = bigquery.Table(table_ref, external_config)

                client.create_table(table)
                print(f"✓ Created external table '{table_name}'")

        print()
    else:
        print("⚠  GOOGLE_SHEET_ID not configured - skipping external tables")
        print("   Set GOOGLE_SHEET_ID in .env to enable Sheets integration")
        print()

    # ===========================================================================
    # STEP 2: Insert Sample Test Data
    # ===========================================================================

    print("=" * 70)
    print("STEP 2: Inserting Sample Test Data")
    print("=" * 70)

    now = datetime.utcnow()

    # Sample event 1: Gmail webhook
    event1 = {
        "event_id": f"gmail-{uuid4().hex[:8]}",
        "timestamp": now.isoformat() + "Z",
        "agent_id": None,
        "event_type": "webhook_received",
        "source": "gmail",
        "payload": json.dumps({
            "message_id": "msg_abc123",
            "from": "alice@company.com",
            "to": "you@company.com",
            "subject": "Q1 Budget Review - ASAP",
            "snippet": "We need to review the Q1 budget immediately...",
            "thread_id": "thread_xyz789",
            "labels": ["INBOX", "IMPORTANT"],
            "timestamp": now.isoformat() + "Z"
        }),
        "processed": False,
    }

    # Sample event 2: Agent action
    event2 = {
        "event_id": f"action-{uuid4().hex[:8]}",
        "timestamp": (now + timedelta(seconds=18)).isoformat() + "Z",
        "agent_id": "triage",
        "event_type": "action_taken",
        "source": "agent",
        "payload": json.dumps({
            "action_type": "DECIDE",
            "entity_type": "task",
            "entity_id": "task_001",
            "summary": "Create task: Review Q1 budget",
            "rationale": "Email from CFO with urgent language, assigned P0",
            "confidence": 0.87,
            "parent_action_id": event1["event_id"]
        }),
        "processed": True,
    }

    # Sample decision
    decision1 = {
        "decision_id": f"dec-{uuid4().hex[:8]}",
        "timestamp": (now + timedelta(seconds=18)).isoformat() + "Z",
        "agent_id": "triage",
        "trigger_event_id": event1["event_id"],
        "context_snapshot": json.dumps({
            "from_email": "alice@company.com",
            "from_name": "Alice Chen",
            "from_priority_score": 0.95,
            "subject": "Q1 Budget Review - ASAP",
            "urgency_keywords": ["ASAP"],
            "existing_tasks_count": 3,
            "max_concurrent_tasks": 5
        }),
        "options_considered": json.dumps([
            {
                "option": "create_task_p0",
                "score": 0.92,
                "reason": "From high-priority contact, urgent language, within capacity"
            },
            {
                "option": "create_task_p1",
                "score": 0.45,
                "reason": "Could deprioritize, but contact urgency suggests P0"
            },
            {
                "option": "ignore",
                "score": 0.05,
                "reason": "Contact too important to ignore"
            }
        ]),
        "chosen_option": "create_task_p0",
        "outcome": "pending",
        "outcome_timestamp": None,
        "feedback": None,
    }

    # Sample observation
    observation1 = {
        "observation_id": f"obs-{uuid4().hex[:8]}",
        "timestamp": (now + timedelta(minutes=15)).isoformat() + "Z",
        "agent_id": "triage",
        "entity_type": "person",
        "entity_id": "alice@company.com",
        "observation_type": "frequency",
        "value": json.dumps({
            "emails_last_30_days": 47,
            "avg_response_time_hours": 2.3,
            "preferred_time": "morning"
        }),
        "confidence": 0.89,
        "expires_at": (now + timedelta(days=90)).isoformat() + "Z",
    }

    # Insert events
    try:
        errors = client.insert_rows_json(
            f"{project_id}.{dataset_id}.events",
            [event1, event2],
            skip_invalid_rows=True
        )
        if errors:
            print(f"✗ Events insertion had errors: {errors}")
        else:
            print("✓ Inserted 2 sample events")
    except Exception as e:
        print(f"✗ Failed to insert events: {e}")

    # Insert decisions
    try:
        errors = client.insert_rows_json(
            f"{project_id}.{dataset_id}.decisions",
            [decision1],
            skip_invalid_rows=True
        )
        if errors:
            print(f"✗ Decisions insertion had errors: {errors}")
        else:
            print("✓ Inserted 1 sample decision")
    except Exception as e:
        print(f"✗ Failed to insert decisions: {e}")

    # Insert observations
    try:
        errors = client.insert_rows_json(
            f"{project_id}.{dataset_id}.observations",
            [observation1],
            skip_invalid_rows=True
        )
        if errors:
            print(f"✗ Observations insertion had errors: {errors}")
        else:
            print("✓ Inserted 1 sample observation")
    except Exception as e:
        print(f"✗ Failed to insert observations: {e}")

    print()

    # ===========================================================================
    # STEP 3: Run Verification Queries
    # ===========================================================================

    print("=" * 70)
    print("STEP 3: Running Verification Queries")
    print("=" * 70)

    queries = {
        "Event Count": f"SELECT COUNT(*) as count FROM `{project_id}.{dataset_id}.events`",
        "Recent Events": f"""
            SELECT event_id, timestamp, source, event_type, processed
            FROM `{project_id}.{dataset_id}.events`
            ORDER BY timestamp DESC
            LIMIT 5
        """,
        "Decision Count": f"SELECT COUNT(*) as count FROM `{project_id}.{dataset_id}.decisions`",
        "Observation Count": f"SELECT COUNT(*) as count FROM `{project_id}.{dataset_id}.observations`",
        "Critical Actions (24h)": f"""
            SELECT timestamp, agent_id, action, confidence
            FROM `{project_id}.{dataset_id}.critical_actions`
            LIMIT 5
        """,
    }

    for query_name, query in queries.items():
        try:
            job_config = bigquery.QueryJobConfig()
            query_job = client.query(query, job_config=job_config)
            results = query_job.result()

            print(f"\n{query_name}:")
            print("-" * 70)
            for row in results:
                print(f"  {row}")

        except Exception as e:
            print(f"\n{query_name}:")
            print(f"  ✗ Query failed: {e}")

    print()
    print("=" * 70)
    print("BigQuery Setup Complete!")
    print("=" * 70)
    print(f"""
Next Steps:
1. Deploy Cloud Functions that write to {project_id}.{dataset_id}.events
2. Set up Gmail webhook to trigger the ingester
3. Monitor events landing in BigQuery in real-time
4. Create agents that query the decision/observation tables

Configuration to save in .env:
  GOOGLE_PROJECT_ID={project_id}
  GOOGLE_SHEET_ID={sheet_id if sheet_id else "your-sheet-id-here"}

External Tables (if configured):
  - {project_id}.{dataset_id}.sheets_agent_log
  - {project_id}.{dataset_id}.sheets_tasks
  - {project_id}.{dataset_id}.sheets_contacts
  - {project_id}.{dataset_id}.sheets_config

Core Tables:
  - {project_id}.{dataset_id}.events
  - {project_id}.{dataset_id}.decisions
  - {project_id}.{dataset_id}.observations
    """)


if __name__ == "__main__":
    main()
