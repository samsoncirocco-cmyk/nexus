import { NextRequest, NextResponse } from 'next/server';
import { getVaultFilePath, readJsonFile, writeJsonFile } from '@/lib/vault-io';

const ACTIVITY_FILE = getVaultFilePath('activity.json');

async function fetchBigQueryEvents(): Promise<any[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/datalake/events?hours=48`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.events || []).map((evt: Record<string, any>) => {
      const src = String(evt.source || '').toLowerCase();
      const source = src === 'gmail' || src === 'email' ? 'gmail'
        : src === 'drive' || src === 'gdrive' ? 'drive'
        : src === 'calendar' || src === 'gcal' ? 'calendar'
        : 'vault';
      return {
        id: `bq-${evt.event_id || ''}`,
        timestamp: String(evt.timestamp || new Date().toISOString()),
        agent: String(evt.agent_id || 'system'),
        type: String(evt.event_type || 'note'),
        title: String(evt.subject || evt.event_type || 'Event'),
        summary: String(evt.summary || evt.subject || ''),
        output: [],
        tags: [String(evt.source || 'bigquery')],
        status: evt.processed ? 'done' : 'info',
        source,
      };
    });
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const [vaultEntries, bqEntries] = await Promise.all([
      readJsonFile<any[]>(ACTIVITY_FILE, []),
      fetchBigQueryEvents(),
    ]);

    // Tag vault entries
    const tagged = vaultEntries.map((e: any) => ({ ...e, source: e.source || 'vault' }));

    // Merge and deduplicate
    const merged = [...tagged, ...bqEntries];
    const seen = new Set<string>();
    const deduped = merged.filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    deduped.sort((a: { timestamp: string }, b: { timestamp: string }) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return NextResponse.json(deduped);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const entries = await readJsonFile<any[]>(ACTIVITY_FILE, []);

    const newEntry = {
      ...body,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: body.timestamp || new Date().toISOString(),
    };
    
    entries.push(newEntry);
    await writeJsonFile(ACTIVITY_FILE, entries);
    
    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add activity' }, { status: 500 });
  }
}
