import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { spawnAgent } from '@/lib/gateway';
import { buildVaultContext } from '@/lib/vault-index';
import { getVaultFilePath, readJsonFile, writeJsonFile } from '@/lib/vault-io';

const COMMANDS_FILE = getVaultFilePath('commands.json');
const ACTIVITY_FILE = getVaultFilePath('activity.json');

// ─── Direct Gemini Execution ─────────────────────────────

const COMMAND_SYSTEM_PROMPT = `You are the Second Brain command executor for Samson Cirocco.

You receive commands and execute them against the knowledge vault. Commands may ask you to:
- Summarize or analyze documents
- Find information across the vault
- Generate reports or insights
- Organize or categorize content
- Answer questions about deals, accounts, projects, or strategies

RULES:
- Execute the command based on the vault content provided.
- Be concise and actionable in your response.
- Cite documents by their file path in brackets like [path/to/doc.md].
- If the command cannot be fulfilled with the available data, explain what's missing.
- Return structured, useful output — not conversational fluff.`;

async function executeCommandDirect(commandText: string): Promise<{
  status: 'done' | 'failed';
  response: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return { status: 'failed', response: 'GEMINI_API_KEY not configured' };
  }

  try {
    const { context, docNames } = buildVaultContext();

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `${COMMAND_SYSTEM_PROMPT}

=== KNOWLEDGE VAULT (${docNames.length} documents) ===

${context}

=== END VAULT ===

COMMAND: ${commandText}

Execute this command using the vault content above.`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    return { status: 'done', response };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Command] Direct execution failed:', message);
    return { status: 'failed', response: `Execution error: ${message}` };
  }
}

/**
 * Determine execution mode:
 * - If OPENCLAW_GATEWAY_URL is set, try CLI gateway first
 * - Otherwise use direct Gemini SDK
 */
function shouldUseGateway(): boolean {
  return !!process.env.OPENCLAW_GATEWAY_URL;
}

async function logCommandToBigQuery(commandId: string, commandText: string, status: string, response: string): Promise<void> {
  try {
    const { logAction } = await import('../../../../openclaw/skills/log-action/index');
    await logAction({
      agentId: 'second-brain',
      eventType: 'command_execution',
      source: 'command-api',
      payload: {
        commandId,
        commandText,
        status,
        responsePreview: response.substring(0, 500),
        executionMode: shouldUseGateway() ? 'gateway' : 'direct',
      },
    });
  } catch (err) {
    // BigQuery logging is best-effort — don't fail the command
    console.warn('[Command] BigQuery logging failed:', (err as Error).message);
  }
}

export interface CommandEntry {
  id: string;
  timestamp: string;
  text: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  gatewayRunId?: string;
  gatewayStatus?: string;
  agentResponse?: string;
}

async function readJSON<T>(file: string, fallback: T): Promise<T> {
  return readJsonFile(file, fallback);
}

