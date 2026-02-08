import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET || process.env.OPENCLAW_HOOK_TOKEN || '';

export async function POST(request: NextRequest) {
  try {
    // Allow internal calls (from same origin) without auth
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const isInternalCall = origin === process.env.NEXT_PUBLIC_APP_URL || referer?.includes(request.nextUrl.origin);
    
    // For external calls, require auth
    if (!isInternalCall) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      
      if (!token || token !== REVALIDATE_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json().catch(() => ({}));
    const paths = body.paths || ['/', '/activity', '/tasks', '/agents', '/commands', '/settings'];
    
    for (const path of paths) {
      revalidatePath(path);
    }

    return NextResponse.json({ 
      revalidated: true, 
      paths,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Revalidation failed', message: String(error) },
      { status: 500 }
    );
  }
}
