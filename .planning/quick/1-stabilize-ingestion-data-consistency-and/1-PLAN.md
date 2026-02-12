# Quick Task 1 Plan

## Objective
Stabilize ingestion consistency by reducing dropped events and duplicate/unstable writes across cloud function ingest paths.

## Tasks
1. Add BigQuery idempotent insert helper and use `event_id` row IDs in ingest/router functions.
2. Fix calendar webhook fetch window to use deterministic lookback and stable versioned `event_id`.
3. Improve Drive watcher token continuity with persisted token fallback and explicit load/save helpers.

## Validation
- Python syntax check for modified cloud function files.
- Verify changed functions still return expected HTTP/status behavior.
- Confirm no direct schema-breaking field removals.
