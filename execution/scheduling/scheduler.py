import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Optional
from dataclasses import dataclass
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ScheduledPost:
    id: str
    user_id: str
    platform: str
    content: str
    scheduled_at: datetime
    status: str  # 'pending', 'processing', 'published', 'failed'
    created_at: datetime

class Scheduler:
    """Handles processing and management of scheduled posts."""
    
    def __init__(self, db_client=None):
        """
        Initialize scheduler with database client.
        
        Args:
            db_client: Database client with query methods
        """
        self.db = db_client
        logger.info("Scheduler initialized")
    
    async def process_scheduled_posts(self) -> List[dict]:
        """
        Check database for posts due to be published.
        
        Returns:
            List of published post results
        """
        try:
            # Query for posts that are due and pending
            now = datetime.now(timezone.utc)
            
            # SQL query to get due posts
            query = """
                SELECT id, user_id, platform, content, scheduled_at, status, created_at
                FROM scheduled_posts
                WHERE scheduled_at <= %s 
                AND status = 'pending'
                ORDER BY scheduled_at ASC
                FOR UPDATE SKIP LOCKED
                LIMIT 100
            """
            
            if self.db:
                posts = await self.db.fetch(query, (now,))
            else:
                # Mock data for testing
                posts = []
                logger.warning("No database client, using mock data")
            
            results = []
            for post_data in posts:
                post = ScheduledPost(**post_data)
                result = await self.publish_due_post(post)
                results.append(result)
            
            logger.info(f"Processed {len(results)} scheduled posts")
            return results
            
        except Exception as e:
            logger.error(f"Error processing scheduled posts: {e}")
            raise
    
    async def publish_due_post(self, post: ScheduledPost) -> dict:
        """
        Publish a scheduled post to its platform.
        
        Args:
            post: ScheduledPost to publish
            
        Returns:
            Publication result with status
        """
        try:
            # Mark as processing
            await self._update_post_status(post.id, 'processing')
            
            # Call platform publisher
            # This is a placeholder - actual implementation would call
            # the platform-specific OAuth flow
            publisher_result = await self._call_platform_publisher(
                post.platform,
                post.user_id,
                post.content
            )
            
            if publisher_result['success']:
                await self._update_post_status(
                    post.id, 
                    'published',
                    platform_post_id=publisher_result.get('post_id')
                )
                logger.info(f"Published post {post.id} to {post.platform}")
                return {
                    'post_id': post.id,
                    'status': 'published',
                    'platform': post.platform,
                    'platform_post_id': publisher_result.get('post_id')
                }
            else:
                await self._update_post_status(post.id, 'failed', 
                    error=publisher_result.get('error'))
                logger.error(f"Failed to publish post {post.id}: {publisher_result.get('error')}")
                return {
                    'post_id': post.id,
                    'status': 'failed',
                    'error': publisher_result.get('error')
                }
                
        except Exception as e:
            await self._update_post_status(post.id, 'failed', error=str(e))
            logger.error(f"Exception publishing post {post.id}: {e}")
            return {
                'post_id': post.id,
                'status': 'failed',
                'error': str(e)
            }
    
    async def reschedule_post(self, post_id: str, new_time: datetime) -> bool:
        """
        Update the scheduled time for a post.
        
        Args:
            post_id: ID of post to reschedule
            new_time: New scheduled time
            
        Returns:
            True if successful
        """
        try:
            query = """
                UPDATE scheduled_posts
                SET scheduled_at = %s, status = 'pending'
                WHERE id = %s
                AND status IN ('pending', 'failed')
            """
            
            if self.db:
                result = await self.db.execute(query, (new_time, post_id))
                logger.info(f"Rescheduled post {post_id} to {new_time}")
                return result > 0
            else:
                logger.warning(f"Mock reschedule: {post_id} -> {new_time}")
                return True
                
        except Exception as e:
            logger.error(f"Error rescheduling post {post_id}: {e}")
            raise
    
    async def cancel_scheduled_post(self, post_id: str) -> bool:
        """
        Cancel a scheduled post.
        
        Args:
            post_id: ID of post to cancel
            
        Returns:
            True if cancelled successfully
        """
        try:
            query = """
                DELETE FROM scheduled_posts
                WHERE id = %s
                AND status = 'pending'
            """
            
            if self.db:
                result = await self.db.execute(query, (post_id,))
                logger.info(f"Cancelled scheduled post {post_id}")
                return result > 0
            else:
                logger.warning(f"Mock cancel: {post_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error cancelling post {post_id}: {e}")
            raise
    
    async def schedule_new_post(self, user_id: str, platform: str, 
                                content: str, scheduled_at: datetime) -> str:
        """
        Create a new scheduled post.
        
        Args:
            user_id: User ID
            platform: Target platform
            content: Post content
            scheduled_at: When to publish
            
        Returns:
            New post ID
        """
        try:
            post_id = f"sch_{datetime.now().timestamp()}"
            
            query = """
                INSERT INTO scheduled_posts (id, user_id, platform, content, 
                                            scheduled_at, status, created_at)
                VALUES (%s, %s, %s, %s, %s, 'pending', %s)
            """
            
            if self.db:
                await self.db.execute(query, (
                    post_id, user_id, platform, content, 
                    scheduled_at, datetime.now(timezone.utc)
                ))
            
            logger.info(f"Created scheduled post {post_id}")
            return post_id
            
        except Exception as e:
            logger.error(f"Error creating scheduled post: {e}")
            raise
    
    async def _update_post_status(self, post_id: str, status: str, 
                                  platform_post_id: str = None,
                                  error: str = None):
        """Update post status in database."""
        query = """
            UPDATE scheduled_posts
            SET status = %s,
                platform_post_id = COALESCE(%s, platform_post_id),
                error = COALESCE(%s, error),
                updated_at = %s
            WHERE id = %s
        """
        
        if self.db:
            await self.db.execute(query, (
                status, platform_post_id, error, 
                datetime.now(timezone.utc), post_id
            ))
    
    async def _call_platform_publisher(self, platform: str, user_id: str, 
                                       content: str) -> dict:
        """
        Call the appropriate platform publisher.
        
        This is a placeholder - actual implementation would import
        and call the platform-specific OAuth modules.
        """
        # Placeholder implementation
        logger.info(f"Publishing to {platform} for user {user_id}")
        
        # In real implementation:
        # from execution.oauth.linkedin_flow import post_content
        # from execution.oauth.twitter_flow import post_tweet
        
        return {
            'success': True,
            'post_id': f'{platform}_post_{datetime.now().timestamp()}'
        }


# Synchronous wrapper for convenience
def run_scheduler():
    """Run scheduler process - called by cron job."""
    scheduler = Scheduler()
    results = asyncio.run(scheduler.process_scheduled_posts())
    return results


if __name__ == "__main__":
    # CLI usage
    import argparse
    
    parser = argparse.ArgumentParser(description="Nexus Scheduler")
    parser.add_argument("--process", action="store_true", 
                       help="Process due scheduled posts")
    
    args = parser.parse_args()
    
    if args.process:
        results = run_scheduler()
        print(f"Processed {len(results)} posts")
        for r in results:
            print(f"  - {r['post_id']}: {r['status']}")
