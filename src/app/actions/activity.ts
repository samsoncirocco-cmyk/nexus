'use server';

import { ensureVaultDir, getVaultFilePath, readJsonFile, writeJsonFile } from '@/lib/vault-io';
import { getRecentEvents } from './datalake';

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
  source?: 'vault' | 'gmail' | 'drive' | 'calendar';
}

export async function getActivity(): Promise<ActivityEntry[]> {
  await ensureVaultDir();
  const entries = await readJsonFile<ActivityEntry[]>(ACTIVITY_FILE, []);
  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/** Fetch vault activity + BigQuery events, merged and sorted. */
export async function getMergedActivity(): Promise<ActivityEntry[]> {
  const [vaultEntries, bqResponse] = await Promise.all([
    getActivity(),
    getRecentEvents(undefined, 48).catch(() => ({ events: [], count: 0, filters: { source: null, hours: 48, limit: 50 } })),
  ]);

  // Tag vault entries with source
  const tagged = vaultEntries.map(e => ({ ...e, source: (e.source || 'vault') as ActivityEntry['source'] }));

  // Convert BigQuery events to ActivityEntry format
  const bqEntries: ActivityEntry[] = (bqResponse.events || []).map((evt: Record<string, unknown>) => ({
    id: `bq-${String(evt.event_id || '')}`,
    timestamp: String(evt.timestamp || new Date().toISOString()),
    agent: String(evt.agent_id || 'system'),
    type: String(evt.event_type || 'note'),
    title: String(evt.subject || evt.event_type || 'Event'),
    summary: String(evt.summary || evt.subject || ''),
    output: [],
    tags: [String(evt.source || 'bigquery')],
    status: evt.processed ? 'done' as const : 'info' as const,
    source: mapBqSource(String(evt.source || '')),
  }));

  // Merge, deduplicate by id, sort by timestamp desc
  const merged = [...tagged, ...bqEntries];
  const seen = new Set<string>();
  const deduped = merged.filter(e => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });

  return deduped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function mapBqSource(source: string): ActivityEntry['source'] {
  const s = source.toLowerCase();
  if (s === 'gmail' || s === 'email') return 'gmail';
  if (s === 'drive' || s === 'gdrive') return 'drive';
  if (s === 'calendar' || s === 'gcal') return 'calendar';
  return 'vault';
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
