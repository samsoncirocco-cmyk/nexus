# BigQuery Deployment Guide - OpenClaw Phase 1

## Prerequisites

Before deploying, ensure you have:

1. **GCP Project ID**: Run `gcloud config get-value project` to get your project
2. **gcloud CLI**: Configured with access to your GCP project
3. **bq CLI**: Google Cloud's BigQuery command-line tool (included with gcloud SDK)
4. **Service Account**: Default Compute Engine service account with BigQuery Admin role
5. **Python 3.7+**: For running the setup script

## Step-by-Step Deployment

### Step 1: Verify GCP Setup

```bash
# Check default project
gcloud config get-value project

# Set project if needed
gcloud config set project YOUR_PROJECT_ID

# Verify BigQuery access
bq ls
```

If you see a list of datasets, you're ready to proceed.

### Step 2: Create Dataset and Core Tables

Run the SQL setup script to create the `openclaw` dataset with all tables:

```bash
bq query --use_legacy_sql=false < /Users/maryobrien/project/execution/bigquery_setup.sql
```

This creates:
- Dataset: `openclaw` (US region)
- Table: `events` (partitioned by date, clustered by agent_id/event_type)
- Table: `decisions` (partitioned by date, clustered by agent_id)
- Table: `observations` (partitioned by date, clustered by entity_type/entity_id)
- Views: `critical_actions`, `decision_audit`, `valid_observations`, `recent_events`

**Verify**:
```bash
bq ls openclaw
bq show openclaw.events
```

### Step 3: Set Environment Variables

Add to `.env` or export in shell:

```bash
export GOOGLE_PROJECT_ID=$(gcloud config get-value project)
export PUBSUB_TOPIC="projects/$(gcloud config get-value project)/topics/openclaw-events"
export BQ_EVENTS_TABLE="$(gcloud config get-value project).openclaw.events"
```

### Step 4: Create External Tables (After Sheets Setup)

Once sheets-builder provides the Google Sheet ID, update the Sheet ID in the Python script:

```python
# In bigquery_setup.py, update SHEET_ID variable
sheet_id = "YOUR_SHEET_ID_HERE"
```

Then run:
```bash
cd /Users/maryobrien/project/execution
python3 bigquery_setup.py
```

This creates external tables that query the Google Sheet:
- `sheets_agent_log`
- `sheets_tasks`
- `sheets_contacts`
- `sheets_config`

### Step 5: Insert Test Data

Verify everything works by inserting sample data:

```bash
bq query --use_legacy_sql=false < /Users/maryobrien/project/execution/bigquery_test_data.sql
```

This inserts:
- 4 sample events
- 3 sample decisions
- 4 sample observations

**Verify**:
```bash
bq query "SELECT COUNT(*) as event_count FROM openclaw.events"
bq query "SELECT COUNT(*) as decision_count FROM openclaw.decisions"
bq query "SELECT COUNT(*) as observation_count FROM openclaw.observations"
```

### Step 6: Test Sample Queries

Run queries from the spec to verify partitioning and clustering:

```bash
# Test partitioned query
bq query "
SELECT event_id, timestamp, source, event_type
FROM \`$(gcloud config get-value project).openclaw.events\`
WHERE source = 'gmail'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
ORDER BY timestamp DESC
LIMIT 10
"

# Test clustered query
bq query "
SELECT decision_id, agent_id, outcome
FROM \`$(gcloud config get-value project).openclaw.decisions\`
WHERE agent_id = 'triage'
ORDER BY timestamp DESC
LIMIT 5
"

# Test views
bq query "SELECT * FROM \`$(gcloud config get-value project).openclaw.critical_actions\` LIMIT 5"
bq query "SELECT * FROM \`$(gcloud config get-value project).openclaw.decision_audit\` LIMIT 5"
```

## Deployment Checklist

- [ ] GCP project configured (`gcloud config get-value project` returns ID)
- [ ] bq CLI available (`which bq` shows path)
- [ ] BigQuery access verified (`bq ls` returns datasets)
- [ ] `bigquery_setup.sql` executed successfully
- [ ] Dataset `openclaw` created (`bq ls openclaw` shows tables)
- [ ] Tables have correct schema:
  - [ ] `events` table exists with 7 columns
  - [ ] `decisions` table exists with 10 columns
  - [ ] `observations` table exists with 9 columns
