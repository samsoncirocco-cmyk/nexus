# OpenClaw Phase 1: BigQuery Infrastructure

Complete BigQuery setup for the OpenClaw data lake system.

## Quick Start

```bash
# 1. Create dataset and tables
bq query --use_legacy_sql=false < bigquery_setup.sql

# 2. Create external tables and test data (requires Python)
python3 bigquery_setup.py

# 3. Verify installation
bq ls -t openclaw
```

## Documentation Index

### Setup & Implementation
- **[BIGQUERY_IMPLEMENTATION.md](BIGQUERY_IMPLEMENTATION.md)** - Complete 400-line guide covering:
  - Architecture overview and data flow
  - Step-by-step setup instructions
  - Table schemas with examples
  - External table usage (Google Sheets integration)
  - Query patterns and best practices
  - Performance optimization
  - Troubleshooting guide
  - Cost estimates

- **[BIGQUERY_QUICK_REFERENCE.md](BIGQUERY_QUICK_REFERENCE.md)** - Quick lookup for:
  - Common SQL queries
  - Table summaries
  - View shortcuts
  - Environment variables
  - Troubleshooting tips

- **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - Delivery summary including:
  - Deliverables overview
  - Technical specifications
  - Integration points
  - Verification checklist
  - Next steps

### Scripts

- **[bigquery_setup.sql](bigquery_setup.sql)** (250 lines)
  - Dataset creation
  - Tables with partitioning & clustering
  - 4 helper views
  - Run: `bq query --use_legacy_sql=false < bigquery_setup.sql`

- **[bigquery_setup.py](bigquery_setup.py)** (180 lines)
  - Create external tables (Sheets integration)
  - Insert test data
  - Run verification queries
  - Run: `python3 bigquery_setup.py`

- **[bigquery_test_data.sql](bigquery_test_data.sql)** (220 lines)
  - 4 sample events with realistic payloads
  - 3 sample decisions with outcomes
  - 4 sample observations with TTL
  - Verification queries for each table
  - Run: `bq query --use_legacy_sql=false < bigquery_test_data.sql`

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
Google Sheets + BigQuery Tables
```

## Core Tables

| Table | Purpose | Partitioning | Clustering | Retention |
|-------|---------|--------------|-----------|-----------|
| **events** | Raw event stream | DATE(timestamp) | agent_id, event_type | 90 days |
| **decisions** | Decision audit trail | DATE(timestamp) | agent_id | Unlimited |
| **observations** | Patterns & anomalies | DATE(timestamp) | entity_type, entity_id | Via expires_at |
| **nlp_enrichment** | NLP entities + sentiment | DATE(timestamp) | source | Same as events |

## Quick Reference

### Create Everything
```bash
bq query --use_legacy_sql=false < bigquery_setup.sql
python3 bigquery_setup.py
```

### Check Setup
```bash
bq ls -t openclaw
bq show openclaw.events
```

### Insert Test Data
```bash
bq query --use_legacy_sql=false < bigquery_test_data.sql
```

### Query Examples
```sql
-- Recent events
SELECT * FROM openclaw.events
WHERE source = 'gmail'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
LIMIT 10;

-- Decision outcomes
SELECT agent_id, outcome, COUNT(*) as count
FROM openclaw.decisions
WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY agent_id, outcome;

-- Current observations
SELECT * FROM openclaw.valid_observations
WHERE entity_type = 'person'
ORDER BY confidence DESC;
```

## Configuration

```bash
# Set in .env
export GOOGLE_PROJECT_ID=your-project-id
export GOOGLE_SHEET_ID=your-sheet-id
export PUBSUB_TOPIC=projects/your-project-id/topics/openclaw-events
export BQ_EVENTS_TABLE=your-project-id.openclaw.events
export BQ_NLP_TABLE=your-project-id.openclaw.nlp_enrichment
```

## Cost Estimate

- **Storage**: Free (< 100 GB)
- **Queries**: Free (< 1 TB/month)
- **Streaming**: $7/100M rows (~$0.50/day)
- **Total**: ~$0-5/month

## Next Steps

1. ✅ BigQuery tables created
2. ⏳ Deploy Cloud Functions
3. ⏳ Set up Gmail webhook
4. ⏳ Build agents

## Support

- Detailed guide: [BIGQUERY_IMPLEMENTATION.md](BIGQUERY_IMPLEMENTATION.md)
- Quick lookup: [BIGQUERY_QUICK_REFERENCE.md](BIGQUERY_QUICK_REFERENCE.md)
- Full delivery: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)

---

**Status**: ✅ Complete | **Phase**: 1 | **Date**: 2026-02-07
