import json
import logging
import math
import os
import re
import uuid
from collections import Counter
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from google.cloud import bigquery

try:
    from sklearn.cluster import KMeans
except Exception:  # pragma: no cover
    KMeans = None

try:
    import vertexai
    from google.auth import default
    from vertexai.generative_models import GenerativeModel
except Exception:  # pragma: no cover
    vertexai = None
    default = None
    GenerativeModel = None

logger = logging.getLogger(__name__)


PROJECT_ID = os.environ.get("PROJECT_ID") or os.environ.get("GOOGLE_PROJECT_ID")

EVENT_TAGS_TABLE = os.environ.get("BQ_EVENT_TAGS_TABLE") or (
    f"{PROJECT_ID}.openclaw.event_tags" if PROJECT_ID else None
)
CLUSTERS_TABLE = os.environ.get("BQ_CLUSTERS_TABLE") or (
    f"{PROJECT_ID}.openclaw.semantic_clusters" if PROJECT_ID else None
)

REGION = os.environ.get("VERTEX_REGION", "us-central1")
VERTEX_MODEL = os.environ.get("VERTEX_MODEL", "gemini-2.0-flash")
CLUSTER_LABELS_WITH_GEMINI = os.environ.get("CLUSTER_LABELS_WITH_GEMINI", "false").lower() == "true"


WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9_\\-]{2,}")
STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "you",
    "your",
    "about",
    "meet",
    "meeting",
    "re",
    "fw",
    "fwd",
    "update",
    "notes",
    "today",
    "tomorrow",
}


def auto_organizer(request):
    """
    Scheduled HTTP Cloud Function: zero-click warehousing.

    - Clusters recent embeddings (last 30 days) using KMeans.
    - Updates openclaw.semantic_clusters (daily rolling replacement).
    - Writes per-event cluster tags to openclaw.event_tags.

    This is intentionally conservative and auditable.
    """
    if not PROJECT_ID or not EVENT_TAGS_TABLE or not CLUSTERS_TABLE:
        return ("Missing PROJECT_ID/BQ tables", 500)

    if KMeans is None:
        return ("scikit-learn not available (KMeans import failed)", 500)

    bq = bigquery.Client()
    now = datetime.utcnow()
    now_iso = now.isoformat() + "Z"
    today_key = now.strftime("%Y%m%d")

    embeddings = _load_recent_embeddings(bq=bq, days_back=30, limit=1000)
    if len(embeddings) < 20:
        return (json.dumps({"status": "ok", "message": "not enough embeddings", "count": len(embeddings)}), 200, {"Content-Type": "application/json"})

    event_ids, vectors, previews = embeddings
    X = np.array(vectors, dtype=np.float32)

    k = _choose_k(len(event_ids))
    km = KMeans(n_clusters=k, n_init="auto", random_state=42)
    labels = km.fit_predict(X)
    centers = km.cluster_centers_

    clusters = _build_clusters(
        today_key=today_key,
        k=k,
        now_iso=now_iso,
        event_ids=event_ids,
        labels=labels,
        centers=centers,
        previews=previews,
    )

    # Replace today's auto clusters (idempotent-ish).
    _delete_existing_today_clusters(bq=bq, today_key=today_key)
    _insert_clusters(bq=bq, clusters=clusters)

    # Tag events with their cluster assignment.
    tag_rows = _build_event_tags(now_iso=now_iso, clusters=clusters)
    _delete_existing_cluster_tags(bq=bq, event_ids=event_ids)
    _insert_event_tags(bq=bq, tag_rows=tag_rows)

    return (
        json.dumps({"status": "ok", "clusters": len(clusters), "tagged_events": len(tag_rows)}),
        200,
        {"Content-Type": "application/json"},
    )


