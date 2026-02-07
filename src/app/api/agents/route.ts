import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

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
}

async function readAgents(): Promise<AgentEntry[]> {
  try {
    const data = await fs.readFile(AGENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function GET() {
  try {
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
      // Update existing — merge, preserving startedAt
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
