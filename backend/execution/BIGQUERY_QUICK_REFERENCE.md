# BigQuery Quick Reference - OpenClaw Phase 1

## Setup (One-Time)

```bash
# 1. Create dataset and tables
bq query --use_legacy_sql=false < bigquery_setup.sql

# 2. Create external tables and test data
python3 bigquery_setup.py

# 3. Verify everything is working
bq ls -t openclaw
```

## Tables at a Glance

| Table | Purpose | Key Columns | Partitioning | TTL |
|-------|---------|------------|--------------|-----|
| `events` | Raw event stream | event_id, timestamp, source, payload | DATE(timestamp) | 90 days |
| `decisions` | Agent decisions | decision_id, agent_id, outcome, options_considered | DATE(timestamp) | None |
| `observations` | Patterns/anomalies | observation_id, entity_type, confidence, expires_at | DATE(timestamp) | Via expires_at |

## Common Queries

### Get Recent Events
```sql
SELECT * FROM `project.openclaw.events`
WHERE source = 'gmail'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
ORDER BY timestamp DESC;
```

### Get Agent Actions
```sql
SELECT * FROM `project.openclaw.events`
WHERE agent_id = 'triage'
  AND event_type = 'action_taken'
ORDER BY timestamp DESC LIMIT 10;
```

### Get Decision Outcomes
```sql
SELECT
  agent_id,
  outcome,
  COUNT(*) as count,
  AVG(CAST(JSON_VALUE(options_considered[OFFSET(0)], '$.score') AS FLOAT64)) as avg_confidence
FROM `project.openclaw.decisions`
WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY agent_id, outcome;
```

### Get Current Observations
```sql
SELECT * FROM `project.openclaw.valid_observations`
WHERE entity_type = 'person'
ORDER BY confidence DESC LIMIT 10;
```

## Views (Shortcuts)

```sql
-- High-confidence actions from past 24 hours
SELECT * FROM `project.openclaw.critical_actions`;

-- Decision audit trail with event context
SELECT * FROM `project.openclaw.decision_audit` LIMIT 10;

-- Non-expired observations only
SELECT * FROM `project.openclaw.valid_observations`;

-- Recent events from past 7 days
SELECT * FROM `project.openclaw.recent_events` LIMIT 20;
```

## Insert Sample Data

### From Python
```python
from google.cloud import bigquery
import json

client = bigquery.Client(project="your-project-id")

event = {
    "event_id": "my-event-123",
    "timestamp": "2026-02-07T20:30:00Z",
    "agent_id": "triage",
    "event_type": "action_taken",
    "source": "agent",
    "payload": json.dumps({"action": "create_task"}),
    "processed": True,
}

errors = client.insert_rows_json("your-project-id.openclaw.events", [event])
print("Success!" if not errors else f"Errors: {errors}")
```

### From BigQuery Console
```sql
INSERT INTO `project.openclaw.events` (
  event_id, timestamp, agent_id, event_type, source, payload, processed
) VALUES (
  'test-123',
  CURRENT_TIMESTAMP(),
  'triage',
  'action_taken',
  'agent',
  JSON '{"test": true}',
  TRUE
);
```

## Sheets Integration

Create external table for live sheet data:

```sql
CREATE EXTERNAL TABLE openclaw.sheets_tasks
OPTIONS (
  format = 'GOOGLE_SHEETS',
  uris = ['https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?sheet=tasks']
);

-- Query live sheet data
SELECT * FROM `project.openclaw.sheets_tasks`
WHERE priority = 'P0' AND status != 'done'
ORDER BY due_date;
```

## Environment Variables

```bash
# Required for Cloud Functions
export GOOGLE_PROJECT_ID="your-project-id"
export PUBSUB_TOPIC="projects/your-project-id/topics/openclaw-events"
export BQ_EVENTS_TABLE="your-project-id.openclaw.events"

# Optional for Sheets integration
export GOOGLE_SHEET_ID="your-sheet-id-here"
```

## Troubleshooting

### "Table not found" error
```bash
# Check table exists
bq show project.openclaw.events

# List all tables
bq ls -t openclaw
```

### BigQuery insert fails
```python
# Check insert errors
errors = client.insert_rows_json(TABLE_ID, rows)
if errors:
    for error in errors:
        print(f"Error: {error}")
```

### Query is slow
```sql
-- Add partition filter (uses clustering)
WHERE DATE(timestamp) = CURRENT_DATE()
  AND agent_id = 'triage'

-- Check query execution plan
-- Go to BigQuery console, run query, check "Execution details"
```

## Cost Notes

- **Query**: Free tier = 1 TB/month
- **Storage**: Free tier = 100 GB
- **Streaming inserts**: $7 per 100M rows (~ $0.50/day for personal use)
- **External tables**: No extra cost, but check Sheets API quotas

## Database Maintenance

### Check table sizes
```sql
SELECT
  table_name,
  ROUND(size_bytes/1024/1024, 2) as size_mb,
  ROUND(size_bytes/1024/1024/1024, 2) as size_gb
FROM `project.region-us`.INFORMATION_SCHEMA.TABLE_STORAGE
WHERE table_schema = 'openclaw'
ORDER BY size_bytes DESC;
```

### Delete old data (if needed)
```sql
DELETE FROM `project.openclaw.events`
WHERE DATE(timestamp) < DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY);
```

### Update retention policy
```sql
ALTER TABLE `project.openclaw.events`
SET OPTIONS (
  expiration_ms=7776000000  -- 90 days in ms
);
```

## File References

- **Setup Scripts**: `/Users/maryobrien/project/execution/`
  - `bigquery_setup.sql` - DDL
  - `bigquery_setup.py` - External tables & test data
  - `bigquery_test_data.sql` - Test data

- **Documentation**: `/Users/maryobrien/project/execution/`
  - `BIGQUERY_IMPLEMENTATION.md` - Complete guide
  - `IMPLEMENTATION_SUMMARY.md` - Summary
  - `BIGQUERY_QUICK_REFERENCE.md` - This file

## Project IDs & Table Names

```
Project ID: Check $GOOGLE_PROJECT_ID
Dataset: openclaw
Tables:
  - openclaw.events (main)
  - openclaw.decisions (audit)
  - openclaw.observations (patterns)
  - openclaw.sheets_agent_log (external)
  - openclaw.sheets_tasks (external)
  - openclaw.sheets_contacts (external)
  - openclaw.sheets_config (external)
```

## Next Steps

1. ✅ BigQuery tables created
2. ⏳ Deploy Cloud Functions (gmail_ingester, event_router)
3. ⏳ Set up Gmail webhook
4. ⏳ Monitor events in BigQuery
5. ⏳ Build agents that query the data

---

**Questions?** Check BIGQUERY_IMPLEMENTATION.md for detailed troubleshooting.
