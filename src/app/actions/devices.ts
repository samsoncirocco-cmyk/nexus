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
 * Mark recommendation as done
 */
export async function markRecommendationDone(deviceId: string, recId: string): Promise<void> {
  await updateRecommendationStatusLib(deviceId, recId, 'done');
  
  // TODO: Log to activity feed
  // const recs = await getRecommendationsLib(deviceId);
  // const rec = recs.find(r => r.id === recId);
  // if (rec) {
  //   await logActivity(`Completed recommendation: ${rec.title}`, 'completed');
  // }
}

/**
 * Mark recommendation as dismissed
 */
export async function markRecommendationDismissed(deviceId: string, recId: string): Promise<void> {
  await updateRecommendationStatusLib(deviceId, recId, 'dismissed');
}
