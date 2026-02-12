"""
Cron job definitions for Inngest/Trigger.dev
Handles scheduled tasks like processing posts and syncing analytics
"""

from inngest import Inngest
from datetime import datetime, timezone
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Inngest client
inngest_client = Inngest(
    app_id="nexus",
    event_key=os.getenv("INNGEST_EVENT_KEY"),
)


# Job 1: Process scheduled posts (every 5 minutes)
@inngest_client.create_function(
    fn_id="process-scheduled-posts",
    trigger=inngest_client.trigger.cron("*/5 * * * *"),  # Every 5 minutes
)
async def process_scheduled_posts(ctx):
    """Check for and publish due scheduled posts."""
    logger.info("Running scheduled post processor")
    
    try:
        from execution.scheduling.scheduler import Scheduler
        
        scheduler = Scheduler()
        results = await scheduler.process_scheduled_posts()
        
        success_count = sum(1 for r in results if r['status'] == 'published')
        failed_count = len(results) - success_count
        
        logger.info(f"Processed {len(results)} posts: {success_count} success, {failed_count} failed")
        
        return {
            "success": True,
            "processed": len(results),
            "published": success_count,
            "failed": failed_count
        }
        
    except Exception as e:
        logger.error(f"Error in scheduled post processor: {e}")
        return {"success": False, "error": str(e)}


# Job 2: Sync analytics (every 6 hours)
@inngest_client.create_function(
    fn_id="sync-analytics",
    trigger=inngest_client.trigger.cron("0 */6 * * *"),  # Every 6 hours
)
async def sync_analytics(ctx):
    """Sync engagement metrics from all platforms."""
    logger.info("Running analytics sync")
    
    try:
        from execution.analytics.sync_metrics import sync_all_platforms
        
        results = await sync_all_platforms()
        
        logger.info(f"Synced analytics for {len(results)} platforms")
        
        return {
            "success": True,
            "platforms_synced": len(results),
            "details": results
        }
        
    except Exception as e:
        logger.error(f"Error in analytics sync: {e}")
        return {"success": False, "error": str(e)}


# Job 3: Reset monthly usage (1st of month at 00:00)
@inngest_client.create_function(
    fn_id="reset-monthly-usage",
    trigger=inngest_client.trigger.cron("0 0 1 * *"),  # 1st of month at midnight
)
async def reset_monthly_usage(ctx):
    """Reset monthly post usage counters for all users."""
    logger.info("Running monthly usage reset")
    
    try:
        from execution.database.supabase_client import NexusDB
        
        db = NexusDB()
        
        # Reset all usage records
        query = """
            UPDATE usage_records
            SET count = 0, period_start = %s, period_end = %s
            WHERE metric = 'posts'
        """
        
        now = datetime.now(timezone.utc)
        # Calculate period (1st of this month to 1st of next month)
        if now.month == 12:
            next_month = now.replace(year=now.year + 1, month=1, day=1)
        else:
            next_month = now.replace(month=now.month + 1, day=1)
        
        await db.execute(query, (now, next_month))
        
        logger.info("Reset monthly usage counters")
        
        return {
            "success": True,
            "reset_at": now.isoformat(),
            "next_period_start": next_month.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error resetting usage: {e}")
        return {"success": False, "error": str(e)}


# Alternative: Trigger.dev configuration (if using Trigger.dev instead of Inngest)
"""
from trigger.dev import TriggerClient
from trigger.dev.schedules import cron

trigger = TriggerClient(api_key=os.getenv("TRIGGER_API_KEY"))

@trigger.schedule(cron="*/5 * * * *")
def process_scheduled_posts_trigger():
    # Same logic as above
    pass

@trigger.schedule(cron="0 */6 * * *")
def sync_analytics_trigger():
    # Same logic as above
    pass

@trigger.schedule(cron="0 0 1 * *")
def reset_usage_trigger():
    # Same logic as above
    pass
"""


if __name__ == "__main__":
    # Serve Inngest functions
    import asyncio
    import os
    
    # This would be run by the Inngest/Trigger.dev runner
    print("Inngest jobs configured:")
    print("  - process-scheduled-posts (every 5 min)")
    print("  - sync-analytics (every 6 hours)")
    print("  - reset-monthly-usage (1st of month)")
