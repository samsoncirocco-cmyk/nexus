import path from 'path';

const IS_VERCEL = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;

/** Read-only vault path (bundled with deployment) */
export const VAULT_PATH = path.join(process.cwd(), 'vault');

/** Writable vault path — /tmp/vault on Vercel, normal vault locally */
export const WRITABLE_VAULT = IS_VERCEL ? '/tmp/vault' : VAULT_PATH;

/** Get writable path for a vault file. Reads should still try VAULT_PATH as fallback. */
export function writablePath(filePath: string): string {
  if (!IS_VERCEL) return filePath;
  return filePath.replace(VAULT_PATH, WRITABLE_VAULT);
}

/** Read with fallback: try writable path first, then original, then default fallback */
export async function readWithFallback(filePath: string, fallback: string = '[]'): Promise<string> {
  const fs = await import('fs/promises');
  try { return await fs.readFile(writablePath(filePath), 'utf-8'); } catch {}
  try { return await fs.readFile(filePath, 'utf-8'); } catch {}
  return fallback;
}
