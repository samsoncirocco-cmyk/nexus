import { NextResponse } from 'next/server';
import { VAULT_PATH, readWithFallback } from '@/lib/paths';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const statusPath = path.join(VAULT_PATH, 'heartbeat-status.json');
    const data = await readWithFallback(statusPath, JSON.stringify({
      lastHeartbeat: null,
      lastChecks: [],
      tasksMovedToDone: 0,
      staleTasks: 0
    }));
    
    const status = JSON.parse(data);
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error reading heartbeat status:', error);
    return NextResponse.json(
      {
        lastHeartbeat: null,
        lastChecks: [],
        tasksMovedToDone: 0,
        staleTasks: 0,
        error: 'Failed to load heartbeat status'
      },
      { status: 500 }
    );
  }
}
