import { NextResponse } from 'next/server';
import { getEnrichedSessions, type EnrichedSession } from '@/lib/gateway';

export interface LiveAgent {
  id: string;
  label: string;
  status: 'running' | 'completed' | 'failed' | 'idle';
  model: string;
  startedAt: string;
  elapsedMs: number;
  lastMessage: string;
  sessionKey: string;
}

function enrichedToLiveAgent(session: EnrichedSession): LiveAgent {
  const startTime = new Date(session.startedAt).getTime();
  const elapsedMs = Date.now() - startTime;
  
  return {
    id: session.id,
    label: session.label,
    status: session.status,
    model: session.model,
    startedAt: session.startedAt,
    elapsedMs,
    lastMessage: session.summary,
    sessionKey: session.key,
  };
}

export async function GET() {
  try {
    const { mode, sessions } = await getEnrichedSessions();
    
    // Only return active agents (running or recently updated)
    const activeAgents = sessions
      .filter(s => s.status === 'running' || s.status === 'idle')
      .map(enrichedToLiveAgent)
      .sort((a, b) => {
        // Running first, then by start time (newest first)
        if (a.status === 'running' && b.status !== 'running') return -1;
        if (b.status === 'running' && a.status !== 'running') return 1;
        return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
      });

    return NextResponse.json({
      mode,
      agents: activeAgents,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch live agents:', error);
    return NextResponse.json(
      { mode: 'fallback', agents: [], timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
