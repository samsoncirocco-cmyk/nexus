'use server';

import fs from 'fs/promises';
import path from 'path';

const VAULT_PATH = path.join(process.cwd(), 'vault');
const ACTIVITY_FILE = path.join(VAULT_PATH, 'activity.json');

export interface ActivityEntry {
  id: string;
  timestamp: string;
  agent: string;
  type: 'completed' | 'started' | 'alert' | 'note' | 'command' | string;
  title: string;
  summary: string;
  output?: string[];
  tags: string[];
  status: 'done' | 'in-progress' | 'failed' | 'info';
}

async function ensureVault() {
  try {
    await fs.access(VAULT_PATH);
  } catch {
    await fs.mkdir(VAULT_PATH, { recursive: true });
  }
}

export async function getActivity(): Promise<ActivityEntry[]> {
  await ensureVault();
  try {
    const data = await fs.readFile(ACTIVITY_FILE, 'utf-8');
    const entries: ActivityEntry[] = JSON.parse(data);
    return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch {
    return [];
  }
}

export async function addActivity(entry: Omit<ActivityEntry, 'id'>): Promise<ActivityEntry> {
  const entries = await getActivity();
  const newEntry: ActivityEntry = {
    ...entry,
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  };
  entries.push(newEntry);
  await fs.writeFile(ACTIVITY_FILE, JSON.stringify(entries, null, 2), 'utf-8');
  return newEntry;
}
