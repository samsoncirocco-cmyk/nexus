import json
import os
import uuid
from datetime import datetime, timedelta
from collections import Counter, defaultdict
import logging

from google.cloud import bigquery

logger = logging.getLogger(__name__)

PROJECT_ID = os.environ.get("PROJECT_ID") or os.environ.get("GOOGLE_PROJECT_ID")
OBSERVATIONS_TABLE = f"{PROJECT_ID}.openclaw.observations"


class CalendarPatternDetector:
    """Analyzes calendar event history in BigQuery to detect patterns and anomalies."""

    def __init__(self, project_id=None):
        self.project_id = project_id or PROJECT_ID
        self.bq = bigquery.Client()
        self.observations_table = f"{self.project_id}.openclaw.observations"

    def _query(self, sql, params=None):
        """Execute a BigQuery query with optional parameters."""
        job_config = bigquery.QueryJobConfig(query_parameters=params or [])
        return list(self.bq.query(sql, job_config=job_config))

    def _store_observation(self, entity_type, entity_id, observation_type, value, confidence=0.8, ttl_days=30):
        """Store a pattern observation in BigQuery."""
        row = {
            "observation_id": f"cal-obs-{uuid.uuid4().hex[:12]}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "agent_id": "calendar_pattern_detector",
            "entity_type": entity_type,
            "entity_id": entity_id,
            "observation_type": observation_type,
            "value": json.dumps(value),
            "confidence": confidence,
            "expires_at": (datetime.utcnow() + timedelta(days=ttl_days)).isoformat() + "Z",
        }
        errors = self.bq.insert_rows_json(self.observations_table, [row])
        if errors:
            logger.error(f"Failed to store observation: {errors}")
        return row["observation_id"]

    def detect_recurring_meetings(self, days=30):
        """Detect recurring meeting patterns from calendar event history."""
        query = """
        SELECT
          JSON_VALUE(payload, '$.title') as title,
          JSON_VALUE(payload, '$.recurring_event_id') as recurring_id,
          JSON_VALUE(payload, '$.organizer_email') as organizer,
          COUNT(*) as occurrence_count,
          ARRAY_AGG(JSON_VALUE(payload, '$.start_time') ORDER BY timestamp LIMIT 10) as start_times,
          AVG(CAST(JSON_VALUE(payload, '$.attendee_count') AS INT64)) as avg_attendees
        FROM `{project}.openclaw.events`
        WHERE source = 'calendar'
          AND JSON_VALUE(payload, '$.change_type') != 'deleted'
          AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
        GROUP BY title, recurring_id, organizer
        HAVING COUNT(*) >= 2
        ORDER BY occurrence_count DESC
        LIMIT 50
        """.format(project=self.project_id)

        rows = self._query(query, [
            bigquery.ScalarQueryParameter("days", "INT64", days),
        ])

        patterns = []
        for row in rows:
            pattern = {
                "title": row.title,
                "recurring_id": row.recurring_id,
                "organizer": row.organizer,
                "occurrence_count": row.occurrence_count,
                "avg_attendees": round(row.avg_attendees or 0, 1),
                "sample_times": list(row.start_times or []),
            }
            patterns.append(pattern)

            # Store as observation
            self._store_observation(
                entity_type="calendar_meeting",
                entity_id=row.recurring_id or row.title,
                observation_type="recurring_pattern",
                value=pattern,
                confidence=min(0.5 + row.occurrence_count * 0.1, 0.99),
            )

        logger.info(f"Detected {len(patterns)} recurring meeting patterns")
        return patterns

    def detect_busy_free_patterns(self, days=14):
        """Analyze busy/free time patterns by day of week and hour."""
        query = """
        SELECT
          EXTRACT(DAYOFWEEK FROM PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%S',
            SPLIT(JSON_VALUE(payload, '$.start_time'), '+')[OFFSET(0)])) as day_of_week,
          EXTRACT(HOUR FROM PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%S',
            SPLIT(JSON_VALUE(payload, '$.start_time'), '+')[OFFSET(0)])) as hour_of_day,
          COUNT(*) as meeting_count
        FROM `{project}.openclaw.events`
        WHERE source = 'calendar'
          AND JSON_VALUE(payload, '$.change_type') != 'deleted'
          AND JSON_VALUE(payload, '$.all_day') = 'false'
          AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
        GROUP BY day_of_week, hour_of_day
        ORDER BY day_of_week, hour_of_day
        """.format(project=self.project_id)

        rows = self._query(query, [
            bigquery.ScalarQueryParameter("days", "INT64", days),
        ])

        # Build heatmap: day_of_week -> hour -> count
        heatmap = defaultdict(lambda: defaultdict(int))
        total_meetings = 0
        for row in rows:
            heatmap[row.day_of_week][row.hour_of_day] = row.meeting_count
            total_meetings += row.meeting_count

        # Find busiest and freest slots
        busy_slots = []
        free_slots = []
        day_names = {1: "Sunday", 2: "Monday", 3: "Tuesday", 4: "Wednesday",
                     5: "Thursday", 6: "Friday", 7: "Saturday"}

        for dow in range(2, 7):  # Monday-Friday
            for hour in range(8, 18):  # Business hours
                count = heatmap[dow][hour]
                slot = {"day": day_names.get(dow, str(dow)), "hour": hour, "meeting_count": count}
                if count >= 2:
                    busy_slots.append(slot)
                elif count == 0:
                    free_slots.append(slot)

        result = {
            "total_meetings": total_meetings,
            "busy_slots": sorted(busy_slots, key=lambda s: -s["meeting_count"])[:10],
            "free_slots": free_slots[:10],
            "heatmap": {str(k): dict(v) for k, v in heatmap.items()},
        }

        self._store_observation(
            entity_type="calendar_schedule",
            entity_id="weekly_pattern",
            observation_type="busy_free_pattern",
            value=result,
            confidence=0.7 if total_meetings > 10 else 0.4,
            ttl_days=7,
        )

        logger.info(f"Detected busy/free patterns from {total_meetings} meetings")
        return result

    def detect_meeting_frequency_by_contact(self, days=30):
        """Analyze meeting frequency grouped by attendee contact."""
        query = """
        SELECT
          attendee.email as contact_email,
          attendee.display_name as contact_name,
          COUNT(DISTINCT e.event_id) as meeting_count,
          MIN(e.timestamp) as first_meeting,
          MAX(e.timestamp) as last_meeting
        FROM `{project}.openclaw.events` e,
        UNNEST(JSON_QUERY_ARRAY(payload, '$.attendees')) as raw_attendee
        CROSS JOIN UNNEST([STRUCT(
          JSON_VALUE(raw_attendee, '$.email') as email,
          JSON_VALUE(raw_attendee, '$.display_name') as display_name,
          JSON_VALUE(raw_attendee, '$.self') as is_self
        )]) as attendee
        WHERE e.source = 'calendar'
          AND JSON_VALUE(payload, '$.change_type') != 'deleted'
          AND attendee.is_self = 'false'
          AND e.timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
        GROUP BY contact_email, contact_name
        HAVING COUNT(DISTINCT e.event_id) >= 2
        ORDER BY meeting_count DESC
        LIMIT 30
        """.format(project=self.project_id)

        rows = self._query(query, [
            bigquery.ScalarQueryParameter("days", "INT64", days),
        ])

        contacts = []
        for row in rows:
            contact = {
                "email": row.contact_email,
                "name": row.contact_name,
                "meeting_count": row.meeting_count,
                "first_meeting": row.first_meeting.isoformat() if row.first_meeting else None,
                "last_meeting": row.last_meeting.isoformat() if row.last_meeting else None,
            }
            contacts.append(contact)

            self._store_observation(
                entity_type="contact",
                entity_id=row.contact_email,
                observation_type="meeting_frequency",
                value=contact,
                confidence=0.85,
            )

        logger.info(f"Detected meeting frequency for {len(contacts)} contacts")
        return contacts

    def suggest_optimal_meeting_times(self, duration_minutes=30, days_ahead=5):
        """Suggest optimal meeting times based on historical free slots."""
        busy_free = self.detect_busy_free_patterns(days=14)
        free_slots = busy_free.get("free_slots", [])

        day_order = {"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4}
        suggestions = []

        for slot in free_slots:
            day_name = slot["day"]
            hour = slot["hour"]
            if day_name in day_order and 9 <= hour <= 16:
                suggestions.append({
                    "day": day_name,
                    "time": f"{hour:02d}:00",
                    "duration_minutes": duration_minutes,
                    "reason": "Historically free time slot with no recurring meetings",
                })

        suggestions.sort(key=lambda s: (day_order.get(s["day"], 99), int(s["time"][:2])))

        if suggestions:
            self._store_observation(
                entity_type="calendar_schedule",
                entity_id="optimal_times",
                observation_type="scheduling_suggestion",
                value={"suggestions": suggestions[:10]},
                confidence=0.6,
                ttl_days=7,
            )

        logger.info(f"Generated {len(suggestions)} optimal time suggestions")
        return suggestions[:10]

    def detect_anomalies(self, days=7):
        """Detect scheduling anomalies: off-hours meetings, double-bookings, recurring gaps."""
        anomalies = []

        # 1. Off-hours meetings
        off_hours_query = """
        SELECT
          event_id,
          JSON_VALUE(payload, '$.title') as title,
          JSON_VALUE(payload, '$.start_time') as start_time,
          JSON_VALUE(payload, '$.organizer_email') as organizer
        FROM `{project}.openclaw.events`
        WHERE source = 'calendar'
          AND JSON_VALUE(payload, '$.change_type') != 'deleted'
          AND JSON_VALUE(payload, '$.all_day') = 'false'
          AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
          AND (
            EXTRACT(HOUR FROM PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%S',
              SPLIT(JSON_VALUE(payload, '$.start_time'), '+')[OFFSET(0)])) < 8
            OR EXTRACT(HOUR FROM PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%S',
              SPLIT(JSON_VALUE(payload, '$.start_time'), '+')[OFFSET(0)])) >= 19
            OR EXTRACT(DAYOFWEEK FROM PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%S',
              SPLIT(JSON_VALUE(payload, '$.start_time'), '+')[OFFSET(0)])) IN (1, 7)
          )
        LIMIT 20
        """.format(project=self.project_id)

        off_hours = self._query(off_hours_query, [
            bigquery.ScalarQueryParameter("days", "INT64", days),
        ])

        for row in off_hours:
            anomaly = {
                "type": "off_hours_meeting",
                "event_id": row.event_id,
                "title": row.title,
                "start_time": row.start_time,
                "organizer": row.organizer,
                "severity": "low",
            }
            anomalies.append(anomaly)

        # 2. Double-bookings (overlapping events)
        overlap_query = """
        WITH parsed_events AS (
          SELECT
            event_id,
            JSON_VALUE(payload, '$.title') as title,
            PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%S',
              SPLIT(JSON_VALUE(payload, '$.start_time'), '+')[OFFSET(0)]) as start_ts,
            PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%S',
              SPLIT(JSON_VALUE(payload, '$.end_time'), '+')[OFFSET(0)]) as end_ts
          FROM `{project}.openclaw.events`
          WHERE source = 'calendar'
            AND JSON_VALUE(payload, '$.change_type') != 'deleted'
            AND JSON_VALUE(payload, '$.all_day') = 'false'
            AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
        )
        SELECT
          a.event_id as event_a,
          a.title as title_a,
          b.event_id as event_b,
          b.title as title_b,
          a.start_ts as start_a,
          a.end_ts as end_a,
          b.start_ts as start_b
        FROM parsed_events a
        JOIN parsed_events b ON a.event_id < b.event_id
          AND a.start_ts < b.end_ts
          AND a.end_ts > b.start_ts
        LIMIT 20
        """.format(project=self.project_id)

        overlaps = self._query(overlap_query, [
            bigquery.ScalarQueryParameter("days", "INT64", days),
        ])

        for row in overlaps:
            anomaly = {
                "type": "double_booking",
                "event_a": row.event_a,
                "title_a": row.title_a,
                "event_b": row.event_b,
                "title_b": row.title_b,
                "severity": "medium",
            }
            anomalies.append(anomaly)

        # Store anomalies as observations
        if anomalies:
            self._store_observation(
                entity_type="calendar_schedule",
                entity_id="anomalies",
                observation_type="scheduling_anomaly",
                value={"anomalies": anomalies, "detection_window_days": days},
                confidence=0.75,
                ttl_days=7,
            )

        logger.info(f"Detected {len(anomalies)} scheduling anomalies")
        return anomalies

    def detect_recurring_gaps(self, days=30):
        """Detect gaps in recurring meeting series (missed instances)."""
        query = """
        SELECT
          JSON_VALUE(payload, '$.recurring_event_id') as recurring_id,
          JSON_VALUE(payload, '$.title') as title,
          COUNT(*) as instance_count,
          ARRAY_AGG(
            PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%S',
              SPLIT(JSON_VALUE(payload, '$.start_time'), '+')[OFFSET(0)])
            ORDER BY timestamp
          ) as instance_times
        FROM `{project}.openclaw.events`
        WHERE source = 'calendar'
          AND JSON_VALUE(payload, '$.recurring_event_id') IS NOT NULL
          AND JSON_VALUE(payload, '$.recurring_event_id') != ''
          AND JSON_VALUE(payload, '$.change_type') != 'deleted'
          AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
        GROUP BY recurring_id, title
        HAVING COUNT(*) >= 3
        ORDER BY instance_count DESC
        LIMIT 20
        """.format(project=self.project_id)

        rows = self._query(query, [
            bigquery.ScalarQueryParameter("days", "INT64", days),
        ])

        gaps = []
        for row in rows:
            times = sorted(row.instance_times)
            if len(times) < 3:
                continue

            # Calculate typical interval between instances
            intervals = [(times[i + 1] - times[i]).total_seconds() for i in range(len(times) - 1)]
            median_interval = sorted(intervals)[len(intervals) // 2]

            # Flag intervals that are >1.5x the median
            for i, interval in enumerate(intervals):
                if interval > median_interval * 1.8 and median_interval > 0:
                    gap = {
                        "recurring_id": row.recurring_id,
                        "title": row.title,
                        "gap_after": times[i].isoformat(),
                        "gap_before": times[i + 1].isoformat(),
                        "expected_interval_hours": round(median_interval / 3600, 1),
                        "actual_interval_hours": round(interval / 3600, 1),
                    }
                    gaps.append(gap)

        if gaps:
            self._store_observation(
                entity_type="calendar_meeting",
                entity_id="recurring_gaps",
                observation_type="recurring_series_gap",
                value={"gaps": gaps},
                confidence=0.7,
                ttl_days=14,
            )

        logger.info(f"Detected {len(gaps)} gaps in recurring series")
        return gaps

    def run_all_detections(self, days=30):
        """Run all pattern detections and return combined results."""
        results = {
            "recurring_meetings": self.detect_recurring_meetings(days=days),
            "busy_free_patterns": self.detect_busy_free_patterns(days=min(days, 14)),
            "contact_frequency": self.detect_meeting_frequency_by_contact(days=days),
            "optimal_times": self.suggest_optimal_meeting_times(),
            "anomalies": self.detect_anomalies(days=min(days, 7)),
            "recurring_gaps": self.detect_recurring_gaps(days=days),
            "detection_timestamp": datetime.utcnow().isoformat() + "Z",
        }
        logger.info("Completed all calendar pattern detections")
        return results
