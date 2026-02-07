import json
import logging
import os
import uuid
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from google.cloud import bigquery

logger = logging.getLogger(__name__)


PROJECT_ID = os.environ.get("PROJECT_ID") or os.environ.get("GOOGLE_PROJECT_ID")
PREDICTIONS_TABLE = os.environ.get("BQ_PREDICTIONS_TABLE") or (
    f"{PROJECT_ID}.openclaw.predictions" if PROJECT_ID else None
)


def pattern_predictor(request):
    """
    Scheduled HTTP Cloud Function: generate predictive intelligence signals.

    Produces:
      - busy_week predictions (next 7 days)
      - comm_spike predictions (contacts with unusual email volume)
      - topic_trend predictions (entities trending in recent NLP enrichment)

    Writes results to: openclaw.predictions

    Notes:
      - This is rule-based by default; BQML model definitions can be added later.
      - Keep outputs auditable: prediction_value JSON includes factors and query windows.

    Future BQML upgrade (sketch):
      -- CREATE OR REPLACE MODEL `openclaw.busy_week_model`
      -- OPTIONS(model_type='linear_reg', input_label_cols=['busy_score']) AS
      -- SELECT ... FROM openclaw.events ...
    """
    if not PROJECT_ID or not PREDICTIONS_TABLE:
        return ("Missing PROJECT_ID/BQ_PREDICTIONS_TABLE", 500)

    bq = bigquery.Client()

    now = datetime.utcnow()
    today = date.today()
    expires_at = (now + timedelta(days=8)).isoformat() + "Z"

    created: List[Dict[str, Any]] = []

    try:
        created.extend(_predict_busy_week(bq=bq, today=today, expires_at=expires_at))
    except Exception as exc:
        logger.error(f"busy_week prediction failed: {exc}")

    try:
        created.extend(_predict_comm_spikes(bq=bq, expires_at=expires_at))
    except Exception as exc:
        logger.error(f"comm_spike prediction failed: {exc}")

    try:
        created.extend(_predict_topic_trends(bq=bq, expires_at=expires_at))
    except Exception as exc:
        logger.error(f"topic_trend prediction failed: {exc}")

    if not created:
        return (json.dumps({"status": "ok", "created": 0}), 200, {"Content-Type": "application/json"})

    errors = bq.insert_rows_json(PREDICTIONS_TABLE, created)
    if errors:
        logger.error(f"Prediction insert errors: {errors}")
        return (json.dumps({"status": "error", "errors": errors}), 500, {"Content-Type": "application/json"})

    return (
        json.dumps({"status": "ok", "created": len(created)}),
        200,
        {"Content-Type": "application/json"},
    )


def _predict_busy_week(*, bq: bigquery.Client, today: date, expires_at: str) -> List[Dict[str, Any]]:
    """
    Busy-week forecast: for each of the next 7 days, compute a busyness score 0..10.
    """
    query = f"""
    WITH upcoming AS (
      SELECT
        DATE(PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%S', SPLIT(JSON_VALUE(payload, '$.start_time'), '+')[OFFSET(0)])) AS day,
        COUNT(*) AS meeting_count
      FROM `{PROJECT_ID}.openclaw.events`
      WHERE source = 'calendar'
        AND JSON_VALUE(payload, '$.change_type') != 'deleted'
        AND JSON_VALUE(payload, '$.all_day') = 'false'
        AND DATE(PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%S', SPLIT(JSON_VALUE(payload, '$.start_time'), '+')[OFFSET(0)]))
            BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL 7 DAY)
      GROUP BY day
    ),
    baseline AS (
      SELECT
        AVG(meeting_count) AS avg_meetings_per_day
      FROM (
        SELECT
          DATE(timestamp) AS day,
          COUNT(*) AS meeting_count
        FROM `{PROJECT_ID}.openclaw.events`
        WHERE source = 'calendar'
          AND JSON_VALUE(payload, '$.change_type') != 'deleted'
          AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 14 DAY)
        GROUP BY day
      )
    )
    SELECT
      d.day,
      COALESCE(u.meeting_count, 0) AS meeting_count,
      b.avg_meetings_per_day AS baseline_avg
    FROM UNNEST(GENERATE_DATE_ARRAY(CURRENT_DATE(), DATE_ADD(CURRENT_DATE(), INTERVAL 7 DAY))) AS d(day)
    LEFT JOIN upcoming u ON u.day = d.day
    CROSS JOIN baseline b
    ORDER BY d.day
    """

    rows = list(bq.query(query))
    out: List[Dict[str, Any]] = []

    for row in rows:
        meeting_count = int(row.meeting_count or 0)
        baseline_avg = float(row.baseline_avg or 0.0)

        if baseline_avg <= 0.01:
            score = min(10.0, meeting_count * 2.0)
        else:
            ratio = meeting_count / baseline_avg
            # Map: 1.0x baseline -> ~5, 2.0x -> ~10
            score = max(0.0, min(10.0, ratio * 5.0))

        label = "Light"
        if score >= 8:
            label = "Very Busy"
        elif score >= 6:
            label = "Busy"
        elif score >= 4:
            label = "Moderate"

        out.append(
            {
                "prediction_id": f"pred-{uuid.uuid4().hex[:12]}",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "agent_id": "pattern_predictor",
                "prediction_type": "busy_week",
                "target_date": row.day.isoformat(),
                "target_entity": "self",
                "prediction_value": {
                    "score": round(score, 2),
                    "label": label,
                    "meeting_count": meeting_count,
                    "baseline_avg_meetings_per_day": round(baseline_avg, 2),
                    "window": {"upcoming_days": 7, "baseline_days": 14},
                },
                "confidence": 0.6 if baseline_avg > 0 else 0.4,
                "expires_at": expires_at,
                "outcome": None,
            }
        )

    return out


