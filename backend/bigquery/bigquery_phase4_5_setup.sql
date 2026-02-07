-- OpenClaw Phase 4 + 5: Omnimodal Senses + Predictive Intelligence
-- Creates BigQuery tables + views for:
--   - Speech transcription enrichment
--   - Geo enrichment (Maps/Places)
--   - Predictive intelligence outputs
--   - Auto-organization tagging
--   - Semantic search query analytics
--
-- Run:
--   bq query --use_legacy_sql=false < execution/bigquery_phase4_5_setup.sql
--
-- Notes:
-- - Uses dataset `openclaw` created by execution/bigquery_setup.sql
-- - Idempotent: safe to re-run (CREATE OR REPLACE)
--
-- ===========================================================================
-- 1. SPEECH ENRICHMENT TABLE (Speech-to-Text)
-- ===========================================================================

CREATE OR REPLACE TABLE `openclaw.speech_enrichment` (
  transcription_id STRING NOT NULL,
  file_id STRING,
  event_id STRING,
  timestamp TIMESTAMP NOT NULL,
  transcript STRING,
  confidence FLOAT64,
  language_code STRING,
  word_timestamps JSON,
  duration_seconds FLOAT64,
  source STRING
)
PARTITION BY DATE(timestamp)
CLUSTER BY source, file_id
OPTIONS (
  description="Speech-to-Text enrichment (transcripts + optional word timings)"
);

-- ===========================================================================
-- 2. GEO ENRICHMENT TABLE (Maps/Places)
-- ===========================================================================

CREATE OR REPLACE TABLE `openclaw.geo_enrichment` (
  geo_id STRING NOT NULL,
  event_id STRING,
  file_id STRING,
  timestamp TIMESTAMP NOT NULL,
  source STRING,
  raw_location STRING,
  formatted_address STRING,
  lat FLOAT64,
  lng FLOAT64,
  place_id STRING,
  place_name STRING,
  place_types JSON,
  place_rating FLOAT64,
  metadata JSON
)
PARTITION BY DATE(timestamp)
CLUSTER BY source, place_id
OPTIONS (
  description="Geocoding + Places enrichment for events/files (address, coordinates, place context)"
);

-- ===========================================================================
-- 3. PREDICTIONS TABLE (Phase 5 outputs)
-- ===========================================================================

CREATE OR REPLACE TABLE `openclaw.predictions` (
  prediction_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  agent_id STRING,
  prediction_type STRING,
  target_date DATE,
  target_entity STRING,
  prediction_value JSON,
  confidence FLOAT64,
  expires_at TIMESTAMP,
  outcome JSON
)
PARTITION BY DATE(timestamp)
CLUSTER BY prediction_type, target_entity
OPTIONS (
  description="Forward-looking predictions produced by predictive agents (busy-week, topic trends, comm spikes)"
);

-- ===========================================================================
-- 4. EVENT TAGS TABLE (Auto-organization)
-- ===========================================================================

CREATE OR REPLACE TABLE `openclaw.event_tags` (
  tag_id STRING NOT NULL,
  event_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  tag_type STRING,
  tag_value STRING,
  cluster_id STRING,
  confidence FLOAT64,
  source STRING
)
PARTITION BY DATE(timestamp)
CLUSTER BY tag_type, tag_value
OPTIONS (
  description="Auto-generated tags for events (clusters, projects, topics)"
);

-- ===========================================================================
-- 5. SEARCH QUERIES TABLE (Semantic search analytics)
-- ===========================================================================

CREATE OR REPLACE TABLE `openclaw.search_queries` (
  query_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  raw_query STRING,
  parsed_date_range JSON,
  parsed_source STRING,
  result_count INT64,
  top_similarity FLOAT64,
  latency_ms INT64
)
PARTITION BY DATE(timestamp)
OPTIONS (
  description="Audit and analytics for semantic search queries"
);

-- ===========================================================================
-- 6. VIEWS
-- ===========================================================================

-- Entities that show up across 2+ sources in the recent window.
CREATE OR REPLACE VIEW `openclaw.v_cross_source_entities` AS
WITH recent AS (
  SELECT
    source,
    JSON_QUERY_ARRAY(entities) AS entities_arr
  FROM `openclaw.nlp_enrichment`
  WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
),
flattened AS (
  SELECT
    source,
    JSON_VALUE(entity_json, '$.name') AS entity_name,
    JSON_VALUE(entity_json, '$.type') AS entity_type,
    SAFE_CAST(JSON_VALUE(entity_json, '$.salience') AS FLOAT64) AS salience
  FROM recent,
  UNNEST(entities_arr) AS entity_json
  WHERE JSON_VALUE(entity_json, '$.name') IS NOT NULL
)
SELECT
  entity_name,
  ANY_VALUE(entity_type) AS entity_type,
  COUNT(DISTINCT source) AS source_count,
  ARRAY_AGG(DISTINCT source ORDER BY source) AS sources,
  AVG(salience) AS avg_salience,
  COUNT(*) AS mention_count
FROM flattened
GROUP BY entity_name
HAVING COUNT(DISTINCT source) >= 2
ORDER BY source_count DESC, mention_count DESC;

-- Upcoming week predictions (busy-week) for quick dashboarding.
CREATE OR REPLACE VIEW `openclaw.v_weekly_predictions` AS
SELECT
  prediction_id,
  timestamp,
  agent_id,
  prediction_type,
  target_date,
  target_entity,
  prediction_value,
  confidence,
  expires_at
FROM `openclaw.predictions`
WHERE prediction_type = 'busy_week'
  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP())
  AND target_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 7 DAY)
ORDER BY target_date ASC, confidence DESC;

-- Events joined with their most recent tags.
CREATE OR REPLACE VIEW `openclaw.v_event_with_tags` AS
WITH tags AS (
  SELECT
    event_id,
    ARRAY_AGG(STRUCT(tag_type, tag_value, cluster_id, confidence, source, timestamp)
      ORDER BY timestamp DESC
      LIMIT 50) AS tag_rows
  FROM `openclaw.event_tags`
  WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
  GROUP BY event_id
)
SELECT
  e.event_id,
  e.timestamp,
  e.source,
  e.event_type,
  e.agent_id,
  e.processed,
  e.payload,
  t.tag_rows
FROM `openclaw.events` e
LEFT JOIN tags t ON e.event_id = t.event_id
ORDER BY e.timestamp DESC;

