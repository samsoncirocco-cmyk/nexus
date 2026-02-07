'use server';

import {
  queryDatalake,
  semanticSearch,
  buildContext,
  type QueryDatalakeResult,
  type SemanticSearchResult,
  type ContextSnapshot,
} from '../../../openclaw/skills';

// ─── Types ────────────────────────────────────────────────

export interface SearchFilters {
  sources?: string[];
  timeRangeDays?: number;
  maxResults?: number;
}

interface EventsResponse {
  events: Record<string, unknown>[];
  count: number;
  filters: { source: string | null; hours: number; limit: number };
  error?: string;
}

interface InsightsResponse {
  analyses: Record<string, unknown>[];
  observations: Record<string, unknown>[];
  counts: { analyses: number; observations: number };
  filters: { days: number; limit: number };
  error?: string;
}

// ─── Server Actions ──────────────────────────────────────

export async function queryDataLake(query: string): Promise<QueryDatalakeResult> {
  try {
    return await queryDatalake({ question: query });
  } catch (err: unknown) {
    return {
      question: query,
      generatedSql: '',
      rows: [],
      totalRows: 0,
      executionMs: 0,
      error: (err as Error).message,
    };
  }
}

export async function searchDataLake(
  query: string,
  filters?: SearchFilters,
): Promise<SemanticSearchResult> {
  try {
    return await semanticSearch({
      query,
      maxResults: filters?.maxResults,
      sources: filters?.sources,
      timeRangeDays: filters?.timeRangeDays,
    });
  } catch (err: unknown) {
    return {
      query,
      hits: [],
      totalHits: 0,
      executionMs: 0,
      tablesSearched: [],
      error: (err as Error).message,
    };
  }
}

export async function getRecentEvents(
  source?: string,
  hours?: number,
): Promise<EventsResponse> {
  try {
    const params = new URLSearchParams();
    if (source) params.set('source', source);
    if (hours) params.set('hours', String(hours));

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/datalake/events?${params}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Events API returned ${res.status}`);
    }

    return await res.json();
  } catch (err: unknown) {
    return {
      events: [],
      count: 0,
      filters: { source: source || null, hours: hours || 24, limit: 50 },
      error: (err as Error).message,
    };
  }
}

export async function getInsights(): Promise<InsightsResponse> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/datalake/insights`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Insights API returned ${res.status}`);
    }

    return await res.json();
  } catch (err: unknown) {
    return {
      analyses: [],
      observations: [],
      counts: { analyses: 0, observations: 0 },
      filters: { days: 7, limit: 20 },
      error: (err as Error).message,
    };
  }
}

export async function getContext(): Promise<ContextSnapshot> {
  try {
    return await buildContext();
  } catch (err: unknown) {
    return {
      timestamp: new Date().toISOString(),
      agentId: 'system',
      recentEmails: [],
      openTasks: [],
      contacts: [],
      recentAnalyses: [],
      error: (err as Error).message,
    };
  }
}
