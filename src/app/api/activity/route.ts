import { NextRequest, NextResponse } from 'next/server';
import { getVaultFilePath, readJsonFile, writeJsonFile } from '@/lib/vault-io';

const ACTIVITY_FILE = getVaultFilePath('activity.json');

export async function GET() {
  try {
    const entries = await readJsonFile<any[]>(ACTIVITY_FILE, []);
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
    
    const entries = await readJsonFile<any[]>(ACTIVITY_FILE, []);

    const newEntry = {
      ...body,
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: body.timestamp || new Date().toISOString(),
    };
    
    entries.push(newEntry);
    await writeJsonFile(ACTIVITY_FILE, entries);
    
    return NextResponse.json(newEntry, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add activity' }, { status: 500 });
  }
}
