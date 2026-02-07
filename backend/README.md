# Backend — KilluaCode Data Lake

Python backend for the Second Brain platform. Handles data ingestion, enrichment, and orchestration via Google Cloud.

## Directory Structure

```
backend/
  cloud_functions/    # GCP Cloud Functions (Gmail, Drive, Calendar, etc.)
  execution/          # Core Python modules (BigQuery setup, orchestrator, AI integrations)
  bigquery/           # SQL schema and migration files for BigQuery tables/views
  .env                # Environment variables (not committed)
  requirements.txt    # Python dependencies
  create_openclaw_sheet.py   # Google Sheet bootstrapper
  populate_openclaw_sheet.py # Sheet data population script
```

## Cloud Functions

| Function | Purpose |
|---|---|
| `gmail_ingester` | Pulls emails via Gmail API |
| `gmail_enricher` | AI-enriches email metadata |
| `event_router` | Routes Pub/Sub events to handlers |
| `drive_watcher` | Monitors Google Drive changes |
| `calendar_ingestor` | Syncs Google Calendar events |
| `orchestrator` | Coordinates multi-step workflows |
| `sample_triage_agent` | Example triage/classification agent |

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in your credentials
```
