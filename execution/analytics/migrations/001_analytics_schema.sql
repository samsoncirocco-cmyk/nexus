-- Nexus Analytics Database Schema
-- Run this in Supabase SQL Editor to create analytics tables

-- Analytics Snapshots Table
-- Stores time-series metrics for each post
CREATE TABLE IF NOT EXISTS analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('linkedin', 'twitter')),
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
    engagement_rate DECIMAL(5,4) DEFAULT 0,  -- Stored as 0.0523 for 5.23%
    engagement_score DECIMAL(8,2) DEFAULT 0, -- Normalized 0-1000 scale
    
    -- Metadata
    collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_post_id 
    ON analytics_snapshots(post_id);

CREATE INDEX IF NOT EXISTS idx_analytics_platform 
    ON analytics_snapshots(platform);

CREATE INDEX IF NOT EXISTS idx_analytics_collected_at 
    ON analytics_snapshots(collected_at);

CREATE INDEX IF NOT EXISTS idx_analytics_post_platform 
    ON analytics_snapshots(post_id, platform);

CREATE INDEX IF NOT EXISTS idx_analytics_user_lookup 
    ON analytics_snapshots(post_id, collected_at DESC);

-- Enable Row Level Security
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view snapshots for their own posts
CREATE POLICY "Users can view own analytics snapshots"
    ON analytics_snapshots
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM posts
            WHERE posts.id = analytics_snapshots.post_id
            AND posts.user_id = auth.uid()
        )
    );

-- RLS Policy: Only system can insert/update (via service key)
CREATE POLICY "System can manage analytics snapshots"
    ON analytics_snapshots
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Analytics Aggregations Cache (optional, for performance)
CREATE TABLE IF NOT EXISTS analytics_daily_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    platform VARCHAR(20),
    
    -- Aggregated metrics
    total_impressions INTEGER DEFAULT 0,
    total_engagements INTEGER DEFAULT 0,
    total_posts INTEGER DEFAULT 0,
    avg_engagement_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Computed at
    computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, date, platform)
);

CREATE INDEX IF NOT EXISTS idx_daily_agg_user_date 
    ON analytics_daily_aggregates(user_id, date);

-- Enable RLS
ALTER TABLE analytics_daily_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily aggregates"
    ON analytics_daily_aggregates
    FOR SELECT
    USING (user_id = auth.uid());

-- Function to get latest snapshot for a post
CREATE OR REPLACE FUNCTION get_latest_snapshot(post_uuid UUID)
RETURNS TABLE (
    impressions INTEGER,
    likes INTEGER,
    comments INTEGER,
    shares INTEGER,
    clicks INTEGER,
    replies INTEGER,
    retweets INTEGER,
    quotes INTEGER,
    bookmarks INTEGER,
    engagement_rate DECIMAL,
    engagement_score DECIMAL,
    collected_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.impressions,
        s.likes,
        s.comments,
        s.shares,
        s.clicks,
        s.replies,
        s.retweets,
        s.quotes,
        s.bookmarks,
        s.engagement_rate,
        s.engagement_score,
        s.collected_at
    FROM analytics_snapshots s
    WHERE s.post_id = post_uuid
    ORDER BY s.collected_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate daily aggregates (can be called by cron)
CREATE OR REPLACE FUNCTION calculate_daily_aggregates(target_date DATE)
RETURNS void AS $$
BEGIN
    INSERT INTO analytics_daily_aggregates (
        user_id, date, platform,
        total_impressions, total_engagements, total_posts, avg_engagement_rate
    )
    SELECT 
        p.user_id,
        DATE(s.collected_at) as date,
        s.platform,
        SUM(s.impressions),
        SUM(
            CASE s.platform
                WHEN 'linkedin' THEN s.likes + s.comments + s.shares + s.clicks
                ELSE s.likes + s.replies + s.retweets + s.quotes + s.bookmarks
            END
        ),
        COUNT(DISTINCT s.post_id),
        AVG(s.engagement_rate)
    FROM analytics_snapshots s
    JOIN posts p ON p.id = s.post_id
    WHERE DATE(s.collected_at) = target_date
    GROUP BY p.user_id, DATE(s.collected_at), s.platform
    ON CONFLICT (user_id, date, platform) 
    DO UPDATE SET
        total_impressions = EXCLUDED.total_impressions,
        total_engagements = EXCLUDED.total_engagements,
        total_posts = EXCLUDED.total_posts,
        avg_engagement_rate = EXCLUDED.avg_engagement_rate,
        computed_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- View for easy analytics dashboard queries
CREATE OR REPLACE VIEW v_post_analytics AS
SELECT 
    p.id as post_id,
    p.user_id,
    p.content,
    p.platform,
    p.posted_at,
    p.platform_post_id,
    s.impressions,
    s.likes,
    s.comments,
    s.shares,
    s.clicks,
    s.replies,
    s.retweets,
    s.quotes,
    s.bookmarks,
    s.engagement_rate,
    s.engagement_score,
    s.collected_at as metrics_updated_at,
    CASE p.platform
        WHEN 'linkedin' THEN s.likes + s.comments + s.shares + s.clicks
        ELSE s.likes + s.replies + s.retweets + s.quotes + s.bookmarks
    END as total_engagements
FROM posts p
LEFT JOIN LATERAL (
    SELECT * FROM analytics_snapshots
    WHERE post_id = p.id
    ORDER BY collected_at DESC
    LIMIT 1
) s ON true
WHERE p.status = 'published';
