import fs from 'fs/promises';
import path from 'path';

const DEFAULT_VAULT_PATH = path.join(process.cwd(), 'vault');

export function getVaultPath(): string {
  const override = process.env.VAULT_DIR;
  return override ? path.resolve(override) : DEFAULT_VAULT_PATH;
}

export async function ensureVaultDir(): Promise<void> {
  await fs.mkdir(getVaultPath(), { recursive: true });
}

export function getVaultFilePath(...parts: string[]): string {
  return path.join(getVaultPath(), ...parts);
}

export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tempPath, filePath);
}
