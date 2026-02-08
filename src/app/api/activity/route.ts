import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { VAULT_PATH, writablePath, readWithFallback } from '@/lib/paths';

const ACTIVITY_FILE = path.join(VAULT_PATH, 'activity.json');

export async function GET() {
  try {
    const data = await readWithFallback(ACTIVITY_FILE, '[]');
    const entries = JSON.parse(data);
    entries.sort((a: { timestamp: string }, b: { timestamp: string }) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return NextResponse.json(entries);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    let entries = [];
    try {
      const data = await readWithFallback(ACTIVITY_FILE, '[]');
      entries = JSON.parse(data);
    } catch {
      // File doesn't exist yet
    }

    const newEntry = {
      ...body,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: body.timestamp || new Date().toISOString(),
    };
    
    entries.push(newEntry);
    await fs.writeFile(writablePath(ACTIVITY_FILE), JSON.stringify(entries, null, 2), 'utf-8');
    
    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add activity' }, { status: 500 });
  }
}
