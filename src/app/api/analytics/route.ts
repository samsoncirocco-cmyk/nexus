/**
 * Analytics API — aggregated stats from BigQuery
 * Returns events per day, by type, by source, model usage, and cost estimates
 */

import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

export const dynamic = 'force-dynamic';

const PROJECT_ID = 'tatt-pro';
const FULL_TABLE = 'tatt-pro.openclaw.events';

// Model pricing per 1M tokens (input/output)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4': { input: 15, output: 75 },
  'claude-sonnet-4': { input: 3, output: 15 },
  'claude-sonnet-3.5': { input: 3, output: 15 },
  'claude-haiku-3.5': { input: 0.8, output: 4 },
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gemini-2.0-flash': { input: 0.075, output: 0.3 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
};

function getBQClient(): BigQuery {
  const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (keyBase64) {
    const credentials = JSON.parse(Buffer.from(keyBase64, 'base64').toString('utf-8'));
    return new BigQuery({ projectId: PROJECT_ID, credentials });
  }
  return new BigQuery({ projectId: PROJECT_ID });
}

interface EventsByDay {
  day: string;
  count: number;
}

interface EventsByType {
  type: string;
  count: number;
}

interface EventsBySource {
  source: string;
  count: number;
}

interface ModelUsage {
  model: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

interface AnalyticsData {
  summary: {
    totalEvents: number;
    eventsToday: number;
    activeAgents: number;
    vaultDocs: number;
  };
  eventsByDay: EventsByDay[];
  eventsByType: EventsByType[];
  eventsBySource: EventsBySource[];
  modelUsage: ModelUsage[];
  totalCost: number;
}

export async function GET() {
  try {
    const bq = getBQClient();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Query 1: Events per day (last 7 days)
    const eventsByDayQuery = `
      SELECT 
        DATE(timestamp) as day,
        COUNT(*) as count
      FROM \`${FULL_TABLE}\`
      WHERE DATE(timestamp) >= '${sevenDaysAgo}'
      GROUP BY day
      ORDER BY day ASC
    `;
    const [eventsByDayRows] = await bq.query({ query: eventsByDayQuery });

    // Query 2: Events by type
    const eventsByTypeQuery = `
      SELECT 
        event_type as type,
        COUNT(*) as count
      FROM \`${FULL_TABLE}\`
      WHERE DATE(timestamp) >= '${sevenDaysAgo}'
      GROUP BY event_type
      ORDER BY count DESC
      LIMIT 10
    `;
    const [eventsByTypeRows] = await bq.query({ query: eventsByTypeQuery });

    // Query 3: Events by source
    const eventsBySourceQuery = `
      SELECT 
        COALESCE(source, 'unknown') as source,
        COUNT(*) as count
      FROM \`${FULL_TABLE}\`
      WHERE DATE(timestamp) >= '${sevenDaysAgo}'
      GROUP BY source
      ORDER BY count DESC
      LIMIT 10
    `;
    const [eventsBySourceRows] = await bq.query({ query: eventsBySourceQuery });

    // Query 4: Total events and events today
    const summaryQuery = `
      SELECT 
        COUNT(*) as total,
        COUNTIF(DATE(timestamp) = '${today}') as today,
        COUNT(DISTINCT agent_id) as agents
      FROM \`${FULL_TABLE}\`
      WHERE DATE(timestamp) >= '${sevenDaysAgo}'
    `;
    const [summaryRows] = await bq.query({ query: summaryQuery });
    const summary = summaryRows[0] as any;

    // Query 5: Model usage and token consumption
    const modelUsageQuery = `
      SELECT 
        JSON_EXTRACT_SCALAR(payload, '$.model') as model,
        COUNT(*) as calls,
        SUM(CAST(JSON_EXTRACT_SCALAR(payload, '$.usage.input_tokens') AS INT64)) as input_tokens,
        SUM(CAST(JSON_EXTRACT_SCALAR(payload, '$.usage.output_tokens') AS INT64)) as output_tokens
      FROM \`${FULL_TABLE}\`
      WHERE DATE(timestamp) >= '${sevenDaysAgo}'
        AND JSON_EXTRACT_SCALAR(payload, '$.model') IS NOT NULL
        AND JSON_EXTRACT_SCALAR(payload, '$.usage.input_tokens') IS NOT NULL
      GROUP BY model
      ORDER BY calls DESC
    `;
    const [modelUsageRows] = await bq.query({ query: modelUsageQuery });

    // Calculate costs
    const modelUsage: ModelUsage[] = (modelUsageRows as any[]).map((row) => {
      const modelName = normalizeModelName(row.model || '');
      const pricing = MODEL_PRICING[modelName] || { input: 0, output: 0 };
      const inputTokens = Number(row.input_tokens) || 0;
      const outputTokens = Number(row.output_tokens) || 0;
      const estimatedCost =
        (inputTokens / 1_000_000) * pricing.input +
        (outputTokens / 1_000_000) * pricing.output;

      return {
        model: row.model || 'unknown',
        calls: Number(row.calls) || 0,
        inputTokens,
        outputTokens,
        estimatedCost,
      };
    });

    const totalCost = modelUsage.reduce((sum, m) => sum + m.estimatedCost, 0);

    // Count vault docs (this would ideally come from the vault, but we'll estimate from events)
    const vaultDocsQuery = `
      SELECT COUNT(DISTINCT JSON_EXTRACT_SCALAR(payload, '$.doc_id')) as doc_count
      FROM \`${FULL_TABLE}\`
      WHERE event_type IN ('doc_created', 'doc_updated')
        AND JSON_EXTRACT_SCALAR(payload, '$.doc_id') IS NOT NULL
    `;
    const [vaultDocsRows] = await bq.query({ query: vaultDocsQuery });
    const vaultDocs = Number((vaultDocsRows[0] as any)?.doc_count) || 0;

    const data: AnalyticsData = {
      summary: {
        totalEvents: Number(summary.total) || 0,
        eventsToday: Number(summary.today) || 0,
        activeAgents: Number(summary.agents) || 0,
        vaultDocs,
      },
      eventsByDay: (eventsByDayRows as any[]).map((row) => ({
        day: row.day?.value || String(row.day),
        count: Number(row.count) || 0,
      })),
      eventsByType: (eventsByTypeRows as any[]).map((row) => ({
        type: row.type || 'unknown',
        count: Number(row.count) || 0,
      })),
      eventsBySource: (eventsBySourceRows as any[]).map((row) => ({
        source: row.source || 'unknown',
        count: Number(row.count) || 0,
      })),
      modelUsage,
      totalCost,
    };

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('[Analytics API Error]', error);
    return NextResponse.json(
      { 
        error: 'Analytics error', 
        details: (error as Error).message,
        summary: {
          totalEvents: 0,
          eventsToday: 0,
          activeAgents: 0,
          vaultDocs: 0,
        },
        eventsByDay: [],
        eventsByType: [],
        eventsBySource: [],
        modelUsage: [],
        totalCost: 0,
      },
      { status: 500 }
    );
  }
}

function normalizeModelName(model: string): string {
  const lower = model.toLowerCase();
  
  // Claude models
  if (lower.includes('opus-4') || lower.includes('claude-4')) return 'claude-opus-4';
  if (lower.includes('sonnet-4')) return 'claude-sonnet-4';
  if (lower.includes('sonnet-3.5') || lower.includes('sonnet-35')) return 'claude-sonnet-3.5';
  if (lower.includes('haiku-3.5') || lower.includes('haiku-35')) return 'claude-haiku-3.5';
  
  // GPT models
  if (lower.includes('gpt-4o-mini')) return 'gpt-4o-mini';
  if (lower.includes('gpt-4o')) return 'gpt-4o';
  
  // Gemini models
  if (lower.includes('gemini-2.0-flash') || lower.includes('gemini-2-flash')) return 'gemini-2.0-flash';
  if (lower.includes('gemini-1.5-pro') || lower.includes('gemini-15-pro')) return 'gemini-1.5-pro';
  
  return model;
}
