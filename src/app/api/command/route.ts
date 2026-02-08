import { NextRequest, NextResponse } from 'next/server';
import { executeCommand } from '@/app/actions/commands';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    // ─── Execute locally via Gemini + BigQuery ───────────
    
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
