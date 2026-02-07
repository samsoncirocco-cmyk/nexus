/**
 * Query Data Lake Skill
 *
 * Accepts a natural language question, converts it to SQL via Gemini,
 * executes against BigQuery, and returns structured results.
 */

import { BigQuery } from '@google-cloud/bigquery';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Types ────────────────────────────────────────────────

export interface QueryDatalakeInput {
  question: string;
  maxRows?: number;
}

export interface QueryDatalakeResult {
  question: string;
  generatedSql: string;
  rows: Record<string, unknown>[];
  totalRows: number;
  executionMs: number;
  error?: string;
}

// ─── Schema Context ───────────────────────────────────────

const SCHEMA_CONTEXT = `
You have access to a BigQuery dataset called "openclaw" with these tables:

openclaw.events (event_id STRING, timestamp TIMESTAMP, agent_id STRING, event_type STRING, source STRING, payload JSON, processed BOOL)
  - Partitioned by DATE(timestamp), clustered by agent_id, event_type
  - Sources: gmail, drive, calendar. Event types: email_received, file_changed, calendar_event, action_taken

openclaw.decisions (decision_id STRING, timestamp TIMESTAMP, agent_id STRING, trigger_event_id STRING, context_snapshot JSON, options_considered JSON, chosen_option STRING, outcome STRING, outcome_timestamp TIMESTAMP, feedback JSON)

openclaw.observations (observation_id STRING, timestamp TIMESTAMP, agent_id STRING, entity_type STRING, entity_id STRING, observation_type STRING, value JSON, confidence FLOAT64, expires_at TIMESTAMP)

openclaw.nlp_enrichment (event_id STRING, timestamp TIMESTAMP, source STRING, entities JSON, sentiment_score FLOAT64, sentiment_magnitude FLOAT64, language STRING, raw_text STRING)

openclaw.ai_analysis (analysis_id STRING, event_id STRING, timestamp TIMESTAMP, agent_id STRING, model_id STRING, analysis_type STRING, prompt_hash STRING, input_summary STRING, output_raw STRING, output_structured JSON, confidence FLOAT64, token_count_input INT64, token_count_output INT64, latency_ms INT64, error STRING)

openclaw.ai_decisions (decision_id STRING, timestamp TIMESTAMP, agent_id STRING, trigger_event_id STRING, analysis_id STRING, decision_type STRING, input_context JSON, reasoning STRING, chosen_action STRING, alternatives JSON, confidence FLOAT64, executed BOOL, execution_result STRING, execution_timestamp TIMESTAMP)

openclaw.embeddings (embedding_id STRING, event_id STRING, timestamp TIMESTAMP, source STRING, content_hash STRING, content_preview STRING, embedding ARRAY<FLOAT64>, model_id STRING, dimensions INT64)

openclaw.semantic_links (link_id STRING, timestamp TIMESTAMP, source_event_id STRING, target_event_id STRING, similarity_score FLOAT64, link_type STRING, metadata JSON)

Views: openclaw.critical_actions, openclaw.decision_audit, openclaw.valid_observations, openclaw.recent_events, openclaw.recent_ai_analysis, openclaw.ai_decision_audit, openclaw.recent_embeddings, openclaw.strong_semantic_links

Rules:
- Always use BigQuery Standard SQL (not legacy SQL)
- Use JSON_VALUE() to extract from JSON columns
- Prefer views when they match the query intent
- Always add a LIMIT clause (default 100)
- Use TIMESTAMP functions for time-based filtering
`;

// ─── Implementation ───────────────────────────────────────

const PROJECT_ID = process.env.PROJECT_ID || 'killuacode';

function getBigQueryClient(): BigQuery {
  return new BigQuery({ projectId: PROJECT_ID });
}

function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

async function naturalLanguageToSql(question: string): Promise<string> {
  const model = getGeminiModel();

  const prompt = `${SCHEMA_CONTEXT}

Convert this natural language question to a BigQuery Standard SQL query.
Return ONLY the SQL query, no explanation, no markdown code fences.

Question: ${question}`;

  const result = await model.generateContent(prompt);
  const sql = result.response.text().trim();

  // Strip markdown fences if Gemini wraps them anyway
  return sql.replace(/^```(?:sql)?\n?/i, '').replace(/\n?```$/i, '').trim();
}

export async function queryDatalake(input: QueryDatalakeInput): Promise<QueryDatalakeResult> {
  const { question, maxRows = 100 } = input;
  const start = Date.now();

  try {
    const generatedSql = await naturalLanguageToSql(question);
    const bq = getBigQueryClient();

    const [rows] = await bq.query({
      query: generatedSql,
      maxResults: maxRows,
    });

    return {
      question,
      generatedSql,
      rows,
      totalRows: rows.length,
      executionMs: Date.now() - start,
    };
  } catch (err: unknown) {
    return {
      question,
      generatedSql: '',
      rows: [],
      totalRows: 0,
      executionMs: Date.now() - start,
      error: (err as Error).message,
    };
  }
}
