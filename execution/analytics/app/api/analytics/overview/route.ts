// app/api/analytics/overview/route.ts
// Returns dashboard overview metrics with trends and platform breakdown

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Types
interface OverviewMetrics {
  period: {
    start: string;
    end: string;
    days: number;
  };
  totals: {
    impressions: number;
    engagements: number;
    posts: number;
    engagementRate: number;
  };
  byPlatform: Record<string, PlatformMetrics>;
  trend: {
    impressionsChange: number;
    engagementsChange: number;
  };
}

interface PlatformMetrics {
  impressions: number;
  engagements: number;
  posts: number;
  likes: number;
  comments: number;
  shares: number;
  clicks: number;
  engagementRate: number;
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

// GET /api/analytics/overview?dateRange=30d
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = cookies();
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
    });

    // Get session from cookie
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

    // Validate date range
    const validRanges = ['1d', '7d', '30d', '90d'];
    if (!validRanges.includes(dateRange)) {
      return NextResponse.json(
        { error: 'Invalid dateRange. Use: 1d, 7d, 30d, 90d' },
        { status: 400 }
      );
    }

    // Calculate date range
    const { startDate, endDate, prevStartDate } = calculateDateRange(dateRange);

    // Fetch user's posts in date range
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, platform, posted_at')
      .eq('user_id', userId)
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
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: getDaysFromRange(dateRange),
        },
        totals: {
          impressions: 0,
          engagements: 0,
          posts: 0,
          engagementRate: 0,
        },
        byPlatform: {},
        trend: {
          impressionsChange: 0,
          engagementsChange: 0,
        },
        chartData: [],
      });
    }

    // Fetch analytics snapshots
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

    // Get previous period for trend calculation
    const { data: prevPosts } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', userId)
      .gte('posted_at', prevStartDate.toISOString())
      .lt('posted_at', startDate.toISOString());

    const prevPostIds = prevPosts?.map(p => p.id) || [];
    let prevSnapshots: any[] = [];

    if (prevPostIds.length > 0) {
      const { data } = await supabase
        .from('analytics_snapshots')
        .select('*')
        .in('post_id', prevPostIds)
        .order('collected_at', { ascending: false });
      prevSnapshots = data || [];
    }

    // Aggregate metrics
    const metrics = aggregateMetrics(snapshots || [], posts || []);
    const prevMetrics = aggregateMetrics(prevSnapshots, []);

    // Calculate trends
    const impressionsChange = prevMetrics.totalImpressions > 0
      ? ((metrics.totalImpressions - prevMetrics.totalImpressions) / prevMetrics.totalImpressions) * 100
      : 0;
    
    const engagementsChange = prevMetrics.totalEngagements > 0
      ? ((metrics.totalEngagements - prevMetrics.totalEngagements) / prevMetrics.totalEngagements) * 100
      : 0;

    // Build chart data (daily aggregation)
    const chartData = buildChartData(snapshots || [], dateRange);

    const response: OverviewMetrics & { chartData: any[] } = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: getDaysFromRange(dateRange),
      },
      totals: {
        impressions: metrics.totalImpressions,
        engagements: metrics.totalEngagements,
        posts: postIds.length,
        engagementRate: metrics.totalEngagementRate,
      },
      byPlatform: metrics.byPlatform,
      trend: {
        impressionsChange: Math.round(impressionsChange * 10) / 10,
        engagementsChange: Math.round(engagementsChange * 10) / 10,
      },
      chartData,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in analytics overview:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateDateRange(range: string): { startDate: Date; endDate: Date; prevStartDate: Date } {
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

  const prevStartDate = new Date(startDate);
  prevStartDate.setDate(prevStartDate.getDate() - days);

  return { startDate, endDate, prevStartDate };
}

function getDaysFromRange(range: string): number {
  switch (range) {
    case '1d':
      return 1;
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    default:
      return 30;
  }
}

