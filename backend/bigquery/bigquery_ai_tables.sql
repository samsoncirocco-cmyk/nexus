-- OpenClaw Phase 2: AI Analysis Tables
-- Stores Vertex AI Gemini analysis results linked to events
-- Run: bq query --use_legacy_sql=false < bigquery_ai_tables.sql

-- ===========================================================================
-- 1. AI ANALYSIS TABLE
-- ===========================================================================

CREATE OR REPLACE TABLE `openclaw.ai_analysis` (
  analysis_id STRING NOT NULL,
  event_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  agent_id STRING,
  model_id STRING,
  analysis_type STRING,
  prompt_hash STRING,
  input_summary STRING,
  output_raw STRING,
  output_structured JSON,
  confidence FLOAT64,
  token_count_input INT64,
  token_count_output INT64,
  latency_ms INT64,
  error STRING
)
PARTITION BY DATE(timestamp)
CLUSTER BY analysis_type, agent_id
OPTIONS (
  description="Vertex AI Gemini analysis results for events"
);

-- ===========================================================================
-- 2. AI DECISIONS TABLE (extends existing decisions with AI reasoning)
-- ===========================================================================

CREATE OR REPLACE TABLE `openclaw.ai_decisions` (
  decision_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  agent_id STRING,
  trigger_event_id STRING,
  analysis_id STRING,
  decision_type STRING,
  input_context JSON,
  reasoning STRING,
  chosen_action STRING,
  alternatives JSON,
  confidence FLOAT64,
  executed BOOL DEFAULT FALSE,
  execution_result STRING,
  execution_timestamp TIMESTAMP
)
PARTITION BY DATE(timestamp)
CLUSTER BY agent_id, decision_type
OPTIONS (
  description="AI-powered decisions with full reasoning chain"
);

-- ===========================================================================
-- 3. VIEWS
-- ===========================================================================

-- Recent AI analyses with event context
CREATE OR REPLACE VIEW `openclaw.recent_ai_analysis` AS
SELECT
  a.analysis_id,
  a.timestamp,
  a.agent_id,
  a.analysis_type,
  a.model_id,
  a.confidence,
  a.input_summary,
  a.latency_ms,
  e.source,
  e.event_type,
  JSON_VALUE(e.payload, '$.subject') as event_subject
FROM `openclaw.ai_analysis` a
LEFT JOIN `openclaw.events` e ON a.event_id = e.event_id
WHERE a.timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
ORDER BY a.timestamp DESC;

-- AI decision audit trail
CREATE OR REPLACE VIEW `openclaw.ai_decision_audit` AS
SELECT
  d.decision_id,
  d.timestamp,
  d.agent_id,
  d.decision_type,
  d.reasoning,
  d.chosen_action,
  d.confidence,
  d.executed,
  d.execution_result,
  a.analysis_type,
  a.model_id,
  e.source as trigger_source
FROM `openclaw.ai_decisions` d
LEFT JOIN `openclaw.ai_analysis` a ON d.analysis_id = a.analysis_id
LEFT JOIN `openclaw.events` e ON d.trigger_event_id = e.event_id
ORDER BY d.timestamp DESC;
