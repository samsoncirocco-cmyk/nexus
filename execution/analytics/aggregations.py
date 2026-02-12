#!/usr/bin/env python3
"""
Nexus Analytics - Aggregations
Provides aggregation functions and engagement score calculations.

Usage:
    from aggregations import get_overview_metrics, get_platform_comparison
    
    # Or run standalone
    python aggregations.py --user-id <uuid> --date-range 30d
"""

import os
import json
import argparse
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from supabase import create_client, Client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('analytics_aggregations')


class DateRange(Enum):
    DAY = '1d'
    WEEK = '7d'
    MONTH = '30d'
    QUARTER = '90d'


def parse_date_range(date_range_str: str) -> Tuple[datetime, datetime]:
    """Parse date range string into start/end datetimes."""
    end_date = datetime.utcnow()
    
    if date_range_str == '1d':
        start_date = end_date - timedelta(days=1)
    elif date_range_str == '7d':
        start_date = end_date - timedelta(days=7)
    elif date_range_str == '30d':
        start_date = end_date - timedelta(days=30)
    elif date_range_str == '90d':
        start_date = end_date - timedelta(days=90)
    else:
        # Try to parse as integer days
        try:
            days = int(date_range_str.replace('d', ''))
            start_date = end_date - timedelta(days=days)
        except ValueError:
            start_date = end_date - timedelta(days=30)
    
    return start_date, end_date


def calculate_engagement_score(metrics: Dict[str, Any], platform: str) -> float:
    """
    Calculate normalized engagement score based on platform weights.
    Returns score on 0-1000 scale for easy cross-platform comparison.
    
    Weights reflect relative value of each engagement type:
    - Passive engagements (likes): 1x
    - Active engagements (comments/replies): 5x
    - Amplification (shares/retweets): 10x
    - Clicks: 2x
    """
    if platform == 'linkedin':
        weights = {
            'likes': 1.0,
            'comments': 5.0,
            'shares': 10.0,
            'clicks': 2.0
        }
        total = sum(
            metrics.get(k, 0) * w 
            for k, w in weights.items()
        )
        # Normalize by impressions (avoid division by zero)
        impressions = max(metrics.get('impressions', 1), 1)
        
        # Scale to 0-1000
        # Formula: (weighted engagements / impressions) * 10000
        # This gives ~1000 for 10% engagement rate
        score = (total / impressions) * 10000
        return round(min(score, 1000), 2)
    
    elif platform == 'twitter':
        weights = {
            'likes': 1.0,
            'replies': 5.0,
            'retweets': 10.0,
            'quotes': 8.0,
            'bookmarks': 3.0
        }
        total = sum(
            metrics.get(k, 0) * w 
            for k, w in weights.items()
        )
        impressions = max(metrics.get('impressions', 1), 1)
        score = (total / impressions) * 10000
        return round(min(score, 1000), 2)
    
    else:
        # Unknown platform - use generic weights
        engagements = sum([
            metrics.get('likes', 0),
            metrics.get('comments', 0),
            metrics.get('shares', 0),
            metrics.get('replies', 0),
            metrics.get('retweets', 0)
        ])
        impressions = max(metrics.get('impressions', 1), 1)
        return round((engagements / impressions) * 10000, 2)


