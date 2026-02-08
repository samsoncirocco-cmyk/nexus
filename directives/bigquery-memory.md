# Directive: BigQuery Memory (Data Lake Integration)

## Goal
Log events and query insights using the BigQuery-powered data lake

## When to Use
- Logging agent events for long-term storage and analysis
- Querying historical activity patterns
- Generating insights and reports from event data
- Tracking decisions, observations, and NLP enrichment

## Prerequisites
- Google Cloud project with BigQuery enabled
- BigQuery dataset `openclaw` created
- Environment variables configured
- `bq` CLI tool installed (optional, for manual queries)
- Backend proxy server running (`tools/bq-api-server.py`)

## Steps

### Architecture Overview

**Data Flow**:
```
Second Brain UI
    ↓
POST /api/datalake/events
    ↓
Backend Proxy (tools/bq-api-server.py)
    ↓
BigQuery Tables
    ├── events (raw event stream)
    ├── decisions (decision audit trail)
    ├── observations (patterns & anomalies)
    └── nlp_enrichment (NLP entities + sentiment)
```

**Why the proxy?**
- BigQuery client libraries are large (100+ MB)
- Vercel has 50 MB serverless limit
- Proxy runs separately, handles BigQuery communication

### Backend Proxy Setup

**Location**: `tools/bq-api-server.py`

**Start the proxy**:
```bash
cd /home/samson/.openclaw/workspace/tools
python3 bq-api-server.py

# Runs on port 8899 by default
```

**Environment Variables**:
```bash
export GOOGLE_PROJECT_ID=your-project-id
export BQ_EVENTS_TABLE=your-project-id.openclaw.events
export BQ_DECISIONS_TABLE=your-project-id.openclaw.decisions
export BQ_OBSERVATIONS_TABLE=your-project-id.openclaw.observations
export BQ_NLP_TABLE=your-project-id.openclaw.nlp_enrichment
```

**Health Check**:
```bash
curl http://localhost:8899/health
```

### Logging an Event

**POST /api/datalake/events**:
```bash
curl -X POST http://localhost:3000/api/datalake/events \
  -H "Content-Type: application/json" \
  -d '{
    "source": "second-brain",
    "event_type": "task_complete",
    "agent_id": "claude-researcher",
    "payload": {
      "task": "Research OHSU network requirements",
      "result": "Completed successfully",
      "duration_ms": 120000
    },
    "session_id": "agent:main:subagent:abc123"
  }'
```

**Event Schema**:
```typescript
{
  event_id: string,         // Auto-generated UUID
  timestamp: timestamp,     // Auto-set to NOW()
  source: string,           // e.g., "second-brain", "gmail", "calendar"
  event_type: string,       // e.g., "task_complete", "research", "email_sent"
  agent_id: string,         // Agent identifier
  session_id?: string,      // Optional session ID
  payload: object,          // Arbitrary JSON data
  user_id?: string,         // Optional user ID
  metadata?: object         // Optional metadata
}
```

**Response**:
```json
{
  "success": true,
  "event_id": "abc123-def456-ghi789",
  "table": "openclaw.events"
}
```

### Logging a Decision

**POST /api/datalake/decisions** (future endpoint):
```bash
curl -X POST http://localhost:8899/decisions \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "claude-researcher",
    "decision_type": "task_prioritization",
    "context": {
      "available_tasks": ["research_ohsu", "draft_proposal"],
      "deadline_pressure": "high"
    },
    "decision": {
      "chosen_task": "draft_proposal",
      "reasoning": "Proposal due tomorrow, research can wait"
    },
    "outcome": "success",
    "confidence": 0.85
  }'
```

**Decision Schema**:
```typescript
{
  decision_id: string,      // Auto-generated UUID
  timestamp: timestamp,     // Auto-set
  agent_id: string,
  decision_type: string,    // e.g., "task_prioritization", "model_selection"
  context: object,          // Input context
  decision: object,         // What was decided
  outcome?: string,         // "success", "failure", "pending"
  confidence?: float,       // 0.0 to 1.0
  metadata?: object
}
```

### Querying Events

