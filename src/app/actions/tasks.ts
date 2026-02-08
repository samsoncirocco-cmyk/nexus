'use server';

import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { VAULT_PATH, WRITABLE_VAULT, writablePath, readWithFallback } from '@/lib/paths';

const TASKS_FILE = path.join(VAULT_PATH, 'tasks.json');

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

// Ensure vault directory exists
async function ensureVault() {
  try {
    await fs.access(WRITABLE_VAULT);
  } catch {
    await fs.mkdir(WRITABLE_VAULT, { recursive: true });
  }
}

// Read all tasks
export async function getTasks(): Promise<Task[]> {
  await ensureVault();
  try {
    const data = await readWithFallback(TASKS_FILE, '[]');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Save tasks
export async function saveTasks(tasks: Task[]): Promise<void> {
  await ensureVault();
  await fs.writeFile(writablePath(TASKS_FILE), JSON.stringify(tasks, null, 2), 'utf-8');
  revalidatePath('/tasks');
}

// Create a new task
export async function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  const tasks = await getTasks();
  const newTask: Task = {
    ...task,
    id: Math.random().toString(36).substring(2, 11),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.push(newTask);
  await saveTasks(tasks);
  return newTask;
}

// Update a task
export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const tasks = await getTasks();
  const index = tasks.findIndex((t) => t.id === id);
  
  if (index === -1) {
    return null;
  }
  
  const updatedTask: Task = {
    ...tasks[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  tasks[index] = updatedTask;
  await saveTasks(tasks);
  return updatedTask;
}

// Delete a task
export async function deleteTask(id: string): Promise<boolean> {
  const tasks = await getTasks();
  const filtered = tasks.filter((t) => t.id !== id);
  
  if (filtered.length === tasks.length) {
    return false;
  }
  
  await saveTasks(filtered);
  return true;
}

// Get tasks grouped by column
export async function getTasksByColumn(): Promise<Record<Column, Task[]>> {
  const tasks = await getTasks();
  return {
    todo: tasks.filter(t => t.column === 'todo'),
    'in-progress': tasks.filter(t => t.column === 'in-progress'),
    done: tasks.filter(t => t.column === 'done'),
  };
}
