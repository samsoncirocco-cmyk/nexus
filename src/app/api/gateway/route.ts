/**
 * Gateway Bridge API
 * 
 * Server-side proxy connecting Second Brain to OpenClaw Gateway.
 * All requests are POST with an `action` field to route to the right operation.
 * 
 * Actions:
 *   - status   → Get gateway connection status
 *   - sessions → List active sessions
 *   - spawn    → Spawn a new agent with a task
 *   - send     → Send a message to an existing session
 *   - enriched → Get enriched session data (gateway + local merged)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getGatewayStatus,
  listSessions,
  spawnAgent,
  sendMessage,
  getEnrichedSessions,
} from '@/lib/gateway';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'status': {
        const status = await getGatewayStatus();
        return NextResponse.json(status);
      }

      case 'sessions': {
        const { activeMinutes } = body;
        const sessions = await listSessions(activeMinutes);
        return NextResponse.json(sessions);
      }

      case 'spawn': {
        const { message, sessionId, agent, thinking, timeout } = body;
        if (!message || typeof message !== 'string') {
          return NextResponse.json(
            { error: 'message is required' },
            { status: 400 }
          );
        }
        const result = await spawnAgent(message, {
          sessionId,
          agent,
          thinking,
          timeout,
        });
        return NextResponse.json(result);
      }

      case 'send': {
        const { sessionId: sid, message: msg, thinking: think, timeout: to } = body;
        if (!sid || !msg) {
          return NextResponse.json(
            { error: 'sessionId and message are required' },
            { status: 400 }
          );
        }
        const result = await sendMessage(sid, msg, {
          thinking: think,
          timeout: to,
        });
        return NextResponse.json(result);
      }

      case 'enriched': {
        const enriched = await getEnrichedSessions();
        return NextResponse.json(enriched);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use: status, sessions, spawn, send, enriched` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error('[Gateway Bridge Error]', error);
    return NextResponse.json(
      { error: 'Gateway bridge error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const status = await getGatewayStatus();
    return NextResponse.json({
      bridge: 'online',
      ...status,
    });
  } catch {
    return NextResponse.json({
      bridge: 'online',
      reachable: false,
      mode: 'fallback',
    });
  }
}
