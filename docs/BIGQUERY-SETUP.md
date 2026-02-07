# 03-BIGQUERY-SETUP.md: BigQuery Dataset & Tables

## Overview

Create a BigQuery dataset called `openclaw` to store all immutable, queryable event data.

**Benefits over Sheets**:
- Append-only (write once, read many)
- Partitioned and clustered for efficient queries
- SQL querying across billions of events
- Long-term retention with archival
- Cost-effective for large volumes

## Dataset Creation

```bash
# Via gcloud CLI
bq mk --location=US openclaw

# Or via Google Cloud Console
# Datasets → Create Dataset → openclaw → US
```

## Table 1: `events`

**Purpose**: Raw, append-only event stream from all sources (Gmail, Calendar, Drive, agents)

**Schema**:
```sql
CREATE TABLE openclaw.events (
  event_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  agent_id STRING,
  event_type STRING,
  source STRING,
  payload JSON,
  processed BOOL DEFAULT FALSE
)
PARTITION BY DATE(timestamp)
CLUSTER BY agent_id, event_type;
```

**Columns**:
- `event_id` (STRING): Unique identifier (e.g., `gmail-msg_xyz`, `action-abc123`)
- `timestamp` (TIMESTAMP): When event occurred (ISO 8601, UTC)
- `agent_id` (STRING, nullable): Which agent generated/processed it (NULL for external events)
- `event_type` (STRING): webhook_received, action_taken, error, metric
- `source` (STRING): gmail, calendar, drive, agent, manual
- `payload` (JSON): Full event data (see examples below)
- `processed` (BOOL): Whether event has been processed by router (default: false)

**Partitioning**: By DATE(timestamp) - keeps queries fast, separates data by day

**Clustering**: By agent_id, event_type - common filter patterns

**Example rows**:
```json
{
  "event_id": "gmail-msg_abc123",
  "timestamp": "2026-02-07T18:45:32Z",
  "agent_id": null,
  "event_type": "webhook_received",
  "source": "gmail",
  "payload": {
    "message_id": "msg_abc123",
    "from": "alice@company.com",
    "to": "you@company.com",
    "subject": "Q1 Budget Review - ASAP",
    "snippet": "We need to review the Q1 budget...",
    "thread_id": "thread_xyz789",
    "labels": ["INBOX", "IMPORTANT"],
    "timestamp": "2026-02-07T18:45:30Z"
  },
  "processed": false
}
```

```json
{
  "event_id": "action-abc456",
  "timestamp": "2026-02-07T18:45:50Z",
  "agent_id": "triage",
  "event_type": "action_taken",
  "source": "agent",
  "payload": {
    "action_type": "DECIDE",
    "entity_type": "task",
    "entity_id": "task_001",
    "summary": "Create task: Review Q1 budget",
    "rationale": "Email from CFO with urgent language, assigned P1",
    "confidence": 0.87,
    "parent_action_id": "gmail-msg_abc123"
  },
  "processed": true
}
```

**Retention Policy**:
- Keep hot data (< 90 days) in standard storage
- Archive to Cloud Storage after 90 days
- Retain for 1 year minimum (audit trail)

**Query Patterns**:
```sql
-- Get all recent Gmail events
SELECT * FROM `project.openclaw.events`
WHERE source = 'gmail'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
ORDER BY timestamp DESC;

-- Get all actions by an agent
SELECT * FROM `project.openclaw.events`
WHERE agent_id = 'triage'
  AND event_type = 'action_taken'
ORDER BY timestamp DESC;

-- Find error events
SELECT * FROM `project.openclaw.events`
WHERE event_type = 'error'
ORDER BY timestamp DESC;
```

---

## Table 2: `decisions`

**Purpose**: Log every decision made by agents with full reasoning and outcome

**Schema**:
```sql
CREATE TABLE openclaw.decisions (
  decision_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  agent_id STRING,
  trigger_event_id STRING,
  context_snapshot JSON,
  options_considered JSON,
  chosen_option STRING,
  outcome STRING,
  outcome_timestamp TIMESTAMP,
  feedback JSON
)
PARTITION BY DATE(timestamp)
CLUSTER BY agent_id;
```

