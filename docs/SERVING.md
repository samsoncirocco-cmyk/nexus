# Serving, Search, and Agent Actions

## Purpose
Expose a unified query and action layer across the data warehouse, enabling semantic search and proactive agents.

## Semantic Search
- Primary store: BigQuery tables + enrichment tables.
- Search index: Vertex AI Search & Conversation.
- Retrieval pipeline:
  1. Query BigQuery for structured filters.
  2. Query Vertex Search for semantic results.
  3. Merge, rank, and return with citations.

## Agent Context API (Internal)
- Provide a stable interface for agents to read:
  - recent events
  - tasks and contacts
  - enrichment outputs
- Prefer batch reads (BigQuery) and minimize Sheets writes.

## Action Sink
Agents write actions to:
- BigQuery `events` (auditing)
- Sheets `agent_log` and `tasks` (human visibility)
- External sinks: Gmail send, Calendar updates, Drive file edits

## Human Interface
- MVP: CLI or lightweight web UI for search and task review.
- Required features:
  - full-text query
  - filters (source, time range, entity)
  - “why did you suggest this?” rationale

## Safety
- Always log actions before and after execution.
- Require explicit user approval for irreversible actions (send email, delete file).
