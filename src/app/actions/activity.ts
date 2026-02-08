'use server';

import fs from 'fs/promises';
import path from 'path';
import { getRecentEvents } from './datalake';

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
  source?: 'gmail' | 'calendar' | 'drive' | 'agent' | 'manual';
}

async function ensureVault() {
  try {
    await fs.access(VAULT_PATH);
  } catch {
    await fs.mkdir(VAULT_PATH, { recursive: true });
  }
}

async function getVaultActivity(): Promise<ActivityEntry[]> {
  await ensureVault();
  try {
    const data = await fs.readFile(ACTIVITY_FILE, 'utf-8');
    const entries: ActivityEntry[] = JSON.parse(data);
    // Tag vault entries as 'manual' source if not already set
    return entries.map(e => ({ ...e, source: e.source || 'manual' }));
  } catch {
    return [];
  }
}

export async function getActivity(): Promise<ActivityEntry[]> {
  // Fetch both local vault and BigQuery events
  const [vaultEntries, bqResponse] = await Promise.all([
    getVaultActivity(),
    getRecentEvents(undefined, 72), // Last 3 days
  ]);

  // Convert BigQuery events to ActivityEntry format
  const bqEntries: ActivityEntry[] = bqResponse.events.map((evt: any) => ({
    id: evt.event_id || `bq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: evt.timestamp?.value || evt.timestamp,
    agent: evt.agent_id || 'system',
    type: evt.event_type || 'note',
    title: evt.subject || evt.summary || 'Untitled Event',
    summary: evt.summary || evt.subject || '',
    tags: [],
    status: evt.processed ? 'done' : 'info',
    source: evt.source as any || 'agent',
  }));

  // Merge and deduplicate by event_id
  const seen = new Set<string>();
  const merged: ActivityEntry[] = [];

  for (const entry of [...vaultEntries, ...bqEntries]) {
    if (!seen.has(entry.id)) {
      seen.add(entry.id);
      merged.push(entry);
    }
  }

  // Sort by timestamp descending
  return merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
