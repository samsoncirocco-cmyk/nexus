/**
 * Device Sync API Endpoint
 * POST /api/devices/sync
 * 
 * Accepts scan results from device scanner, updates registry, stores scan data.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  type ScanResult,
  type Device,
  getDevice,
  updateDevice,
  saveScanResults,
  rotateScanHistory,
  saveRecommendations,
} from '@/lib/devices';
import { generateRecommendations } from '@/lib/recommendations';
import { readJsonFile, writeJsonFile, getVaultFilePath } from '@/lib/vault-io';

// Maximum payload size (50 MB)
const MAX_PAYLOAD_SIZE = 50 * 1024 * 1024;

// Maximum files per scan
const MAX_FILES_PER_SCAN = 100_000;

interface ActivityEntry {
  timestamp: string;
  type: string;
  source: string;
  message: string;
}

/**
 * Log to activity feed
 */
async function logActivity(message: string, type: string = 'note'): Promise<void> {
  try {
    const activityPath = getVaultFilePath('activity.json');
    const activity = await readJsonFile<ActivityEntry[]>(activityPath, []);
    
    activity.unshift({
      timestamp: new Date().toISOString(),
      type,
      source: 'device-scanner',
      message,
    });

    // Keep last 1000 activities
    if (activity.length > 1000) {
      activity.splice(1000);
    }

    await writeJsonFile(activityPath, activity);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

/**
 * Validate scan result payload
 */
function validateScanResult(data: any): data is ScanResult {
  if (!data || typeof data !== 'object') return false;
  
  // Check required fields
  if (!data.device || typeof data.device !== 'object') return false;
  if (!data.device.id || typeof data.device.id !== 'string') return false;
  
  if (!data.scan || typeof data.scan !== 'object') return false;
  if (!data.scan.timestamp) return false;
  
  if (!data.summary || typeof data.summary !== 'object') return false;
  if (typeof data.summary.totalFiles !== 'number') return false;
  
  if (!Array.isArray(data.files)) return false;
  
  // Check file count limit
  if (data.files.length > MAX_FILES_PER_SCAN) {
    throw new Error(`Too many files: ${data.files.length} (max: ${MAX_FILES_PER_SCAN})`);
  }
  
  return true;
}

/**
 * POST handler - sync scan results
 */
export async function POST(request: NextRequest) {
  try {
    // Check content length
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      return NextResponse.json(
        { error: 'Payload too large', maxSize: MAX_PAYLOAD_SIZE },
        { status: 413 }
      );
    }

    // Parse JSON payload
    let scanResult: any;
    try {
      scanResult = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate payload
    try {
      if (!validateScanResult(scanResult)) {
        return NextResponse.json(
          { error: 'Invalid scan result format' },
          { status: 400 }
        );
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    const deviceId = scanResult.device.id;
    const deviceName = scanResult.device.name || deviceId;

    // Get or create device
    let device = await getDevice(deviceId);
    
    if (!device) {
      // New device
      device = {
        id: deviceId,
        name: deviceName,
        type: (scanResult.device.type || 'other') as Device['type'],
        hostname: scanResult.device.hostname,
        os: scanResult.device.os,
        lastScan: scanResult.scan.timestamp,
        storageUsed: scanResult.summary.totalSize,
        scanCount: 1,
      };
    } else {
      // Update existing device
      device.lastScan = scanResult.scan.timestamp;
      device.storageUsed = scanResult.summary.totalSize;
      device.scanCount = (device.scanCount || 0) + 1;
      
      // Update metadata if provided
      if (scanResult.device.hostname) {
        device.hostname = scanResult.device.hostname;
      }
      if (scanResult.device.os) {
        device.os = scanResult.device.os;
      }
    }

    // Save scan results
    const scanPath = await saveScanResults(deviceId, scanResult);
    console.log(`Saved scan results: ${scanPath}`);

    // Rotate old scans (keep last 7)
    await rotateScanHistory(deviceId, 7);

    // Generate recommendations from scan data
    const recsData = generateRecommendations(scanResult);
    await saveRecommendations(deviceId, recsData.recommendations);
    device.recommendationCount = recsData.summary.pending;
    console.log(`Generated ${recsData.recommendations.length} recommendations for ${deviceId}`);

    // Update device registry
    await updateDevice(device);
    console.log(`Updated device registry: ${deviceId}`);

    // Log to activity feed
    const duplicateGroups = scanResult.duplicates.groups || 0;
    const totalFiles = scanResult.summary.totalFiles || 0;
    const totalSize = scanResult.summary.totalSize || 0;
    const totalSizeMB = Math.round(totalSize / 1024 / 1024);

    const activityMessage = `Scanned ${deviceName} — ${totalFiles.toLocaleString()} files, ${totalSizeMB} MB${duplicateGroups > 0 ? `, found ${duplicateGroups} duplicate groups` : ''}`;
    
    await logActivity(activityMessage, 'note');

    // Return success response
    return NextResponse.json({
      success: true,
      device: {
        id: deviceId,
        name: deviceName,
        scanCount: device.scanCount,
      },
      scan: {
        timestamp: scanResult.scan.timestamp,
        totalFiles,
        totalSize,
        duplicateGroups,
      },
      recommendations: recsData.recommendations.length,
      message: 'Scan results synced successfully',
    });

  } catch (error: any) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET handler - return API info
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/devices/sync',
    method: 'POST',
    description: 'Sync device scan results',
    limits: {
      maxPayloadSize: MAX_PAYLOAD_SIZE,
      maxFilesPerScan: MAX_FILES_PER_SCAN,
    },
  });
}