def get_overview_metrics(
    supabase: Client,
    user_id: str, 
    date_range: str = '30d'
) -> Dict[str, Any]:
    """
    Get high-level overview metrics for dashboard.
    
    Returns:
        {
            'period': {
                'start': ISO date,
                'end': ISO date,
                'days': int
            },
            'totals': {
                'impressions': int,
                'engagements': int,
                'posts': int,
                'engagement_rate': float
            },
            'by_platform': {
                'linkedin': {...},
                'twitter': {...}
            },
            'trend': {
                'impressions_change': float,  # % change vs previous period
                'engagements_change': float
            }
        }
    """
    start_date, end_date = parse_date_range(date_range)
    prev_start = start_date - (end_date - start_date)
    
    # Get user's posts in date range
    posts_result = supabase.table('posts') \
        .select('id, platform') \
        .eq('user_id', user_id) \
        .gte('posted_at', start_date.isoformat()) \
        .lte('posted_at', end_date.isoformat()) \
        .execute()
    
    post_ids = [p['id'] for p in posts_result.data]
    
    if not post_ids:
        return {
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat(),
                'days': (end_date - start_date).days
            },
            'totals': {
                'impressions': 0,
                'engagements': 0,
                'posts': 0,
                'engagement_rate': 0
            },
            'by_platform': {},
            'trend': {'impressions_change': 0, 'engagements_change': 0}
        }
    
    # Get latest snapshot for each post
    snapshots_result = supabase.table('analytics_snapshots') \
        .select('*') \
        .in_('post_id', post_ids) \
        .gte('collected_at', start_date.isoformat()) \
        .lte('collected_at', end_date.isoformat()) \
        .order('collected_at', desc=True) \
        .execute()
    
    # Get previous period for trend calculation
    prev_posts_result = supabase.table('posts') \
        .select('id') \
        .eq('user_id', user_id) \
        .gte('posted_at', prev_start.isoformat()) \
        .lt('posted_at', start_date.isoformat()) \
        .execute()
    
    prev_post_ids = [p['id'] for p in prev_posts_result.data]
    
    prev_snapshots = []
    if prev_post_ids:
        prev_result = supabase.table('analytics_snapshots') \
            .select('*') \
            .in_('post_id', prev_post_ids) \
            .order('collected_at', desc=True) \
            .execute()
        prev_snapshots = prev_result.data
    
    # Aggregate current period
    platform_stats = {}
    total_impressions = 0
    total_engagements = 0
    
    for snapshot in snapshots_result.data:
        platform = snapshot.get('platform', 'unknown')
        
        if platform not in platform_stats:
            platform_stats[platform] = {
                'impressions': 0,
                'engagements': 0,
                'posts': set(),
                'likes': 0,
                'comments': 0,
                'shares': 0,
                'clicks': 0
            }
        
        stats = platform_stats[platform]
        stats['impressions'] += snapshot.get('impressions', 0)
        stats['posts'].add(snapshot.get('post_id'))
        stats['likes'] += snapshot.get('likes', 0)
        stats['comments'] += snapshot.get('comments', 0) + snapshot.get('replies', 0)
        stats['shares'] += snapshot.get('shares', 0) + snapshot.get('retweets', 0)
        stats['clicks'] += snapshot.get('clicks', 0)
        
        # Calculate engagements based on platform
        if platform == 'linkedin':
            engagements = (
                snapshot.get('likes', 0) +
                snapshot.get('comments', 0) +
                snapshot.get('shares', 0) +
                snapshot.get('clicks', 0)
            )
        else:  # twitter
            engagements = (
                snapshot.get('likes', 0) +
                snapshot.get('replies', 0) +
                snapshot.get('retweets', 0) +
                snapshot.get('quotes', 0) +
                snapshot.get('bookmarks', 0)
            )
        
        stats['engagements'] += engagements
        total_engagements += engagements
        total_impressions += snapshot.get('impressions', 0)
    
    # Convert sets to counts
    for platform in platform_stats:
        platform_stats[platform]['posts'] = len(platform_stats[platform]['posts'])
        platform_stats[platform]['engagement_rate'] = round(
            (platform_stats[platform]['engagements'] / max(platform_stats[platform]['impressions'], 1)) * 100,
            2
        )
    
    # Calculate trends
    prev_impressions = sum(s.get('impressions', 0) for s in prev_snapshots)
    prev_engagements = sum(
        s.get('likes', 0) + s.get('comments', 0) + s.get('shares', 0) + s.get('clicks', 0)
        for s in prev_snapshots
    )
    
    impressions_change = (
        ((total_impressions - prev_impressions) / max(prev_impressions, 1)) * 100
        if prev_impressions > 0 else 0
    )
    engagements_change = (
        ((total_engagements - prev_engagements) / max(prev_engagements, 1)) * 100
        if prev_engagements > 0 else 0
    )
    
    return {
        'period': {
            'start': start_date.isoformat(),
            'end': end_date.isoformat(),
            'days': (end_date - start_date).days
        },
        'totals': {
            'impressions': total_impressions,
            'engagements': total_engagements,
            'posts': len(post_ids),
            'engagement_rate': round(
                (total_engagements / max(total_impressions, 1)) * 100, 2
            )
        },
        'by_platform': platform_stats,
        'trend': {
            'impressions_change': round(impressions_change, 1),
            'engagements_change': round(engagements_change, 1)
        }
    }


