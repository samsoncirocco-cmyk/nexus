#!/usr/bin/env python3
"""
OpenClaw Phase 4 + 5 BigQuery Setup Runner

Applies execution/bigquery_phase4_5_setup.sql to create:
- speech_enrichment
- geo_enrichment
- predictions
- event_tags
- search_queries
- views: v_cross_source_entities, v_weekly_predictions, v_event_with_tags

Usage:
  python3 execution/bigquery_phase4_5_setup.py

Requirements:
  - Application Default Credentials configured (gcloud auth application-default login)
  - GOOGLE_PROJECT_ID or PROJECT_ID set in environment
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from google.cloud import bigquery


def main() -> int:
    project_id = os.environ.get("GOOGLE_PROJECT_ID") or os.environ.get("PROJECT_ID")
    if not project_id:
        print("ERROR: GOOGLE_PROJECT_ID or PROJECT_ID not set in environment", file=sys.stderr)
        return 1

    sql_path = Path(__file__).with_name("bigquery_phase4_5_setup.sql")
    if not sql_path.exists():
        print(f"ERROR: SQL file not found: {sql_path}", file=sys.stderr)
        return 1

    sql = sql_path.read_text(encoding="utf-8")

    client = bigquery.Client(project=project_id)

    print(f"Project: {project_id}")
    print(f"Applying: {sql_path}")
    print()

    try:
        job = client.query(sql)
        job.result()
    except Exception as exc:
        print(f"ERROR: BigQuery setup failed: {exc}", file=sys.stderr)
        return 1

    print("✓ Phase 4/5 BigQuery tables + views applied successfully")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

