#!/usr/bin/env python3
"""
Nexus Analytics - Metrics Sync
Fetches engagement metrics from LinkedIn and Twitter/X APIs.
Stores snapshots in Supabase analytics_snapshots table.

Usage:
    python sync_metrics.py --user-id <uuid> [--platform <platform>] [--dry-run]
    python sync_metrics.py --all-users [--platform <platform>]
"""

import os
import sys
import json
import time
import argparse
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
from dataclasses import dataclass
from enum import Enum

import requests
from supabase import create_client, Client

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('analytics_sync')


class Platform(Enum):
    LINKEDIN = 'linkedin'
    TWITTER = 'twitter'


@dataclass
class MetricsSnapshot:
    """Unified metrics snapshot for any platform."""
    post_id: str
    platform: str
    platform_post_id: str
    impressions: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    clicks: int = 0
    replies: int = 0
    retweets: int = 0
    quotes: int = 0
    bookmarks: int = 0
    engagement_rate: float = 0.0
    engagement_score: float = 0.0
    collected_at: Optional[datetime] = None


class RateLimiter:
    """Simple rate limit tracker with exponential backoff."""
    
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: List[float] = []
        self.backoff_until: Optional[float] = None
    
    def can_request(self) -> bool:
        if self.backoff_until and time.time() < self.backoff_until:
            return False
        
        # Clean old requests
        cutoff = time.time() - self.window_seconds
        self.requests = [t for t in self.requests if t > cutoff]
        
        return len(self.requests) < self.max_requests
    
    def record_request(self):
        self.requests.append(time.time())
    
    def backoff(self, seconds: int):
        self.backoff_until = time.time() + seconds
        logger.warning(f"Rate limited. Backing off for {seconds} seconds")


