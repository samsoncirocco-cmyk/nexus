#!/usr/bin/env bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../.env"

PROJECT_ID="${PROJECT_ID:-killuacode}"
PUBSUB_TOPIC="${PUBSUB_TOPIC:-openclaw-events}"
SHEET_ID="${GOOGLE_SHEET_ID:-15-3fveXfHSKyTXmQ3x344ie4p9rbtTZGaNl-GLQ8Eac}"
CF_DIR="${SCRIPT_DIR}/../cloud_functions"
RUNTIME="python312"
REGION="${REGION:-us-central1}"

COMMON_ENV="PROJECT_ID=${PROJECT_ID},PUBSUB_TOPIC=${PUBSUB_TOPIC},GOOGLE_SHEET_ID=${SHEET_ID}"

echo "=== Deploying Cloud Functions to project: ${PROJECT_ID} ==="

deploy_http_function() {
  local name="$1"
  local entry_point="$2"
  local source_dir="${CF_DIR}/${name}"

  echo "  Deploying ${name} (HTTP, entry: ${entry_point})..."
  gcloud functions deploy "${name}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --runtime="${RUNTIME}" \
    --trigger-http \
    --allow-unauthenticated \
    --entry-point="${entry_point}" \
    --source="${source_dir}" \
    --set-env-vars="${COMMON_ENV}" \
    --quiet
  echo "  Done: ${name}"
}

deploy_pubsub_function() {
  local name="$1"
  local entry_point="$2"
  local topic="$3"
  local source_dir="${CF_DIR}/${name}"

  echo "  Deploying ${name} (Pub/Sub: ${topic}, entry: ${entry_point})..."
  gcloud functions deploy "${name}" \
    --project="${PROJECT_ID}" \
    --region="${REGION}" \
    --runtime="${RUNTIME}" \
    --trigger-topic="${topic}" \
    --entry-point="${entry_point}" \
    --source="${source_dir}" \
    --set-env-vars="${COMMON_ENV}" \
    --quiet
  echo "  Done: ${name}"
}

# HTTP-triggered functions
deploy_http_function "gmail_ingester"       "gmail_webhook"
deploy_http_function "drive_watcher"        "drive_webhook"
deploy_http_function "calendar_ingestor"    "calendar_webhook"
deploy_http_function "sample_triage_agent"  "agent_handler"

# Pub/Sub-triggered functions
deploy_pubsub_function "gmail_enricher"  "enrich_gmail_event"  "${PUBSUB_TOPIC}"
deploy_pubsub_function "event_router"    "route_event"         "${PUBSUB_TOPIC}"
deploy_pubsub_function "orchestrator"    "orchestrate_event"   "${PUBSUB_TOPIC}"

echo "=== Cloud Functions deployment complete ==="