def _load_recent_embeddings(
    *, bq: bigquery.Client, days_back: int, limit: int
) -> Tuple[List[str], List[List[float]], List[str]]:
    query = f"""
    SELECT
      event_id,
      embedding,
      content_preview
    FROM `{PROJECT_ID}.openclaw.embeddings`
    WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days_back DAY)
      AND embedding IS NOT NULL
    ORDER BY timestamp DESC
    LIMIT @limit
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("days_back", "INT64", days_back),
            bigquery.ScalarQueryParameter("limit", "INT64", limit),
        ]
    )
    rows = list(bq.query(query, job_config=job_config))

    event_ids: List[str] = []
    vectors: List[List[float]] = []
    previews: List[str] = []
    for row in rows:
        if not row.embedding:
            continue
        event_ids.append(row.event_id)
        vectors.append(list(row.embedding))
        previews.append((row.content_preview or "")[:300])

    return event_ids, vectors, previews


def _choose_k(n: int) -> int:
    # Heuristic: small datasets -> fewer clusters; cap to avoid overfragmentation.
    if n < 50:
        return 3
    if n < 150:
        return 6
    if n < 400:
        return 10
    return 12


def _build_clusters(
    *,
    today_key: str,
    k: int,
    now_iso: str,
    event_ids: List[str],
    labels: np.ndarray,
    centers: np.ndarray,
    previews: List[str],
) -> List[Dict[str, Any]]:
    # Map cluster -> member event indices
    members: Dict[int, List[int]] = {i: [] for i in range(k)}
    for idx, c in enumerate(labels.tolist()):
        members[int(c)].append(idx)

    clusters: List[Dict[str, Any]] = []
    for i in range(k):
        idxs = members.get(i, [])
        if not idxs:
            continue

        sample_idxs = idxs[:10]
        sample_event_ids = [event_ids[j] for j in sample_idxs]
        sample_texts = [previews[j] for j in sample_idxs if previews[j]]

        label, description = _label_cluster(i, sample_texts)

        clusters.append(
            {
                "cluster_id": f"clu-{today_key}-{k}-{i}",
                "timestamp": now_iso,
                "label": label,
                "description": description,
                "centroid": [float(x) for x in centers[i].tolist()],
                "member_count": len(idxs),
                "sample_event_ids": sample_event_ids,
                "last_updated": now_iso,
                "_member_event_ids": [event_ids[j] for j in idxs],
            }
        )

    return clusters


def _label_cluster(cluster_index: int, sample_texts: List[str]) -> Tuple[str, str]:
    if CLUSTER_LABELS_WITH_GEMINI and vertexai and GenerativeModel and default:
        try:
            credentials, _ = default()
            vertexai.init(project=PROJECT_ID, location=REGION, credentials=credentials)
            model = GenerativeModel(VERTEX_MODEL)
            prompt = (
                "You are naming a cluster of personal events. "
                "Return JSON with keys: label (<=5 words), description (<=20 words). "
                "Texts:\n\n" + "\n---\n".join(sample_texts[:5])
            )
            resp = model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.2,
                    "max_output_tokens": 256,
                    "response_mime_type": "application/json",
                },
            )
            data = json.loads(resp.text)
            label = (data.get("label") or "").strip()
            desc = (data.get("description") or "").strip()
            if label:
                return label[:60], desc[:200]
        except Exception as exc:
            logger.warning(f"Gemini cluster labeling failed: {exc}")

    # Fallback: keyword label from previews
    tokens = []
    for t in sample_texts:
        for w in WORD_RE.findall(t.lower()):
            if w in STOPWORDS:
                continue
            tokens.append(w)
    top = [w for w, _ in Counter(tokens).most_common(3)]
    if top:
        label = " / ".join(top[:2]).title()
        desc = f"Auto-clustered events about {', '.join(top[:3])}."
    else:
        label = f"Cluster {cluster_index}"
        desc = "Auto-clustered events."
    return label, desc


def _delete_existing_today_clusters(*, bq: bigquery.Client, today_key: str) -> None:
    query = f"DELETE FROM `{PROJECT_ID}.openclaw.semantic_clusters` WHERE STARTS_WITH(cluster_id, @prefix)"
    prefix = f"clu-{today_key}-"
    job_config = bigquery.QueryJobConfig(
        query_parameters=[bigquery.ScalarQueryParameter("prefix", "STRING", prefix)]
    )
    try:
        bq.query(query, job_config=job_config).result()
    except Exception as exc:
        logger.warning(f"Failed to delete today's clusters: {exc}")


def _insert_clusters(*, bq: bigquery.Client, clusters: List[Dict[str, Any]]) -> None:
    rows = []
    for c in clusters:
        rows.append(
            {
                "cluster_id": c["cluster_id"],
                "timestamp": c["timestamp"],
                "label": c["label"],
                "description": c["description"],
                "centroid": c["centroid"],
                "member_count": c["member_count"],
                "sample_event_ids": c["sample_event_ids"],
                "last_updated": c["last_updated"],
            }
        )
    errors = bq.insert_rows_json(f"{PROJECT_ID}.openclaw.semantic_clusters", rows)
    if errors:
        logger.warning(f"Cluster insert errors: {errors}")


def _build_event_tags(*, now_iso: str, clusters: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    tags: List[Dict[str, Any]] = []
    for c in clusters:
        for event_id in c.get("_member_event_ids", []):
            tags.append(
                {
                    "tag_id": f"tag-{uuid.uuid5(uuid.NAMESPACE_URL, event_id + '|' + c['cluster_id']).hex[:12]}",
                    "event_id": event_id,
                    "timestamp": now_iso,
                    "tag_type": "cluster",
                    "tag_value": c.get("label"),
                    "cluster_id": c.get("cluster_id"),
                    "confidence": 0.6,
                    "source": "auto_organizer",
                }
            )
    return tags


def _delete_existing_cluster_tags(*, bq: bigquery.Client, event_ids: List[str]) -> None:
    # Best-effort cleanup so cluster assignments are refreshed on each run.
    query = f"""
    DELETE FROM `{PROJECT_ID}.openclaw.event_tags`
    WHERE source = 'auto_organizer'
      AND tag_type = 'cluster'
      AND event_id IN UNNEST(@event_ids)
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[bigquery.ArrayQueryParameter("event_ids", "STRING", event_ids)]
    )
    try:
        bq.query(query, job_config=job_config).result()
    except Exception as exc:
        logger.warning(f"Failed to delete existing cluster tags: {exc}")


def _insert_event_tags(*, bq: bigquery.Client, tag_rows: List[Dict[str, Any]]) -> None:
    if not tag_rows:
        return
    errors = bq.insert_rows_json(f"{PROJECT_ID}.openclaw.event_tags", tag_rows)
    if errors:
        logger.warning(f"Event tag insert errors: {errors}")

