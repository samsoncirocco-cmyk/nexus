# Enrichment Pipeline

## Purpose
Transform raw events into structured intelligence. Enrichment should be additive, non-blocking, and reversible.

## Text Enrichment (Cloud Natural Language)
Input: email subject/snippet/body, calendar descriptions, notes.
Outputs stored in `openclaw.nlp_enrichment`:
- `event_id`
- `timestamp`
- `language`
- `entities` (array of {name, type, salience, metadata})
- `sentiment_score`
- `sentiment_magnitude`
- `raw_text` (optional; redact if needed)

## Vision Enrichment (Cloud Vision)
Input: Drive image file IDs.
Outputs stored in `openclaw.vision_enrichment`:
- `file_id`, `event_id`
- `labels`, `objects`, `text_annotations`
- `dominant_colors`
- `safe_search`

## Speech Enrichment (Speech-to-Text)
Input: audio files, meeting recordings.
Outputs stored in `openclaw.speech_enrichment`:
- `file_id`, `event_id`
- `transcript`, `confidence`, `language_code`
- word-level timestamps (optional)

## Video Enrichment (Video Intelligence)
Input: Drive video file IDs.
Outputs stored in `openclaw.video_enrichment`:
- `file_id`, `event_id`
- `shot_labels`, `object_tracking`, `text_detection`
- `explicit_content` scores

## Geo Enrichment (Maps/Places)
Input: addresses in email/calendar or GPS metadata from photos.
Outputs stored in `openclaw.geo_enrichment`:
- `event_id` or `file_id`
- `address`, `lat`, `lng`
- `place_id`, `place_name`, `types`, `rating`

## Orchestration
- Enrichment runs asynchronously after ingestion.
- Failures are logged; original event remains usable.
- Prefer batch processing for backfills; real-time for new events.

## Privacy Controls
- Redact or hash sensitive fields before enrichment when possible.
- Keep raw content in source systems; store references in BigQuery.
