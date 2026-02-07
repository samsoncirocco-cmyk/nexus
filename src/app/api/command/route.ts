import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const VAULT_PATH = path.join(process.cwd(), 'vault');
const COMMANDS_FILE = path.join(VAULT_PATH, 'commands.json');
const ACTIVITY_FILE = path.join(VAULT_PATH, 'activity.json');

export interface CommandEntry {
  id: string;
  timestamp: string;
  text: string;
  status: 'pending' | 'processing' | 'done';
}

async function readJSON(file: string): Promise<any[]> {
  try {
    const data = await fs.readFile(file, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeJSON(file: string, data: any[]) {
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  const commands = await readJSON(COMMANDS_FILE);
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
    const commands = await readJSON(COMMANDS_FILE);
    commands.push(newCommand);
    await writeJSON(COMMANDS_FILE, commands);

    // Also append to activity.json
    const activity = await readJSON(ACTIVITY_FILE);
    activity.push({
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      agent: 'samson',
      type: 'command',
      title: text.trim(),
      summary: `Command issued: ${text.trim()}`,
      output: [],
      tags: ['command'],
      status: 'pending',
      commandId: id,
    });
    await writeJSON(ACTIVITY_FILE, activity);

    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create command' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status || !['pending', 'processing', 'done'].includes(status)) {
      return NextResponse.json({ error: 'id and valid status required' }, { status: 400 });
    }

    const commands = await readJSON(COMMANDS_FILE);
    const idx = commands.findIndex((c: CommandEntry) => c.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Command not found' }, { status: 404 });
    }

    commands[idx].status = status;
    await writeJSON(COMMANDS_FILE, commands);

    return NextResponse.json({ ok: true, command: commands[idx] });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update command' }, { status: 500 });
  }
}
