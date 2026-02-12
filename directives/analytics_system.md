# Analytics System Directive

## Overview

The Nexus Analytics System provides unified performance tracking across all connected social platforms (LinkedIn, Twitter/X). It collects engagement metrics, aggregates them for insights, and presents them through a dashboard interface.

---

## 1. Data Collection Specifications

### 1.1 Platform-Specific Metrics

#### LinkedIn Metrics
| Metric | Type | API Endpoint | Refresh Frequency |
|--------|------|--------------|-------------------|
| impressions | integer | `socialActions` | 6 hours |
| likes | integer | `reactions` | 6 hours |
| comments | integer | `comments` | 6 hours |
| shares | integer | `shares` | 6 hours |
| clicks | integer | `clicks` | 6 hours |
| engagement_rate | float | calculated | derived |
| unique_impressions | integer | `socialActions` | 6 hours |

#### Twitter/X Metrics
| Metric | Type | API Endpoint | Refresh Frequency |
|--------|------|--------------|-------------------|
| impressions | integer | `public_metrics.impression_count` | 6 hours |
| likes | integer | `public_metrics.like_count` | 6 hours |
| replies | integer | `public_metrics.reply_count` | 6 hours |
| retweets | integer | `public_metrics.retweet_count` | 6 hours |
| quotes | integer | `public_metrics.quote_count` | 6 hours |
| bookmarks | integer | `public_metrics.bookmark_count` | 6 hours |
| engagement_rate | float | calculated | derived |

### 1.2 Unified Schema (Database)

```sql
-- analytics_snapshots table
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  platform VARCHAR(20) NOT NULL, -- 'linkedin', 'twitter'
  platform_post_id VARCHAR(255) NOT NULL,
  
  -- Raw metrics
  impressions INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  quotes INTEGER DEFAULT 0,
  bookmarks INTEGER DEFAULT 0,
  
  -- Calculated metrics
  engagement_rate DECIMAL(5,4) DEFAULT 0,
  engagement_score DECIMAL(8,2) DEFAULT 0,
  
  -- Metadata
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_analytics_post_id ON analytics_snapshots(post_id);
CREATE INDEX idx_analytics_platform ON analytics_snapshots(platform);
CREATE INDEX idx_analytics_collected_at ON analytics_snapshots(collected_at);
CREATE INDEX idx_analytics_post_platform ON analytics_snapshots(post_id, platform);
```

---

## 2. Polling Strategy

### 2.1 Frequency
- **Primary poll**: Every 6 hours
- **High-activity windows**: Every 2 hours (first 48h after posting)
- **Rate limit buffer**: 15-minute cooldown on rate limit errors

### 2.2 Polling Logic

```
FOR EACH user with connected platforms:
  FOR EACH platform in [linkedin, twitter]:
    IF platform_access_token IS valid AND NOT expired:
      FETCH posts from last 30 days without platform_post_id
      FOR EACH post:
        CALL fetch_{platform}_metrics(post.platform_post_id, token)
        INSERT/UPDATE analytics_snapshots
      COMMIT transaction
    ELSE:
      LOG "Token expired for user {user_id}, platform {platform}"
      QUEUE token refresh notification
```

### 2.3 Rate Limit Handling

| Platform | Rate Limit | Strategy |
|----------|------------|----------|
| LinkedIn | 100 requests/hour | Exponential backoff, queue for next window |
| Twitter | 900 requests/15min | Token bucket tracking, spread requests |

---

## 3. Aggregation Rules

### 3.1 Engagement Score Calculation

