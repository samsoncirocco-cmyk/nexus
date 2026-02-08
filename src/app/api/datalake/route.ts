/**
 * Data Lake API
 *
 * GET endpoint for querying the tatt-pro.openclaw.events table.
 * Query params:
 *   - action: stats | recent | search | type
 *   - count:  number of events to return (for recent)
 *   - q:      search query (for search)
 *   - type:   event type filter (for type)
 */

import { NextRequest, NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

export const dynamic = 'force-dynamic';

const PROJECT_ID = 'tatt-pro';
const DATASET = 'openclaw';
const TABLE = 'events';

interface BQEvent {
  id?: string;
  timestamp: string;
  type: string;
  source: string;
  summary: string;
  content: string;
  metadata?: any;
}

function getBQClient(): BigQuery {
  // On Vercel: use base64-encoded service account key
  const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (keyBase64) {
    const credentials = JSON.parse(Buffer.from(keyBase64, 'base64').toString('utf-8'));
    return new BigQuery({ projectId: PROJECT_ID, credentials });
  }
  // Locally: use ADC
  return new BigQuery({ projectId: PROJECT_ID });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const action = searchParams.get('action') || 'recent';

    const bq = getBQClient();

    switch (action) {
      case 'stats': {
        // Return event type counts
        const query = `
          SELECT `type`, COUNT(*) as count
          FROM \`${PROJECT_ID}.${DATASET}.${TABLE}\`
          GROUP BY `type`
          ORDER BY `count` DESC
        `;
        const [rows] = await bq.query({ query });
        return NextResponse.json(rows);
      }

      case 'recent': {
        // Return recent events
        const count = Math.min(Number(searchParams.get('count')) || 20, 500);
        const query = `
          SELECT id, timestamp, `type`, source, summary, content, metadata
          FROM \`${PROJECT_ID}.${DATASET}.${TABLE}\`
          ORDER BY timestamp DESC
          LIMIT @count
        `;
        const [rows] = await bq.query({ 
          query, 
          params: { count } 
        });
        return NextResponse.json(rows as BQEvent[]);
      }

      case 'search': {
        // Search events by content or summary
        const q = searchParams.get('q');
        if (!q) {
          return NextResponse.json(
            { error: 'q parameter is required for search' },
            { status: 400 }
          );
        }
        const count = Math.min(Number(searchParams.get('count')) || 50, 500);
        const query = `
          SELECT id, timestamp, `type`, source, summary, content, metadata
          FROM \`${PROJECT_ID}.${DATASET}.${TABLE}\`
          WHERE LOWER(summary) LIKE @pattern 
             OR LOWER(content) LIKE @pattern
          ORDER BY timestamp DESC
          LIMIT @count
        `;
        const [rows] = await bq.query({
          query,
          params: { 
            pattern: `%${q.toLowerCase()}%`,
            count 
          }
        });
        return NextResponse.json(rows as BQEvent[]);
      }

      case 'type': {
        // Filter events by type
        const eventType = searchParams.get('type');
        if (!eventType) {
          return NextResponse.json(
            { error: 'type parameter is required' },
            { status: 400 }
          );
        }
        const count = Math.min(Number(searchParams.get('count')) || 50, 500);
        const query = `
          SELECT id, timestamp, `type`, source, summary, content, metadata
          FROM \`${PROJECT_ID}.${DATASET}.${TABLE}\`
          WHERE `type` = @eventType
          ORDER BY timestamp DESC
          LIMIT @count
        `;
        const [rows] = await bq.query({
          query,
          params: { eventType, count }
        });
        return NextResponse.json(rows as BQEvent[]);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use: stats, recent, search, type` },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error('[Data Lake API Error]', error);
    return NextResponse.json(
      { error: 'Data lake error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
