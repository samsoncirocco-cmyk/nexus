'use server';

import { ensureVaultDir, getVaultFilePath, readJsonFile } from '@/lib/vault-io';

const AGENTS_FILE = getVaultFilePath('agents.json');

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

export async function getAgents(): Promise<AgentEntry[]> {
  await ensureVaultDir();
  return readJsonFile<AgentEntry[]>(AGENTS_FILE, []);
}

export async function getRunningAgents(): Promise<AgentEntry[]> {
  const agents = await getAgents();
  return agents.filter((a) => a.status === 'running');
}
