/**
 * Data Lake Insights API
 *
 * GET: Returns AI insights from ai_analysis and observations tables.
 * Query params:
 *   - days:  lookback window in days (default 7)
 *   - limit: max rows per table (default 20)
 */

import { NextRequest, NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

export const dynamic = 'force-dynamic';

const PROJECT_ID = process.env.PROJECT_ID || 'killuacode';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const days = Math.min(Number(searchParams.get('days')) || 7, 30);
    const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);

    const bq = new BigQuery({ projectId: PROJECT_ID });

    const analysisQuery = `
      SELECT
        analysis_id,
        event_id,
        timestamp,
        agent_id,
        analysis_type,
        input_summary,
        output_raw,
        confidence,
        token_count_input,
        token_count_output,
        latency_ms
      FROM \`openclaw.ai_analysis\`
      WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
        AND error IS NULL
      ORDER BY timestamp DESC
      LIMIT @limit
    `;

    const observationsQuery = `
      SELECT
        observation_id,
        timestamp,
        agent_id,
        entity_type,
        entity_id,
        observation_type,
        value,
        confidence,
        expires_at
      FROM \`openclaw.observations\`
      WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP())
      ORDER BY confidence DESC, timestamp DESC
      LIMIT @limit
    `;

    const [analysisRows, observationRows] = await Promise.all([
      bq.query({ query: analysisQuery, params: { limit } }),
      bq.query({ query: observationsQuery, params: { limit } }),
    ]);

    return NextResponse.json({
      analyses: analysisRows[0],
      observations: observationRows[0],
      counts: {
        analyses: (analysisRows[0] as unknown[]).length,
        observations: (observationRows[0] as unknown[]).length,
      },
      filters: { days, limit },
    });
  } catch (error: unknown) {
    console.error('[Data Lake Insights Error]', error);
    return NextResponse.json(
      { error: 'Failed to fetch insights', details: (error as Error).message },
      { status: 500 }
    );
  }
}
