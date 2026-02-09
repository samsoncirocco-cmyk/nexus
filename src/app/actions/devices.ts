/**
 * Device Server Actions
 * Server-side functions for fetching device data
 */

'use server';

import {
  getDevices as getDevicesLib,
  getDevice as getDeviceLib,
  getLatestScan,
  getScanHistory as getScanHistoryLib,
  getRecommendations as getRecommendationsLib,
  updateRecommendationStatus as updateRecommendationStatusLib,
  type Device,
  type ScanResult,
  type Recommendation,
} from '@/lib/devices';
import { readJsonFile, writeJsonFile, getVaultFilePath } from '@/lib/vault-io';

/**
 * Get all devices
 */
export async function getDevices(): Promise<Device[]> {
  return getDevicesLib();
}

/**
 * Get device by ID with latest scan
 */
export async function getDeviceDetails(id: string) {
  const device = await getDeviceLib(id);
  if (!device) {
    return null;
  }

  const latestScan = await getLatestScan(id);
  const recommendations = await getRecommendationsLib(id);

  return {
    device,
    latestScan,
    recommendations,
    recommendationCount: recommendations.filter(r => r.status !== 'done' && r.status !== 'dismissed').length,
    totalSavings: recommendations
      .filter(r => r.status !== 'done' && r.status !== 'dismissed')
      .reduce((sum, r) => sum + r.savings, 0),
  };
}

/**
 * Get scan history for a device
 */
export async function getScanHistory(id: string): Promise<ScanResult[]> {
  return getScanHistoryLib(id);
}

/**
 * Get recommendations for a device
 */
export async function getRecommendations(id: string): Promise<Recommendation[]> {
  return getRecommendationsLib(id);
}

/**
 * Log to activity feed
 */
async function logActivity(message: string, type: string = 'note'): Promise<void> {
  try {
    const activityPath = getVaultFilePath('activity.json');
    const activity = await readJsonFile<Array<{ timestamp: string; type: string; source: string; message: string }>>(activityPath, []);
    activity.unshift({
      timestamp: new Date().toISOString(),
      type,
      source: 'device-cleaner',
      message,
    });
    if (activity.length > 1000) activity.splice(1000);
    await writeJsonFile(activityPath, activity);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Mark recommendation as done
 */
export async function markRecommendationDone(deviceId: string, recId: string): Promise<void> {
  // Get rec before updating so we can log it
  const recs = await getRecommendationsLib(deviceId);
  const rec = recs.find(r => r.id === recId);

  await updateRecommendationStatusLib(deviceId, recId, 'done');

  if (rec) {
    const savingsStr = rec.savings > 0 ? ` — saved ${formatBytes(rec.savings)}` : '';
    await logActivity(`Completed: ${rec.title}${savingsStr}`, 'completed');
  }
}

/**
 * Mark recommendation as dismissed
 */
export async function markRecommendationDismissed(deviceId: string, recId: string): Promise<void> {
  const recs = await getRecommendationsLib(deviceId);
  const rec = recs.find(r => r.id === recId);

  await updateRecommendationStatusLib(deviceId, recId, 'dismissed');

  if (rec) {
    await logActivity(`Dismissed: ${rec.title}`, 'note');
  }
}
