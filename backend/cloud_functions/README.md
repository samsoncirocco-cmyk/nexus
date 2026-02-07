# OpenClaw Cloud Functions

This directory contains all Cloud Functions for the OpenClaw Phase 1 event pipeline.

## Architecture Overview

```
Gmail Webhook (via API)
    ↓
[gmail_ingester] → Pub/Sub topic: openclaw-events
    ↓
[event_router] → Routes to:
    ├→ BigQuery events table
    ├→ agent_log Sheet
    └→ Cloud Tasks (trigger agents)
    ↓
[sample_triage_agent] → Processes event, creates task
    ↓
BigQuery + Sheets updated
```

## Functions

### 1. gmail_ingester

**File**: `gmail_ingester/main.py`

**Trigger**: HTTP (CloudFunctions runtime call)

**Responsibilities**:
- Receive Gmail push notifications via webhook
- Fetch full message metadata from Gmail API
- Normalize to standard event format
- Publish to Pub/Sub topic `openclaw-events`
- Write to BigQuery `events` table (for durability)

**Environment Variables**:
- `PROJECT_ID` or `GOOGLE_PROJECT_ID`: GCP project ID
- `PUBSUB_TOPIC`: Full topic path (default: `projects/{PROJECT_ID}/topics/openclaw-events`)
- `BQ_EVENTS_TABLE`: BigQuery table (default: `{PROJECT_ID}.openclaw.events`)

**Event Format** (published to Pub/Sub):
```json
{
  "event_id": "gmail-msg_abc123",
  "timestamp": "2026-02-07T18:45:32Z",
  "agent_id": null,
  "event_type": "webhook_received",
  "source": "gmail",
  "payload": "{\"message_id\": \"msg_abc123\", \"from\": \"alice@company.com\", \"subject\": \"...\", ...}",
  "processed": false
}
```

### 2. event_router

**File**: `event_router/main.py`

**Trigger**: Pub/Sub (topic: `openclaw-events`)

**Responsibilities**:
- Consume events from Pub/Sub
- Route to appropriate downstream handlers based on event type
- Write to BigQuery `events` table (idempotent)
- Enrich text payloads using Cloud Natural Language (entities + sentiment)
- Write NLP results to BigQuery `nlp_enrichment` table
- Log routing decision to Sheets `agent_log`
- Create Cloud Task to invoke relevant agent

**Environment Variables**:
- `PROJECT_ID` or `GOOGLE_PROJECT_ID`: GCP project ID
- `GOOGLE_SHEET_ID` or `SHEET_ID`: Google Sheet ID for logging
- `TASKS_REGION`: Cloud Tasks region (default: `us-central1`)
- `TASKS_QUEUE`: Cloud Tasks queue name (default: `openclaw-agents`)
- `BQ_NLP_TABLE`: BigQuery NLP table (default: `{PROJECT_ID}.openclaw.nlp_enrichment`)

**Routing Rules**:
- Gmail webhook → Trigger `triage` agent
- Future: Calendar events → Trigger `scheduler` agent
- Future: Drive changes → Trigger `researcher` agent

**NLP Enrichment**:
- Extracts text from payload fields (subject/snippet/body when present)
- Runs Cloud Natural Language (entities + sentiment)
- Stores results in `openclaw.nlp_enrichment`
- Output includes language, entities, sentiment score/magnitude, and source
- If text is missing or NLP fails, routing continues without blocking
- Requires the Cloud Natural Language API to be enabled in the project

### 3. sample_triage_agent

**File**: `sample_triage_agent/main.py`

**Trigger**: Cloud Tasks (HTTP POST)

**Responsibilities**:
- Receive event from event_router
- Read context from BigQuery + Sheets (using AgentContextBuilder)
- Analyze email: urgency signals, sender importance, current workload
- Decide: should we create a task?
- Act: create task in Sheets if needed
- Log decision to BigQuery + Sheets (using AgentStateWriter)

**Decision Logic**:
- `create_task = True` if:
  - Email contains urgency keywords (ASAP, urgent, critical, etc.)
  - OR sender has priority_score > 0.8
- `priority = P0` if urgent, else `P1` if high-priority contact, else `P2`
- `due_date = 1 day` if urgent, else `2-3 days`

**Output** (writes to data lake):
- Creates task in Sheets `tasks` tab
- Appends action to Sheets `agent_log` tab
- Inserts event to BigQuery `events` table

## Deployment

See [DEPLOYMENT.md](../DEPLOYMENT.md) for step-by-step deployment instructions.

Quick deploy:
```bash
export PROJECT_ID="your-project"
export REGION="us-central1"
export SHEET_ID="your-sheet-id"

# Deploy functions
gcloud functions deploy gmail_webhook \
  --runtime python311 \
  --trigger-http \
  --entry-point gmail_webhook \
  --source ./gmail_ingester \
  --region=$REGION \
  --set-env-vars PROJECT_ID=$PROJECT_ID

# (see DEPLOYMENT.md for complete commands)
```