**Columns**:
- `decision_id` (STRING): UUID for this decision
- `timestamp` (TIMESTAMP): When decision was made
- `agent_id` (STRING): Which agent made the decision
- `trigger_event_id` (STRING): FK to `events.event_id` that triggered this
- `context_snapshot` (JSON): What the agent saw when deciding (excerpt of context)
- `options_considered` (JSON): Array of candidate options with scores
- `chosen_option` (STRING): Which option was chosen
- `outcome` (STRING): success, failure, pending, cancelled
- `outcome_timestamp` (TIMESTAMP, nullable): When outcome was determined
- `feedback` (JSON): Human or downstream feedback on decision

**Example row**:
```json
{
  "decision_id": "dec_xyz789",
  "timestamp": "2026-02-07T18:45:50Z",
  "agent_id": "triage",
  "trigger_event_id": "gmail-msg_abc123",
  "context_snapshot": {
    "from_email": "alice@company.com",
    "from_name": "Alice Chen",
    "from_priority_score": 0.95,
    "subject": "Q1 Budget Review - ASAP",
    "urgency_keywords": ["ASAP"],
    "existing_tasks_count": 3,
    "max_concurrent_tasks": 5
  },
  "options_considered": [
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
  ],
  "chosen_option": "create_task_p0",
  "outcome": "pending",
  "outcome_timestamp": null,
  "feedback": null
}
```

**Query Patterns**:
```sql
-- Get all decisions by an agent
SELECT * FROM `project.openclaw.decisions`
WHERE agent_id = 'triage'
ORDER BY timestamp DESC;

-- Get decisions with specific outcomes
SELECT * FROM `project.openclaw.decisions`
WHERE outcome = 'failure'
ORDER BY timestamp DESC
LIMIT 50;

-- Analyze decision confidence
SELECT
  agent_id,
  AVG(CAST(JSON_VALUE(options_considered[OFFSET(0)], '$.score') AS FLOAT64)) as avg_confidence
FROM `project.openclaw.decisions`
WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY agent_id;
```

---

## Table 3: `observations`

**Purpose**: Long-term pattern/anomaly detection (what agents notice about the world)

**Schema**:
```sql
CREATE TABLE openclaw.observations (
  observation_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  agent_id STRING,
  entity_type STRING,
  entity_id STRING,
  observation_type STRING,
  value JSON,
  confidence FLOAT64,
  expires_at TIMESTAMP
)
PARTITION BY DATE(timestamp)
CLUSTER BY entity_type, entity_id;
```

**Columns**:
- `observation_id` (STRING): UUID
- `timestamp` (TIMESTAMP): When observation was made
- `agent_id` (STRING): Which agent made it
- `entity_type` (STRING): person, project, topic, pattern, anomaly
- `entity_id` (STRING): Reference ID (email, project name, etc.)
- `observation_type` (STRING): sentiment, frequency, relationship, anomaly, pattern
- `value` (JSON): The actual observation data
- `confidence` (FLOAT64): 0.0-1.0 confidence in observation
- `expires_at` (TIMESTAMP): TTL (when observation becomes stale)

**Example rows**:
```json
{
  "observation_id": "obs_abc123",
  "timestamp": "2026-02-07T19:00:00Z",
  "agent_id": "triage",
  "entity_type": "person",
  "entity_id": "alice@company.com",
  "observation_type": "frequency",
  "value": {
    "emails_last_30_days": 47,
    "avg_response_time_hours": 2.3,
    "preferred_time": "morning"
  },
  "confidence": 0.89,
  "expires_at": "2026-05-07T19:00:00Z"
}
```

```json
{
  "observation_id": "obs_def456",
  "timestamp": "2026-02-07T19:00:00Z",
  "agent_id": "research",
  "entity_type": "anomaly",
  "entity_id": "alice@company.com",
  "observation_type": "silence",
  "value": {
    "expected_contact_frequency": "daily",
    "days_since_last_contact": 4,
    "severity": "medium"
  },
  "confidence": 0.76,
  "expires_at": "2026-02-14T19:00:00Z"
}
```

**TTL Policy**:
- Observations expire after period defined in `expires_at`
- Agents can renew observations that are still valid
- Old observations auto-delete (via scheduled query or BigQuery lifecycle)

