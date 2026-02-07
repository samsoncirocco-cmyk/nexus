# 01-ARCHITECTURE.md: Google Data Lake Architecture Overview

## Vision

Transform OpenClaw from a stateless chatbot into an omniscient, auditable AI system where:
- **Every decision is logged** to BigQuery (immutable audit trail)
- **All state lives in Google** (Sheets for humans, BigQuery for queries)
- **Agents coordinate through shared data** (not peer-to-peer)
- **Full traceability** ("why did you do that?" is always answerable)
- **Real-time ingestion** from Gmail, Calendar, Drive

## Data Architecture

```
SOURCES → NORMALIZE → EVENT BUS → STORAGE → AGENTS → SINKS
  ↓                     ↓            ↓        ↓        ↓
Gmail                Cloud Fn    Pub/Sub   Sheets   Gmail
Calendar              (ingest)    (queue)  BigQuery Calendar
Drive                                      Drive    Drive
Manual input                                        Sheets
```

### Layers

1. **Ingestion Layer**
   - Gmail webhook → Cloud Function (normalize)
   - Calendar push notification → Cloud Function
   - Drive watch → Cloud Function (polling fallback)
   - Manual input via Sheets forms

2. **Event Bus (Pub/Sub)**
   - Topic: `openclaw-events`
   - Messages: JSON events from all sources
   - Subscribers: event-router, analytics, archival

3. **Storage Layer**
   - **Google Sheets**: Human-readable, editable operational state
     - `agent_log`: What agents did
     - `tasks`: To-do board
     - `contacts`: People data
     - `config`: Agent configuration
   - **BigQuery**: Immutable, queryable analytics
     - `events`: Raw event stream (append-only)
     - `decisions`: Agent decision records with reasoning
     - `observations`: Pattern/anomaly detection data

4. **Agent Layer**
   - Stateless workers
   - Read context from Google (Sheets + BigQuery)
   - Make decisions
   - Write state back to Google
   - Never talk to each other directly (coordinate via data lake)

5. **Sink Layer**
   - Gmail (send replies, apply labels)
   - Calendar (create/update events)
   - Sheets (update task status)
   - Drive (upload documents, reports)
   - External APIs

## Key Design Decisions

### Why Sheets + BigQuery (not just one)?
- **Sheets**: Live dashboard, human editable, shareable, mobile-friendly
- **BigQuery**: Append-only audit trail, SQL queryable, aggregations, anomaly detection

### Why Pub/Sub?
- Decouples ingesters from processors
- Built-in retry, deduplication, backpressure
- Easy to add new subscribers (Slack notifier, logging, etc.)

### Why append-only BigQuery?
- Immutable history
- Can reconstruct any past state
- Full audit trail
- Efficient partitioning and clustering

### Why no agent-to-agent messaging?
- Makes state invisible/unqueryable
- Breaks "single source of truth"
- Hard to debug
- Shared state lake means every interaction is observable

## Cost Estimate

For personal use (1 user, ~100 emails/day):

| Service | Cost |
|---------|------|
| BigQuery (< 1 TB/month) | Free tier |
| Cloud Functions (< 2M invocations) | Free tier |
| Pub/Sub (< 10 GB/month) | Free tier |
| Cloud Tasks (< 100k tasks/month) | Free tier |
| Google Workspace | $0 incremental |
| **Total** | **~$0-5/month** |

Runs almost entirely on Google Cloud free tier for personal-scale usage.

## Success Criteria

Phase 1 is complete when:
- ✅ Gmail webhook fires and data lands in BigQuery within 10 seconds
- ✅ New rows appear in Sheets `agent_log` automatically
- ✅ BigQuery queries work on `openclaw.events`
- ✅ You can manually update a task in Sheets and it syncs to BigQuery
- ✅ Config changes in Sheets are readable by agents

## Next Steps

1. **Phase 1 (Foundation)**: Get data flowing into Google
2. **Phase 2 (First Agent)**: Build triage agent using the data lake
3. **Phase 3 (Multi-Agent)**: Multiple agents coordinating
4. **Phase 4 (Intelligence)**: Long-term memory, anomaly detection, audit queries
