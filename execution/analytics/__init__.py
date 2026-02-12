"""
Nexus Analytics System

This module provides data collection, aggregation, and reporting
for social media analytics across LinkedIn and Twitter/X.
"""

from .sync_metrics import AnalyticsSync, MetricsSnapshot, Platform
from .aggregations import (
    calculate_engagement_score,
    get_overview_metrics,
    get_platform_comparison,
    get_best_performing_content,
    get_daily_trends,
    parse_date_range,
)

__all__ = [
    'AnalyticsSync',
    'MetricsSnapshot', 
    'Platform',
    'calculate_engagement_score',
    'get_overview_metrics',
    'get_platform_comparison',
    'get_best_performing_content',
    'get_daily_trends',
    'parse_date_range',
]

__version__ = '1.0.0'
