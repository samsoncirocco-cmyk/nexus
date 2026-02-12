import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/schedule/[id] - Get specific scheduled post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: post, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();

    if (error || !post) {
      return NextResponse.json(
        { error: 'Scheduled post not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error fetching scheduled post:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled post' },
      { status: 500 }
    );
  }
}

// PATCH /api/schedule/[id] - Update scheduled post
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, scheduled_at, status } = body;

    // Build update object
    const updates: any = {};
    if (content !== undefined) updates.content = content;
    if (scheduled_at !== undefined) {
      const scheduledDate = new Date(scheduled_at);
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled time must be in the future' },
          { status: 400 }
        );
      }
      updates.scheduled_at = scheduledDate.toISOString();
    }
    if (status !== undefined) updates.status = status;

    // Verify ownership
    const { data: existing } = await supabase
      .from('scheduled_posts')
      .select('status')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Scheduled post not found' },
        { status: 404 }
      );
    }

    // Only allow updates to pending or failed posts
    if (existing.status === 'published' || existing.status === 'processing') {
      return NextResponse.json(
        { error: 'Cannot update published or processing posts' },
        { status: 400 }
      );
    }

    const { data: post, error } = await supabase
      .from('scheduled_posts')
      .update(updates)
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ post });
  } catch (error) {
    console.error('Error updating scheduled post:', error);
    return NextResponse.json(
      { error: 'Failed to update scheduled post' },
      { status: 500 }
    );
  }
}

// DELETE /api/schedule/[id] - Cancel scheduled post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership and status
    const { data: existing } = await supabase
      .from('scheduled_posts')
      .select('status')
      .eq('id', params.id)
      .eq('user_id', session.user.id)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'Scheduled post not found' },
        { status: 404 }
      );
    }

    if (existing.status === 'published') {
      return NextResponse.json(
        { error: 'Cannot delete published posts' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('id', params.id)
      .eq('user_id', session.user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting scheduled post:', error);
    return NextResponse.json(
      { error: 'Failed to delete scheduled post' },
      { status: 500 }
    );
  }
}
