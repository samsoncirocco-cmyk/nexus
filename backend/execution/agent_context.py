import json
import os
import hashlib
from datetime import datetime, timedelta

from google.auth import default
from google.cloud import bigquery
from googleapiclient.discovery import build


credentials, _ = default()


class AgentContextBuilder:
    """Read state from Google data lake."""

    def __init__(self, project_id, sheet_id):
        self.project_id = project_id
        self.sheet_id = sheet_id
        self.bq = bigquery.Client()
        self.sheets = build("sheets", "v4", credentials=credentials)
        self.drive = build("drive", "v3", credentials=credentials)

    def get_open_tasks(self, assigned_to=None, priority_filter=None):
        """Get open tasks from Sheets."""
        result = (
            self.sheets.spreadsheets()
            .values()
            .get(spreadsheetId=self.sheet_id, range="tasks!A:L")
            .execute()
        )

        rows = result.get("values", [])
        if not rows:
            return []

        headers = rows[0]
        tasks = []

        for row in rows[1:]:
            if len(row) < len(headers):
                row = row + [""] * (len(headers) - len(row))

            task = dict(zip(headers, row))

            # Filter
            if task.get("status") not in ("pending", "in_progress"):
                continue
            if assigned_to and task.get("assigned_to") != assigned_to:
                continue
            if priority_filter and task.get("priority") != priority_filter:
                continue

            tasks.append(task)

        return sorted(
            tasks,
            key=lambda t: {
                "P0": 0,
                "P1": 1,
                "P2": 2,
                "P3": 3,
                "P4": 4,
            }.get(t.get("priority", "P2"), 2),
        )

    def get_recent_emails(self, hours=24, from_email=None):
        """Query BigQuery for recent Gmail activity."""
        query = """
        SELECT
          event_id,
          timestamp,
          JSON_VALUE(payload, '$.message_id') as message_id,
          JSON_VALUE(payload, '$.from') as from_email,
          JSON_VALUE(payload, '$.subject') as subject,
          JSON_VALUE(payload, '$.snippet') as snippet,
          JSON_VALUE(payload, '$.thread_id') as thread_id
        FROM `{project}.openclaw.events`
        WHERE source = 'gmail'
          AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @hours HOUR)
        ORDER BY timestamp DESC
        LIMIT 50
        """.format(project=self.project_id)

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("hours", "INT64", hours),
            ]
        )

        rows = list(self.bq.query(query, job_config=job_config))
        if from_email:
            rows = [row for row in rows if row.from_email == from_email]
        return rows

    def get_contact_info(self, email):
        """Get contact record from Sheets."""
        result = (
            self.sheets.spreadsheets()
            .values()
            .get(spreadsheetId=self.sheet_id, range="contacts!A:G")
            .execute()
        )

        rows = result.get("values", [])
        if not rows:
            return None

        headers = rows[0]
        for row in rows[1:]:
            if len(row) > 0 and row[0] == email:
                return dict(zip(headers, row + [""] * (len(headers) - len(row))))

        return None


class AgentStateWriter:
    """Write state to Google data lake."""

    def __init__(self, project_id, sheet_id):
        self.project_id = project_id
        self.sheet_id = sheet_id
        self.bq = bigquery.Client()
        self.sheets = build("sheets", "v4", credentials=credentials)

    def log_action(
        self,
        agent_id,
        action_type,
        entity_type,
        entity_id,
        summary,
        rationale="",
        confidence=1.0,
        parent_id="",
    ):
        """Log action to both Sheets and BigQuery."""
        import uuid

        action_id = str(uuid.uuid4())[:8]
        ts = datetime.utcnow().isoformat() + "Z"
        input_hash = hashlib.sha256(
            f"{entity_type}{entity_id}{action_type}".encode()
        ).hexdigest()[:12]

        # Write to Sheets
        self.sheets.spreadsheets().values().append(
            spreadsheetId=self.sheet_id,
            range="agent_log!A:J",
            valueInputOption="USER_ENTERED",
            body={
                "values": [
                    [
                        ts,
                        agent_id,
                        action_type,
                        entity_type,
                        entity_id,
                        summary,
                        input_hash,
                        rationale,
                        confidence,
                        parent_id,
                    ]
                ]
            },
        ).execute()

        # Write to BigQuery
        self.bq.insert_rows_json(
            f"{self.project_id}.openclaw.events",
            [
                {
                    "event_id": f"action-{action_id}",
                    "timestamp": ts,
                    "agent_id": agent_id,
                    "event_type": "action_taken",
                    "source": "agent",
                    "payload": json.dumps(
                        {
                            "action_type": action_type,
                            "entity_type": entity_type,
                            "entity_id": entity_id,
                            "summary": summary,
                            "rationale": rationale,
                            "confidence": confidence,
                            "parent_action_id": parent_id,
                        }
                    ),
                    "processed": True,
                }
            ],
        )

        return action_id

    def create_task(self, title, priority="P2", due_date=None, context_json=None):
        """Create a new task in Sheets."""
        import uuid

        task_id = str(uuid.uuid4())[:12]
        ts = datetime.utcnow().isoformat() + "Z"

        if not due_date:
            due_date = (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%d")

        self.sheets.spreadsheets().values().append(
            spreadsheetId=self.sheet_id,
            range="tasks!A:L",
            valueInputOption="USER_ENTERED",
            body={
                "values": [
                    [
                        task_id,
                        ts,
                        "agent",
                        title,
                        "pending",
                        priority,
                        "unassigned",
                        "agent",
                        "",
                        due_date,
                        json.dumps(context_json or {}),
                        ts,
                    ]
                ]
            },
        ).execute()

        return task_id

    def update_task(self, task_id, updates):
        """Update a task row in Sheets by task_id."""
        result = (
            self.sheets.spreadsheets()
            .values()
            .get(spreadsheetId=self.sheet_id, range="tasks!A:L")
            .execute()
        )

        rows = result.get("values", [])
        headers = rows[0]

        for i, row in enumerate(rows[1:], start=2):
            if len(row) > 0 and row[0] == task_id:
                row_dict = dict(zip(headers, row + [""] * (len(headers) - len(row))))
                row_dict.update(updates)
                row_dict["last_updated"] = datetime.utcnow().isoformat() + "Z"

                new_row = [row_dict.get(h, "") for h in headers]
                self.sheets.spreadsheets().values().update(
                    spreadsheetId=self.sheet_id,
                    range=f"tasks!A{i}:L{i}",
                    valueInputOption="USER_ENTERED",
                    body={"values": [new_row]},
                ).execute()
                return True

        return False
