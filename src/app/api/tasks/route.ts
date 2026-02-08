import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';

const TASKS_FILE = path.join(process.cwd(), 'vault', 'tasks.json');

export type Priority = 'low' | 'medium' | 'high';
export type Column = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  column: Column;
  priority: Priority;
  assignee?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

async function readTasks(): Promise<Task[]> {
  try {
    const data = await fs.readFile(TASKS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeTasks(tasks: Task[]): Promise<void> {
  await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
}

// GET: Return all tasks grouped by column
export async function GET() {
  try {
    const tasks = await readTasks();
    
    // Group by column
    const grouped = {
      todo: tasks.filter(t => t.column === 'todo'),
      'in-progress': tasks.filter(t => t.column === 'in-progress'),
      done: tasks.filter(t => t.column === 'done'),
    };
    
    return NextResponse.json(grouped);
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

// POST: Create new task
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, priority = 'medium', assignee, tags = [] } = body;
    
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    
    const tasks = await readTasks();
    const newTask: Task = {
      id: Math.random().toString(36).substring(2, 11),
      title,
      description: description || '',
      column: 'todo',
      priority,
      assignee,
      tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    tasks.push(newTask);
    await writeTasks(tasks);
    
    revalidatePath('/tasks');
    revalidatePath('/api/tasks');
    
    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    console.error('POST /api/tasks error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

// PATCH: Update task (move column, change priority, assign)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, column, priority, assignee, title, description, tags } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }
    
    const tasks = await readTasks();
    const taskIndex = tasks.findIndex(t => t.id === id);
    
    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    // Update only provided fields
    const updatedTask: Task = {
      ...tasks[taskIndex],
      ...(column !== undefined && { column }),
      ...(priority !== undefined && { priority }),
      ...(assignee !== undefined && { assignee }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(tags !== undefined && { tags }),
      updatedAt: new Date().toISOString(),
    };
    
    tasks[taskIndex] = updatedTask;
    await writeTasks(tasks);
    
    revalidatePath('/tasks');
    revalidatePath('/api/tasks');
    
    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('PATCH /api/tasks error:', error);
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

// DELETE: Delete task
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }
    
    const tasks = await readTasks();
    const filtered = tasks.filter(t => t.id !== id);
    
    if (filtered.length === tasks.length) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    await writeTasks(filtered);
    
    revalidatePath('/tasks');
    revalidatePath('/api/tasks');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/tasks error:', error);
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
