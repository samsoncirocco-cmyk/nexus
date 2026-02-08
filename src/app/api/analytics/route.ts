/**
 * Analytics API — Real-time BigQuery analytics for Second Brain
 * Aggregates events from tatt-pro.openclaw.events
 */

import { NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

export const dynamic = 'force-dynamic';

const PROJECT_ID = 'tatt-pro';
const FULL_TABLE = 'tatt-pro.openclaw.events';

function getBQClient(): BigQuery {
  const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (keyBase64) {
    const credentials = JSON.parse(Buffer.from(keyBase64, 'base64').toString('utf-8'));
    return new BigQuery({ projectId: PROJECT_ID, credentials });
  }
  return new BigQuery({ projectId: PROJECT_ID });
}

export async function GET() {
  try {
    const bq = getBQClient();

    // Run all queries in parallel for faster response
    const [
      totalEventsResult,
      eventsTodayResult,
      eventsByTypeResult,
      eventsBySourceResult,
      eventsByDayResult,
      recentEventsResult,
    ] = await Promise.all([
      // Total events (last 7 days)
      bq.query({
        query: `
          SELECT COUNT(*) as total
          FROM \`${FULL_TABLE}\`
          WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        `,
      }),

      // Events today (last 24h)
      bq.query({
        query: `
          SELECT COUNT(*) as total
          FROM \`${FULL_TABLE}\`
          WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
        `,
      }),

      // Events by type (last 7 days)
      bq.query({
        query: `
          SELECT event_type, COUNT(*) as count
          FROM \`${FULL_TABLE}\`
          WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
          GROUP BY event_type
          ORDER BY count DESC
          LIMIT 20
        `,
      }),

      // Events by source (last 7 days)
      bq.query({
        query: `
          SELECT source, COUNT(*) as count
          FROM \`${FULL_TABLE}\`
          WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
          GROUP BY source
          ORDER BY count DESC
          LIMIT 20
        `,
      }),

      // Events by day (last 7 days)
      bq.query({
        query: `
          SELECT 
            DATE(timestamp) as day,
            COUNT(*) as count
          FROM \`${FULL_TABLE}\`
          WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
          GROUP BY day
          ORDER BY day ASC
        `,
      }),

      // Recent events (last 10)
      bq.query({
        query: `
          SELECT 
            event_id,
            timestamp,
            agent_id,
            event_type,
            source,
            TO_JSON_STRING(payload) as payload_str
          FROM \`${FULL_TABLE}\`
          ORDER BY timestamp DESC
          LIMIT 10
        `,
      }),
    ]);

    // Extract results
    const totalEvents = Number((totalEventsResult[0][0] as any)?.total || 0);
    const eventsToday = Number((eventsTodayResult[0][0] as any)?.total || 0);

    const eventsByType = (eventsByTypeResult[0] as any[]).map((row) => ({
      type: row.event_type || 'unknown',
      count: Number(row.count || 0),
    }));

    const eventsBySource = (eventsBySourceResult[0] as any[]).map((row) => ({
      source: row.source || 'unknown',
      count: Number(row.count || 0),
    }));

    const eventsByDay = (eventsByDayResult[0] as any[]).map((row) => ({
      day: row.day?.value || String(row.day),
      count: Number(row.count || 0),
    }));

    const recentEvents = (recentEventsResult[0] as any[]).map((row) => ({
      id: row.event_id,
      timestamp: row.timestamp?.value || String(row.timestamp),
      agent: row.agent_id || 'system',
      type: row.event_type || 'unknown',
      source: row.source || 'unknown',
      summary: extractSummary(row.payload_str),
      metadata: safeParseJSON(row.payload_str),
    }));

    // Count unique sources and event types
    const uniqueSources = new Set(eventsBySource.map((e) => e.source)).size;
    const uniqueTypes = new Set(eventsByType.map((e) => e.type)).size;

    // Calculate active agents (unique agent_ids in last 7 days)
    const [activeAgentsResult] = await bq.query({
      query: `
        SELECT COUNT(DISTINCT agent_id) as count
        FROM \`${FULL_TABLE}\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
          AND agent_id IS NOT NULL
      `,
    });
    const activeAgents = Number((activeAgentsResult[0] as any)?.count || 0);

    // Build response
    const response = {
      summary: {
        totalEvents,
        eventsToday,
        activeAgents,
        uniqueSources,
        uniqueTypes,
      },
      eventsByDay,
      eventsByType,
      eventsBySource,
      recentEvents,
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('[Analytics API Error]', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch analytics',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

function safeParseJSON(str: string | null): any {
  if (!str) return {};
  try {
    return JSON.parse(str);
  } catch {
    return {};
  }
}

function extractSummary(payloadStr: string | null): string {
  if (!payloadStr) return 'No details';
  try {
    const p = JSON.parse(payloadStr);
    return (
      p.summary ||
      p.text ||
      p.decision ||
      p.insight ||
      p.task ||
      p.title ||
      p.subject ||
      p.message ||
      JSON.stringify(p).slice(0, 150)
    );
  } catch {
    return payloadStr.slice(0, 150);
  }
}