**GET /api/datalake/events** — Recent events:
```bash
curl "http://localhost:3000/api/datalake/events?limit=10&source=second-brain"
```

**Query Parameters**:
- `limit` (optional) — Max results (default: 100)
- `source` (optional) — Filter by source
- `event_type` (optional) — Filter by event type
- `agent_id` (optional) — Filter by agent
- `start_date` (optional) — ISO timestamp for range start
- `end_date` (optional) — ISO timestamp for range end

**Response**:
```json
{
  "events": [
    {
      "event_id": "abc123",
      "timestamp": "2026-02-08T00:00:00.000Z",
      "source": "second-brain",
      "event_type": "task_complete",
      "agent_id": "claude-researcher",
      "payload": { ... }
    }
  ],
  "count": 10
}
```

### Querying Insights

**GET /api/datalake/insights** — Aggregated analytics:
```bash
curl http://localhost:3000/api/datalake/insights
```

**Response**:
```json
{
  "total_events": 1250,
  "events_by_type": {
    "task_complete": 450,
    "research": 300,
    "email_sent": 200,
    "deploy": 50
  },
  "events_by_agent": {
    "claude-researcher": 600,
    "claude-writer": 400,
    "claude-analyst": 250
  },
  "events_last_24h": 45,
  "events_last_7d": 320
}
```

### BigQuery Table Schemas

**events Table**:
```sql
CREATE TABLE openclaw.events (
  event_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  source STRING NOT NULL,
  event_type STRING NOT NULL,
  agent_id STRING,
  session_id STRING,
  payload JSON,
  user_id STRING,
  metadata JSON
)
PARTITION BY DATE(timestamp)
CLUSTER BY agent_id, event_type;
```

**decisions Table**:
```sql
CREATE TABLE openclaw.decisions (
  decision_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  agent_id STRING NOT NULL,
  decision_type STRING NOT NULL,
  context JSON,
  decision JSON,
  outcome STRING,
  confidence FLOAT64,
  metadata JSON
)
PARTITION BY DATE(timestamp)
CLUSTER BY agent_id;
```

**observations Table**:
```sql
CREATE TABLE openclaw.observations (
  observation_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  entity_type STRING NOT NULL,
  entity_id STRING NOT NULL,
  observation_type STRING NOT NULL,
  value JSON,
  confidence FLOAT64,
  expires_at TIMESTAMP,
  metadata JSON
)
PARTITION BY DATE(timestamp)
CLUSTER BY entity_type, entity_id;
```

### Running Manual Queries

**Using bq CLI**:
```bash
# Recent events
bq query --use_legacy_sql=false \
  "SELECT * FROM openclaw.events
   WHERE source = 'second-brain'
     AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
   ORDER BY timestamp DESC
   LIMIT 10"

# Events by type
bq query --use_legacy_sql=false \
  "SELECT event_type, COUNT(*) as count
   FROM openclaw.events
   WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
   GROUP BY event_type
   ORDER BY count DESC"

# Agent activity
bq query --use_legacy_sql=false \
  "SELECT agent_id, event_type, COUNT(*) as count
   FROM openclaw.events
   WHERE agent_id IS NOT NULL
   GROUP BY agent_id, event_type
   ORDER BY count DESC"
```

### Integrating with Second Brain

**Log activity feed events to BigQuery**:
```typescript
// In src/app/api/activity/route.ts
async function logToBigQuery(activity) {
  await fetch('http://localhost:8899/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: 'second-brain',
      event_type: activity.type,
      agent_id: activity.metadata?.agent,
      payload: {
        title: activity.title,
        description: activity.description,
        metadata: activity.metadata
      }
    })
  });
}
```

**Log agent spawns**:
```typescript
// In gateway bridge
await fetch('http://localhost:8899/events', {
  method: 'POST',
  body: JSON.stringify({
    source: 'gateway',
    event_type: 'agent_spawn',
    agent_id: agentId,
    session_id: sessionId,
    payload: {
      message: taskMessage,
      model: agentModel
    }
  })
});
```