def get_platform_comparison(
    supabase: Client,
    user_id: str,
    platforms: List[str],
    date_range: str = '30d'
) -> Dict[str, Any]:
    """
    Compare performance across platforms.
    
    Returns:
        {
            'platforms': {
                'linkedin': {...metrics...},
                'twitter': {...metrics...}
            },
            'comparison': {
                'best_platform': str,
                'best_engagement_rate': float,
                'efficiency_score': {platform: score}
            }
        }
    """
    start_date, end_date = parse_date_range(date_range)
    
    # Get posts for specified platforms
    posts_query = supabase.table('posts') \
        .select('id, platform') \
        .eq('user_id', user_id) \
        .in_('platform', platforms) \
        .gte('posted_at', start_date.isoformat()) \
        .lte('posted_at', end_date.isoformat())
    
    posts_result = posts_query.execute()
    post_ids = [p['id'] for p in posts_result.data]
    
    if not post_ids:
        return {
            'platforms': {},
            'comparison': {
                'best_platform': None,
                'best_engagement_rate': 0,
                'efficiency_score': {}
            }
        }
    
    # Get snapshots
    snapshots_result = supabase.table('analytics_snapshots') \
        .select('*') \
        .in_('post_id', post_ids) \
        .gte('collected_at', start_date.isoformat()) \
        .lte('collected_at', end_date.isoformat()) \
        .execute()
    
    # Aggregate by platform
    platform_data = {}
    
    for snapshot in snapshots_result.data:
        platform = snapshot.get('platform')
        
        if platform not in platform_data:
            platform_data[platform] = {
                'impressions': [],
                'engagement_rates': [],
                'engagement_scores': [],
                'post_count': 0,
                'total_likes': 0,
                'total_comments': 0,
                'total_shares': 0
            }
        
        data = platform_data[platform]
        data['impressions'].append(snapshot.get('impressions', 0))
        data['engagement_rates'].append(snapshot.get('engagement_rate', 0))
        data['engagement_scores'].append(snapshot.get('engagement_score', 0))
        data['post_count'] += 1
        data['total_likes'] += snapshot.get('likes', 0)
        data['total_comments'] += snapshot.get('comments', 0) + snapshot.get('replies', 0)
        data['total_shares'] += snapshot.get('shares', 0) + snapshot.get('retweets', 0)
    
    # Calculate platform metrics
    platforms_output = {}
    
    for platform, data in platform_data.items():
        impressions = sum(data['impressions'])
        avg_engagement_rate = sum(data['engagement_rates']) / max(len(data['engagement_rates']), 1)
        avg_engagement_score = sum(data['engagement_scores']) / max(len(data['engagement_scores']), 1)
        
        platforms_output[platform] = {
            'total_impressions': impressions,
            'post_count': data['post_count'],
            'avg_impressions_per_post': round(impressions / max(data['post_count'], 1), 0),
            'avg_engagement_rate': round(avg_engagement_rate, 2),
            'avg_engagement_score': round(avg_engagement_score, 2),
            'total_likes': data['total_likes'],
            'total_comments': data['total_comments'],
            'total_shares': data['total_shares']
        }
    
    # Determine best platform
    best_platform = None
    best_rate = 0
    efficiency_scores = {}
    
    for platform, metrics in platforms_output.items():
        rate = metrics['avg_engagement_rate']
        if rate > best_rate:
            best_rate = rate
            best_platform = platform
        
        # Efficiency = engagement per post
        efficiency_scores[platform] = round(
            metrics['avg_engagement_score'] * (metrics['avg_impressions_per_post'] / 1000),
            2
        )
    
    return {
        'platforms': platforms_output,
        'comparison': {
            'best_platform': best_platform,
            'best_engagement_rate': round(best_rate, 2),
            'efficiency_score': efficiency_scores
        }
    }


def get_best_performing_content(
    supabase: Client,
    user_id: str,
    limit: int = 10,
    date_range: str = '30d'
) -> List[Dict[str, Any]]:
    """
    Get top performing posts by engagement score.
    
    Returns:
        [
            {
                'post_id': str,
                'content': str,
                'platform': str,
                'posted_at': str,
                'metrics': {...},
                'engagement_score': float,
                'rank': int
            }
        ]
    """
    start_date, end_date = parse_date_range(date_range)
    
    # Get posts with content
    posts_result = supabase.table('posts') \
        .select('id, content, platform, posted_at, platform_post_id') \
        .eq('user_id', user_id) \
        .gte('posted_at', start_date.isoformat()) \
        .lte('posted_at', end_date.isoformat()) \
        .execute()
    
    post_ids = [p['id'] for p in posts_result.data]
    posts_map = {p['id']: p for p in posts_result.data}
    
    if not post_ids:
        return []
    
    # Get latest snapshot for each post
    snapshots_result = supabase.table('analytics_snapshots') \
        .select('*') \
        .in_('post_id', post_ids) \
        .order('collected_at', desc=True) \
        .execute()
    
    # Keep only latest snapshot per post
    latest_snapshots = {}
    for snapshot in snapshots_result.data:
        post_id = snapshot.get('post_id')
        if post_id not in latest_snapshots:
            latest_snapshots[post_id] = snapshot
    
    # Build results with engagement scores
    results = []
    for post_id, snapshot in latest_snapshots.items():
        post = posts_map.get(post_id)
        if not post:
            continue
        
        # Recalculate engagement score
        score = calculate_engagement_score(snapshot, post['platform'])
        
        results.append({
            'post_id': post_id,
            'content': post.get('content', '')[:200] + '...' if len(post.get('content', '')) > 200 else post.get('content', ''),
            'platform': post.get('platform'),
            'posted_at': post.get('posted_at'),
            'platform_post_id': post.get('platform_post_id'),
            'metrics': {
                'impressions': snapshot.get('impressions', 0),
                'likes': snapshot.get('likes', 0),
                'comments': snapshot.get('comments', 0) + snapshot.get('replies', 0),
                'shares': snapshot.get('shares', 0) + snapshot.get('retweets', 0),
                'engagement_rate': snapshot.get('engagement_rate', 0)
            },
            'engagement_score': score
        })
    
    # Sort by engagement score
    results.sort(key=lambda x: x['engagement_score'], reverse=True)
    
    # Add rank and limit
    for i, item in enumerate(results[:limit], 1):
        item['rank'] = i
    
    return results[:limit]


