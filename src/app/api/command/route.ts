import { NextRequest, NextResponse } from 'next/server';
import { executeCommand } from '@/app/actions/commands';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || '';
const HOOK_TOKEN = process.env.OPENCLAW_HOOK_TOKEN || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    // ─── Try gateway first (for local dev) ────────────────
    
    if (GATEWAY_URL && HOOK_TOKEN) {
      const hookUrl = `${GATEWAY_URL}/hooks/agent`;
      
      try {
        const hookRes = await fetch(hookUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${HOOK_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `[COMMAND FROM SECOND BRAIN] ${text.trim()}`,
            name: 'Brain Command',
            wakeMode: 'now',
            deliver: true,
            channel: 'telegram',
          }),
          signal: AbortSignal.timeout(5000), // 5s timeout
        });

        if (hookRes.ok) {
          return NextResponse.json(
            { 
              ok: true, 
              mode: 'gateway',
              status: 'dispatched', 
              message: 'Command sent to Paul via gateway' 
            },
            { status: 202 }
          );
        }
        // Gateway returned error, fall through to local execution
      } catch (fetchErr) {
        // Gateway unreachable, fall through to local execution
        console.log('Gateway unreachable, falling back to local execution:', (fetchErr as Error).message);
      }
    }

    // ─── Fallback to local execution (Vercel-friendly) ───
    
    const result = await executeCommand(text.trim());
    
    if (result.error) {
      return NextResponse.json(
        {
          ok: false,
          mode: 'local',
          status: 'error',
          message: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        mode: 'local',
        status: result.status,
        message: result.message,
        data: result.data,
      },
      { status: 200 }
    );
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to process command',
        details: (error as Error).message 
      }, 
      { status: 500 }
    );
  }
}
