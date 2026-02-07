import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://192.168.0.39:18789';
const HOOK_TOKEN = process.env.OPENCLAW_HOOK_TOKEN || 'brain-hook-secret-2026';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    // Send command to OpenClaw via webhook — this actually reaches Paul
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
      });

      if (hookRes.ok) {
        return NextResponse.json(
          { ok: true, status: 'dispatched', message: 'Command sent to Paul via gateway' },
          { status: 202 }
        );
      } else {
        const errText = await hookRes.text();
        return NextResponse.json(
          { ok: false, status: 'gateway-error', message: `Gateway returned ${hookRes.status}: ${errText}` },
          { status: 502 }
        );
      }
    } catch (fetchErr) {
      return NextResponse.json(
        { ok: false, status: 'unreachable', message: `Gateway unreachable: ${(fetchErr as Error).message}` },
        { status: 503 }
      );
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process command' }, { status: 500 });
  }
}
