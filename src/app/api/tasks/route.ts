import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const TASKS_FILE = path.join(process.cwd(), 'vault', 'tasks.json');

export async function GET() {
  try {
    const data = await fs.readFile(TASKS_FILE, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json([]);
  }
}
