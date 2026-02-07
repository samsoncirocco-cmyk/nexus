'use server';

import fs from 'fs/promises';
import path from 'path';

// Fix: The vault is at projects/second-brain/vault, which is parallel to src/
// process.cwd() in Next.js usually points to the project root (projects/second-brain)
const VAULT_PATH = path.join(process.cwd(), 'vault');
const TASKS_FILE = path.join(VAULT_PATH, 'tasks.json');

export type Priority = 'low' | 'medium' | 'high';
export type Column = 'Backlog' | 'In Progress' | 'Waiting on Samson' | 'Done';

export interface TaskLink {
  label: string;
  url: string;
  type: 'drive' | 'brain' | 'file' | 'external';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  column: Column;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  links?: TaskLink[];
}

// Ensure vault directory exists
async function ensureVault() {
  try {
    await fs.access(VAULT_PATH);
  } catch {
    await fs.mkdir(VAULT_PATH, { recursive: true });
  }
}

// Read all tasks
export async function getTasks(): Promise<Task[]> {
  await ensureVault();
  try {
    const data = await fs.readFile(TASKS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return empty if file doesn't exist or is invalid
    return [];
  }
}

// Save tasks
export async function saveTasks(tasks: Task[]): Promise<void> {
  await ensureVault();
  await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
}

// Create a new task
export async function createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  const tasks = await getTasks();
  const newTask: Task = {
    ...task,
    id: Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.push(newTask);
  await saveTasks(tasks);
  return newTask;
}

// Update a task
export async function updateTask(updatedTask: Task): Promise<void> {
  const tasks = await getTasks();
  const index = tasks.findIndex((t) => t.id === updatedTask.id);
  if (index !== -1) {
    tasks[index] = { ...updatedTask, updatedAt: new Date().toISOString() };
    await saveTasks(tasks);
  }
}

// Delete a task
export async function deleteTask(id: string): Promise<void> {
  const tasks = await getTasks();
  const filtered = tasks.filter((t) => t.id !== id);
  await saveTasks(filtered);
}