```python
def calculate_engagement_score(metrics: dict, platform: str) -> float:
    """
    Calculate normalized engagement score based on platform weights.
    Returns: 0-1000 scale for easy comparison
    """
    if platform == 'linkedin':
        weights = {
            'likes': 1.0,
            'comments': 5.0,
            'shares': 10.0,
            'clicks': 2.0
        }
        total = sum(metrics.get(k, 0) * w for k, w in weights.items())
        # Normalize by impressions
        impressions = max(metrics.get('impressions', 1), 1)
        return min((total / impressions) * 10000, 1000)
    
    elif platform == 'twitter':
        weights = {
            'likes': 1.0,
            'replies': 5.0,
            'retweets': 10.0,
            'quotes': 8.0,
            'bookmarks': 3.0
        }
        total = sum(metrics.get(k, 0) * w for k, w in weights.items())
        impressions = max(metrics.get('impressions', 1), 1)
        return min((total / impressions) * 10000, 1000)
```

### 3.2 Aggregation Time Windows

| Window | Description | Use Case |
|--------|-------------|----------|
| `24h` | Last 24 hours | Daily dashboard |
| `7d` | Last 7 days | Weekly trends |
| `30d` | Last 30 days | Monthly overview |
| `90d` | Last 90 days | Quarterly analysis |
| `custom` | User-defined | Deep dives |

### 3.3 Rollup Functions

```sql
-- Daily aggregation
SELECT 
  DATE(collected_at) as date,
  platform,
  SUM(impressions) as total_impressions,
  SUM(likes) as total_likes,
  AVG(engagement_rate) as avg_engagement_rate,
  MAX(engagement_score) as peak_engagement_score
FROM analytics_snapshots
WHERE user_id = $1 AND collected_at >= $2
GROUP BY DATE(collected_at), platform;
```

---

## 4. Dashboard Views

### 4.1 Overview Dashboard

**Components:**
1. **Performance Cards** (top row)
   - Total Impressions (with % change)
   - Total Engagements
   - Avg Engagement Rate
   - Best Performing Platform

2. **Trend Chart** (line chart)
   - X-axis: Time (daily buckets)
   - Y-axis: Engagement metrics
   - Series: Platform comparison

3. **Content Performance Table**
   - Top 10 posts by engagement score
   - Sortable columns
   - Quick actions

### 4.2 Platform Breakdown View

**Components:**
1. **Platform Selector** (tabs)
2. **Metric Comparison** (radar or bar chart)
3. **Posting Time Analysis** (heatmap)
4. **Audience Growth** (line chart, if available)

### 4.3 Content Detail View

**Components:**
1. **Post Preview** (rendered content)
2. **Metrics Timeline** (area chart)
3. **Engagement Breakdown** (pie chart)
4. **Comparison to Average** (benchmark bar)

---

## 5. Error Handling & Resilience

### 5.1 API Error Categories

| Error | Action | Retry |
|-------|--------|-------|
| 401 Unauthorized | Refresh token | Immediate |
| 429 Rate Limited | Exponential backoff | Yes (max 3) |
| 500 Server Error | Log and skip | Yes (max 2) |
| 404 Not Found | Mark post deleted | No |
| Network Error | Exponential backoff | Yes (max 5) |

### 5.2 Data Integrity

- Use UPSERT for snapshot records
- Keep last 3 successful snapshots per post
- Archive snapshots older than 90 days to cold storage
- Validate metrics deltas (flag >1000% change for review)

---

## 6. Security & Privacy

- Encrypt platform tokens at rest (AES-256)
- Rate limit dashboard API requests per user
- No PII in analytics tables (anonymize user_ids in exports)
- Audit log for all metric exports

---

## 7. Execution Scripts

| Script | Path | Purpose |
|--------|------|---------|
| sync_metrics.py | `execution/analytics/sync_metrics.py` | Fetch and store platform metrics |
| aggregations.py | `execution/analytics/aggregations.py` | Calculate aggregates and scores |

---

## 8. API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/analytics/overview` | GET | Dashboard overview data |
| `/api/analytics/platform/[platform]` | GET | Platform-specific metrics |
| `/api/analytics/posts` | GET | Post-level analytics |

---

*Version: 1.0*
*Last Updated: 2026-02-11*
