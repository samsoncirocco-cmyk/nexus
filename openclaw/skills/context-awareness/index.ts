/**
 * Context Awareness Skill
 *
 * Builds a full context snapshot: recent emails from BigQuery,
 * open tasks and contacts from Google Sheets, and recent AI analyses.
 */

import { BigQuery } from '@google-cloud/bigquery';
import { google } from 'googleapis';

// ─── Types ────────────────────────────────────────────────

export interface ContextAwarenessInput {
  agentId?: string;
  emailCount?: number;
  taskCount?: number;
  analysisCount?: number;
}

interface EmailSummary {
  eventId: string;
  timestamp: string;
  subject: string | null;
  from: string | null;
  source: string;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  assignee: string;
  dueDate: string;
}

interface ContactEntry {
  name: string;
  email: string;
  role: string;
  notes: string;
}

interface AiAnalysisSummary {
  analysisId: string;
  timestamp: string;
  analysisType: string;
  inputSummary: string;
  confidence: number;
}

export interface ContextSnapshot {
  timestamp: string;
  agentId: string;
  recentEmails: EmailSummary[];
  openTasks: TaskItem[];
  contacts: ContactEntry[];
  recentAnalyses: AiAnalysisSummary[];
  error?: string;
}

// ─── Implementation ───────────────────────────────────────

const PROJECT_ID = process.env.PROJECT_ID || 'killuacode';
const SHEET_ID = process.env.GOOGLE_SHEET_ID || '15-3fveXfHSKyTXmQ3x344ie4p9rbtTZGaNl-GLQ8Eac';

function getBigQueryClient(): BigQuery {
  return new BigQuery({ projectId: PROJECT_ID });
}

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function fetchRecentEmails(count: number): Promise<EmailSummary[]> {
  const bq = getBigQueryClient();
  const query = `
    SELECT
      event_id,
      timestamp,
      JSON_VALUE(payload, '$.subject') as subject,
      JSON_VALUE(payload, '$.from') as from_addr,
      source
    FROM \`openclaw.events\`
    WHERE source = 'gmail'
      AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
    ORDER BY timestamp DESC
    LIMIT ${count}
  `;

  const [rows] = await bq.query({ query });
  return (rows as Record<string, unknown>[]).map((row) => ({
    eventId: String(row.event_id || ''),
    timestamp: String(row.timestamp || ''),
    subject: row.subject ? String(row.subject) : null,
    from: row.from_addr ? String(row.from_addr) : null,
    source: String(row.source || 'gmail'),
  }));
}

async function fetchOpenTasks(count: number): Promise<TaskItem[]> {
  const sheets = getSheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Tasks!A2:E',
    });

    const rows = res.data.values || [];
    return rows
      .filter((row) => row[2] !== 'done')
      .slice(0, count)
      .map((row) => ({
        id: String(row[0] || ''),
        title: String(row[1] || ''),
        status: String(row[2] || 'open'),
        assignee: String(row[3] || ''),
        dueDate: String(row[4] || ''),
      }));
  } catch {
    return [];
  }
}

async function fetchContacts(): Promise<ContactEntry[]> {
  const sheets = getSheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Contacts!A2:D',
    });

    const rows = res.data.values || [];
    return rows.map((row) => ({
      name: String(row[0] || ''),
      email: String(row[1] || ''),
      role: String(row[2] || ''),
      notes: String(row[3] || ''),
    }));
  } catch {
    return [];
  }
}

async function fetchRecentAnalyses(count: number): Promise<AiAnalysisSummary[]> {
  const bq = getBigQueryClient();
  const query = `
    SELECT
      analysis_id,
      timestamp,
      analysis_type,
      input_summary,
      confidence
    FROM \`openclaw.ai_analysis\`
    WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
    ORDER BY timestamp DESC
    LIMIT ${count}
  `;

  const [rows] = await bq.query({ query });
  return (rows as Record<string, unknown>[]).map((row) => ({
    analysisId: String(row.analysis_id || ''),
    timestamp: String(row.timestamp || ''),
    analysisType: String(row.analysis_type || ''),
    inputSummary: String(row.input_summary || ''),
    confidence: Number(row.confidence || 0),
  }));
}

export async function buildContext(input: ContextAwarenessInput = {}): Promise<ContextSnapshot> {
  const {
    agentId = 'system',
    emailCount = 10,
    taskCount = 20,
    analysisCount = 5,
  } = input;

  const timestamp = new Date().toISOString();

  try {
    const [recentEmails, openTasks, contacts, recentAnalyses] = await Promise.all([
      fetchRecentEmails(emailCount),
      fetchOpenTasks(taskCount),
      fetchContacts(),
      fetchRecentAnalyses(analysisCount),
    ]);

    return {
      timestamp,
      agentId,
      recentEmails,
      openTasks,
      contacts,
      recentAnalyses,
    };
  } catch (err: unknown) {
    return {
      timestamp,
      agentId,
      recentEmails: [],
      openTasks: [],
      contacts: [],
      recentAnalyses: [],
      error: (err as Error).message,
    };
  }
}
