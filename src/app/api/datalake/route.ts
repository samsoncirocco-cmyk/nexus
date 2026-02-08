/**
 * Data Lake API — queries tatt-pro.openclaw.events via BigQuery
 */

import { NextRequest, NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

export const dynamic = 'force-dynamic';

const PROJECT_ID = 'tatt-pro';
const DATASET = 'openclaw';
const FULL_TABLE = 'tatt-pro.openclaw.events';

function getBQClient(): BigQuery {
  const keyBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (keyBase64) {
    const credentials = JSON.parse(Buffer.from(keyBase64, 'base64').toString('utf-8'));
    return new BigQuery({ projectId: PROJECT_ID, credentials });
  }
  return new BigQuery({ projectId: PROJECT_ID });
}

// Use regular strings to avoid backtick conflicts in template literals
const STATS_QUERY = 'SELECT `type`, COUNT(*) as `count` FROM `' + FULL_TABLE + '` GROUP BY `type` ORDER BY `count` DESC';

function recentQuery(count: number) {
  return 'SELECT id, timestamp, `type`, source, summary, content, metadata FROM `' + FULL_TABLE + '` ORDER BY timestamp DESC LIMIT ' + count;
}

function searchQuery() {
  return 'SELECT id, timestamp, `type`, source, summary, content, metadata FROM `' + FULL_TABLE + '` WHERE LOWER(summary) LIKE @pattern OR LOWER(content) LIKE @pattern ORDER BY timestamp DESC LIMIT @count';
}

function typeQuery() {
  return 'SELECT id, timestamp, `type`, source, summary, content, metadata FROM `' + FULL_TABLE + '` WHERE `type` = @eventType ORDER BY timestamp DESC LIMIT @count';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const action = searchParams.get('action') || 'recent';
    const bq = getBQClient();

    switch (action) {
      case 'stats': {
        const [rows] = await bq.query({ query: STATS_QUERY });
        return NextResponse.json(rows);
      }

      case 'recent': {
        const count = Math.min(Number(searchParams.get('count')) || 20, 500);
        const [rows] = await bq.query({ query: recentQuery(count) });
        return NextResponse.json(rows);
      }

      case 'search': {
        const q = searchParams.get('q');
        if (!q) {
          return NextResponse.json({ error: 'q parameter is required for search' }, { status: 400 });
        }
        const count = Math.min(Number(searchParams.get('count')) || 50, 500);
        const [rows] = await bq.query({
          query: searchQuery(),
          params: { pattern: '%' + q.toLowerCase() + '%', count }
        });
        return NextResponse.json(rows);
      }

      case 'type': {
        const eventType = searchParams.get('type');
        if (!eventType) {
          return NextResponse.json({ error: 'type parameter is required' }, { status: 400 });
        }
        const count = Math.min(Number(searchParams.get('count')) || 50, 500);
        const [rows] = await bq.query({
          query: typeQuery(),
          params: { eventType, count }
        });
        return NextResponse.json(rows);
      }

      default:
        return NextResponse.json({ error: 'Unknown action: ' + action + '. Use: stats, recent, search, type' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('[Data Lake API Error]', error);
    return NextResponse.json(
      { error: 'Data lake error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
