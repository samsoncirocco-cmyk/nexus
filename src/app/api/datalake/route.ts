/**
 * Data Lake API
 *
 * Server-side proxy connecting Second Brain to the OpenClaw data lake.
 * All requests are POST with an `action` field to route to the right operation.
 *
 * Actions:
 *   - query   -> Natural language query against BigQuery
 *   - search  -> Semantic search across events, NLP, and AI tables
 *   - context -> Build a full context snapshot (emails, tasks, analyses)
 *   - log     -> Log an agent action to the events table
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  queryDatalake,
  semanticSearch,
  buildContext,
  logAction,
} from '../../../../openclaw/skills';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'query': {
        const { question, maxRows } = body;
        if (!question || typeof question !== 'string') {
          return NextResponse.json(
            { error: 'question is required' },
            { status: 400 }
          );
        }
        const result = await queryDatalake({ question, maxRows });
        return NextResponse.json(result);
      }

      case 'search': {
        const { query, maxResults, sources, timeRangeDays } = body;
        if (!query || typeof query !== 'string') {
          return NextResponse.json(
            { error: 'query is required' },
            { status: 400 }
          );
        }
        const result = await semanticSearch({
          query,
          maxResults,
          sources,
          timeRangeDays,
        });
        return NextResponse.json(result);
      }

      case 'context': {
        const { agentId, emailCount, taskCount, analysisCount } = body;
        const result = await buildContext({
          agentId,
          emailCount,
          taskCount,
          analysisCount,
        });
        return NextResponse.json(result);
      }

      case 'log': {
        const { agentId, eventType, source, payload, processed } = body;
        if (!agentId || !eventType || !source) {
          return NextResponse.json(
            { error: 'agentId, eventType, and source are required' },
            { status: 400 }
          );
        }
        const result = await logAction({
          agentId,
          eventType,
          source,
          payload: payload || {},
          processed,
        });
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use: query, search, context, log` },
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

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    service: 'datalake',
    status: 'online',
    actions: ['query', 'search', 'context', 'log'],
  });
}
