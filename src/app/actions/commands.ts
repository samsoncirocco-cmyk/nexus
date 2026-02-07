'use server';

import fs from 'fs/promises';
import path from 'path';

const VAULT_PATH = path.join(process.cwd(), 'vault');
const COMMANDS_FILE = path.join(VAULT_PATH, 'commands.json');

export interface CommandEntry {
  id: string;
  timestamp: string;
  text: string;
  status: 'pending' | 'processing' | 'done';
}

export async function getCommands(): Promise<CommandEntry[]> {
  try {
    const data = await fs.readFile(COMMANDS_FILE, 'utf-8');
    const commands: CommandEntry[] = JSON.parse(data);
    return commands.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch {
    return [];
  }
}
