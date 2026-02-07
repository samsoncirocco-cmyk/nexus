-- OpenClaw: Calendar Analytics Views
-- Companion to execution/bigquery_setup.sql

-- ===========================================================================
-- 1. CALENDAR PATTERNS VIEW
-- Aggregated calendar event analytics for pattern detection
-- ===========================================================================

CREATE OR REPLACE VIEW `openclaw.calendar_patterns` AS
WITH calendar_events AS (
  SELECT
    event_id,
    timestamp,
    JSON_VALUE(payload, '$.calendar_event_id') as calendar_event_id,
    JSON_VALUE(payload, '$.title') as title,
    JSON_VALUE(payload, '$.change_type') as change_type,
    JSON_VALUE(payload, '$.start_time') as start_time,
    JSON_VALUE(payload, '$.end_time') as end_time,
    JSON_VALUE(payload, '$.location') as location,
    JSON_VALUE(payload, '$.organizer_email') as organizer_email,
    JSON_VALUE(payload, '$.meeting_link') as meeting_link,
    CAST(JSON_VALUE(payload, '$.attendee_count') AS INT64) as attendee_count,
    CAST(JSON_VALUE(payload, '$.all_day') AS BOOL) as all_day,
    JSON_VALUE(payload, '$.recurring_event_id') as recurring_event_id,
    JSON_VALUE(payload, '$.status') as event_status,
    JSON_VALUE(payload, '$.visibility') as visibility
  FROM `openclaw.events`
  WHERE source = 'calendar'
    AND JSON_VALUE(payload, '$.change_type') != 'deleted'
)
SELECT
  event_id,
  timestamp,
  calendar_event_id,
  title,
  change_type,
  start_time,
  end_time,
  location,
  organizer_email,
  meeting_link,
  attendee_count,
  all_day,
  recurring_event_id,
  event_status,
  visibility,
  CASE
    WHEN recurring_event_id IS NOT NULL AND recurring_event_id != '' THEN TRUE
    ELSE FALSE
  END as is_recurring,
  CASE
    WHEN meeting_link IS NOT NULL AND meeting_link != '' THEN TRUE
    ELSE FALSE
  END as has_meeting_link
FROM calendar_events
ORDER BY timestamp DESC;

-- ===========================================================================
-- 2. CALENDAR WEEKLY SUMMARY VIEW
-- Weekly meeting statistics
-- ===========================================================================

CREATE OR REPLACE VIEW `openclaw.calendar_weekly_summary` AS
SELECT
  DATE_TRUNC(timestamp, WEEK) as week_start,
  COUNT(*) as total_events,
  COUNTIF(CAST(JSON_VALUE(payload, '$.all_day') AS BOOL) = FALSE) as timed_meetings,
  COUNTIF(CAST(JSON_VALUE(payload, '$.all_day') AS BOOL) = TRUE) as all_day_events,
  COUNTIF(JSON_VALUE(payload, '$.recurring_event_id') IS NOT NULL
    AND JSON_VALUE(payload, '$.recurring_event_id') != '') as recurring_events,
  COUNTIF(JSON_VALUE(payload, '$.meeting_link') IS NOT NULL
    AND JSON_VALUE(payload, '$.meeting_link') != '') as virtual_meetings,
  AVG(CAST(JSON_VALUE(payload, '$.attendee_count') AS INT64)) as avg_attendees,
  COUNT(DISTINCT JSON_VALUE(payload, '$.organizer_email')) as unique_organizers
FROM `openclaw.events`
WHERE source = 'calendar'
  AND JSON_VALUE(payload, '$.change_type') != 'deleted'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
GROUP BY week_start
ORDER BY week_start DESC;

-- ===========================================================================
-- 3. CALENDAR TOP CONTACTS VIEW
-- Most frequent meeting contacts
-- ===========================================================================

CREATE OR REPLACE VIEW `openclaw.calendar_top_contacts` AS
SELECT
  attendee_email,
  attendee_name,
  COUNT(DISTINCT event_id) as meeting_count,
  MIN(timestamp) as first_meeting,
  MAX(timestamp) as last_meeting
FROM (
  SELECT
    e.event_id,
    e.timestamp,
    JSON_VALUE(a, '$.email') as attendee_email,
    JSON_VALUE(a, '$.display_name') as attendee_name,
    JSON_VALUE(a, '$.self') as is_self
  FROM `openclaw.events` e,
  UNNEST(JSON_QUERY_ARRAY(payload, '$.attendees')) as a
  WHERE e.source = 'calendar'
    AND JSON_VALUE(payload, '$.change_type') != 'deleted'
)
WHERE is_self = 'false'
  AND attendee_email IS NOT NULL
GROUP BY attendee_email, attendee_name
HAVING COUNT(DISTINCT event_id) >= 2
ORDER BY meeting_count DESC;
