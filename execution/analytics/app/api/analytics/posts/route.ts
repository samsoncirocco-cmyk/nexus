// app/api/analytics/posts/route.ts
// Returns post-level analytics with filtering and sorting

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

// GET /api/analytics/posts?platform=&sortBy=&limit=&offset=&dateRange=
export async function GET(request: NextRequest) {
  try {
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
    const platform = searchParams.get('platform');
    const sortBy = searchParams.get('sortBy') || 'engagementScore'; // engagementScore, impressions, likes, date
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const dateRange = searchParams.get('dateRange') || '30d';
    const search = searchParams.get('search');

    // Validate inputs
    const validSortFields = ['engagementScore', 'engagementRate', 'impressions', 'likes', 'date', 'comments'];
    if (!validSortFields.includes(sortBy)) {
      return NextResponse.json(
        { error: `Invalid sortBy. Use: ${validSortFields.join(', ')}` },
        { status: 400 }
      );
    }

    const { startDate, endDate } = calculateDateRange(dateRange);

    // Build posts query
    let postsQuery = supabase
      .from('posts')
      .select('id, content, platform, posted_at, platform_post_id, status')
      .eq('user_id', userId)
      .gte('posted_at', startDate.toISOString())
      .lte('posted_at', endDate.toISOString());

    if (platform) {
      postsQuery = postsQuery.eq('platform', platform.toLowerCase());
    }

    if (search) {
      postsQuery = postsQuery.ilike('content', `%${search}%`);
    }

    const { data: posts, error: postsError } = await postsQuery;

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
        posts: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false,
        },
        summary: {
          totalPosts: 0,
          totalImpressions: 0,
          totalEngagements: 0,
          avgEngagementRate: 0,
        },
      });
    }

    // Fetch latest snapshot for each post
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .in('post_id', postIds)
      .order('collected_at', { ascending: false });

    if (snapshotsError) {
      console.error('Error fetching snapshots:', snapshotsError);
      return NextResponse.json(
        { error: 'Failed to fetch analytics data' },
        { status: 500 }
      );
    }

    // Keep only latest snapshot per post
    const latestByPost: Record<string, any> = {};
    for (const snapshot of (snapshots || [])) {
      if (!latestByPost[snapshot.post_id]) {
        latestByPost[snapshot.post_id] = snapshot;
      }
    }

    // Build enriched posts list
    const postsMap = new Map(posts?.map(p => [p.id, p]));
    const enrichedPosts: any[] = [];

    for (const [postId, snapshot] of Object.entries(latestByPost)) {
      const post = postsMap.get(postId);
      if (!post) continue;

      const platform = post.platform;
      
      // Calculate engagements based on platform
      let engagements = 0;
      let comments = 0;
      let shares = 0;

      if (platform === 'linkedin') {
        engagements = (snapshot.likes || 0) + (snapshot.comments || 0) + 
                      (snapshot.shares || 0) + (snapshot.clicks || 0);
        comments = snapshot.comments || 0;
        shares = snapshot.shares || 0;
      } else {
        engagements = (snapshot.likes || 0) + (snapshot.replies || 0) + 
                      (snapshot.retweets || 0) + (snapshot.quotes || 0) + 
                      (snapshot.bookmarks || 0);
        comments = snapshot.replies || 0;
        shares = (snapshot.retweets || 0) + (snapshot.quotes || 0);
      }

      enrichedPosts.push({
        id: postId,
        content: post.content,
        contentPreview: post.content?.substring(0, 150) + (post.content?.length > 150 ? '...' : ''),
        platform,
        postedAt: post.posted_at,
        platformPostId: post.platform_post_id,
        status: post.status,
        metrics: {
          impressions: snapshot.impressions || 0,
          engagements,
          likes: snapshot.likes || 0,
          comments,
          shares,
          clicks: snapshot.clicks || 0,
          bookmarks: snapshot.bookmarks || 0,
          quotes: snapshot.quotes || 0,
          retweets: snapshot.retweets || 0,
          replies: snapshot.replies || 0,
          engagementRate: snapshot.engagement_rate || 0,
        },
        engagementScore: snapshot.engagement_score || 0,
        lastUpdated: snapshot.collected_at,
      });
    }

    // Sort posts
    enrichedPosts.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'engagementScore':
          comparison = a.engagementScore - b.engagementScore;
          break;
        case 'engagementRate':
          comparison = a.metrics.engagementRate - b.metrics.engagementRate;
          break;
        case 'impressions':
          comparison = a.metrics.impressions - b.metrics.impressions;
          break;
        case 'likes':
          comparison = a.metrics.likes - b.metrics.likes;
          break;
        case 'comments':
          comparison = a.metrics.comments - b.metrics.comments;
          break;
        case 'date':
          comparison = new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime();
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Calculate summary
    const summary = enrichedPosts.reduce(
      (acc, post) => ({
        totalPosts: acc.totalPosts + 1,
        totalImpressions: acc.totalImpressions + post.metrics.impressions,
        totalEngagements: acc.totalEngagements + post.metrics.engagements,
      }),
      { totalPosts: 0, totalImpressions: 0, totalEngagements: 0 }
    );

    summary.avgEngagementRate = summary.totalImpressions > 0
      ? Math.round((summary.totalEngagements / summary.totalImpressions) * 10000) / 100
      : 0;

    // Paginate
    const total = enrichedPosts.length;
    const paginatedPosts = enrichedPosts.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return NextResponse.json({
      posts: paginatedPosts,
      pagination: {
        total,
        limit,
        offset,
        hasMore,
      },
      summary,
      filters: {
        platform,
        dateRange,
        sortBy,
        sortOrder,
      },
    });

  } catch (error) {
    console.error('Error in posts analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/analytics/posts/refresh
// Trigger refresh of metrics for specific posts
export async function POST(request: NextRequest) {
  try {
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
    const body = await request.json();
    const { postIds } = body;

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return NextResponse.json(
        { error: 'postIds array required' },
        { status: 400 }
      );
    }

    // Verify posts belong to user
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, platform, platform_post_id')
      .eq('user_id', userId)
      .in('id', postIds);

    if (postsError) {
      return NextResponse.json(
        { error: 'Failed to verify posts' },
        { status: 500 }
      );
    }

    // Get platform tokens
    const platforms = [...new Set(posts?.map(p => p.platform))];
    const { data: platformData } = await supabase
      .from('user_platforms')
      .select('platform, access_token')
      .eq('user_id', userId)
      .in('platform', platforms);

    const tokenMap = new Map(platformData?.map(p => [p.platform, p.access_token]));

    // Queue refresh jobs (in production, this would enqueue to a job queue)
    const refreshJobs = posts?.map(post => ({
      postId: post.id,
      platform: post.platform,
      platformPostId: post.platform_post_id,
      hasToken: !!tokenMap.get(post.platform),
    }));

    return NextResponse.json({
      queued: refreshJobs?.length || 0,
      jobs: refreshJobs,
      message: 'Refresh jobs queued successfully',
    });

  } catch (error) {
    console.error('Error refreshing posts:', error);
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