**Log task completions**:
```typescript
// In task API
await fetch('http://localhost:8899/events', {
  method: 'POST',
  body: JSON.stringify({
    source: 'tasks',
    event_type: 'task_status_change',
    payload: {
      task_id: task.id,
      old_status: oldStatus,
      new_status: newStatus,
      task_title: task.title
    }
  })
});
```

## Expected Output

### Successful Event Log
```json
{
  "success": true,
  "event_id": "f3a2b1c4-d5e6-7890-abcd-ef1234567890",
  "table": "openclaw.events",
  "timestamp": "2026-02-08T00:00:00.000Z"
}
```

### Query Results
```json
{
  "events": [
    {
      "event_id": "abc123",
      "timestamp": "2026-02-08T00:00:00.000Z",
      "source": "second-brain",
      "event_type": "task_complete",
      "agent_id": "claude-researcher",
      "payload": {
        "task": "Research OHSU",
        "result": "Completed",
        "duration_ms": 120000
      }
    }
  ],
  "count": 1
}
```

### Analytics Dashboard (Future)
```
BigQuery Insights

Total Events: 1,250
Events (Last 24h): 45
Events (Last 7d): 320

Top Event Types:
1. task_complete: 450
2. research: 300
3. email_sent: 200

Most Active Agents:
1. claude-researcher: 600
2. claude-writer: 400
3. claude-analyst: 250
```

## Edge Cases

### Backend Proxy Not Running
**Problem**: API calls to `/api/datalake/*` fail

**Error**:
```json
{
  "error": "BigQuery proxy unreachable",
  "details": "ECONNREFUSED localhost:8899"
}
```

**Solution**:
```bash
cd tools
python3 bq-api-server.py
```

### BigQuery Quota Exceeded
**Problem**: Hitting free tier limits

**Free Tier**:
- 10 GB storage (free)
- 1 TB queries/month (free)
- Streaming: $0.01 per 200 MB

**Solution**:
- Optimize queries (use partitioning/clustering)
- Archive old data
- Upgrade to paid tier if needed

### Large Payload Size
**Problem**: Payload >10 MB (BigQuery limit)

**Validation**:
```typescript
const payloadSize = JSON.stringify(payload).length;
const MAX_SIZE = 10 * 1024 * 1024;  // 10 MB

if (payloadSize > MAX_SIZE) {
  return { error: 'Payload too large', max: '10 MB' };
}
```

### Duplicate Events
**Problem**: Same event logged multiple times

**Solution**: Use deterministic event IDs
```typescript
import crypto from 'crypto';

const eventHash = crypto
  .createHash('sha256')
  .update(JSON.stringify({ source, event_type, timestamp, payload }))
  .digest('hex');

const event_id = eventHash.slice(0, 32);
```

Then use `MERGE` instead of `INSERT` in BigQuery.

### Time Zone Issues
**Problem**: Timestamps in wrong time zone

**Solution**: Always use UTC
```typescript
timestamp: new Date().toISOString()  // "2026-02-08T00:00:00.000Z"
```

BigQuery stores as UTC, convert to local time in UI.

### Query Timeout
**Problem**: Complex query takes >60s

**Solution**:
- Simplify query (use views/materialized tables)
- Increase proxy timeout
- Use BigQuery job ID for async queries

### Schema Evolution
**Problem**: Need to add new fields to events

**Solution**: BigQuery supports schema evolution
```bash
bq update openclaw.events \
  --schema=schema.json
```

JSON fields are schema-less, so new payload fields work automatically.

## Cost
- **BigQuery Storage**: Free (<10 GB)
- **BigQuery Queries**: Free (<1 TB/month)
- **Streaming Inserts**: ~$0.01 per 200 MB (~$0.50/day for 10K events)
- **Proxy Server**: Free (self-hosted)

**Monthly Estimate** (10K events/day):
- Storage: Free
- Queries: Free (assuming <1 TB)
- Streaming: ~$15/month

---

**Related Directives**:
- `activity-feed.md` — Log activity to both vault and BigQuery
- `agent-monitoring.md` — Track agent metrics
- `task-management.md` — Log task lifecycle events
