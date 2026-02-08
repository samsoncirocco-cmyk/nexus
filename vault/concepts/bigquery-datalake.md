---
title: "BigQuery Data Lake"
date: 2026-02-08
tags: [bigquery, data, memory, events, gcp]
description: "Unlimited AI memory via BigQuery. Events, decisions, analyses, and observations."
---

# BigQuery Data Lake

GCP Project: tatt-pro | Dataset: openclaw

## Tables
- events — Raw events (email, calendar, agent actions)
- decisions — Logged decisions with context
- observations — Patterns and insights
- nlp_enrichment — NLP analysis results
- ai_analysis — AI model outputs
- ai_decisions — Automated decision records

## Tools
- `python3 tools/memory-log.py <type> <source> '<json>'` — log events
- `python3 tools/memory-query.py search|recent|stats` — query
- 170+ events backfilled from daily notes and vault docs

## Integration
- Second Brain pages query BigQuery directly
- Ask Brain searches BQ alongside vault
- Activity feed merges BQ events with vault JSON
