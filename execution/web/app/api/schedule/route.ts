import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/schedule - List scheduled posts for user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');

    const { data: posts, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', status)
      .order('scheduled_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled posts' },
      { status: 500 }
    );
  }
}

// POST /api/schedule - Create new scheduled post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { platform, content, scheduled_at, recurring } = body;

    // Validate required fields
    if (!platform || !content || !scheduled_at) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduled_at);
    if (scheduledDate <= new Date()) {
      return NextResponse.json(
        { error: 'Scheduled time must be in the future' },
        { status: 400 }
      );
    }

    // Create scheduled post
    const { data: post, error } = await supabase
      .from('scheduled_posts')
      .insert({
        user_id: session.user.id,
        platform,
        content,
        scheduled_at: scheduledDate.toISOString(),
        status: 'pending',
        recurring: recurring || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Error creating scheduled post:', error);
    return NextResponse.json(
      { error: 'Failed to create scheduled post' },
      { status: 500 }
    );
  }
}
