# Security, Privacy, and Governance

## Principles
- Data minimization: store only what you need.
- Least privilege: narrow IAM scopes per component.
- Auditability: every action is logged.
- Reversibility: actions should be traceable and undoable when possible.

## IAM Roles (minimum)
- Pub/Sub publisher for ingestors
- BigQuery dataEditor for pipeline writers
- Sheets editor for operational dashboards
- Cloud Tasks taskCreator for routing
- Gmail readonly, Drive readonly, Calendar readonly for ingestion

## Secrets & Credentials
- Use Application Default Credentials (ADC).
- Never commit service account keys or `.env` files.
- Store secrets in Secret Manager if needed.

## Data Retention
- Events table: partitioned, enforce TTL for raw payloads if sensitive.
- Enrichment tables: keep derived data, not full content.

## User Controls
- Allow per-source enable/disable.
- Provide opt-out for specific labels or folders.
- Provide deletion or redaction workflow by `event_id`.
