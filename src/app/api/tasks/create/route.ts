import { NextRequest, NextResponse } from 'next/server';
import { getVaultFilePath, readJsonFile, writeJsonFile } from '@/lib/vault-io';

const TASKS_FILE = getVaultFilePath('tasks.json');

interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'todo' | 'in-progress' | 'done';
  tags?: string[];
  dueDate?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: CreateTaskRequest = await req.json();
    
    // Validation
    if (!body.title || body.title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Map status to column (status field → column field for compatibility)
    const statusToColumn: Record<string, string> = {
      'todo': 'Backlog',
      'in-progress': 'In Progress',
      'done': 'Done'
    };

    // Create new task with unique ID
    const newTask = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: body.title.trim(),
      description: body.description?.trim() || '',
      column: statusToColumn[body.status || 'todo'] || 'Backlog',
      priority: body.priority || 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: body.tags || [],
      dueDate: body.dueDate || undefined,
    };

    // Read existing tasks
    const tasks = await readJsonFile<any[]>(TASKS_FILE, []);
    
    // Append new task
    tasks.push(newTask);
    
    // Persist to file
    await writeJsonFile(TASKS_FILE, tasks);
    
    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('Task creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create task' }, 
      { status: 500 }
    );
  }
}
