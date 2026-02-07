/**
 * Data Lake Events API
 *
 * GET: Returns recent events from BigQuery.
 * Query params:
 *   - source: filter by event source (e.g. gmail, drive, calendar)
 *   - hours:  lookback window in hours (default 24)
 *   - limit:  max rows to return (default 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

export const dynamic = 'force-dynamic';

const PROJECT_ID = process.env.PROJECT_ID || 'killuacode';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const source = searchParams.get('source');
    const hours = Math.min(Number(searchParams.get('hours')) || 24, 168); // cap at 7 days
    const limit = Math.min(Number(searchParams.get('limit')) || 50, 500);

    const bq = new BigQuery({ projectId: PROJECT_ID });

    const conditions = [
      `timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${hours} HOUR)`,
    ];
    if (source) {
      conditions.push(`source = @source`);
    }

    const query = `
      SELECT
        event_id,
        timestamp,
        agent_id,
        event_type,
        source,
        JSON_VALUE(payload, '$.subject') as subject,
        JSON_VALUE(payload, '$.summary') as summary,
        processed
      FROM \`openclaw.events\`
      WHERE ${conditions.join(' AND ')}
      ORDER BY timestamp DESC
      LIMIT @limit
    `;

    const params: Record<string, unknown> = { limit };
    if (source) {
      params.source = source;
    }

    const [rows] = await bq.query({ query, params });

    return NextResponse.json({
      events: rows,
      count: (rows as unknown[]).length,
      filters: { source, hours, limit },
    });
  } catch (error: unknown) {
    console.error('[Data Lake Events Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', details: (error as Error).message },
      { status: 500 }
    );
  }
}
