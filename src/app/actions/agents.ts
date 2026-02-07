'use server';

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

async function ensureVault() {
  try {
    await fs.access(VAULT_PATH);
  } catch {
    await fs.mkdir(VAULT_PATH, { recursive: true });
  }
}

export async function getAgents(): Promise<AgentEntry[]> {
  await ensureVault();
  try {
    const data = await fs.readFile(AGENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function getRunningAgents(): Promise<AgentEntry[]> {
  const agents = await getAgents();
  return agents.filter((a) => a.status === 'running');
}
