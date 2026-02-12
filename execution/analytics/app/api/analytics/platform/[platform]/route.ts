// app/api/analytics/platform/[platform]/route.ts
// Returns platform-specific analytics with comparisons

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

// GET /api/analytics/platform/[platform]?dateRange=30d
export async function GET(
  request: NextRequest,
  { params }: { params: { platform: string } }
) {
  try {
    const platform = params.platform.toLowerCase();

    // Validate platform
    if (!['linkedin', 'twitter'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform. Use: linkedin, twitter' },
        { status: 400 }
      );
    }

    // Auth check
    const cookieStore = cookies();
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
    });

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30d';

    const validRanges = ['1d', '7d', '30d', '90d'];
    if (!validRanges.includes(dateRange)) {
      return NextResponse.json(
        { error: 'Invalid dateRange' },
        { status: 400 }
      );
    }

    const { startDate, endDate } = calculateDateRange(dateRange);

    // Fetch posts for this platform
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, content, posted_at, platform_post_id')
      .eq('user_id', userId)
      .eq('platform', platform)
      .gte('posted_at', startDate.toISOString())
      .lte('posted_at', endDate.toISOString());

    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return NextResponse.json(
        { error: 'Failed to fetch posts' },
        { status: 500 }
      );
    }

    const postIds = posts?.map(p => p.id) || [];

    if (postIds.length === 0) {
      return NextResponse.json({
        platform,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: getDaysFromRange(dateRange),
        },
        summary: {
          posts: 0,
          impressions: 0,
          engagements: 0,
          engagementRate: 0,
          avgEngagementScore: 0,
        },
        metrics: {
          likes: 0,
          comments: 0,
          shares: 0,
          clicks: 0,
        },
        topPosts: [],
        hourlyHeatmap: [],
        dailyTrend: [],
      });
    }

    // Fetch snapshots
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .in('post_id', postIds)
      .gte('collected_at', startDate.toISOString())
      .lte('collected_at', endDate.toISOString())
      .order('collected_at', { ascending: false });

    if (snapshotsError) {
      console.error('Error fetching snapshots:', snapshotsError);
      return NextResponse.json(
        { error: 'Failed to fetch analytics data' },
        { status: 500 }
      );
    }

    // Get latest snapshot per post
    const latestByPost: Record<string, any> = {};
    for (const snapshot of (snapshots || [])) {
      if (!latestByPost[snapshot.post_id]) {
        latestByPost[snapshot.post_id] = snapshot;
      }
    }

    // Calculate metrics
    const summary = calculatePlatformSummary(
      Object.values(latestByPost),
      postIds.length,
      platform
    );

    // Get top posts
    const topPosts = getTopPosts(
      Object.values(latestByPost),
      posts || [],
      platform,
      10
    );

    // Build hourly heatmap
    const hourlyHeatmap = buildHourlyHeatmap(posts || []);

    // Build daily trend
    const dailyTrend = buildDailyTrend(snapshots || [], platform);

    return NextResponse.json({
      platform,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: getDaysFromRange(dateRange),
      },
      summary,
      metrics: summary.breakdown,
      topPosts,
      hourlyHeatmap,
      dailyTrend,
    });

  } catch (error) {
    console.error('Error in platform analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateDateRange(range: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  let days = 30;

  switch (range) {
    case '1d':
      days = 1;
      break;
    case '7d':
      days = 7;
      break;
    case '30d':
      days = 30;
      break;
    case '90d':
      days = 90;
      break;
  }

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  return { startDate, endDate };
}

function getDaysFromRange(range: string): number {
  const map: Record<string, number> = {
    '1d': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
  };
  return map[range] || 30;
}

function calculatePlatformSummary(
  snapshots: any[],
  postCount: number,
  platform: string
) {
  let impressions = 0;
  let engagements = 0;
  let totalEngagementScore = 0;

  const breakdown = {
    likes: 0,
    comments: 0,
    shares: 0,
    clicks: 0,
    replies: 0,
    retweets: 0,
    quotes: 0,
    bookmarks: 0,
  };

  for (const snapshot of snapshots) {
    impressions += snapshot.impressions || 0;
    totalEngagementScore += snapshot.engagement_score || 0;

    breakdown.likes += snapshot.likes || 0;
    breakdown.comments += snapshot.comments || 0;
    breakdown.shares += snapshot.shares || 0;
    breakdown.clicks += snapshot.clicks || 0;
    breakdown.replies += snapshot.replies || 0;
    breakdown.retweets += snapshot.retweets || 0;
    breakdown.quotes += snapshot.quotes || 0;
    breakdown.bookmarks += snapshot.bookmarks || 0;

    if (platform === 'linkedin') {
      engagements += (snapshot.likes || 0) + (snapshot.comments || 0) + 
                     (snapshot.shares || 0) + (snapshot.clicks || 0);
    } else {
      engagements += (snapshot.likes || 0) + (snapshot.replies || 0) + 
                     (snapshot.retweets || 0) + (snapshot.quotes || 0) + 
                     (snapshot.bookmarks || 0);
    }
  }

  const engagementRate = impressions > 0 
    ? Math.round((engagements / impressions) * 10000) / 100 
    : 0;

  return {
    posts: postCount,
    impressions,
    engagements,
    engagementRate,
    avgEngagementScore: snapshots.length > 0 
      ? Math.round((totalEngagementScore / snapshots.length) * 100) / 100 
      : 0,
    avgImpressionsPerPost: postCount > 0 
      ? Math.round(impressions / postCount) 
      : 0,
    breakdown,
  };
}

function getTopPosts(
  snapshots: any[],
  posts: any[],
  platform: string,
  limit: number
) {
  const postsMap = new Map(posts.map(p => [p.id, p]));

  const scored = snapshots.map(snapshot => {
    const post = postsMap.get(snapshot.post_id);
    if (!post) return null;

    let engagements = 0;
    if (platform === 'linkedin') {
      engagements = (snapshot.likes || 0) + (snapshot.comments || 0) + 
                    (snapshot.shares || 0) + (snapshot.clicks || 0);
    } else {
      engagements = (snapshot.likes || 0) + (snapshot.replies || 0) + 
                    (snapshot.retweets || 0) + (snapshot.quotes || 0) + 
                    (snapshot.bookmarks || 0);
    }

    return {
      id: snapshot.post_id,
      content: post.content?.substring(0, 200) + (post.content?.length > 200 ? '...' : ''),
      postedAt: post.posted_at,
      platformPostId: post.platform_post_id,
      metrics: {
        impressions: snapshot.impressions || 0,
        likes: snapshot.likes || 0,
        comments: (snapshot.comments || 0) + (snapshot.replies || 0),
        shares: (snapshot.shares || 0) + (snapshot.retweets || 0),
        clicks: snapshot.clicks || 0,
        bookmarks: snapshot.bookmarks || 0,
        engagementRate: snapshot.engagement_rate || 0,
      },
      engagementScore: snapshot.engagement_score || 0,
    };
  }).filter(Boolean);

  scored.sort((a: any, b: any) => b.engagementScore - a.engagementScore);

  return scored.slice(0, limit).map((post: any, index: number) => ({
    ...post,
    rank: index + 1,
  }));
}

function buildHourlyHeatmap(posts: any[]) {
  const hours = Array(24).fill(0).map((_, i) => ({
    hour: i,
    posts: 0,
    label: `${i}:00`,
  }));

  for (const post of posts) {
    const hour = new Date(post.posted_at).getHours();
    hours[hour].posts += 1;
  }

  return hours;
}

function buildDailyTrend(snapshots: any[], platform: string) {
  const dailyData: Record<string, any> = {};

  for (const snapshot of snapshots) {
    const date = new Date(snapshot.collected_at).toISOString().split('T')[0];

    if (!dailyData[date]) {
      dailyData[date] = {
        date,
        impressions: 0,
        engagements: 0,
        posts: new Set(),
      };
    }

    const day = dailyData[date];
    day.impressions += snapshot.impressions || 0;
    day.posts.add(snapshot.post_id);

    let engagements = 0;
    if (platform === 'linkedin') {
      engagements = (snapshot.likes || 0) + (snapshot.comments || 0) + 
                    (snapshot.shares || 0) + (snapshot.clicks || 0);
    } else {
      engagements = (snapshot.likes || 0) + (snapshot.replies || 0) + 
                    (snapshot.retweets || 0) + (snapshot.quotes || 0) + 
                    (snapshot.bookmarks || 0);
    }

    day.engagements += engagements;
  }

  return Object.values(dailyData)
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
    .map((day: any) => ({
      date: day.date,
      impressions: day.impressions,
      engagements: day.engagements,
      posts: day.posts.size,
      engagementRate: day.impressions > 0 
        ? Math.round((day.engagements / day.impressions) * 10000) / 100 
        : 0,
    }));
}