class AnalyticsSync:
    """Main sync orchestrator."""
    
    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.rate_limiters = {
            Platform.LINKEDIN: RateLimiter(max_requests=100, window_seconds=3600),
            Platform.TWITTER: RateLimiter(max_requests=900, window_seconds=900)
        }
    
    def fetch_linkedin_metrics(self, post_id: str, access_token: str) -> Optional[MetricsSnapshot]:
        """
        Fetch metrics from LinkedIn API.
        
        LinkedIn API v2: /v2/socialActions/{entityUrn}
        """
        if not self.rate_limiters[Platform.LINKEDIN].can_request():
            logger.warning("LinkedIn rate limit reached, skipping")
            return None
        
        try:
            # LinkedIn requires specific headers
            headers = {
                'Authorization': f'Bearer {access_token}',
                'X-Restli-Protocol-Version': '2.0.0',
                'Content-Type': 'application/json'
            }
            
            # Format post URN (assumes post_id is already formatted)
            entity_urn = f"urn:li:share:{post_id}" if ':' not in post_id else post_id
            
            # Fetch social actions (likes, comments)
            url = f"https://api.linkedin.com/v2/socialActions/{entity_urn}"
            response = requests.get(url, headers=headers, timeout=30)
            
            if response.status_code == 429:
                # Rate limited
                self.rate_limiters[Platform.LINKEDIN].backoff(900)  # 15 min
                return None
            
            if response.status_code == 401:
                logger.error(f"LinkedIn token expired/invalid for post {post_id}")
                raise TokenExpiredError("LinkedIn token expired")
            
            if response.status_code == 404:
                logger.warning(f"LinkedIn post not found: {post_id}")
                return None
            
            response.raise_for_status()
            self.rate_limiters[Platform.LINKEDIN].record_request()
            
            data = response.json()
            
            # Parse social actions
            likes = sum(1 for a in data.get('likes', []) if a.get('actor'))
            comments = data.get('commentsSummary', {}).get('totalCount', 0)
            
            # Fetch statistics for impressions/clicks (requires different endpoint)
            stats_url = f"https://api.linkedin.com/v2/organizationalEntityShareStatistics"
            params = {'q': 'organizationalEntity', 'organizationalEntity': entity_urn}
            stats_response = requests.get(stats_url, headers=headers, params=params, timeout=30)
            
            impressions = 0
            clicks = 0
            shares = 0
            
            if stats_response.status_code == 200:
                stats_data = stats_response.json()
                elements = stats_data.get('elements', [])
                if elements:
                    stats = elements[0].get('totalShareStatistics', {})
                    impressions = stats.get('impressionCount', 0)
                    clicks = stats.get('clickCount', 0)
                    shares = stats.get('shareCount', 0)
            
            # Calculate engagement rate
            total_engagements = likes + comments + shares + clicks
            engagement_rate = (total_engagements / max(impressions, 1)) * 100
            
            snapshot = MetricsSnapshot(
                post_id=post_id,
                platform=Platform.LINKEDIN.value,
                platform_post_id=post_id,
                impressions=impressions,
                likes=likes,
                comments=comments,
                shares=shares,
                clicks=clicks,
                engagement_rate=round(engagement_rate, 4),
                collected_at=datetime.utcnow()
            )
            
            logger.info(f"LinkedIn metrics fetched for {post_id}: {likes} likes, {comments} comments")
            return snapshot
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error fetching LinkedIn metrics: {e}")
            return None
        except Exception as e:
            logger.error(f"Error fetching LinkedIn metrics: {e}")
            return None
    
    def fetch_twitter_metrics(self, post_id: str, access_token: str) -> Optional[MetricsSnapshot]:
        """
        Fetch metrics from Twitter/X API v2.
        
        Endpoint: GET /2/tweets/:id
        """
        if not self.rate_limiters[Platform.TWITTER].can_request():
            logger.warning("Twitter rate limit reached, skipping")
            return None
        
        try:
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # Twitter API v2 endpoint
            url = f"https://api.twitter.com/2/tweets/{post_id}"
            params = {
                'tweet.fields': 'public_metrics,non_public_metrics,organic_metrics',
                'expansions': 'attachments.media_keys',
                'media.fields': 'public_metrics'
            }
            
            response = requests.get(url, headers=headers, params=params, timeout=30)
            
            if response.status_code == 429:
                # Rate limited - extract retry-after if available
                retry_after = int(response.headers.get('x-rate-limit-reset', time.time() + 900))
                wait_seconds = max(0, retry_after - int(time.time()))
                self.rate_limiters[Platform.TWITTER].backoff(wait_seconds)
                return None
            
            if response.status_code == 401:
                logger.error(f"Twitter token expired/invalid for post {post_id}")
                raise TokenExpiredError("Twitter token expired")
            
            if response.status_code == 404:
                logger.warning(f"Twitter post not found: {post_id}")
                return None
            
            response.raise_for_status()
            self.rate_limiters[Platform.TWITTER].record_request()
            
            data = response.json()
            tweet = data.get('data', {})
            metrics = tweet.get('public_metrics', {})
            
            # Extract metrics
            impressions = metrics.get('impression_count', 0)
            likes = metrics.get('like_count', 0)
            replies = metrics.get('reply_count', 0)
            retweets = metrics.get('retweet_count', 0)
            quotes = metrics.get('quote_count', 0)
            bookmarks = metrics.get('bookmark_count', 0)
            
            # Calculate engagement rate
            total_engagements = likes + replies + retweets + quotes + bookmarks
            engagement_rate = (total_engagements / max(impressions, 1)) * 100
            
            snapshot = MetricsSnapshot(
                post_id=post_id,
                platform=Platform.TWITTER.value,
                platform_post_id=post_id,
                impressions=impressions,
                likes=likes,
                replies=replies,
                retweets=retweets,
                quotes=quotes,
                bookmarks=bookmarks,
                engagement_rate=round(engagement_rate, 4),
                collected_at=datetime.utcnow()
            )
            
            logger.info(f"Twitter metrics fetched for {post_id}: {likes} likes, {retweets} RTs")
            return snapshot
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error fetching Twitter metrics: {e}")
            return None
        except Exception as e:
            logger.error(f"Error fetching Twitter metrics: {e}")
            return None
    
    def save_snapshot(self, snapshot: MetricsSnapshot, dry_run: bool = False) -> bool:
        """Save metrics snapshot to database."""
        if dry_run:
            logger.info(f"[DRY RUN] Would save snapshot: {json.dumps(snapshot.__dict__, default=str)}")
            return True
        
        try:
            data = {
                'post_id': snapshot.post_id,
                'platform': snapshot.platform,
                'platform_post_id': snapshot.platform_post_id,
                'impressions': snapshot.impressions,
                'likes': snapshot.likes,
                'comments': snapshot.comments,
                'shares': snapshot.shares,
                'clicks': snapshot.clicks,
                'replies': snapshot.replies,
                'retweets': snapshot.retweets,
                'quotes': snapshot.quotes,
                'bookmarks': snapshot.bookmarks,
                'engagement_rate': snapshot.engagement_rate,
                'engagement_score': snapshot.engagement_score,
                'collected_at': snapshot.collected_at.isoformat() if snapshot.collected_at else None
            }
            
            result = self.supabase.table('analytics_snapshots').insert(data).execute()
            logger.info(f"Snapshot saved for {snapshot.platform_post_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save snapshot: {e}")
            return False
    
    def sync_user_metrics(self, user_id: str, platform: Optional[Platform] = None, 
                         dry_run: bool = False) -> Dict[str, int]:
        """Sync metrics for all posts of a user."""
        stats = {'success': 0, 'failed': 0, 'skipped': 0}
        
        try:
            # Fetch user's connected platforms
            platforms_query = self.supabase.table('user_platforms') \
                .select('*') \
                .eq('user_id', user_id)
            
            if platform:
                platforms_query = platforms_query.eq('platform', platform.value)
            
            platforms_result = platforms_query.execute()
            platforms_data = platforms_result.data
            
            if not platforms_data:
                logger.info(f"No connected platforms for user {user_id}")
                return stats
            
            # Get posts that need syncing (posted in last 30 days)
            cutoff_date = (datetime.utcnow() - timedelta(days=30)).isoformat()
            posts_result = self.supabase.table('posts') \
                .select('*') \
                .eq('user_id', user_id) \
                .gte('posted_at', cutoff_date) \
                .not_.is_('platform_post_id', None) \
                .execute()
            
            posts = posts_result.data
            logger.info(f"Found {len(posts)} posts to sync for user {user_id}")
            
            for post in posts:
                post_platform = post.get('platform')
                platform_post_id = post.get('platform_post_id')
                
                if not platform_post_id:
                    continue
                
                # Find matching platform config
                platform_config = next(
                    (p for p in platforms_data if p['platform'] == post_platform),
                    None
                )
                
                if not platform_config:
                    stats['skipped'] += 1
                    continue
                
                access_token = platform_config.get('access_token')
                if not access_token:
                    stats['skipped'] += 1
                    continue
                
                # Fetch metrics based on platform
                snapshot = None
                try:
                    if post_platform == Platform.LINKEDIN.value:
                        snapshot = self.fetch_linkedin_metrics(platform_post_id, access_token)
                    elif post_platform == Platform.TWITTER.value:
                        snapshot = self.fetch_twitter_metrics(platform_post_id, access_token)
                    
                    if snapshot:
                        snapshot.post_id = post['id']
                        # Calculate engagement score
                        from aggregations import calculate_engagement_score
                        snapshot.engagement_score = calculate_engagement_score(
                            snapshot.__dict__, post_platform
                        )
                        
                        if self.save_snapshot(snapshot, dry_run):
                            stats['success'] += 1
                        else:
                            stats['failed'] += 1
                    else:
                        stats['failed'] += 1
                        
                except TokenExpiredError:
                    logger.error(f"Token expired for {post_platform}, skipping remaining")
                    break
                    
        except Exception as e:
            logger.error(f"Error syncing user {user_id}: {e}")
        
        return stats
    
    def sync_all_users(self, platform: Optional[Platform] = None, dry_run: bool = False):
        """Sync metrics for all active users."""
        try:
            # Get all users with connected platforms
            result = self.supabase.table('user_platforms') \
                .select('user_id') \
                .execute()
            
            user_ids = list(set(p['user_id'] for p in result.data))
            logger.info(f"Starting sync for {len(user_ids)} users")
            
            for user_id in user_ids:
                stats = self.sync_user_metrics(user_id, platform, dry_run)
                logger.info(f"User {user_id}: {stats}")
                
        except Exception as e:
            logger.error(f"Error in sync_all_users: {e}")


class TokenExpiredError(Exception):
    """Raised when a platform access token has expired."""
    pass


def main():
    parser = argparse.ArgumentParser(description='Sync analytics metrics from social platforms')
    parser.add_argument('--user-id', help='Sync specific user')
    parser.add_argument('--all-users', action='store_true', help='Sync all users')
    parser.add_argument('--platform', choices=['linkedin', 'twitter'], help='Filter by platform')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done')
    
    args = parser.parse_args()
    
    # Load environment variables
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not supabase_url or not supabase_key:
        logger.error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        sys.exit(1)
    
    sync = AnalyticsSync(supabase_url, supabase_key)
    
    platform = Platform(args.platform) if args.platform else None
    
    if args.all_users:
        sync.sync_all_users(platform, args.dry_run)
    elif args.user_id:
        stats = sync.sync_user_metrics(args.user_id, platform, args.dry_run)
        print(json.dumps(stats, indent=2))
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