def _predict_comm_spikes(*, bq: bigquery.Client, expires_at: str) -> List[Dict[str, Any]]:
    """
    Communication spikes: identify senders with unusually high volume in last 7d vs prior 30d.
    """
    query = f"""
    WITH parsed AS (
      SELECT
        timestamp,
        REGEXP_EXTRACT(LOWER(JSON_VALUE(payload, '$.from')), r'([a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{{2,}})') AS from_email
      FROM `{PROJECT_ID}.openclaw.events`
      WHERE source = 'gmail'
        AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 37 DAY)
    ),
    last7 AS (
      SELECT from_email, COUNT(*) AS cnt
      FROM parsed
      WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        AND from_email IS NOT NULL
      GROUP BY from_email
    ),
    prior30 AS (
      SELECT from_email, COUNT(*) AS cnt
      FROM parsed
      WHERE timestamp <= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        AND from_email IS NOT NULL
      GROUP BY from_email
    )
    SELECT
      l.from_email,
      l.cnt AS last7_cnt,
      COALESCE(p.cnt, 0) AS prior30_cnt
    FROM last7 l
    LEFT JOIN prior30 p USING (from_email)
    WHERE l.cnt >= 5
    ORDER BY l.cnt DESC
    LIMIT 50
    """

    rows = list(bq.query(query))
    out: List[Dict[str, Any]] = []
    for row in rows:
        last7 = int(row.last7_cnt or 0)
        prior30 = int(row.prior30_cnt or 0)
        prior7_est = max(1.0, prior30 / 30.0 * 7.0)
        ratio = last7 / prior7_est
        if ratio < 2.0:
            continue

        out.append(
            {
                "prediction_id": f"pred-{uuid.uuid4().hex[:12]}",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "agent_id": "pattern_predictor",
                "prediction_type": "comm_spike",
                "target_date": None,
                "target_entity": row.from_email,
                "prediction_value": {
                    "last_7_days_count": last7,
                    "prior_30_days_count": prior30,
                    "estimated_prior_7_days": round(prior7_est, 2),
                    "ratio_vs_baseline": round(ratio, 2),
                    "window": {"recent_days": 7, "baseline_days": 30},
                },
                "confidence": 0.65,
                "expires_at": expires_at,
                "outcome": None,
            }
        )
    return out


def _predict_topic_trends(*, bq: bigquery.Client, expires_at: str) -> List[Dict[str, Any]]:
    """
    Topic trends: entities with frequency spikes in last 7d vs prior 30d.
    """
    query = f"""
    WITH flattened AS (
      SELECT
        timestamp,
        JSON_VALUE(entity_json, '$.name') AS entity_name
      FROM `{PROJECT_ID}.openclaw.nlp_enrichment`,
      UNNEST(JSON_QUERY_ARRAY(entities)) AS entity_json
      WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 37 DAY)
        AND JSON_VALUE(entity_json, '$.name') IS NOT NULL
    ),
    last7 AS (
      SELECT entity_name, COUNT(*) AS cnt
      FROM flattened
      WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
      GROUP BY entity_name
    ),
    prior30 AS (
      SELECT entity_name, COUNT(*) AS cnt
      FROM flattened
      WHERE timestamp <= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
      GROUP BY entity_name
    )
    SELECT
      l.entity_name,
      l.cnt AS last7_cnt,
      COALESCE(p.cnt, 0) AS prior30_cnt
    FROM last7 l
    LEFT JOIN prior30 p USING (entity_name)
    WHERE l.cnt >= 10
    ORDER BY l.cnt DESC
    LIMIT 50
    """

    rows = list(bq.query(query))
    out: List[Dict[str, Any]] = []
    for row in rows:
        last7 = int(row.last7_cnt or 0)
        prior30 = int(row.prior30_cnt or 0)
        prior7_est = max(1.0, prior30 / 30.0 * 7.0)
        ratio = last7 / prior7_est
        if ratio < 2.0:
            continue

        out.append(
            {
                "prediction_id": f"pred-{uuid.uuid4().hex[:12]}",
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "agent_id": "pattern_predictor",
                "prediction_type": "topic_trend",
                "target_date": None,
                "target_entity": row.entity_name,
                "prediction_value": {
                    "last_7_days_mentions": last7,
                    "prior_30_days_mentions": prior30,
                    "estimated_prior_7_days": round(prior7_est, 2),
                    "ratio_vs_baseline": round(ratio, 2),
                    "window": {"recent_days": 7, "baseline_days": 30},
                },
                "confidence": 0.6,
                "expires_at": expires_at,
                "outcome": None,
            }
        )
    return out

