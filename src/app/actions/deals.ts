'use server';

import fs from 'fs/promises';
import path from 'path';

const VAULT_PATH = path.join(process.cwd(), 'vault');
const DEALS_FILE = path.join(VAULT_PATH, 'deals.json');

export type ActivityType = 'call' | 'email' | 'meeting' | 'task' | 'follow-up' | 'quote' | 'proposal' | 'note';
export type ActivityStatus = 'planned' | 'completed' | 'overdue' | 'cancelled';
export type DealStage = 'Prospecting' | 'Discovery' | 'Solution Presented' | 'Negotiation' | 'Closed Won' | 'Closed Lost';
export type DealPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Activity {
  id: string;
  dealId: string;
  type: ActivityType;
  status: ActivityStatus;
  title: string;
  description: string;
  dueDate: string;       // YYYY-MM-DD
  completedDate?: string;
  contact?: string;       // who you're reaching out to
  partner?: string;       // partner company involved
  createdAt: string;
  updatedAt: string;
}

export interface Deal {
  id: string;
  account: string;
  oppName: string;
  sfdc_id?: string;       // Salesforce Opportunity ID
  stage: DealStage;
  amount: number | null;
  closeDate: string;      // YYYY-MM-DD
  priority: DealPriority;
  partner?: string;
  contact?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DealsData {
  deals: Deal[];
  activities: Activity[];
}

async function ensureVault() {
  try { await fs.access(VAULT_PATH); } catch { await fs.mkdir(VAULT_PATH, { recursive: true }); }
}

async function readData(): Promise<DealsData> {
  await ensureVault();
  try {
    const raw = await fs.readFile(DEALS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { deals: [], activities: [] };
  }
}

async function writeData(data: DealsData): Promise<void> {
  await ensureVault();
  await fs.writeFile(DEALS_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function genId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36).slice(-4);
}

// === DEALS ===

export async function getDeals(): Promise<Deal[]> {
  const data = await readData();
  return data.deals;
}

export async function createDeal(deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deal> {
  const data = await readData();
  const newDeal: Deal = { ...deal, id: genId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  data.deals.push(newDeal);
  await writeData(data);
  return newDeal;
}

export async function updateDeal(deal: Deal): Promise<void> {
  const data = await readData();
  const idx = data.deals.findIndex(d => d.id === deal.id);
  if (idx !== -1) { data.deals[idx] = { ...deal, updatedAt: new Date().toISOString() }; await writeData(data); }
}

export async function deleteDeal(id: string): Promise<void> {
  const data = await readData();
  data.deals = data.deals.filter(d => d.id !== id);
  data.activities = data.activities.filter(a => a.dealId !== id);
  await writeData(data);
}

// === ACTIVITIES ===

export async function getActivities(): Promise<Activity[]> {
  const data = await readData();
  return data.activities;
}

export async function createActivity(activity: Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Activity> {
  const data = await readData();
  const newAct: Activity = { ...activity, id: genId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  data.activities.push(newAct);
  await writeData(data);
  return newAct;
}

export async function updateActivity(activity: Activity): Promise<void> {
  const data = await readData();
  const idx = data.activities.findIndex(a => a.id === activity.id);
  if (idx !== -1) { data.activities[idx] = { ...activity, updatedAt: new Date().toISOString() }; await writeData(data); }
}

export async function deleteActivity(id: string): Promise<void> {
  const data = await readData();
  data.activities = data.activities.filter(a => a.id !== id);
  await writeData(data);
}

export async function getDealsWithActivities(): Promise<(Deal & { activities: Activity[] })[]> {
  const data = await readData();
  return data.deals.map(deal => ({
    ...deal,
    activities: data.activities.filter(a => a.dealId === deal.id).sort((a, b) => b.dueDate.localeCompare(a.dueDate))
  }));
}
