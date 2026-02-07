-- OpenClaw Phase 2: Semantic Understanding Tables
-- Stores embeddings and semantic search indices
-- Run: bq query --use_legacy_sql=false < bigquery_semantic_tables.sql

-- ===========================================================================
-- 1. EMBEDDINGS TABLE
-- ===========================================================================

CREATE OR REPLACE TABLE `openclaw.embeddings` (
  embedding_id STRING NOT NULL,
  event_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  source STRING,
  content_hash STRING,
  content_preview STRING,
  embedding ARRAY<FLOAT64>,
  model_id STRING,
  dimensions INT64
)
PARTITION BY DATE(timestamp)
CLUSTER BY source
OPTIONS (
  description="Vector embeddings for semantic search over events"
);

-- ===========================================================================
-- 2. SEMANTIC CLUSTERS TABLE
-- ===========================================================================

CREATE OR REPLACE TABLE `openclaw.semantic_clusters` (
  cluster_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  label STRING,
  description STRING,
  centroid ARRAY<FLOAT64>,
  member_count INT64,
  sample_event_ids ARRAY<STRING>,
  last_updated TIMESTAMP
)
OPTIONS (
  description="Semantic clusters grouping similar events"
);

-- ===========================================================================
-- 3. SEMANTIC LINKS TABLE
-- ===========================================================================

CREATE OR REPLACE TABLE `openclaw.semantic_links` (
  link_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  source_event_id STRING NOT NULL,
  target_event_id STRING NOT NULL,
  similarity_score FLOAT64,
  link_type STRING,
  metadata JSON
)
PARTITION BY DATE(timestamp)
CLUSTER BY source_event_id
OPTIONS (
  description="Semantic similarity links between events"
);

-- ===========================================================================
-- 4. VIEWS
-- ===========================================================================

-- Recent embeddings with event context
CREATE OR REPLACE VIEW `openclaw.recent_embeddings` AS
SELECT
  emb.embedding_id,
  emb.event_id,
  emb.timestamp,
  emb.source,
  emb.content_preview,
  emb.model_id,
  emb.dimensions,
  e.event_type,
  JSON_VALUE(e.payload, '$.subject') as event_subject
FROM `openclaw.embeddings` emb
LEFT JOIN `openclaw.events` e ON emb.event_id = e.event_id
WHERE emb.timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
ORDER BY emb.timestamp DESC;

-- Strongest semantic links
CREATE OR REPLACE VIEW `openclaw.strong_semantic_links` AS
SELECT
  l.source_event_id,
  l.target_event_id,
  l.similarity_score,
  l.link_type,
  l.timestamp,
  e1.source as source_origin,
  e2.source as target_origin,
  JSON_VALUE(e1.payload, '$.subject') as source_subject,
  JSON_VALUE(e2.payload, '$.subject') as target_subject
FROM `openclaw.semantic_links` l
LEFT JOIN `openclaw.events` e1 ON l.source_event_id = e1.event_id
LEFT JOIN `openclaw.events` e2 ON l.target_event_id = e2.event_id
WHERE l.similarity_score > 0.8
ORDER BY l.similarity_score DESC;
