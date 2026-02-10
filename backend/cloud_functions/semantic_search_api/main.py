import json
import logging
import math
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import dateparser
from dateparser.search import search_dates
from google.cloud import bigquery
from google.auth import default
import vertexai
from vertexai.language_models import TextEmbeddingModel

logger = logging.getLogger(__name__)


PROJECT_ID = os.environ.get("PROJECT_ID") or os.environ.get("GOOGLE_PROJECT_ID")
REGION = os.environ.get("VERTEX_REGION", "us-central1")

EMBEDDING_MODEL_ID = os.environ.get("EMBEDDING_MODEL_ID", "text-embedding-005")
EMBEDDING_DIMENSIONS = 768
DEFAULT_DAYS_BACK = 365
DEFAULT_TOP_K = 10
DEFAULT_MIN_SIMILARITY = 0.5

SEARCH_QUERIES_TABLE = os.environ.get("BQ_SEARCH_QUERIES_TABLE") or (
    f"{PROJECT_ID}.openclaw.search_queries" if PROJECT_ID else None
)


def semantic_search_api(request):
    """
    HTTP Cloud Function: semantic search endpoint for OpenClaw.

    Request JSON:
      - query (string, required)
      - top_k (int, optional)
      - source (string, optional)
      - days_back (int, optional)
      - min_similarity (float, optional)

    Returns JSON with ranked results, plus optional enrichment joins.
    """
    if not PROJECT_ID:
        return _json({"error": "PROJECT_ID/GOOGLE_PROJECT_ID not configured"}, 500)

    started = time.time()

    body = request.get_json(silent=True) or {}
    query_text = (body.get("query") or "").strip()
    if not query_text:
        return _json({"error": "Missing required field: query"}, 400)

    top_k = _coerce_int(body.get("top_k"), DEFAULT_TOP_K, min_value=1, max_value=50)
    source_filter = (body.get("source") or "").strip() or None
    days_back = _coerce_int(body.get("days_back"), DEFAULT_DAYS_BACK, min_value=1, max_value=365)
    min_similarity = _coerce_float(
        body.get("min_similarity"), DEFAULT_MIN_SIMILARITY, min_value=0.0, max_value=1.0
    )

    parsed_range = _infer_date_range(query_text)
    if parsed_range:
        days_back = max(days_back, parsed_range.get("days_back", days_back))

    try:
        query_vector = _embed_query(query_text)
    except Exception as exc:
        logger.error(f"Failed to embed query: {exc}")
        return _json({"error": "Embedding failed"}, 500)

    bq = bigquery.Client()

    results = _search_embeddings(
        bq=bq,
        query_vector=query_vector,
        top_k=top_k,
        source_filter=source_filter,
        days_back=days_back,
        min_similarity=min_similarity,
    )

    event_ids = [r["event_id"] for r in results]
    enrich = _fetch_enrichment(bq=bq, event_ids=event_ids) if event_ids else {}

    # Attach enrichment to results.
    for r in results:
        e = enrich.get(r["event_id"]) or {}
        r["entities"] = e.get("entities")
        r["place_name"] = e.get("place_name")
        r["formatted_address"] = e.get("formatted_address")

    latency_ms = int((time.time() - started) * 1000)

    _log_query(
        bq=bq,
        raw_query=query_text,
        parsed_date_range=parsed_range,
        parsed_source=source_filter,
        result_count=len(results),
        top_similarity=(results[0]["similarity"] if results else None),
        latency_ms=latency_ms,
    )

    return _json(
        {
            "query": query_text,
            "top_k": top_k,
            "source_filter": source_filter,
            "days_back": days_back,
            "min_similarity": min_similarity,
            "parsed_date_range": parsed_range,
            "latency_ms": latency_ms,
            "results": results,
        },
        200,
    )


def _embed_query(query_text: str) -> List[float]:
    # Vertex AI init is safe to call multiple times.
    credentials, _ = default()
    vertexai.init(project=PROJECT_ID, location=REGION, credentials=credentials)
    model = TextEmbeddingModel.from_pretrained(EMBEDDING_MODEL_ID)
    embeddings = model.get_embeddings([query_text])
    vector = embeddings[0].values
    if len(vector) != EMBEDDING_DIMENSIONS:
        logger.warning(f"Unexpected embedding dim: {len(vector)} (expected {EMBEDDING_DIMENSIONS})")
    return vector


