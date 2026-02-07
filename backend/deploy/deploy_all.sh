#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../.env"

PROJECT_ID="${PROJECT_ID:-killuacode}"
PUBSUB_TOPIC="${PUBSUB_TOPIC:-openclaw-events}"

echo "============================================"
echo "  OpenClaw Full Deployment"
echo "  Project: ${PROJECT_ID}"
echo "============================================"
echo ""

# Step 1: Create Pub/Sub topic (idempotent)
echo "=== Step 1/4: Ensuring Pub/Sub topic exists ==="
if gcloud pubsub topics describe "${PUBSUB_TOPIC}" --project="${PROJECT_ID}" &>/dev/null; then
  echo "  Topic '${PUBSUB_TOPIC}' already exists."
else
  echo "  Creating topic '${PUBSUB_TOPIC}'..."
  gcloud pubsub topics create "${PUBSUB_TOPIC}" --project="${PROJECT_ID}"
  echo "  Topic created."
fi
echo ""

# Step 2: Deploy BigQuery schemas
echo "=== Step 2/4: Deploying BigQuery schemas ==="
bash "${SCRIPT_DIR}/deploy_bigquery.sh"
echo ""

# Step 3: Deploy Cloud Functions
echo "=== Step 3/4: Deploying Cloud Functions ==="
bash "${SCRIPT_DIR}/deploy_functions.sh"
echo ""

# Step 4: Set up webhooks
echo "=== Step 4/4: Setting up webhooks ==="
bash "${SCRIPT_DIR}/setup_webhooks.sh"
echo ""

echo "============================================"
echo "  Deployment complete!"
echo "============================================"
echo ""
echo "Deployed resources:"
echo "  - Pub/Sub topic: ${PUBSUB_TOPIC}"
echo "  - BigQuery dataset: openclaw"
echo "  - Cloud Functions: gmail_ingester, gmail_enricher, event_router,"
echo "    drive_watcher, calendar_ingestor, orchestrator, sample_triage_agent"
echo "  - Webhooks: Gmail, Calendar, Drive"