**Query Patterns**:
```sql
-- Get current observations about a person
SELECT * FROM `project.openclaw.observations`
WHERE entity_type = 'person'
  AND entity_id = 'alice@company.com'
  AND expires_at > CURRENT_TIMESTAMP()
ORDER BY timestamp DESC;

-- Find anomalies
SELECT * FROM `project.openclaw.observations`
WHERE observation_type = 'anomaly'
  AND expires_at > CURRENT_TIMESTAMP()
ORDER BY timestamp DESC;

-- Analyze patterns
SELECT
  entity_type,
  observation_type,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence
FROM `project.openclaw.observations`
WHERE expires_at > CURRENT_TIMESTAMP()
GROUP BY entity_type, observation_type;
```

---

## External Tables (Query Sheets with SQL)

Create external tables that query your Google Sheets as data sources:

```sql
-- Query agent_log from Sheets
CREATE EXTERNAL TABLE openclaw.sheets_agent_log
OPTIONS (
  format = 'GOOGLE_SHEETS',
  uris = ['https://docs.google.com/spreadsheets/d/15-3fveXfHSKyTXmQ3x344ie4p9rbtTZGaNl-GLQ8Eac/gviz/tq?sheet=agent_log']
);

-- Query tasks from Sheets
CREATE EXTERNAL TABLE openclaw.sheets_tasks
OPTIONS (
  format = 'GOOGLE_SHEETS',
  uris = ['https://docs.google.com/spreadsheets/d/15-3fveXfHSKyTXmQ3x344ie4p9rbtTZGaNl-GLQ8Eac/gviz/tq?sheet=tasks']
);

-- Query contacts from Sheets
CREATE EXTERNAL TABLE openclaw.sheets_contacts
OPTIONS (
  format = 'GOOGLE_SHEETS',
  uris = ['https://docs.google.com/spreadsheets/d/15-3fveXfHSKyTXmQ3x344ie4p9rbtTZGaNl-GLQ8Eac/gviz/tq?sheet=contacts']
);
```

**Now you can query Sheets with SQL**:
```sql
-- Find all P0 tasks
SELECT * FROM `project.openclaw.sheets_tasks`
WHERE priority = 'P0'
  AND status != 'done'
ORDER BY due_date;

-- Get recent agent actions
SELECT * FROM `project.openclaw.sheets_agent_log`
WHERE agent_id = 'triage'
ORDER BY timestamp DESC
LIMIT 100;
```

---

## Setup Checklist

- [ ] Create BigQuery dataset: `bq mk --location=US openclaw`
- [ ] Create `events` table with schema above
- [ ] Create `decisions` table with schema above
- [ ] Create `observations` table with schema above
- [ ] Create external tables for Sheets (`sheets_agent_log`, `sheets_tasks`, `sheets_contacts`)
- [ ] Set up retention policy (90 day hot, archive to Cloud Storage)
- [ ] Create view for "recent critical decisions" (optional)
- [ ] Test: Insert sample event and verify it's queryable
- [ ] Save project ID to `.env` as `GOOGLE_PROJECT_ID=...`

## Dataset Queries (Useful Patterns)

```sql
-- View of recent critical actions
CREATE OR REPLACE VIEW openclaw.critical_actions AS
SELECT
  timestamp,
  agent_id,
  JSON_VALUE(payload, '$.action_type') as action,
  JSON_VALUE(payload, '$.summary') as summary,
  CAST(JSON_VALUE(payload, '$.confidence') AS FLOAT64) as confidence
FROM `openclaw.events`
WHERE event_type = 'action_taken'
  AND CAST(JSON_VALUE(payload, '$.confidence') AS FLOAT64) > 0.8
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
ORDER BY timestamp DESC;

-- Decision audit trail
CREATE OR REPLACE VIEW openclaw.decision_audit AS
SELECT
  d.timestamp,
  d.agent_id,
  d.chosen_option,
  d.outcome,
  e.source,
  JSON_VALUE(e.payload, '$.summary') as trigger_summary
FROM `openclaw.decisions` d
LEFT JOIN `openclaw.events` e ON d.trigger_event_id = e.event_id
ORDER BY d.timestamp DESC;
```

---

## Troubleshooting

**Query fails with "Table not found"**:
- Verify table was created in correct dataset: `bq ls openclaw`
- Check project ID matches

**External table query fails**:
- Verify SHEET_ID is correct (from Sheet URL)
- Check sheet tab name matches (case-sensitive)
- Ensure service account has Reader access to Sheet

**Partitioning queries are slow**:
- Use `WHERE timestamp > TIMESTAMP_SUB(...)` to filter partitions
- Cluster by frequently-filtered columns (agent_id, event_type, entity_type)
