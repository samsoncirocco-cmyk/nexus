# BigQuery Implementation for OpenClaw Phase 1

## Overview

This document guides the setup of the BigQuery infrastructure for OpenClaw Phase 1. The system creates an immutable event store with three core tables (events, decisions, observations) and external table connections to Google Sheets for SQL-based querying.

## Architecture

```
Gmail, Calendar, Drive
        ↓
   Cloud Functions (ingester)
        ↓
  Pub/Sub (openclaw-events)
        ↓
Event Router + BigQuery
        ↓
Google Sheets (agent_log) ← → BigQuery (events, decisions, observations)
```

## Prerequisites

- Google Cloud Project (with billing enabled for BigQuery)
- Service account with BigQuery Admin and Sheets Editor roles
- GOOGLE_PROJECT_ID configured in .env
- GOOGLE_SHEET_ID configured in .env (optional, for Sheets integration)

## Setup Steps

### Step 1: Create the Dataset and Tables

Run the SQL setup script in BigQuery console:

```bash
# Option A: Using bq CLI
bq query --use_legacy_sql=false < /Users/maryobrien/project/execution/bigquery_setup.sql

# Option B: Using Google Cloud Console
# 1. Go to BigQuery Console
# 2. Copy-paste the SQL from bigquery_setup.sql
# 3. Click "Run query"
```

This creates:
- `openclaw` dataset (US location)
- `events` table (partitioned by date, clustered by agent_id/event_type)
- `decisions` table (partitioned by date, clustered by agent_id)
- `observations` table (partitioned by date, clustered by entity_type/entity_id)
- Helper views for common queries

### Step 2: Create External Tables (if using Sheets)

Run the Python setup script:

```bash
python3 /Users/maryobrien/project/execution/bigquery_setup.py
```

This script:
1. Creates external tables for Sheets (agent_log, tasks, contacts, config)
2. Inserts sample test data
3. Verifies tables are queryable

### Step 3: Verify Setup

Check that all tables were created:

```bash
bq ls -t openclaw
```

Expected output:
```
       tableId        Type    Labels   Time Partitioning
 ----------------------- ------- ---------- -----------------
  decisions             TABLE
  events                TABLE   expiration_ms:7776000000
  observations          TABLE
  sheets_agent_log      TABLE   (external table)
  sheets_tasks          TABLE   (external table)
  sheets_contacts       TABLE   (external table)
  sheets_config         TABLE   (external table)
  critical_actions      VIEW
  decision_audit        VIEW
  recent_events         VIEW
  valid_observations    VIEW
```

## Table Schemas

### events table

Stores raw, append-only event stream from all sources.

```
event_id        STRING NOT NULL   (Primary key)
timestamp       TIMESTAMP NOT NULL (Partition key)
agent_id        STRING            (Cluster key)
event_type      STRING            (Cluster key)
source          STRING
payload         JSON
processed       BOOL DEFAULT FALSE
```

**Example row:**
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
    "subject": "Q1 Budget Review - ASAP",
    "snippet": "We need to review the Q1 budget...",
    "thread_id": "thread_xyz789"
  },
  "processed": false
}
```

### decisions table

Logs every decision made by agents with full reasoning.

```
decision_id       STRING NOT NULL   (Primary key)
timestamp         TIMESTAMP NOT NULL (Partition key)
agent_id          STRING            (Cluster key)
trigger_event_id  STRING            (FK to events.event_id)
context_snapshot  JSON
options_considered JSON
chosen_option     STRING
outcome           STRING
outcome_timestamp TIMESTAMP
feedback          JSON
```

**Example row:**
```json
{
  "decision_id": "dec_xyz789",
  "timestamp": "2026-02-07T18:45:50Z",
  "agent_id": "triage",
  "trigger_event_id": "gmail-msg_abc123",
  "context_snapshot": {
    "from_email": "alice@company.com",
    "from_priority_score": 0.95,
    "subject": "Q1 Budget Review - ASAP"
  },
  "options_considered": [
    {
      "option": "create_task_p0",
      "score": 0.92,
      "reason": "From high-priority contact, urgent language"
    }
  ],
  "chosen_option": "create_task_p0",
  "outcome": "pending",
  "outcome_timestamp": null,
  "feedback": null
}
```

### observations table

Stores long-term pattern/anomaly detection data.

```
observation_id  STRING NOT NULL   (Primary key)
timestamp       TIMESTAMP NOT NULL (Partition key)
agent_id        STRING
entity_type     STRING            (Cluster key)
entity_id       STRING            (Cluster key)
observation_type STRING
value           JSON
confidence      FLOAT64
expires_at      TIMESTAMP
```

**Example row:**
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
    "avg_response_time_hours": 2.3
  },
  "confidence": 0.89,
  "expires_at": "2026-05-07T19:00:00Z"
}
```

## External Tables (Google Sheets)

If GOOGLE_SHEET_ID is configured, the setup script creates external tables that query your Google Sheets directly via SQL:

```sql
-- Query the tasks sheet
SELECT * FROM `project.openclaw.sheets_tasks`
WHERE priority = 'P0'
  AND status != 'done'
ORDER BY due_date;

-- Get recent agent actions
SELECT * FROM `project.openclaw.sheets_agent_log`
WHERE agent_id = 'triage'
ORDER BY timestamp DESC
LIMIT 100;

-- Find specific contacts
SELECT * FROM `project.openclaw.sheets_contacts`
WHERE priority_score > 0.8
ORDER BY priority_score DESC;
```