## Testing

### Test Event Format

Publish a test message to the Pub/Sub topic:

```bash
gcloud pubsub topics publish openclaw-events \
  --message '{
    "event_id": "test-email-001",
    "timestamp": "2026-02-07T18:45:32Z",
    "agent_id": null,
    "event_type": "webhook_received",
    "source": "gmail",
    "payload": "{\"message_id\": \"test\", \"from\": \"test@example.com\", \"subject\": \"Test Email - ASAP\", \"snippet\": \"This is a test\", \"thread_id\": \"thread_test\", \"labels\": [\"INBOX\"], \"date\": \"2026-02-07T18:45:30Z\"}",
    "processed": false
  }' \
  --project=$PROJECT_ID
```

### Check Logs

```bash
# Event router logs
gcloud functions logs read event_router --region=$REGION --limit 50

# Triage agent logs
gcloud functions logs read agent-triage --region=$REGION --limit 50

# Stream logs in real-time
gcloud functions logs read event_router --region=$REGION --follow
```

### Query BigQuery

```bash
# Recent events
bq query --use_legacy_sql=false \
  'SELECT event_id, timestamp, source, event_type FROM `'$PROJECT_ID'.openclaw.events` ORDER BY timestamp DESC LIMIT 10'

# Events by source
bq query --use_legacy_sql=false \
  'SELECT source, COUNT(*) as count FROM `'$PROJECT_ID'.openclaw.events` GROUP BY source'
```

## Monitoring

### Set up Cloud Logging Alerts

Monitor for errors:

```bash
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="OpenClaw Function Errors" \
  --condition-display-name="Function error rate > 5%" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=300s \
  --resource-type=cloud_function
```

### Manual Monitoring

Check function status:

```bash
# List all functions
gcloud functions list --region=$REGION

# Get function details
gcloud functions describe gmail_webhook --region=$REGION

# Recent executions
gcloud functions logs read gmail_webhook --region=$REGION --limit 20
```

## Error Handling

Each function logs errors but does NOT stop the pipeline:

- **gmail_ingester**: Logs to Cloud Logging, returns 500 but tries to write to BigQuery anyway
- **event_router**: Logs to Cloud Logging, continues processing other routes even if one fails
- **agent functions**: Log to Cloud Logging, write to BigQuery, but don't fail the Pub/Sub message

This ensures:
1. All errors are visible in Cloud Logging
2. Messages aren't lost due to downstream failures
3. Pipeline is resilient to temporary API errors

## Extending with New Agents

To add a new agent:

1. Create new directory in `cloud_functions/`:
   ```bash
   mkdir cloud_functions/new_agent
   ```

2. Create `main.py` with entry point function:
   ```python
   def agent_handler(request):
       # Read event
       event = request.get_json()

       # Use AgentContextBuilder to read state
       context = AgentContextBuilder(PROJECT_ID, SHEET_ID)

       # Make decision
       decision = ...

       # Use AgentStateWriter to persist
       state = AgentStateWriter(PROJECT_ID, SHEET_ID)
       state.log_action(...)

       return "OK", 200
   ```

3. Add routing rule in `event_router/main.py`:
   ```python
   if source == "calendar" and event_type == "webhook_received":
       trigger_agent("scheduler", data)
   ```

4. Deploy new agent Cloud Function with same pattern as others

## Cost Estimation

For personal use (1 user, ~100 emails/day, <500 Cloud Function invocations/day):

| Service | Usage | Cost |
|---------|-------|------|
| Cloud Functions | ~1.5k invocations/month | Free tier (2M/month) |
| Pub/Sub | ~3 GB/month | Free tier (10 GB/month) |
| BigQuery | ~50 GB/month | Free tier (1 TB/month) |
| Cloud Tasks | ~100/month | Free tier (100k/month) |
| Gmail API | Included with Workspace | $0 |
| **Total** | | **~$0** |

All runs on GCP free tier for personal-scale usage.

## Security Notes

- Cloud Functions run as default Compute Engine service account
- Service account needs roles:
  - `roles/pubsub.publisher` (publish to Pub/Sub)
  - `roles/bigquery.dataEditor` (write to BigQuery)
  - `roles/sheets.editor` (write to Sheets)
  - `roles/cloudtasks.taskCreator` (create Cloud Tasks)
  - `roles/gmail.readonly` (read Gmail metadata)
  - `roles/cloudlanguage.user` (Cloud Natural Language API)

- Credentials are obtained via Application Default Credentials (ADC)
- No API keys or secrets hardcoded
- All data in transit is encrypted via Google Cloud APIs

## Future Enhancements

- [ ] Add Circuit breaker for downstream service failures
- [ ] Implement idempotency keys for Cloud Functions
- [ ] Add metrics/observability (Cloud Trace, Cloud Profiler)
- [ ] Add dead-letter queue for failed events
- [ ] Implement rate limiting per sender
- [ ] Add support for other event sources (Calendar, Drive)
