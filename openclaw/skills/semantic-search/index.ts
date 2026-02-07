/**
 * Semantic Search Skill
 *
 * Searches across events, nlp_enrichment, and ai_analysis tables
 * using Gemini to generate optimized search queries, then merges
 * and ranks results by relevance.
 */

import { BigQuery } from '@google-cloud/bigquery';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ─── Types ────────────────────────────────────────────────

export interface SemanticSearchInput {
  query: string;
  maxResults?: number;
  sources?: string[];
  timeRangeDays?: number;
}

interface SearchHit {
  eventId: string;
  timestamp: string;
  source: string;
  eventType: string;
  subject: string | null;
  snippet: string | null;
  relevanceScore: number;
  table: string;
}

export interface SemanticSearchResult {
  query: string;
  hits: SearchHit[];
  totalHits: number;
  executionMs: number;
  tablesSearched: string[];
  error?: string;
}

// ─── Schema for search query generation ───────────────────

const SEARCH_SCHEMA = `
Tables to search across:

1. openclaw.events — Raw events. Columns: event_id, timestamp, agent_id, event_type, source, payload (JSON with "subject", "summary", "body", "message_id" fields), processed
2. openclaw.nlp_enrichment — NLP analysis. Columns: event_id, timestamp, source, entities (JSON), sentiment_score, sentiment_magnitude, language, raw_text
3. openclaw.ai_analysis — AI results. Columns: analysis_id, event_id, timestamp, agent_id, model_id, analysis_type, input_summary, output_raw, output_structured (JSON), confidence

Generate a UNION ALL query that searches across these tables for the given query.
Use LIKE patterns, JSON_VALUE extraction, and text matching.
Each row in the result must have: event_id, timestamp, source, event_type, subject, snippet, relevance_score (0-1 float), table_name.
Order by relevance_score DESC.
Return ONLY SQL, no explanation, no markdown fences.
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

async function generateSearchSql(
  query: string,
  maxResults: number,
  sources: string[],
  timeRangeDays: number,
): Promise<string> {
  const model = getGeminiModel();

  const sourceFilter = sources.length > 0
    ? `Only search events from these sources: ${sources.join(', ')}`
    : 'Search all sources';

  const prompt = `${SEARCH_SCHEMA}

${sourceFilter}
Time range: last ${timeRangeDays} days
Max results: ${maxResults}

Search query: ${query}`;

  const result = await model.generateContent(prompt);
  const sql = result.response.text().trim();
  return sql.replace(/^```(?:sql)?\n?/i, '').replace(/\n?```$/i, '').trim();
}

export async function semanticSearch(input: SemanticSearchInput): Promise<SemanticSearchResult> {
  const {
    query,
    maxResults = 20,
    sources = [],
    timeRangeDays = 30,
  } = input;
  const start = Date.now();

  try {
    const sql = await generateSearchSql(query, maxResults, sources, timeRangeDays);
    const bq = getBigQueryClient();

    const [rows] = await bq.query({
      query: sql,
      maxResults,
    });

    const hits: SearchHit[] = (rows as Record<string, unknown>[]).map((row) => ({
      eventId: String(row.event_id || ''),
      timestamp: String(row.timestamp || ''),
      source: String(row.source || ''),
      eventType: String(row.event_type || ''),
      subject: row.subject ? String(row.subject) : null,
      snippet: row.snippet ? String(row.snippet) : null,
      relevanceScore: Number(row.relevance_score || 0),
      table: String(row.table_name || ''),
    }));

    const tablesSearched = [...new Set(hits.map((h) => h.table))];

    return {
      query,
      hits,
      totalHits: hits.length,
      executionMs: Date.now() - start,
      tablesSearched,
    };
  } catch (err: unknown) {
    return {
      query,
      hits: [],
      totalHits: 0,
      executionMs: Date.now() - start,
      tablesSearched: [],
      error: (err as Error).message,
    };
  }
}
