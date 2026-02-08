export interface BQEvent {
  id?: string;
  timestamp: string;
  type: string;
  source: string;
  agent?: string;
  summary: string;
  content: string;
  metadata?: any;
}

export interface BQStat {
  event_type: string;
  cnt: number;
}

export async function getStats(): Promise<BQStat[]> {
  try {
    const res = await fetch('/api/datalake?action=stats');
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch BQ stats', e);
    return [];
  }
}

export async function getRecentEvents(count = 20): Promise<BQEvent[]> {
  try {
    const res = await fetch('/api/datalake?action=recent&count=' + count);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Failed to fetch recent events', e);
    return [];
  }
}

export async function searchEvents(query: string): Promise<BQEvent[]> {
  try {
    const res = await fetch('/api/datalake?action=search&q=' + encodeURIComponent(query));
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error('Failed to search events', e);
    return [];
  }
}
