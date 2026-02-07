#!/bin/bash

# OpenClaw Phase 1A Deployment Script
# Project ID: killuacode
# Execute this script to deploy all cloud infrastructure

set -e  # Exit on error

PROJECT_ID="killuacode"
REGION="us-central1"

echo "🚀 OpenClaw Phase 1A Deployment"
echo "================================"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Set project
echo "1️⃣ Setting GCP project..."
gcloud config set project $PROJECT_ID
gcloud config get-value project

# Create Pub/Sub topic
echo ""
echo "2️⃣ Creating Pub/Sub topic..."
gcloud pubsub topics create openclaw-events --project=$PROJECT_ID || echo "Topic already exists"

# Create Cloud Tasks queue
echo ""
echo "3️⃣ Creating Cloud Tasks queue..."
gcloud tasks queues create openclaw-agents \
  --location=$REGION \
  --project=$PROJECT_ID || echo "Queue already exists"

# Deploy Gmail Ingester
echo ""
echo "4️⃣ Deploying gmail_webhook Cloud Function..."
gcloud functions deploy gmail_webhook \
  --runtime python311 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point gmail_webhook \
  --source ./cloud_functions/gmail_ingester \
  --region=$REGION \
  --project=$PROJECT_ID \
  --set-env-vars PROJECT_ID=$PROJECT_ID,PUBSUB_TOPIC=projects/$PROJECT_ID/topics/openclaw-events,BQ_EVENTS_TABLE=$PROJECT_ID.openclaw.events \
  --memory 512MB \
  --timeout 60s

echo "✅ gmail_webhook deployed"

# Deploy Event Router (without SHEET_ID - will update after sheets-builder)
echo ""
echo "5️⃣ Deploying event_router Cloud Function..."
gcloud functions deploy event_router \
  --runtime python311 \
  --trigger-topic openclaw-events \
  --entry-point route_event \
  --source ./cloud_functions/event_router \
  --region=$REGION \
  --project=$PROJECT_ID \
  --set-env-vars PROJECT_ID=$PROJECT_ID,GOOGLE_SHEET_ID=PLACEHOLDER,TASKS_REGION=$REGION,TASKS_QUEUE=openclaw-agents \
  --memory 512MB \
  --timeout 60s

echo "✅ event_router deployed"

# Deploy Sample Triage Agent
echo ""
echo "6️⃣ Deploying agent-triage Cloud Function..."
gcloud functions deploy agent-triage \
  --runtime python311 \
  --trigger-http \
  --allow-unauthenticated \
  --entry-point agent_handler \
  --source ./cloud_functions/sample_triage_agent \
  --region=$REGION \
  --project=$PROJECT_ID \
  --set-env-vars PROJECT_ID=$PROJECT_ID,GOOGLE_SHEET_ID=PLACEHOLDER \
  --memory 512MB \
  --timeout 60s

echo "✅ agent-triage deployed"

# List deployed functions
echo ""
echo "7️⃣ Verifying all functions deployed..."
gcloud functions list --region=$REGION --project=$PROJECT_ID

echo ""
echo "✅ Phase 1A Cloud Infrastructure Deployed!"
echo ""
echo "⚠️  IMPORTANT: Update SHEET_ID"
echo "Once sheets-builder provides Sheet ID, run:"
echo ""
echo "export SHEET_ID='<sheet-id-from-sheets-builder>'"
echo "gcloud functions deploy event_router --set-env-vars GOOGLE_SHEET_ID=\$SHEET_ID ..."
echo "gcloud functions deploy agent-triage --set-env-vars GOOGLE_SHEET_ID=\$SHEET_ID ..."
echo ""
echo "See DEPLOYMENT.md for complete commands"
