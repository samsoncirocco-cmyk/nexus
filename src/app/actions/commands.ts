'use server';

import { ensureVaultDir, getVaultFilePath, readJsonFile } from '@/lib/vault-io';

const COMMANDS_FILE = getVaultFilePath('commands.json');

export interface CommandEntry {
  id: string;
  timestamp: string;
  text: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
}

export async function getCommands(): Promise<CommandEntry[]> {
  await ensureVaultDir();
  const commands = await readJsonFile<CommandEntry[]>(COMMANDS_FILE, []);
  return commands.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
