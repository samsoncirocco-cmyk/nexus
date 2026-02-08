/**
 * Data Lake API — queries tatt-pro.openclaw.events via BigQuery
 * Schema: event_id, timestamp, agent_id, event_type, source, payload (JSON), processed
 */

import { NextRequest, NextResponse } from 'next/server';
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const action = searchParams.get('action') || 'recent';
    const bq = getBQClient();

    switch (action) {
      case 'stats': {
        const query = [
          'SELECT event_type, COUNT(*) as cnt',
          'FROM ' + '`' + FULL_TABLE + '`',
          'GROUP BY event_type',
          'ORDER BY cnt DESC'
        ].join(' ');
        const [rows] = await bq.query({ query });
        return NextResponse.json(rows);
      }

      case 'recent': {
        const count = Math.min(Number(searchParams.get('count')) || 20, 500);
        const query = [
          'SELECT event_id, timestamp, agent_id, event_type, source, TO_JSON_STRING(payload) as payload_str',
          'FROM ' + '`' + FULL_TABLE + '`',
          'ORDER BY timestamp DESC',
          'LIMIT ' + count
        ].join(' ');
        const [rows] = await bq.query({ query });
        // Parse payload_str back to object for the frontend
        const events = (rows as any[]).map(r => ({
          id: r.event_id,
          timestamp: r.timestamp?.value || String(r.timestamp),
          type: r.event_type,
          source: r.source,
          agent: r.agent_id,
          summary: extractSummary(r.payload_str),
          content: r.payload_str,
          metadata: safeParseJSON(r.payload_str),
        }));
        return NextResponse.json(events);
      }

      case 'search': {
        const q = searchParams.get('q');
        if (!q) {
          return NextResponse.json({ error: 'q parameter is required for search' }, { status: 400 });
        }
        const count = Math.min(Number(searchParams.get('count')) || 50, 500);
        const pattern = '%' + q.toLowerCase().replace(/'/g, "\\'") + '%';
        const query = [
          'SELECT event_id, timestamp, agent_id, event_type, source, TO_JSON_STRING(payload) as payload_str',
          'FROM ' + '`' + FULL_TABLE + '`',
          'WHERE LOWER(TO_JSON_STRING(payload)) LIKE \'' + pattern + '\'',
          'OR LOWER(event_type) LIKE \'' + pattern + '\'',
          'OR LOWER(source) LIKE \'' + pattern + '\'',
          'ORDER BY timestamp DESC',
          'LIMIT ' + count
        ].join(' ');
        const [rows] = await bq.query({ query });
        const events = (rows as any[]).map(r => ({
          id: r.event_id,
          timestamp: r.timestamp?.value || String(r.timestamp),
          type: r.event_type,
          source: r.source,
          agent: r.agent_id,
          summary: extractSummary(r.payload_str),
          content: r.payload_str,
          metadata: safeParseJSON(r.payload_str),
        }));
        return NextResponse.json(events);
      }

      case 'type': {
        const eventType = searchParams.get('type');
        if (!eventType) {
          return NextResponse.json({ error: 'type parameter is required' }, { status: 400 });
        }
        const count = Math.min(Number(searchParams.get('count')) || 50, 500);
        const safeType = eventType.replace(/'/g, "\\'");
        const query = [
          'SELECT event_id, timestamp, agent_id, event_type, source, TO_JSON_STRING(payload) as payload_str',
          'FROM ' + '`' + FULL_TABLE + '`',
          'WHERE event_type = \'' + safeType + '\'',
          'ORDER BY timestamp DESC',
          'LIMIT ' + count
        ].join(' ');
        const [rows] = await bq.query({ query });
        const events = (rows as any[]).map(r => ({
          id: r.event_id,
          timestamp: r.timestamp?.value || String(r.timestamp),
          type: r.event_type,
          source: r.source,
          agent: r.agent_id,
          summary: extractSummary(r.payload_str),
          content: r.payload_str,
          metadata: safeParseJSON(r.payload_str),
        }));
        return NextResponse.json(events);
      }

      default:
        return NextResponse.json({ error: 'Unknown action: ' + action }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('[Data Lake API Error]', error);
    return NextResponse.json(
      { error: 'Data lake error', details: (error as Error).message },
      { status: 500 }
    );
  }
}

function safeParseJSON(str: string | null): any {
  if (!str) return {};
  try { return JSON.parse(str); } catch { return {}; }
}

function extractSummary(payloadStr: string | null): string {
  if (!payloadStr) return '';
  try {
    const p = JSON.parse(payloadStr);
    return p.summary || p.text || p.decision || p.insight || p.task || p.title || p.subject || JSON.stringify(p).slice(0, 200);
  } catch {
    return payloadStr.slice(0, 200);
  }
}
