/**
 * Device Knowledge Graph - Data Layer
 * Helper functions for device registry and scan results
 */

import { readJsonFile, writeJsonFile, getVaultFilePath } from '@/lib/vault-io';
import fs from 'fs/promises';
import path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface Device {
  id: string;
  name: string;
  type: 'mac' | 'iphone' | 'windows' | 'linux' | 'android';
  hostname?: string;
  os?: string;
  lastScan: string; // ISO timestamp
  storageTotal?: number; // bytes
  storageUsed?: number; // bytes
  scanCount?: number;
  recommendationCount?: number;
}

export interface DeviceRegistry {
  devices: Device[];
  lastUpdated: string; // ISO timestamp
}

export interface FileMetadata {
  path: string;
  size: number;
  mtime: string; // ISO timestamp
  type: string; // 'images' | 'videos' | 'documents' | etc.
  extension: string;
  hash?: string; // SHA-256
}

export interface DuplicateGroup {
  hash: string;
  files: string[];
  count: number;
  size: number;
  savings: number;
}

export interface SummaryBucket {
  count: number;
  size: number;
}

export interface ScanSummary {
  totalFiles: number;
  totalSize: number;
  errors: number;
  byType: Record<string, SummaryBucket>;
  byAge: Record<string, SummaryBucket>;
  bySize: Record<string, SummaryBucket>;
}

export interface ScanResult {
  device: {
    id: string;
    name: string;
    type: string;
    hostname: string;
    os: string;
  };
  scan: {
    timestamp: string;
    duration: number;
    root: string;
  };
  summary: ScanSummary;
  duplicates: {
    groups: number;
    totalFiles: number;
    totalSavings: number;
    details: DuplicateGroup[];
  };
  files: FileMetadata[];
}

export interface Recommendation {
  id: string;
  type: 'duplicates' | 'old-downloads' | 'empty-folders' | 'large-files' | 'old-screenshots';
  title: string;
  description: string;
  savings: number; // bytes
  files: string[];
  confidence: number; // 0.0 - 1.0
  action: 'delete' | 'review' | 'archive';
  status?: 'pending' | 'done' | 'dismissed';
  createdAt: string;
}

export interface RecommendationsData {
  generated: string;
  recommendations: Recommendation[];
}

// ============================================================================
// Registry Functions
// ============================================================================

/**
 * Get all devices from registry
 */
export async function getDevices(): Promise<Device[]> {
  try {
    const registry = await readJsonFile<DeviceRegistry>(
      getVaultFilePath('devices/index.json'),
      { devices: [], lastUpdated: new Date().toISOString() }
    );
    return registry.devices;
  } catch (error) {
    console.error('Failed to read device registry:', error);
    return [];
  }
}

/**
 * Get single device by ID
 */
export async function getDevice(id: string): Promise<Device | null> {
  const devices = await getDevices();
  return devices.find(d => d.id === id) || null;
}

/**
 * Update or add device in registry
 */
export async function updateDevice(device: Device): Promise<void> {
  const registry = await readJsonFile<DeviceRegistry>(
    getVaultFilePath('devices/index.json'),
    { devices: [], lastUpdated: new Date().toISOString() }
  );

  const existingIndex = registry.devices.findIndex(d => d.id === device.id);
  
  if (existingIndex >= 0) {
    registry.devices[existingIndex] = device;
  } else {
    registry.devices.push(device);
  }

  registry.lastUpdated = new Date().toISOString();

  await writeJsonFile(
    getVaultFilePath('devices/index.json'),
    registry
  );
}

// ============================================================================
// Scan Results Functions
// ============================================================================

/**
 * Get device directory path
 */
function getDeviceDir(deviceId: string): string {
  return getVaultFilePath(`devices/${deviceId}`);
}

/**
 * Save scan results to vault
 */
export async function saveScanResults(
  deviceId: string,
  scan: ScanResult
): Promise<string> {
  const deviceDir = getDeviceDir(deviceId);
  
  // Ensure device directory exists
  await fs.mkdir(deviceDir, { recursive: true });

  // Generate filename with timestamp
  const timestamp = new Date(scan.scan.timestamp).toISOString().replace(/[:.]/g, '-');
  const filename = `scan-${timestamp}.json`;
  const filepath = path.join(deviceDir, filename);

  // Write scan results
  await writeJsonFile(filepath, scan);

  return filepath;
}

