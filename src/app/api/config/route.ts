import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { VAULT_PATH, writablePath, readWithFallback } from '@/lib/paths';

const CONFIG_FILE = path.join(VAULT_PATH, 'config.json');

export const dynamic = 'force-dynamic';

async function readConfig() {
  try {
    const data = await readWithFallback(CONFIG_FILE, 'null');
    return data === 'null' ? null : JSON.parse(data);
  } catch {
    return null;
  }
}

export async function GET() {
  const config = await readConfig();
  if (!config) {
    return NextResponse.json({ error: 'Config not found' }, { status: 404 });
  }
  return NextResponse.json(config);
}

export async function PATCH(request: Request) {
  try {
    const config = await readConfig();
    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }
    const updates = await request.json();
    const merged = { ...config, ...updates };
    await fs.writeFile(writablePath(CONFIG_FILE), JSON.stringify(merged, null, 2), 'utf-8');
    return NextResponse.json(merged);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