## Performance Optimization

### Partitioning

All tables are partitioned by `DATE(timestamp)`:
- Queries with `WHERE timestamp > ...` are fast and cheap
- Each day's data is stored separately
- Old partitions can be archived or deleted

### Clustering

- **events**: Clustered by `agent_id, event_type`
  - Fast queries filtering by agent or event type
- **decisions**: Clustered by `agent_id`
  - Fast queries for decisions by specific agent
- **observations**: Clustered by `entity_type, entity_id`
  - Fast queries finding observations about specific entities

### Retention Policy

**events table**: Automatically expires after 90 days (hot data)
- Keep recent data in standard storage
- Archive older data to Cloud Storage for audit trail
- Can be extended via scheduled BigQuery export

**decisions & observations tables**: No automatic expiration
- Keep all decision records (audit trail)
- Observations with `expires_at` can be cleaned up manually

## Query Patterns

### Recent Events

```sql
SELECT * FROM `project.openclaw.events`
WHERE source = 'gmail'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
ORDER BY timestamp DESC;
```

### Agent Actions

```sql
SELECT * FROM `project.openclaw.events`
WHERE agent_id = 'triage'
  AND event_type = 'action_taken'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
ORDER BY timestamp DESC;
```

### Decision Analysis

```sql
SELECT
  agent_id,
  COUNT(*) as decision_count,
  AVG(CAST(JSON_VALUE(options_considered[OFFSET(0)], '$.score') AS FLOAT64)) as avg_confidence,
  COUNTIF(outcome = 'success') as successful_outcomes
FROM `project.openclaw.decisions`
WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY agent_id;
```

### Find Valid Observations

```sql
SELECT * FROM `project.openclaw.valid_observations`
WHERE entity_type = 'person'
  AND observation_type = 'frequency'
ORDER BY confidence DESC;
```

## Integration with Cloud Functions

The gmail_ingester and event_router Cloud Functions expect:

```python
# In Cloud Functions environment variables:
GOOGLE_PROJECT_ID = "your-project-id"
BQ_EVENTS_TABLE = "your-project-id.openclaw.events"
PUBSUB_TOPIC = "projects/your-project-id/topics/openclaw-events"
```

The functions write directly to the events table:

```python
from google.cloud import bigquery

bq = bigquery.Client()
errors = bq.insert_rows_json(TABLE_ID, [event])
```

The event format must match the schema exactly:
```python
event = {
    "event_id": "gmail-msg_xyz",
    "timestamp": "2026-02-07T18:45:32Z",
    "agent_id": None,
    "event_type": "webhook_received",
    "source": "gmail",
    "payload": json.dumps({...}),
    "processed": False,
}
```

## Troubleshooting

### "Table not found" Error

Check that the table exists and schema is correct:
```bash
bq show openclaw.events
```

Verify project ID:
```bash
echo $GOOGLE_PROJECT_ID
```

### External Table Queries Fail

1. Verify GOOGLE_SHEET_ID is correct (from Sheet URL)
2. Check sheet tab name matches (case-sensitive)
3. Ensure service account has at least Reader access to the Sheet

### BigQuery Inserts Timeout

- Batch inserts instead of single rows
- Use Pub/Sub for decoupling
- Check network connectivity to googleapis.com

### Retention Not Working

BigQuery auto-expiration runs once per day. To manually delete old data:
```sql
DELETE FROM `project.openclaw.events`
WHERE DATE(timestamp) < DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY);
```

## Verification Checklist

- [ ] Dataset created: `bq ls openclaw`
- [ ] events table exists with correct schema
- [ ] decisions table exists with correct schema
- [ ] observations table exists with correct schema
- [ ] External tables created (if using Sheets)
- [ ] Sample data inserted successfully
- [ ] Verification queries return results
- [ ] Cloud Functions can write to events table
- [ ] Query performance is acceptable (sub-second for partitioned queries)
- [ ] GOOGLE_PROJECT_ID saved in .env
- [ ] GOOGLE_SHEET_ID saved in .env (if using Sheets)

## Cost Estimate

For personal-scale usage (100 emails/day):

| Operation | Cost |
|-----------|------|
| Storage (1 GB/month) | Free tier |
| Queries (< 1 TB/month) | Free tier |
| Streaming inserts | $7/100M rows (negligible for personal) |
| Pub/Sub integration | Free tier |
| **Total** | **~$0-1/month** |

BigQuery runs almost entirely on the free tier for typical personal use.

## Next Steps

1. **Phase 1 Complete**: Email events land in BigQuery within 10 seconds
2. **Phase 2**: Build triage agent that reads from events/decisions tables
3. **Phase 3**: Implement multi-agent coordination via shared state
4. **Phase 4**: Add intelligence (long-term memory, anomaly detection)

## Files Generated

- `bigquery_setup.sql`: SQL DDL for all tables and views
- `bigquery_setup.py`: Python script for external tables and testing
- `BIGQUERY_IMPLEMENTATION.md`: This guide

## Support & Debugging

For issues, check:
1. BigQuery console logs: https://console.cloud.google.com/bigquery
2. Cloud Functions logs: https://console.cloud.google.com/functions
3. Pub/Sub topic messages: https://console.cloud.google.com/cloudpubsub
4. Service account permissions: https://console.cloud.google.com/iam-admin
