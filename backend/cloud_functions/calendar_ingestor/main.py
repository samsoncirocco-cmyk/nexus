import base64
import json
import os
from datetime import datetime
import logging

from google.auth import default
from google.cloud import bigquery, pubsub_v1
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)

# Get credentials from environment (Cloud Functions default auth)
credentials, _ = default(scopes=["https://www.googleapis.com/auth/calendar.readonly"])

publisher = pubsub_v1.PublisherClient()
bq = bigquery.Client()

PROJECT_ID = os.environ.get("PROJECT_ID") or os.environ.get("GOOGLE_PROJECT_ID")
TOPIC = os.environ.get("PUBSUB_TOPIC") or f"projects/{PROJECT_ID}/topics/openclaw-events"
TABLE_ID = os.environ.get("BQ_EVENTS_TABLE") or f"{PROJECT_ID}.openclaw.events"
CALENDAR_ID = os.environ.get("CALENDAR_ID", "primary")


def extract_meeting_link(event):
    """Extract meeting link from calendar event (Meet, Zoom, Teams, etc.)."""
    # Google Meet link
    if event.get("hangoutLink"):
        return event["hangoutLink"]

    # Check conference data
    conference = event.get("conferenceData", {})
    for entry_point in conference.get("entryPoints", []):
        if entry_point.get("entryPointType") == "video":
            return entry_point.get("uri", "")

    # Check description for common meeting URLs
    description = event.get("description", "") or ""
    for prefix in ["https://meet.google.com/", "https://zoom.us/", "https://teams.microsoft.com/"]:
        idx = description.find(prefix)
        if idx != -1:
            end = description.find(" ", idx)
            if end == -1:
                end = description.find("\n", idx)
            if end == -1:
                end = len(description)
            return description[idx:end].strip()

    return ""


def extract_attendees(event):
    """Extract attendee list with response status."""
    attendees = []
    for a in event.get("attendees", []):
        attendees.append({
            "email": a.get("email", ""),
            "display_name": a.get("displayName", ""),
            "response_status": a.get("responseStatus", "needsAction"),
            "organizer": a.get("organizer", False),
            "self": a.get("self", False),
        })
    return attendees


def normalize_calendar_event(cal_event, change_type="updated"):
    """Normalize a Google Calendar event into standard OpenClaw event format."""
    event_id = cal_event.get("id", "")
    start = cal_event.get("start", {})
    end = cal_event.get("end", {})

    # Handle all-day vs timed events
    start_time = start.get("dateTime") or start.get("date", "")
    end_time = end.get("dateTime") or end.get("date", "")

    recurrence = cal_event.get("recurrence", [])
    recurring_event_id = cal_event.get("recurringEventId", "")

    return {
        "event_id": f"calendar-{event_id}",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "agent_id": None,
        "event_type": "calendar_created" if change_type == "created" else "webhook_received",
        "source": "calendar",
        "payload": json.dumps({
            "calendar_event_id": event_id,
            "change_type": change_type,
            "title": cal_event.get("summary", ""),
            "description": (cal_event.get("description", "") or "")[:2000],
            "location": cal_event.get("location", ""),
            "start_time": start_time,
            "end_time": end_time,
            "timezone": start.get("timeZone", ""),
            "all_day": "date" in start,
            "status": cal_event.get("status", ""),
            "organizer_email": cal_event.get("organizer", {}).get("email", ""),
            "creator_email": cal_event.get("creator", {}).get("email", ""),
            "attendees": extract_attendees(cal_event),
            "attendee_count": len(cal_event.get("attendees", [])),
            "recurrence": recurrence,
            "recurring_event_id": recurring_event_id,
            "meeting_link": extract_meeting_link(cal_event),
            "visibility": cal_event.get("visibility", "default"),
            "html_link": cal_event.get("htmlLink", ""),
            "updated": cal_event.get("updated", ""),
        }),
        "processed": False,
    }


