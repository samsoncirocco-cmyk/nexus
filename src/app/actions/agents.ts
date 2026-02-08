'use server';

import fs from 'fs/promises';
import path from 'path';
import { VAULT_PATH, WRITABLE_VAULT, writablePath, readWithFallback } from '@/lib/paths';

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
    await fs.access(WRITABLE_VAULT);
  } catch {
    await fs.mkdir(WRITABLE_VAULT, { recursive: true });
  }
}

export async function getAgents(): Promise<AgentEntry[]> {
  await ensureVault();
  try {
    const data = await readWithFallback(AGENTS_FILE, '[]');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function getRunningAgents(): Promise<AgentEntry[]> {
  const agents = await getAgents();
  return agents.filter((a) => a.status === 'running');
}
