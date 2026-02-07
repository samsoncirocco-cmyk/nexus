'use server';

import { ensureVaultDir, getVaultFilePath, readJsonFile, writeJsonFile } from '@/lib/vault-io';

const TASKS_FILE = getVaultFilePath('tasks.json');

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
// Read all tasks
export async function getTasks(): Promise<Task[]> {
  await ensureVaultDir();
  return readJsonFile<Task[]>(TASKS_FILE, []);
}

// Save tasks
export async function saveTasks(tasks: Task[]): Promise<void> {
  await ensureVaultDir();
  await writeJsonFile(TASKS_FILE, tasks);
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