def _search_embeddings(
    *,
    bq: bigquery.Client,
    query_vector: List[float],
    top_k: int,
    source_filter: Optional[str],
    days_back: int,
    min_similarity: float,
) -> List[Dict[str, Any]]:
    params = [
        bigquery.ScalarQueryParameter("days_back", "INT64", days_back),
    ]
    source_clause = ""
    if source_filter:
        source_clause = "AND source = @source_filter"
        params.append(bigquery.ScalarQueryParameter("source_filter", "STRING", source_filter))

    query = f"""
    SELECT
      embedding_id,
      event_id,
      source,
      content_preview,
      embedding,
      timestamp
    FROM `{PROJECT_ID}.openclaw.embeddings`
    WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days_back DAY)
      {source_clause}
    ORDER BY timestamp DESC
    LIMIT 2000
    """

    job_config = bigquery.QueryJobConfig(query_parameters=params)
    rows = list(bq.query(query, job_config=job_config))

    scored: List[Dict[str, Any]] = []
    for row in rows:
        if not row.embedding:
            continue
        sim = _cosine_similarity(query_vector, row.embedding)
        if sim < min_similarity:
            continue
        scored.append(
            {
                "event_id": row.event_id,
                "embedding_id": row.embedding_id,
                "source": row.source,
                "content_preview": row.content_preview,
                "similarity": round(sim, 4),
                "timestamp": row.timestamp.isoformat() if row.timestamp else None,
            }
        )

    scored.sort(key=lambda r: r["similarity"], reverse=True)
    return scored[:top_k]


def _fetch_enrichment(*, bq: bigquery.Client, event_ids: List[str]) -> Dict[str, Dict[str, Any]]:
    if not event_ids:
        return {}

    query = f"""
    WITH ids AS (SELECT * FROM UNNEST(@event_ids) AS event_id)
    SELECT
      ids.event_id,
      n.entities AS entities,
      g.place_name AS place_name,
      g.formatted_address AS formatted_address
    FROM ids
    LEFT JOIN `{PROJECT_ID}.openclaw.nlp_enrichment` n
      ON n.event_id = ids.event_id
    LEFT JOIN (
      SELECT
        event_id,
        ANY_VALUE(place_name) AS place_name,
        ANY_VALUE(formatted_address) AS formatted_address
      FROM `{PROJECT_ID}.openclaw.geo_enrichment`
      WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 365 DAY)
      GROUP BY event_id
    ) g
      ON g.event_id = ids.event_id
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[bigquery.ArrayQueryParameter("event_ids", "STRING", event_ids)]
    )

    out: Dict[str, Dict[str, Any]] = {}
    for row in bq.query(query, job_config=job_config):
        out[row.event_id] = {
            "entities": row.entities,
            "place_name": row.place_name,
            "formatted_address": row.formatted_address,
        }
    return out


def _infer_date_range(query_text: str) -> Optional[Dict[str, Any]]:
    """
    Best-effort: identify a date mention and convert it into a days_back window.
    This is intentionally conservative: it narrows search, but never errors.
    """
    try:
        found = search_dates(
            query_text,
            settings={
                "RETURN_AS_TIMEZONE_AWARE": True,
                "PREFER_DATES_FROM": "past",
            },
        )
    except Exception:
        found = None

    if not found:
        return None

    # Pick the first detected date expression.
    phrase, dt = found[0]
    if not dt:
        return None

    now = datetime.now(timezone.utc)
    delta_days = max(1, int((now - dt).total_seconds() // 86400) + 1)
    return {
        "phrase": phrase,
        "parsed_datetime": dt.isoformat(),
        "days_back": min(delta_days, 365),
    }


def _log_query(
    *,
    bq: bigquery.Client,
    raw_query: str,
    parsed_date_range: Optional[Dict[str, Any]],
    parsed_source: Optional[str],
    result_count: int,
    top_similarity: Optional[float],
    latency_ms: int,
) -> None:
    if not SEARCH_QUERIES_TABLE:
        return

    row = {
        "query_id": f"q-{uuid.uuid4().hex[:12]}",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "raw_query": raw_query,
        "parsed_date_range": parsed_date_range or {},
        "parsed_source": parsed_source,
        "result_count": result_count,
        "top_similarity": float(top_similarity) if top_similarity is not None else None,
        "latency_ms": latency_ms,
    }
    try:
        errors = bq.insert_rows_json(SEARCH_QUERIES_TABLE, [row])
        if errors:
            logger.warning(f"Failed to log search query: {errors}")
    except Exception as exc:
        logger.warning(f"Failed to log search query: {exc}")


def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    if len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _coerce_int(val: Any, default: int, *, min_value: int, max_value: int) -> int:
    try:
        n = int(val)
    except Exception:
        n = default
    return max(min_value, min(max_value, n))


def _coerce_float(val: Any, default: float, *, min_value: float, max_value: float) -> float:
    try:
        x = float(val)
    except Exception:
        x = default
    return max(min_value, min(max_value, x))


def _json(obj: Dict[str, Any], status: int):
    return (json.dumps(obj, default=str), status, {"Content-Type": "application/json"})

