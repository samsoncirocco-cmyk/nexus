export interface BQEvent {
  id?: string;
  timestamp: string;
  type: string;
  source: string;
  summary: string;
  content: string;
  metadata?: any;
}

const PROXY_URL = process.env.NEXT_PUBLIC_BQ_PROXY_URL || "http://localhost:8877";

export async function getStats() {
  try {
    const res = await fetch(`${PROXY_URL}/stats`);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("Failed to fetch BQ stats", e);
    return [];
  }
}

export async function getRecentEvents(count = 20): Promise<BQEvent[]> {
  try {
    const res = await fetch(`${PROXY_URL}/recent?count=${count}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("Failed to fetch recent events", e);
    return [];
  }
}

export async function searchEvents(query: string): Promise<BQEvent[]> {
  try {
    const res = await fetch(`${PROXY_URL}/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("Failed to search events", e);
    return [];
  }
}
