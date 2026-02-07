'use server';

import { ensureVaultDir, getVaultFilePath, readJsonFile, writeJsonFile } from '@/lib/vault-io';

const ACTIVITY_FILE = getVaultFilePath('activity.json');

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

export async function getActivity(): Promise<ActivityEntry[]> {
  await ensureVaultDir();
  const entries = await readJsonFile<ActivityEntry[]>(ACTIVITY_FILE, []);
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export async function addActivity(entry: Omit<ActivityEntry, 'id'>): Promise<ActivityEntry> {
  const entries = await getActivity();
  const newEntry: ActivityEntry = {
    ...entry,
    id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
  };
  entries.push(newEntry);
  await writeJsonFile(ACTIVITY_FILE, entries);
  return newEntry;
}
