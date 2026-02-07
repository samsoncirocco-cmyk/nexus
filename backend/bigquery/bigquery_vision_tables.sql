-- OpenClaw Phase 3: Vision Enrichment Table
-- Per SPECS/05-ENRICHMENT.md schema for Cloud Vision API results
-- Run: bq query --use_legacy_sql=false < bigquery_vision_tables.sql

CREATE OR REPLACE TABLE `openclaw.vision_enrichment` (
  file_id STRING NOT NULL,
  event_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  labels JSON,
  objects JSON,
  text_annotations JSON,
  dominant_colors JSON,
  safe_search JSON
)
PARTITION BY DATE(timestamp)
CLUSTER BY file_id
OPTIONS (
  description="Cloud Vision API enrichment for Drive image files"
);
