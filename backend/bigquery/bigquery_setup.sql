-- OpenClaw Phase 1: BigQuery Dataset & Tables Setup
-- This script creates the complete BigQuery infrastructure for the OpenClaw system
-- Run this in BigQuery console: bq query --use_legacy_sql=false < bigquery_setup.sql

-- ===========================================================================
-- 1. CREATE DATASET
-- ===========================================================================

CREATE SCHEMA IF NOT EXISTS `openclaw`
OPTIONS (
  description="OpenClaw event store and analytics",
  location="US"
);

-- ===========================================================================
-- 2. CREATE EVENTS TABLE
-- ===========================================================================

CREATE OR REPLACE TABLE `openclaw.events` (
  event_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  agent_id STRING,
  event_type STRING,
  source STRING,
  payload JSON,
  processed BOOL DEFAULT FALSE
)
PARTITION BY DATE(timestamp)
CLUSTER BY agent_id, event_type
OPTIONS (
  description="Raw, append-only event stream from all sources",
  require_partition_filter=FALSE,
  partition_expiration_days=90
);

-- ===========================================================================
-- 3. CREATE DECISIONS TABLE
-- ===========================================================================

CREATE OR REPLACE TABLE `openclaw.decisions` (
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
CLUSTER BY agent_id
OPTIONS (
  description="Log of every decision made by agents with reasoning"
);

-- ===========================================================================
-- 4. CREATE OBSERVATIONS TABLE
-- ===========================================================================

CREATE OR REPLACE TABLE `openclaw.observations` (
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
CLUSTER BY entity_type, entity_id
OPTIONS (
  description="Long-term pattern/anomaly detection data"
);

-- ===========================================================================
-- 5. CREATE NLP ENRICHMENT TABLE
-- ===========================================================================

CREATE OR REPLACE TABLE `openclaw.nlp_enrichment` (
  event_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  source STRING,
  entities JSON,
  sentiment_score FLOAT64,
  sentiment_magnitude FLOAT64,
  language STRING,
  raw_text STRING
)
PARTITION BY DATE(timestamp)
CLUSTER BY source
OPTIONS (
  description="Cloud Natural Language enrichment for events"
);

-- ===========================================================================
-- 6. CREATE VIEWS FOR COMMON QUERIES
-- ===========================================================================

-- Critical actions from past 24 hours
CREATE OR REPLACE VIEW `openclaw.critical_actions` AS
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

-- Decision audit trail with event context
CREATE OR REPLACE VIEW `openclaw.decision_audit` AS
SELECT
  d.timestamp,
  d.agent_id,
  d.decision_id,
  d.chosen_option,
  d.outcome,
  e.source,
  JSON_VALUE(e.payload, '$.summary') as trigger_summary
FROM `openclaw.decisions` d
LEFT JOIN `openclaw.events` e ON d.trigger_event_id = e.event_id
ORDER BY d.timestamp DESC;

-- Valid observations (not expired)
CREATE OR REPLACE VIEW `openclaw.valid_observations` AS
SELECT
  observation_id,
  timestamp,
  agent_id,
  entity_type,
  entity_id,
  observation_type,
  value,
  confidence,
  expires_at
FROM `openclaw.observations`
WHERE expires_at > CURRENT_TIMESTAMP()
ORDER BY timestamp DESC;

-- Recent events by source
CREATE OR REPLACE VIEW `openclaw.recent_events` AS
SELECT
  event_id,
  timestamp,
  source,
  event_type,
  agent_id,
  processed,
  JSON_VALUE(payload, '$.message_id') as message_id,
  JSON_VALUE(payload, '$.subject') as subject
FROM `openclaw.events`
WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
ORDER BY timestamp DESC;
