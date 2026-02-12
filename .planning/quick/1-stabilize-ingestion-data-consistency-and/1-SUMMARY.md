# Quick Task 1 Summary

## Objective
Stabilize ingestion consistency by reducing dropped events and duplicate/unstable writes across cloud function ingest paths.

## What Changed
- Added idempotent BigQuery insert helpers in:
  - `backend/cloud_functions/gmail_ingester/main.py`
  - `backend/cloud_functions/calendar_ingestor/main.py`
  - `backend/cloud_functions/drive_watcher/main.py`
  - `backend/cloud_functions/event_router/main.py`
- Calendar ingestion now uses a configurable lookback window (`CALENDAR_LOOKBACK_SECONDS`, default `900`) instead of `updatedMin` tied to current time.
- Calendar event IDs are now versioned with update markers so changed events emit unique, stable events.
- Drive watcher now loads and persists `startPageToken` via `DRIVE_TOKEN_FILE` (default `/tmp/drive_start_page_token.txt`) to reduce missed changes between invocations.
- Added dedupe insert IDs for NLP/Vision enrichment rows to avoid duplicate enrichment records during retries.

## Validation
- Ran syntax checks successfully:
  - `python3 -m py_compile backend/cloud_functions/gmail_ingester/main.py backend/cloud_functions/calendar_ingestor/main.py backend/cloud_functions/drive_watcher/main.py backend/cloud_functions/event_router/main.py`

## Expected Impact
- Lower duplicate-event volume caused by retried webhook deliveries.
- Fewer dropped calendar updates due to narrow fetch windows.
- Better continuity for Drive changes polling within warm Cloud Function instances.