- [ ] Views created:
  - [ ] `critical_actions` view exists
  - [ ] `decision_audit` view exists
  - [ ] `valid_observations` view exists
  - [ ] `recent_events` view exists
- [ ] Test data inserted successfully
- [ ] Sample queries return results
- [ ] Environment variables set:
  - [ ] `GOOGLE_PROJECT_ID`
  - [ ] `PUBSUB_TOPIC`
  - [ ] `BQ_EVENTS_TABLE`
- [ ] External tables created (after Sheets ready):
  - [ ] `sheets_agent_log`
  - [ ] `sheets_tasks`
  - [ ] `sheets_contacts`
  - [ ] `sheets_config`

## Troubleshooting

### "bq: command not found"

Install Google Cloud SDK:
```bash
# macOS
brew install google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Then initialize
gcloud init
```

### "Access Denied" Error

Ensure service account has BigQuery Admin role:
```bash
gcloud projects get-iam-policy $(gcloud config get-value project) \
  --flatten="bindings[].members" \
  --filter="bindings.role:roles/bigquery.admin"
```

If missing, grant the role:
```bash
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
  --member=serviceAccount:YOUR_SERVICE_ACCOUNT@appspot.gserviceaccount.com \
  --role=roles/bigquery.admin
```

### "Table already exists" Error

Tables can be safely recreated - the SQL script uses `CREATE OR REPLACE TABLE`:
```bash
bq query --use_legacy_sql=false < bigquery_setup.sql
```

### External Table Sheet ID Not Found

Wait for sheets-builder to provide the Sheet ID, then:

1. Get the Sheet ID from the Google Sheet URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`
2. Update `bigquery_setup.py` with the SHEET_ID
3. Run `python3 bigquery_setup.py`

## After Deployment

Once deployment is complete:

1. **Verify Tables**: Run `bq ls -t openclaw`
2. **Check Schema**: Run `bq show openclaw.events`
3. **Monitor Costs**: BigQuery free tier covers:
   - 1 TB of queries/month
   - 100 GB of storage
   - Standard pricing beyond that

4. **Next Steps**:
   - Deploy Cloud Functions (gmail_ingester, event_router)
   - Set up Gmail webhook
   - Configure Pub/Sub topic `openclaw-events`
   - Monitor events landing in BigQuery

## Cloud Functions Integration

Once BigQuery is deployed, Cloud Functions can write to the events table:

```python
from google.cloud import bigquery
import json

bq = bigquery.Client()
project_id = "YOUR_PROJECT_ID"

event = {
    "event_id": "gmail-msg_xyz",
    "timestamp": "2026-02-07T18:45:32Z",
    "agent_id": None,
    "event_type": "webhook_received",
    "source": "gmail",
    "payload": json.dumps({
        "message_id": "msg_xyz",
        "from": "alice@company.com",
        "subject": "Q1 Budget Review - ASAP",
        # ... other fields
    }),
    "processed": False,
}

errors = bq.insert_rows_json(f"{project_id}.openclaw.events", [event])
if errors:
    print(f"Insert errors: {errors}")
else:
    print("Event inserted successfully")
```

## Performance Tuning

The tables are optimized with:

**Partitioning**: `DATE(timestamp)` - splits data by day
- Reduces query scope automatically
- Enables faster queries on recent data
- Reduces costs (only scans relevant partitions)

**Clustering**: By frequently-filtered columns
- `events`: `agent_id, event_type` (common filters)
- `decisions`: `agent_id` (agent decision queries)
- `observations`: `entity_type, entity_id` (entity lookups)

These optimizations mean queries like this are very fast:
```sql
SELECT * FROM openclaw.events
WHERE DATE(timestamp) = CURRENT_DATE()  -- Uses partition
  AND agent_id = 'triage'                -- Uses cluster
ORDER BY timestamp DESC;
```

## Support

For detailed information, see:
- [BIGQUERY_IMPLEMENTATION.md](BIGQUERY_IMPLEMENTATION.md) - Complete guide
- [BIGQUERY_QUICK_REFERENCE.md](BIGQUERY_QUICK_REFERENCE.md) - Quick lookup
- [README.md](README.md) - Overview

For BigQuery documentation: https://cloud.google.com/bigquery/docs

## Next: Coordinate with sheets-builder

Once this deployment is complete, ask sheets-builder for:
1. Google Sheet ID
2. Column order in each tab (to map external tables correctly)
3. Confirmation that tabs are ready

Then run Step 4 to create external tables.