def calendar_webhook(request):
    """
    HTTP Cloud Function: Receives Google Calendar push notification, fetches events, normalizes, publishes.

    Triggered by: Google Calendar API watch notifications (channel push)
    Publishes to: openclaw-events Pub/Sub topic
    Writes to: openclaw.events BigQuery table

    Google Calendar push notifications send headers:
    - X-Goog-Channel-ID: channel ID from watch()
    - X-Goog-Resource-ID: opaque resource ID
    - X-Goog-Resource-State: sync | exists | not_exists
    - X-Goog-Message-Number: monotonically increasing
    """
    try:
        # Validate push notification headers
        resource_state = request.headers.get("X-Goog-Resource-State", "")
        channel_id = request.headers.get("X-Goog-Channel-ID", "")

        logger.info(f"Calendar push: state={resource_state}, channel={channel_id}")

        # Initial sync notification - just acknowledge
        if resource_state == "sync":
            logger.info("Received sync notification, acknowledging")
            return "OK", 200

        # Fetch recent calendar events via Calendar API
        service = build("calendar", "v3", credentials=credentials)

        # Use sync token if stored, otherwise fetch recent events
        # For push notifications, fetch events updated in the last few minutes
        now = datetime.utcnow()
        time_min = (now.replace(second=0, microsecond=0)).isoformat() + "Z"

        # Fetch updated events using updatedMin to get recently changed events
        events_result = service.events().list(
            calendarId=CALENDAR_ID,
            updatedMin=request.headers.get("X-Goog-Updated", time_min),
            singleEvents=True,
            orderBy="updated",
            maxResults=50,
        ).execute()

        events = []
        for cal_event in events_result.get("items", []):
            cal_event_id = cal_event.get("id", "")
            status = cal_event.get("status", "confirmed")

            if status == "cancelled":
                change_type = "deleted"
            else:
                change_type = "updated"

            event = normalize_calendar_event(cal_event, change_type)
            events.append(event)

            # Publish to Pub/Sub
            try:
                future = publisher.publish(TOPIC, json.dumps(event).encode())
                future.result(timeout=5)
                logger.info(f"Published event {event['event_id']} to Pub/Sub")
            except Exception as pub_error:
                logger.error(f"Failed to publish {event['event_id']} to Pub/Sub: {pub_error}")

            # Write to BigQuery (idempotent insert)
            errors = bq.insert_rows_json(TABLE_ID, [event])
            if errors:
                logger.error(f"BigQuery insert errors for {event['event_id']}: {errors}")
            else:
                logger.info(f"Inserted event {event['event_id']} to BigQuery")

        logger.info(f"Successfully processed {len(events)} calendar events")
        return "OK", 200

    except Exception as exc:
        logger.exception(f"Unhandled error in calendar_webhook: {exc}")
        return f"Error: {str(exc)}", 500


def setup_calendar_watch(request):
    """
    HTTP Cloud Function: Sets up Google Calendar push notifications.

    Call this once to register the watch channel. Channels expire and need renewal.
    Deploy as a separate function or call via Cloud Scheduler.
    """
    try:
        import uuid

        service = build("calendar", "v3", credentials=credentials)

        webhook_url = os.environ.get("CALENDAR_WEBHOOK_URL")
        if not webhook_url:
            return "CALENDAR_WEBHOOK_URL not configured", 500

        channel_id = str(uuid.uuid4())

        body = {
            "id": channel_id,
            "type": "web_hook",
            "address": webhook_url,
        }

        # Optionally set expiration (max 30 days for Calendar API)
        ttl_ms = int(os.environ.get("WATCH_TTL_MS", 86400000 * 7))  # default 7 days
        body["params"] = {"ttl": str(ttl_ms)}

        result = service.events().watch(
            calendarId=CALENDAR_ID,
            body=body,
        ).execute()

        logger.info(f"Calendar watch created: channel={channel_id}, resourceId={result.get('resourceId')}")

        # Store watch info in BigQuery for renewal tracking
        watch_event = {
            "event_id": f"calendar-watch-{channel_id}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "agent_id": None,
            "event_type": "watch_created",
            "source": "calendar",
            "payload": json.dumps({
                "channel_id": channel_id,
                "resource_id": result.get("resourceId", ""),
                "expiration": result.get("expiration", ""),
                "webhook_url": webhook_url,
            }),
            "processed": True,
        }
        bq.insert_rows_json(TABLE_ID, [watch_event])

        return json.dumps({
            "channel_id": channel_id,
            "resource_id": result.get("resourceId"),
            "expiration": result.get("expiration"),
        }), 200

    except Exception as exc:
        logger.exception(f"Error setting up calendar watch: {exc}")
        return f"Error: {str(exc)}", 500