export async function GET() {
  const commands = await readJSON<CommandEntry[]>(COMMANDS_FILE, []);
  commands.sort((a: CommandEntry, b: CommandEntry) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  return NextResponse.json(commands);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const id = `cmd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    const newCommand: CommandEntry = {
      id,
      timestamp,
      text: text.trim(),
      status: 'pending',
    };

    // Write to commands.json
    const commands = await readJSON<CommandEntry[]>(COMMANDS_FILE, []);
    commands.push(newCommand);
    await writeJsonFile(COMMANDS_FILE, commands);

    // Also append to activity.json
    const activity = await readJSON<any[]>(ACTIVITY_FILE, []);
    activity.push({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      agent: 'samson',
      type: 'command',
      title: text.trim(),
      summary: `Command issued: ${text.trim()}`,
      output: [],
      tags: ['command'],
      status: 'processing',
      commandId: id,
    });
    await writeJsonFile(ACTIVITY_FILE, activity);

    // ─── Command Execution: Gateway CLI or Direct Gemini SDK ───
    // Update command status to processing immediately
    const cmdIndex = commands.findIndex((c: CommandEntry) => c.id === id);
    if (cmdIndex >= 0) {
      commands[cmdIndex].status = 'processing';
      await writeJsonFile(COMMANDS_FILE, commands);
    }

    const trimmedText = text.trim();
    const commandId = id;

    // Helper to update command + activity after execution
    const updateResult = async (status: 'done' | 'failed', response: string, runId?: string) => {
      try {
        const cmds = await readJSON<CommandEntry[]>(COMMANDS_FILE, []);
        const idx = cmds.findIndex((c: CommandEntry) => c.id === commandId);
        if (idx >= 0) {
          cmds[idx].status = status;
          cmds[idx].agentResponse = response;
          if (runId) {
            cmds[idx].gatewayRunId = runId;
            cmds[idx].gatewayStatus = status === 'done' ? 'ok' : 'error';
          }
          await writeJsonFile(COMMANDS_FILE, cmds);
        }

        const acts = await readJSON<any[]>(ACTIVITY_FILE, []);
        const actIdx = acts.findIndex(
          (a: { commandId?: string }) => a.commandId === commandId
        );
        if (actIdx >= 0) {
          acts[actIdx].status = status;
          acts[actIdx].summary = status === 'done'
            ? `Agent responded: ${response.substring(0, 200)}`
            : `Command failed: ${response.substring(0, 200)}`;
          await writeJsonFile(ACTIVITY_FILE, acts);
        }

        // Best-effort BigQuery logging
        logCommandToBigQuery(commandId, trimmedText, status, response);
      } catch (updateErr) {
        console.error('[Command] Failed to update result:', updateErr);
      }
    };

    if (shouldUseGateway()) {
      // ─── Path A: CLI Gateway (local dev with OpenClaw running) ───
      spawnAgent(trimmedText, {
        sessionId: `command:${commandId}`,
        thinking: 'low',
        timeout: 120,
      })
        .then(async (result) => {
          const response = result.result?.payloads?.[0]?.text || result.summary;
          if (result.status === 'ok') {
            await updateResult('done', response, result.runId);
          } else if (result.status === 'fallback') {
            // Gateway returned fallback — retry with direct execution
            console.warn('[Command] Gateway fallback — retrying with direct SDK');
            const direct = await executeCommandDirect(trimmedText);
            await updateResult(direct.status, direct.response);
          } else {
            await updateResult('failed', result.error || response, result.runId);
          }
        })
        .catch(async (err) => {
          console.error('[Command] Gateway failed, falling back to direct:', err);
          // Fallback to direct execution if gateway errors
          const direct = await executeCommandDirect(trimmedText);
          await updateResult(direct.status, direct.response);
        });
    } else {
      // ─── Path B: Direct Gemini SDK (Vercel / production) ───
      executeCommandDirect(trimmedText)
        .then(async (result) => {
          await updateResult(result.status, result.response);
        })
        .catch(async (err) => {
          console.error('[Command] Direct execution error:', err);
          await updateResult('failed', (err as Error).message);
        });
    }

    return NextResponse.json(
      { ok: true, id, status: 'processing', message: 'Command dispatched to agent' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Command] Error:', error);
    return NextResponse.json({ error: 'Failed to create command' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status || !['pending', 'processing', 'done', 'failed'].includes(status)) {
      return NextResponse.json({ error: 'id and valid status required' }, { status: 400 });
    }

    const commands = await readJSON<CommandEntry[]>(COMMANDS_FILE, []);
    const idx = commands.findIndex((c: CommandEntry) => c.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Command not found' }, { status: 404 });
    }

    commands[idx].status = status;
    await writeJsonFile(COMMANDS_FILE, commands);

    return NextResponse.json({ ok: true, command: commands[idx] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update command' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const commands = await readJSON<CommandEntry[]>(COMMANDS_FILE, []);
    const idx = commands.findIndex((c: CommandEntry) => c.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Command not found' }, { status: 404 });
    }

    commands.splice(idx, 1);
    await writeJsonFile(COMMANDS_FILE, commands);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete command' }, { status: 500 });
  }
}
