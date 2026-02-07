import { NextRequest, NextResponse } from 'next/server';
import { getVaultFilePath, readJsonFile, writeJsonFile } from '@/lib/vault-io';

const TASKS_FILE = getVaultFilePath('tasks.json');

export async function GET() {
  try {
    const data = await readJsonFile<any[]>(TASKS_FILE, []);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  try {
    const task = await req.json();
    if (!task.id || !task.title) {
      return NextResponse.json({ error: 'Missing id or title' }, { status: 400 });
    }
    const tasks = await readJsonFile<any[]>(TASKS_FILE, []);
    tasks.push(task);
    await writeJsonFile(TASKS_FILE, tasks);
    return NextResponse.json(task, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const updates = await req.json();
    if (!updates.id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const tasks = await readJsonFile<any[]>(TASKS_FILE, []);
    const idx = tasks.findIndex((t: any) => t.id === updates.id);
    if (idx === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    tasks[idx] = { ...tasks[idx], ...updates };
    await writeJsonFile(TASKS_FILE, tasks);
    return NextResponse.json(tasks[idx]);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }
    const tasks = await readJsonFile<any[]>(TASKS_FILE, []);
    const filtered = tasks.filter((t: any) => t.id !== id);
    if (filtered.length === tasks.length) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    await writeJsonFile(TASKS_FILE, filtered);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
