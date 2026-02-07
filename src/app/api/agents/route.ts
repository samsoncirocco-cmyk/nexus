import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getEnrichedSessions, type EnrichedSession } from '@/lib/gateway';

const VAULT_PATH = path.join(process.cwd(), 'vault');
const AGENTS_FILE = path.join(VAULT_PATH, 'agents.json');

export interface AgentEntry {
  id: string;
  label: string;
  status: 'running' | 'completed' | 'failed';
  model: string;
  startedAt: string;
  completedAt?: string;
  lastUpdate: string;
  summary: string;
  // Gateway-enriched fields
  source?: 'gateway' | 'local';
  tokens?: { input: number; output: number; total: number };
  contextTokens?: number;
  sessionKey?: string;
}

async function readAgents(): Promise<AgentEntry[]> {
  try {
    const data = await fs.readFile(AGENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function enrichedToAgent(session: EnrichedSession): AgentEntry {
  return {
    id: session.id,
    label: session.label,
    status: session.status === 'idle' ? 'completed' : session.status,
    model: session.model,
    startedAt: session.startedAt,
    lastUpdate: session.lastUpdate,
    summary: session.summary,
    source: session.source,
    tokens: session.tokens,
    contextTokens: session.contextTokens,
    sessionKey: session.key,
  };
}

export async function GET(req: NextRequest) {
  try {
    const useGateway = req.nextUrl.searchParams.get('source') !== 'local';

    if (useGateway) {
      try {
        const { mode, sessions } = await getEnrichedSessions();
        if (mode === 'live' && sessions.length > 0) {
          const agents = sessions.map(enrichedToAgent);
          // Sort: running first, then by last update
          agents.sort((a, b) => {
            if (a.status === 'running' && b.status !== 'running') return -1;
            if (b.status === 'running' && a.status !== 'running') return 1;
            return new Date(b.lastUpdate).getTime() - new Date(a.lastUpdate).getTime();
          });
          return NextResponse.json(agents);
        }
      } catch {
        // Fall through to local
      }
    }

    // Fallback to local agents.json
    const agents = await readAgents();
    return NextResponse.json(agents);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const agents = await readAgents();

    const existingIndex = agents.findIndex((a) => a.id === body.id);

    const entry: AgentEntry = {
      id: body.id,
      label: body.label || body.id,
      status: body.status || 'running',
      model: body.model || 'unknown',
      startedAt: body.startedAt || new Date().toISOString(),
      completedAt: body.completedAt,
      lastUpdate: body.lastUpdate || new Date().toISOString(),
      summary: body.summary || '',
    };

    if (existingIndex >= 0) {
      agents[existingIndex] = {
        ...agents[existingIndex],
        ...entry,
        startedAt: agents[existingIndex].startedAt,
        lastUpdate: new Date().toISOString(),
      };
    } else {
      agents.push(entry);
    }

    await fs.writeFile(AGENTS_FILE, JSON.stringify(agents, null, 2), 'utf-8');

    return NextResponse.json(existingIndex >= 0 ? agents[existingIndex] : entry, {
      status: existingIndex >= 0 ? 200 : 201,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}
