"""
Semantic Understanding Layer for OpenClaw

Generates embeddings for events and provides semantic search capabilities.
Uses Vertex AI text-embedding models and stores vectors in BigQuery.

Usage:
    semantic = SemanticLayer(project_id)
    semantic.embed_event(event_data)
    results = semantic.search("urgent meeting about budget", top_k=5)
"""

import hashlib
import json
import logging
import math
import uuid
from datetime import datetime

from google.cloud import bigquery
from google.auth import default
import vertexai
from vertexai.language_models import TextEmbeddingModel

logger = logging.getLogger(__name__)

credentials, _ = default()

DEFAULT_EMBEDDING_MODEL = "text-embedding-005"
EMBEDDING_DIMENSIONS = 768
SIMILARITY_THRESHOLD = 0.75


class SemanticLayer:
    """Generate embeddings and perform semantic search over OpenClaw events."""

    def __init__(self, project_id, region="us-central1"):
        self.project_id = project_id
        self.region = region
        self.bq = bigquery.Client()
        self.embedding_table = f"{project_id}.openclaw.embeddings"
        self.links_table = f"{project_id}.openclaw.semantic_links"
        self.clusters_table = f"{project_id}.openclaw.semantic_clusters"

        vertexai.init(project=project_id, location=region)
        self.embedding_model = TextEmbeddingModel.from_pretrained(DEFAULT_EMBEDDING_MODEL)

    def embed_event(self, event_data):
        """
        Generate an embedding for an event and store it in BigQuery.

        Args:
            event_data: Event dict from openclaw.events

        Returns:
            dict with embedding_id and dimensions, or None on failure
        """
        event_id = event_data.get("event_id", "unknown")
        text = self._extract_text(event_data)

        if not text:
            logger.info(f"No text content for event {event_id}, skipping embedding")
            return None

        content_hash = hashlib.sha256(text.encode()).hexdigest()[:16]

        # Check for duplicate
        if self._embedding_exists(event_id, content_hash):
            logger.info(f"Embedding already exists for event {event_id}")
            return None

        try:
            embeddings = self.embedding_model.get_embeddings([text])
            vector = embeddings[0].values
        except Exception as exc:
            logger.error(f"Failed to generate embedding for {event_id}: {exc}")
            return None

        embedding_id = f"emb-{uuid.uuid4().hex[:12]}"
        row = {
            "embedding_id": embedding_id,
            "event_id": event_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "source": event_data.get("source"),
            "content_hash": content_hash,
            "content_preview": text[:200],
            "embedding": vector,
            "model_id": DEFAULT_EMBEDDING_MODEL,
            "dimensions": len(vector),
        }

        try:
            errors = self.bq.insert_rows_json(self.embedding_table, [row])
            if errors:
                logger.error(f"BigQuery insert errors for embedding {embedding_id}: {errors}")
                return None
        except Exception as bq_exc:
            logger.error(f"Failed to store embedding: {bq_exc}")
            return None

        logger.info(f"Stored embedding {embedding_id} for event {event_id}")
        return {"embedding_id": embedding_id, "dimensions": len(vector)}

    def embed_batch(self, events):
        """Generate embeddings for multiple events."""
        results = []
        # Batch text extraction
        texts = []
        valid_events = []
        for event in events:
            text = self._extract_text(event)
            if text:
                texts.append(text)
                valid_events.append(event)

        if not texts:
            return results

        # Batch embed (Vertex AI supports batching)
        try:
            embeddings = self.embedding_model.get_embeddings(texts)
        except Exception as exc:
            logger.error(f"Batch embedding failed: {exc}")
            return results

        rows = []
        for event, text, embedding in zip(valid_events, texts, embeddings):
            embedding_id = f"emb-{uuid.uuid4().hex[:12]}"
            rows.append({
                "embedding_id": embedding_id,
                "event_id": event.get("event_id", "unknown"),
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "source": event.get("source"),
                "content_hash": hashlib.sha256(text.encode()).hexdigest()[:16],
                "content_preview": text[:200],
                "embedding": embedding.values,
                "model_id": DEFAULT_EMBEDDING_MODEL,
                "dimensions": len(embedding.values),
            })
            results.append({"embedding_id": embedding_id, "event_id": event.get("event_id")})

        if rows:
            try:
                errors = self.bq.insert_rows_json(self.embedding_table, rows)
                if errors:
                    logger.error(f"Batch BigQuery insert errors: {errors}")
            except Exception as bq_exc:
                logger.error(f"Failed to store batch embeddings: {bq_exc}")

        return results

    def search(self, query_text, top_k=10, source_filter=None, days_back=30):
        """
        Semantic search over event embeddings.

        Computes cosine similarity between query embedding and stored embeddings.

        Args:
            query_text: Natural language search query
            top_k: Number of results to return
            source_filter: Optional source filter (e.g., "gmail")
            days_back: How far back to search

        Returns:
            List of dicts with event_id, similarity, content_preview
        """
        try:
            query_embeddings = self.embedding_model.get_embeddings([query_text])
            query_vector = query_embeddings[0].values
        except Exception as exc:
            logger.error(f"Failed to embed query: {exc}")
            return []

        # Build BigQuery query using ML.DISTANCE or manual cosine similarity
        source_clause = ""
        params = [
            bigquery.ScalarQueryParameter("days_back", "INT64", days_back),
            bigquery.ScalarQueryParameter("top_k", "INT64", top_k),
        ]

        if source_filter:
            source_clause = "AND source = @source_filter"
            params.append(bigquery.ScalarQueryParameter("source_filter", "STRING", source_filter))

        # Use a UDF-free approach: fetch candidate embeddings and compute similarity in Python
        # For large datasets, consider BigQuery ML VECTOR_SEARCH instead
        query = """
        SELECT
          embedding_id,
          event_id,
          source,
          content_preview,
          embedding,
          timestamp
        FROM `{project}.openclaw.embeddings`
        WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days_back DAY)
          {source_clause}
        ORDER BY timestamp DESC
        LIMIT 1000
        """.format(
            project=self.project_id,
            source_clause=source_clause,
        )

        job_config = bigquery.QueryJobConfig(query_parameters=params)

        try:
            rows = list(self.bq.query(query, job_config=job_config))
        except Exception as exc:
            logger.error(f"Failed to query embeddings: {exc}")
            return []

        # Compute cosine similarity in Python
        results = []
        for row in rows:
            stored_vector = row.embedding
            if not stored_vector:
                continue
            similarity = self._cosine_similarity(query_vector, stored_vector)
            if similarity >= SIMILARITY_THRESHOLD:
                results.append({
                    "event_id": row.event_id,
                    "embedding_id": row.embedding_id,
                    "source": row.source,
                    "content_preview": row.content_preview,
                    "similarity": round(similarity, 4),
                    "timestamp": row.timestamp.isoformat() if row.timestamp else None,
                })

        results.sort(key=lambda r: r["similarity"], reverse=True)
        return results[:top_k]

    def find_similar_events(self, event_id, top_k=5):
        """
        Find events semantically similar to a given event.

        Args:
            event_id: The event to find similar events for
            top_k: Number of similar events to return

        Returns:
            List of similar events with similarity scores
        """
        # Get the embedding for the target event
        query = """
        SELECT embedding, content_preview
        FROM `{project}.openclaw.embeddings`
        WHERE event_id = @event_id
        ORDER BY timestamp DESC
        LIMIT 1
        """.format(project=self.project_id)

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("event_id", "STRING", event_id),
            ]
        )

        rows = list(self.bq.query(query, job_config=job_config))
        if not rows or not rows[0].embedding:
            logger.warning(f"No embedding found for event {event_id}")
            return []

        target_vector = rows[0].embedding

        # Fetch recent embeddings for comparison
        compare_query = """
        SELECT embedding_id, event_id, source, content_preview, embedding, timestamp
        FROM `{project}.openclaw.embeddings`
        WHERE event_id != @event_id
          AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
        ORDER BY timestamp DESC
        LIMIT 1000
        """.format(project=self.project_id)

        compare_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("event_id", "STRING", event_id),
            ]
        )

        candidates = list(self.bq.query(compare_query, job_config=compare_config))

        results = []
        for row in candidates:
            if not row.embedding:
                continue
            similarity = self._cosine_similarity(target_vector, row.embedding)
            if similarity >= SIMILARITY_THRESHOLD:
                results.append({
                    "event_id": row.event_id,
                    "source": row.source,
                    "content_preview": row.content_preview,
                    "similarity": round(similarity, 4),
                    "timestamp": row.timestamp.isoformat() if row.timestamp else None,
                })

        results.sort(key=lambda r: r["similarity"], reverse=True)

        # Store links for top results
        for r in results[:top_k]:
            self._store_link(event_id, r["event_id"], r["similarity"], "similar")

        return results[:top_k]

    def _store_link(self, source_event_id, target_event_id, similarity, link_type):
        """Store a semantic link between two events."""
        link_id = f"link-{uuid.uuid4().hex[:12]}"
        row = {
            "link_id": link_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "source_event_id": source_event_id,
            "target_event_id": target_event_id,
            "similarity_score": similarity,
            "link_type": link_type,
            "metadata": json.dumps({}),
        }
        try:
            self.bq.insert_rows_json(self.links_table, [row])
        except Exception as exc:
            logger.error(f"Failed to store semantic link: {exc}")

    def _embedding_exists(self, event_id, content_hash):
        """Check if an embedding already exists for this event+content."""
        query = """
        SELECT COUNT(*) as cnt
        FROM `{project}.openclaw.embeddings`
        WHERE event_id = @event_id AND content_hash = @content_hash
        """.format(project=self.project_id)

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("event_id", "STRING", event_id),
                bigquery.ScalarQueryParameter("content_hash", "STRING", content_hash),
            ]
        )

        try:
            rows = list(self.bq.query(query, job_config=job_config))
            return rows[0].cnt > 0 if rows else False
        except Exception:
            return False

    def _extract_text(self, event_data):
        """Extract text content from an event for embedding."""
        payload = event_data.get("payload")
        if payload is None:
            return None
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except json.JSONDecodeError:
                return payload[:2000] if payload.strip() else None
        if not isinstance(payload, dict):
            return None

        candidates = [
            payload.get("subject"),
            payload.get("snippet"),
            payload.get("body"),
            payload.get("body_text"),
            payload.get("text"),
            payload.get("content"),
            payload.get("description"),
            payload.get("title"),
        ]

        cleaned = [c.strip() for c in candidates if isinstance(c, str) and c.strip()]
        return "\n".join(cleaned) if cleaned else None

    @staticmethod
    def _cosine_similarity(vec_a, vec_b):
        """Compute cosine similarity between two vectors."""
        if len(vec_a) != len(vec_b):
            return 0.0
        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)