/**
 * Get all scan files for a device (sorted newest first)
 */
export async function getScanFiles(deviceId: string): Promise<string[]> {
  const deviceDir = getDeviceDir(deviceId);

  try {
    const files = await fs.readdir(deviceDir);
    const scanFiles = files
      .filter(f => f.startsWith('scan-') && f.endsWith('.json'))
      .sort()
      .reverse(); // Newest first
    return scanFiles.map(f => path.join(deviceDir, f));
  } catch (error) {
    return [];
  }
}

/**
 * Get latest scan for a device
 */
export async function getLatestScan(deviceId: string): Promise<ScanResult | null> {
  const scanFiles = await getScanFiles(deviceId);
  
  if (scanFiles.length === 0) {
    return null;
  }

  try {
    const latest = await readJsonFile<ScanResult | null>(scanFiles[0], null);
    return latest;
  } catch (error) {
    console.error('Failed to read latest scan:', error);
    return null;
  }
}

/**
 * Get all scans for a device
 */
export async function getScanHistory(deviceId: string): Promise<ScanResult[]> {
  const scanFiles = await getScanFiles(deviceId);
  const scans: ScanResult[] = [];

  for (const file of scanFiles) {
    try {
      const scan = await readJsonFile<ScanResult | null>(file, null);
      if (scan !== null) {
        scans.push(scan);
      }
    } catch (error) {
      console.error(`Failed to read scan ${file}:`, error);
    }
  }

  return scans;
}

/**
 * Rotate scan history - keep last N scans
 */
export async function rotateScanHistory(deviceId: string, keepCount: number = 7): Promise<void> {
  const scanFiles = await getScanFiles(deviceId);

  if (scanFiles.length <= keepCount) {
    return; // Nothing to rotate
  }

  // Delete old scans (keep first N, which are newest due to reverse sort)
  const toDelete = scanFiles.slice(keepCount);

  for (const file of toDelete) {
    try {
      await fs.unlink(file);
      console.log(`Deleted old scan: ${path.basename(file)}`);
    } catch (error) {
      console.error(`Failed to delete ${file}:`, error);
    }
  }
}

// ============================================================================
// Recommendations Functions
// ============================================================================

/**
 * Get recommendations for a device
 */
export async function getRecommendations(deviceId: string): Promise<Recommendation[]> {
  const recPath = path.join(getDeviceDir(deviceId), 'recommendations.json');

  try {
    const data = await readJsonFile<RecommendationsData | null>(recPath, null);
    return data?.recommendations || [];
  } catch (error) {
    return [];
  }
}

/**
 * Save recommendations for a device
 */
export async function saveRecommendations(
  deviceId: string,
  recommendations: Recommendation[]
): Promise<void> {
  const deviceDir = getDeviceDir(deviceId);
  await fs.mkdir(deviceDir, { recursive: true });

  const data: RecommendationsData = {
    generated: new Date().toISOString(),
    recommendations,
  };

  const recPath = path.join(deviceDir, 'recommendations.json');
  await writeJsonFile(recPath, data);
}

/**
 * Update recommendation status
 */
export async function updateRecommendationStatus(
  deviceId: string,
  recId: string,
  status: 'done' | 'dismissed'
): Promise<void> {
  const recommendations = await getRecommendations(deviceId);
  const rec = recommendations.find(r => r.id === recId);

  if (!rec) {
    throw new Error(`Recommendation ${recId} not found`);
  }

  rec.status = status;
  await saveRecommendations(deviceId, recommendations);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format bytes as human-readable string
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Get storage percentage
 */
export function getStoragePercentage(used: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((used / total) * 100);
}

/**
 * Get device icon name (Material Symbols)
 */
export function getDeviceIcon(type: string): string {
  const icons: Record<string, string> = {
    mac: 'computer',
    iphone: 'smartphone',
    windows: 'desktop_windows',
    linux: 'devices_other',
    other: 'storage',
  };
  return icons[type] || 'storage';
}
