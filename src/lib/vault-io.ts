import fs from 'fs/promises';
import path from 'path';

const DEFAULT_VAULT_PATH = path.join(process.cwd(), 'vault');
const IS_VERCEL = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const WRITABLE_DIR = IS_VERCEL ? '/tmp/vault' : DEFAULT_VAULT_PATH;

export function getVaultPath(): string {
  const override = process.env.VAULT_DIR;
  return override ? path.resolve(override) : DEFAULT_VAULT_PATH;
}

/** Writable vault path — /tmp/vault on Vercel, normal vault locally */
export function getWritableVaultPath(): string {
  return IS_VERCEL ? WRITABLE_DIR : getVaultPath();
}

export async function ensureVaultDir(): Promise<void> {
  await fs.mkdir(getVaultPath(), { recursive: true });
}

export function getVaultFilePath(...parts: string[]): string {
  return path.join(getVaultPath(), ...parts);
}

export function getWritableFilePath(...parts: string[]): string {
  return path.join(getWritableVaultPath(), ...parts);
}

/**
 * Read JSON file — tries writable path first (for runtime state),
 * falls back to vault path (for bundled data).
 */
export async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  // On Vercel, check /tmp first for runtime writes, then bundled vault
  if (IS_VERCEL) {
    const tmpPath = filePath.replace(DEFAULT_VAULT_PATH, WRITABLE_DIR);
    try {
      const raw = await fs.readFile(tmpPath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch {
      // Fall through to bundled vault
    }
  }
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Write JSON file — writes to /tmp on Vercel, vault path locally.
 */
export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  const writePath = IS_VERCEL
    ? filePath.replace(DEFAULT_VAULT_PATH, WRITABLE_DIR)
    : filePath;
  await fs.mkdir(path.dirname(writePath), { recursive: true });
  const tempPath = `${writePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tempPath, writePath);
}
