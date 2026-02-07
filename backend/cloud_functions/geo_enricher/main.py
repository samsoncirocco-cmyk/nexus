import base64
import hashlib
import json
import logging
import os
import re
from datetime import datetime
from typing import Any, Dict, Optional, Tuple

import googlemaps
from google.cloud import bigquery

logger = logging.getLogger(__name__)


PROJECT_ID = os.environ.get("PROJECT_ID") or os.environ.get("GOOGLE_PROJECT_ID")
GEO_TABLE_ID = os.environ.get("BQ_GEO_TABLE") or (
    f"{PROJECT_ID}.openclaw.geo_enrichment" if PROJECT_ID else None
)
GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")


ADDRESS_HINT_RE = re.compile(
    r"(?P<addr>\d{1,6}\s+[\w\s.\-#]{3,},?\s+[\w\s.\-]{2,},?\s+[A-Z]{2}\s+\d{5}(-\d{4})?)"
)


def geo_enricher(event, context):
    """
    Pub/Sub Cloud Function: Enrich events with geocoding + Places context.

    Inputs:
      - Calendar events: payload.location
      - Any event: payload.raw_location / payload.address / best-effort regex from payload text fields

    Writes to: openclaw.geo_enrichment
    """
    if not PROJECT_ID or not GEO_TABLE_ID:
        logger.error("Missing required configuration (PROJECT_ID, GEO_TABLE_ID)")
        return "Missing config"

    if not GOOGLE_MAPS_API_KEY:
        logger.warning("GOOGLE_MAPS_API_KEY not set; skipping geo enrichment")
        return "OK"

    try:
        data = json.loads(base64.b64decode(event["data"]).decode("utf-8"))
    except Exception as exc:
        logger.error(f"Failed to decode Pub/Sub payload: {exc}")
        return "Bad payload"

    event_id = data.get("event_id", "unknown")
    source = data.get("source")
    timestamp = data.get("timestamp") or datetime.utcnow().isoformat() + "Z"

    payload = _parse_payload(data.get("payload"))
    raw_location, loc_source = _extract_location(source=source, payload=payload)
    if not raw_location:
        return "OK"

    geo_id = f"geo-{event_id}-{_short_hash(raw_location.encode('utf-8'))}"

    bq = bigquery.Client()
    if _geo_exists(bq, geo_id):
        return "OK"

    gmaps = googlemaps.Client(key=GOOGLE_MAPS_API_KEY)

    lat, lng, formatted, place_id = _geocode_or_parse_coords(gmaps, raw_location)
    place_name, place_types, place_rating, metadata = _place_details(gmaps, place_id, lat, lng)

    row = {
        "geo_id": geo_id,
        "event_id": event_id,
        "file_id": payload.get("file_id") or payload.get("fileId"),
        "timestamp": timestamp,
        "source": loc_source or source,
        "raw_location": raw_location,
        "formatted_address": formatted,
        "lat": lat,
        "lng": lng,
        "place_id": place_id,
        "place_name": place_name,
        "place_types": place_types,
        "place_rating": place_rating,
        "metadata": metadata,
    }

    errors = bq.insert_rows_json(GEO_TABLE_ID, [row])
    if errors:
        logger.error(f"BigQuery geo insert errors geo_id={geo_id}: {errors}")
    else:
        logger.info(f"Inserted geo enrichment geo_id={geo_id} event_id={event_id}")

    return "OK"


def _geo_exists(bq: bigquery.Client, geo_id: str) -> bool:
    query = f"SELECT COUNT(*) AS cnt FROM `{GEO_TABLE_ID}` WHERE geo_id = @geo_id"
    job_config = bigquery.QueryJobConfig(
        query_parameters=[bigquery.ScalarQueryParameter("geo_id", "STRING", geo_id)]
    )
    try:
        rows = list(bq.query(query, job_config=job_config))
        return bool(rows and rows[0].cnt and rows[0].cnt > 0)
    except Exception as exc:
        logger.warning(f"Geo dedupe query failed for {geo_id}: {exc}")
        return False


def _extract_location(*, source: Optional[str], payload: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
    # 1) Explicit fields
    for key in ["location", "raw_location", "address"]:
        val = payload.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip(), source or "unknown"

    # 2) Calendar payload commonly uses `location`
    if source == "calendar":
        loc = payload.get("location")
        if isinstance(loc, str) and loc.strip():
            return loc.strip(), "calendar"

    # 3) Best-effort regex scan of text content (emails/notes)
    text_candidates = [
        payload.get("body_text"),
        payload.get("body"),
        payload.get("text"),
        payload.get("description"),
        payload.get("content"),
        payload.get("notes"),
    ]
    combined = "\n".join([t for t in text_candidates if isinstance(t, str) and t.strip()])
    if combined:
        m = ADDRESS_HINT_RE.search(combined)
        if m:
            return m.group("addr").strip(), (source or "text")

    return None, None


def _geocode_or_parse_coords(
    gmaps: googlemaps.Client,
    raw_location: str,
) -> Tuple[Optional[float], Optional[float], Optional[str], Optional[str]]:
    # Accept "lat,lng"
    if "," in raw_location:
        maybe = raw_location.split(",", 1)
        try:
            lat = float(maybe[0].strip())
            lng = float(maybe[1].strip())
            return lat, lng, None, None
        except Exception:
            pass

    try:
        results = gmaps.geocode(raw_location)
    except Exception as exc:
        logger.error(f"Geocoding failed for location='{raw_location}': {exc}")
        return None, None, None, None

    if not results:
        return None, None, None, None

    top = results[0]
    formatted = top.get("formatted_address")
    place_id = top.get("place_id")
    loc = (top.get("geometry") or {}).get("location") or {}
    lat = loc.get("lat")
    lng = loc.get("lng")
    return lat, lng, formatted, place_id


def _place_details(
    gmaps: googlemaps.Client,
    place_id: Optional[str],
    lat: Optional[float],
    lng: Optional[float],
) -> Tuple[Optional[str], Any, Optional[float], Any]:
    if place_id:
        try:
            details = gmaps.place(
                place_id=place_id,
                fields=["name", "types", "rating", "url", "website", "formatted_phone_number"],
            )
            result = details.get("result") or {}
            return (
                result.get("name"),
                result.get("types"),
                result.get("rating"),
                result,
            )
        except Exception as exc:
            logger.warning(f"Place details failed place_id={place_id}: {exc}")
            return None, None, None, None

    # If we have coordinates but no place_id, try nearby search.
    if lat is not None and lng is not None:
        try:
            nearby = gmaps.places_nearby(location=(lat, lng), radius=50)
            results = nearby.get("results") or []
            if not results:
                return None, None, None, None
            top = results[0]
            return (
                top.get("name"),
                top.get("types"),
                top.get("rating"),
                top,
            )
        except Exception as exc:
            logger.warning(f"Places nearby failed lat={lat} lng={lng}: {exc}")
            return None, None, None, None

    return None, None, None, None


def _parse_payload(payload: Any) -> Dict[str, Any]:
    if payload is None:
        return {}
    if isinstance(payload, dict):
        return payload
    if isinstance(payload, str):
        try:
            parsed = json.loads(payload)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {"text": payload}
    return {}


def _short_hash(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()[:12]

