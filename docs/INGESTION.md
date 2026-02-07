# Ingestion & Event Bus

## Purpose
Define how data enters OpenClaw and is normalized into a consistent event stream. All sources must emit a single, stable event format that can be enriched, routed, and audited.

## Sources (Phase 1-2)
- Gmail API (push notifications + message metadata)
- Google Drive API (file metadata + content links)
- Google Calendar API (events + attendees + locations)
- Optional: Telegram bot or other chat ingress

## Event Schema (canonical)
All ingestors publish to Pub/Sub topic `openclaw-events` and write to BigQuery `openclaw.events`.

Required fields:
- `event_id` (string, globally unique)
- `timestamp` (UTC ISO8601)
- `source` (gmail|drive|calendar|telegram|manual|agent)
- `event_type` (webhook_received|file_added|calendar_created|message_received|action_taken)
- `payload` (JSON string with source-specific details)
- `agent_id` (nullable)
- `processed` (boolean)

## Normalization Rules
- Always include the minimal, lossless source payload (subject, snippet, file name, event title, timestamps).
- Store full raw payload only if it is safe and needed; otherwise keep a pointer (e.g., Drive file ID) and fetch on demand.
- Idempotency: use source IDs to generate stable `event_id` (e.g., `gmail-{message_id}`).

## Drive Ingestion (Draft)
- **Event types**: `file_added`, `file_updated`
- **Required payload fields**: `file_id`, `name`, `mime_type`, `owners`, `created_time`, `modified_time`, `webViewLink`
- **Idempotency**: `event_id = drive-{file_id}-{modified_time}` (or equivalent stable hash)
- **Privacy**: store references/metadata only, not full file content

## Pub/Sub Routing
- All ingestors publish to the same topic.
- `event_router` performs routing, enrichment hooks, and inserts into sinks.

## Error Handling
- Ingestors must log errors but should not halt the pipeline.
- If BigQuery insert fails, still publish to Pub/Sub; the event router can retry writes.

## Config & Env Vars
- `PROJECT_ID` or `GOOGLE_PROJECT_ID`
- `PUBSUB_TOPIC`
- `BQ_EVENTS_TABLE`
- Source-specific tokens handled via Application Default Credentials (ADC).

## Observability
- Each ingestor logs:
  - received webhook id
  - normalized event id
  - publish success/failure
- Add metric labels by `source` and `event_type`.
