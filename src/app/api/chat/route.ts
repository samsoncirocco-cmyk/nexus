import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const VAULT_DIR = join(process.cwd(), 'vault');
const QUEUE_PATH = join(VAULT_DIR, 'chat-queue.json');
const RESPONSES_PATH = join(VAULT_DIR, 'chat-responses.json');

interface ChatMessage {
  id: string;
  text: string;
  from: 'user' | 'paul';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

function readJSON(path: string): ChatMessage[] {
  try {
    if (!existsSync(path)) return [];
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeJSON(path: string, data: ChatMessage[]) {
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// GET — return merged chat history (queue + responses), sorted by timestamp
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const since = url.searchParams.get('since');
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);

    const queue = readJSON(QUEUE_PATH);
    const responses = readJSON(RESPONSES_PATH);

    let all = [...queue, ...responses];

    // Filter by timestamp if 'since' provided
    if (since) {
      const sinceDate = new Date(since).getTime();
      all = all.filter((m) => new Date(m.timestamp).getTime() > sinceDate);
    }

    // Sort by timestamp ascending
    all.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Limit results
    if (all.length > limit) {
      all = all.slice(-limit);
    }

    return NextResponse.json({ messages: all });
  } catch (error: unknown) {
    console.error('Chat GET error:', error);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

// POST — add user message, get instant AI response via /api/ask, store both
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Missing "text" field' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: generateId(),
      text: text.trim(),
      from: 'user',
      timestamp: now,
      status: 'sent',
    };

    // Write user message to queue
    const queue = readJSON(QUEUE_PATH);
    queue.push(userMessage);
    writeJSON(QUEUE_PATH, queue);

    // Call /api/ask for instant AI response
    let aiResponse: ChatMessage;
    try {
      const origin = request.nextUrl.origin;
      const askRes = await fetch(`${origin}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text.trim() }),
      });

      const askData = await askRes.json();

      if (askData.error) {
        aiResponse = {
          id: generateId(),
          text: `I couldn't process that right now: ${askData.error}`,
          from: 'paul',
          timestamp: new Date().toISOString(),
          status: 'delivered',
        };
      } else {
        const sources = askData.sources?.length
          ? `\n\n📎 Sources: ${askData.sources.map((s: string) => `[${s}]`).join(', ')}`
          : '';
        aiResponse = {
          id: generateId(),
          text: askData.answer + sources,
          from: 'paul',
          timestamp: new Date().toISOString(),
          status: 'delivered',
        };
      }
    } catch {
      aiResponse = {
        id: generateId(),
        text: "I'm having trouble connecting to the vault right now. I'll catch up on this during my next heartbeat. 🦆",
        from: 'paul',
        timestamp: new Date().toISOString(),
        status: 'delivered',
      };
    }

    // Write AI response to responses file
    const responses = readJSON(RESPONSES_PATH);
    responses.push(aiResponse);
    writeJSON(RESPONSES_PATH, responses);

    return NextResponse.json({
      userMessage,
      aiResponse,
    });
  } catch (error: unknown) {
    console.error('Chat POST error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
