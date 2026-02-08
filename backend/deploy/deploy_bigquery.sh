#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../.env"

PROJECT_ID="${PROJECT_ID:-killuacode}"
BQ_DIR="${SCRIPT_DIR}/../bigquery"

echo "=== Deploying BigQuery schemas to project: ${PROJECT_ID} ==="

# Run SQL files in dependency order: setup first, then tables, then views/test data
SQL_FILES=(
  "bigquery_setup.sql"
  "bigquery_ai_tables.sql"
  "bigquery_semantic_tables.sql"
  "bigquery_vision_tables.sql"
  "bigquery_calendar_views.sql"
  "bigquery_phase4_5_setup.sql"
)

for sql_file in "${SQL_FILES[@]}"; do
  filepath="${BQ_DIR}/${sql_file}"
  if [[ ! -f "${filepath}" ]]; then
    echo "  SKIP: ${sql_file} (not found)"
    continue
  fi
  echo "  Running: ${sql_file}..."
  bq query \
    --project_id="${PROJECT_ID}" \
    --use_legacy_sql=false \
    --format=prettyjson \
    < "${filepath}"
  echo "  Done: ${sql_file}"
done

echo "=== BigQuery deployment complete ==="
