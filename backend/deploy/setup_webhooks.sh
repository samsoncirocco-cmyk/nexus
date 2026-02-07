#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../.env"

PROJECT_ID="${PROJECT_ID:-killuacode}"
REGION="${REGION:-us-central1}"
BASE_URL="https://${REGION}-${PROJECT_ID}.cloudfunctions.net"

echo "=== Setting up push notification webhooks ==="

# Gmail watch — subscribe to inbox changes via Gmail Push Notifications
echo "  Setting up Gmail watch..."
ACCESS_TOKEN=$(gcloud auth print-access-token)

curl -s -X POST \
  "https://gmail.googleapis.com/gmail/v1/users/me/watch" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"topicName\": \"projects/${PROJECT_ID}/topics/openclaw-events\",
    \"labelIds\": [\"INBOX\"]
  }" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Gmail watch expiration: {d.get(\"expiration\", \"unknown\")}')"

echo "  Gmail watch configured."

# Calendar watch — subscribe to calendar changes
echo "  Setting up Calendar watch..."
CALENDAR_WEBHOOK="${BASE_URL}/calendar_ingestor"
CHANNEL_ID="openclaw-calendar-$(date +%s)"

curl -s -X POST \
  "https://www.googleapis.com/calendar/v3/calendars/primary/events/watch" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"${CHANNEL_ID}\",
    \"type\": \"web_hook\",
    \"address\": \"${CALENDAR_WEBHOOK}\",
    \"params\": {
      \"ttl\": \"604800\"
    }
  }" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Calendar channel: {d.get(\"id\", \"unknown\")}, expiration: {d.get(\"expiration\", \"unknown\")}')"

echo "  Calendar watch configured."

# Drive watch — subscribe to Drive changes
echo "  Setting up Drive watch..."
DRIVE_WEBHOOK="${BASE_URL}/drive_watcher"
DRIVE_CHANNEL_ID="openclaw-drive-$(date +%s)"

# Get the current start page token for changes
START_TOKEN=$(curl -s \
  "https://www.googleapis.com/drive/v3/changes/startPageToken" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('startPageToken',''))")

curl -s -X POST \
  "https://www.googleapis.com/drive/v3/changes/watch?pageToken=${START_TOKEN}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"${DRIVE_CHANNEL_ID}\",
    \"type\": \"web_hook\",
    \"address\": \"${DRIVE_WEBHOOK}\",
    \"params\": {
      \"ttl\": \"604800\"
    }
  }" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Drive channel: {d.get(\"id\", \"unknown\")}, expiration: {d.get(\"expiration\", \"unknown\")}')"

echo "  Drive watch configured."

echo "=== Webhook setup complete ==="
echo ""
echo "NOTE: Gmail watch expires after 7 days. Set up a cron job or Cloud Scheduler"
echo "      to re-run this script periodically to keep watches active."
