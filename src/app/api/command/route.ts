import { NextRequest, NextResponse } from 'next/server';
import { spawnAgent } from '@/lib/gateway';
import { getVaultFilePath, readJsonFile, writeJsonFile } from '@/lib/vault-io';

const COMMANDS_FILE = getVaultFilePath('commands.json');
const ACTIVITY_FILE = getVaultFilePath('activity.json');

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

    // ─── Gateway Bridge: Spawn an agent for this command ───
    // Fire and forget — don't block the response waiting for the agent
    // Update command status to processing immediately
    const cmdIndex = commands.findIndex((c: CommandEntry) => c.id === id);
    if (cmdIndex >= 0) {
      commands[cmdIndex].status = 'processing';
      await writeJsonFile(COMMANDS_FILE, commands);
    }

    // Spawn agent in background (non-blocking)
    spawnAgent(text.trim(), {
      sessionId: `command:${id}`,
      thinking: 'low',
      timeout: 120,
    })
      .then(async (result) => {
        // Update command with agent result
        try {
          const cmds = await readJSON<CommandEntry[]>(COMMANDS_FILE, []);
          const idx = cmds.findIndex((c: CommandEntry) => c.id === id);
          if (idx >= 0) {
            cmds[idx].status = result.status === 'ok' ? 'done' : 'failed';
            cmds[idx].gatewayRunId = result.runId;
            cmds[idx].gatewayStatus = result.status;
            cmds[idx].agentResponse = result.result?.payloads?.[0]?.text || result.summary;
            await writeJsonFile(COMMANDS_FILE, cmds);
          }

          // Update activity entry too
          const acts = await readJSON<any[]>(ACTIVITY_FILE, []);
          const actIdx = acts.findIndex(
            (a: { commandId?: string }) => a.commandId === id
          );
          if (actIdx >= 0) {
            acts[actIdx].status = result.status === 'ok' ? 'done' : 'failed';
            acts[actIdx].summary = result.result?.payloads?.[0]?.text
              ? `Agent responded: ${result.result.payloads[0].text.substring(0, 200)}`
              : `Command ${result.status}: ${result.summary}`;
            await writeJsonFile(ACTIVITY_FILE, acts);
          }
        } catch (updateErr) {
          console.error('[Command] Failed to update result:', updateErr);
        }
      })
      .catch((err) => {
        console.error('[Command] Agent spawn failed:', err);
        // Update command to failed
        readJSON<CommandEntry[]>(COMMANDS_FILE, []).then((cmds) => {
          const idx = cmds.findIndex((c: CommandEntry) => c.id === id);
          if (idx >= 0) {
            cmds[idx].status = 'failed';
            cmds[idx].gatewayStatus = 'error';
            cmds[idx].agentResponse = (err as Error).message;
            writeJsonFile(COMMANDS_FILE, cmds);
          }
        });
      });

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