def get_daily_trends(
    supabase: Client,
    user_id: str,
    days: int = 30,
    platform: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get daily aggregated metrics for trend charts.
    
    Returns:
        [
            {
                'date': '2026-01-01',
                'impressions': 1000,
                'engagements': 50,
                'posts': 2,
                'engagement_rate': 5.0
            }
        ]
    """
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Get posts
    posts_query = supabase.table('posts') \
        .select('id, platform, posted_at') \
        .eq('user_id', user_id) \
        .gte('posted_at', start_date.isoformat())
    
    if platform:
        posts_query = posts_query.eq('platform', platform)
    
    posts_result = posts_query.execute()
    post_ids = [p['id'] for p in posts_result.data]
    
    if not post_ids:
        return []
    
    # Get snapshots
    snapshots_result = supabase.table('analytics_snapshots') \
        .select('*') \
        .in_('post_id', post_ids) \
        .gte('collected_at', start_date.isoformat()) \
        .execute()
    
    # Aggregate by day
    daily_data = {}
    
    for snapshot in snapshots_result.data:
        date_key = snapshot.get('collected_at', '')[:10]  # YYYY-MM-DD
        
        if date_key not in daily_data:
            daily_data[date_key] = {
                'impressions': 0,
                'engagements': 0,
                'posts': set()
            }
        
        data = daily_data[date_key]
        data['impressions'] += snapshot.get('impressions', 0)
        data['posts'].add(snapshot.get('post_id'))
        
        # Calculate engagements
        platform = snapshot.get('platform')
        if platform == 'linkedin':
            engagements = (
                snapshot.get('likes', 0) +
                snapshot.get('comments', 0) +
                snapshot.get('shares', 0) +
                snapshot.get('clicks', 0)
            )
        else:
            engagements = (
                snapshot.get('likes', 0) +
                snapshot.get('replies', 0) +
                snapshot.get('retweets', 0) +
                snapshot.get('quotes', 0) +
                snapshot.get('bookmarks', 0)
            )
        
        data['engagements'] += engagements
    
    # Format output
    results = []
    for date in sorted(daily_data.keys()):
        data = daily_data[date]
        results.append({
            'date': date,
            'impressions': data['impressions'],
            'engagements': data['engagements'],
            'posts': len(data['posts']),
            'engagement_rate': round(
                (data['engagements'] / max(data['impressions'], 1)) * 100,
                2
            )
        })
    
    return results


def main():
    parser = argparse.ArgumentParser(description='Analytics aggregations')
    parser.add_argument('--user-id', required=True, help='User ID')
    parser.add_argument('--date-range', default='30d', help='Date range (1d, 7d, 30d, 90d)')
    parser.add_argument('--action', choices=['overview', 'comparison', 'best', 'trends'], 
                       default='overview', help='Aggregation type')
    parser.add_argument('--platforms', nargs='+', help='Platforms to compare')
    parser.add_argument('--limit', type=int, default=10, help='Result limit')
    
    args = parser.parse_args()
    
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not supabase_url or not supabase_key:
        logger.error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        return
    
    supabase = create_client(supabase_url, supabase_key)
    
    if args.action == 'overview':
        result = get_overview_metrics(supabase, args.user_id, args.date_range)
    elif args.action == 'comparison':
        platforms = args.platforms or ['linkedin', 'twitter']
        result = get_platform_comparison(supabase, args.user_id, platforms, args.date_range)
    elif args.action == 'best':
        result = get_best_performing_content(supabase, args.user_id, args.limit, args.date_range)
    elif args.action == 'trends':
        days = int(args.date_range.replace('d', ''))
        result = get_daily_trends(supabase, args.user_id, days)
    
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