function aggregateMetrics(snapshots: any[], posts: any[]) {
  const byPlatform: Record<string, any> = {};
  let totalImpressions = 0;
  let totalEngagements = 0;

  for (const snapshot of snapshots) {
    const platform = snapshot.platform || 'unknown';

    if (!byPlatform[platform]) {
      byPlatform[platform] = {
        impressions: 0,
        engagements: 0,
        posts: new Set(),
        likes: 0,
        comments: 0,
        shares: 0,
        clicks: 0,
      };
    }

    const p = byPlatform[platform];
    p.impressions += snapshot.impressions || 0;
    p.posts.add(snapshot.post_id);
    p.likes += snapshot.likes || 0;
    p.comments += (snapshot.comments || 0) + (snapshot.replies || 0);
    p.shares += (snapshot.shares || 0) + (snapshot.retweets || 0);
    p.clicks += snapshot.clicks || 0;

    // Calculate engagements
    let engagements = 0;
    if (platform === 'linkedin') {
      engagements = (snapshot.likes || 0) + (snapshot.comments || 0) + 
                    (snapshot.shares || 0) + (snapshot.clicks || 0);
    } else {
      engagements = (snapshot.likes || 0) + (snapshot.replies || 0) + 
                    (snapshot.retweets || 0) + (snapshot.quotes || 0) + 
                    (snapshot.bookmarks || 0);
    }

    p.engagements += engagements;
    totalEngagements += engagements;
    totalImpressions += snapshot.impressions || 0;
  }

  // Convert Sets to counts and calculate rates
  for (const platform in byPlatform) {
    const p = byPlatform[platform];
    p.posts = p.posts.size;
    p.engagementRate = p.impressions > 0 
      ? Math.round((p.engagements / p.impressions) * 10000) / 100 
      : 0;
  }

  const totalEngagementRate = totalImpressions > 0 
    ? Math.round((totalEngagements / totalImpressions) * 10000) / 100 
    : 0;

  return {
    totalImpressions,
    totalEngagements,
    totalEngagementRate,
    byPlatform,
  };
}

function buildChartData(snapshots: any[], range: string) {
  const dailyData: Record<string, any> = {};

  for (const snapshot of snapshots) {
    const date = new Date(snapshot.collected_at).toISOString().split('T')[0];

    if (!dailyData[date]) {
      dailyData[date] = {
        date,
        impressions: 0,
        engagements: 0,
        posts: new Set(),
        linkedin: { impressions: 0, engagements: 0 },
        twitter: { impressions: 0, engagements: 0 },
      };
    }

    const day = dailyData[date];
    day.impressions += snapshot.impressions || 0;
    day.posts.add(snapshot.post_id);

    const platform = snapshot.platform;
    let engagements = 0;

    if (platform === 'linkedin') {
      engagements = (snapshot.likes || 0) + (snapshot.comments || 0) + 
                    (snapshot.shares || 0) + (snapshot.clicks || 0);
      day.linkedin.impressions += snapshot.impressions || 0;
      day.linkedin.engagements += engagements;
    } else {
      engagements = (snapshot.likes || 0) + (snapshot.replies || 0) + 
                    (snapshot.retweets || 0) + (snapshot.quotes || 0) + 
                    (snapshot.bookmarks || 0);
      day.twitter.impressions += snapshot.impressions || 0;
      day.twitter.engagements += engagements;
    }

    day.engagements += engagements;
  }

  // Convert to array and sort
  const sorted = Object.values(dailyData).sort((a: any, b: any) => 
    a.date.localeCompare(b.date)
  );

  // Format for Recharts
  return sorted.map((day: any) => ({
    date: day.date,
    impressions: day.impressions,
    engagements: day.engagements,
    posts: day.posts.size,
    engagementRate: day.impressions > 0 
      ? Math.round((day.engagements / day.impressions) * 10000) / 100 
      : 0,
    linkedinImpressions: day.linkedin.impressions,
    linkedinEngagements: day.linkedin.engagements,
    twitterImpressions: day.twitter.impressions,
    twitterEngagements: day.twitter.engagements,
  }));
}
