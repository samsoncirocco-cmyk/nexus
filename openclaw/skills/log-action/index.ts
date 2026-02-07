/**
 * Log Action Skill
 *
 * Logs agent actions to the openclaw.events BigQuery table,
 * following the canonical event schema.
 */

import { BigQuery } from '@google-cloud/bigquery';
import { randomUUID } from 'crypto';

// ─── Types ────────────────────────────────────────────────

export interface LogActionInput {
  agentId: string;
  eventType: string;
  source: string;
  payload: Record<string, unknown>;
  processed?: boolean;
}

export interface LogActionResult {
  eventId: string;
  timestamp: string;
  success: boolean;
  error?: string;
}

// ─── Implementation ───────────────────────────────────────

const PROJECT_ID = process.env.PROJECT_ID || 'killuacode';
const DATASET = 'openclaw';
const TABLE = 'events';

function getBigQueryClient(): BigQuery {
  return new BigQuery({ projectId: PROJECT_ID });
}

export async function logAction(input: LogActionInput): Promise<LogActionResult> {
  const eventId = randomUUID();
  const timestamp = new Date().toISOString();

  try {
    const bq = getBigQueryClient();
    const table = bq.dataset(DATASET).table(TABLE);

    await table.insert([
      {
        event_id: eventId,
        timestamp,
        agent_id: input.agentId,
        event_type: input.eventType,
        source: input.source,
        payload: JSON.stringify(input.payload),
        processed: input.processed ?? false,
      },
    ]);

    return {
      eventId,
      timestamp,
      success: true,
    };
  } catch (err: unknown) {
    return {
      eventId,
      timestamp,
      success: false,
      error: (err as Error).message,
    };
  }
}
