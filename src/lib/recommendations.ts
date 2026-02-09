/**
 * Recommendations Engine — Phase 4
 * Analyzes scan results to generate cleanup recommendations
 */

import type {
  ScanResult,
  FileMetadata,
  Recommendation,
  RecommendationType,
  RecommendationsData,
  RecommendationsSummary,
} from '@/lib/devices.types';

// ============================================================================
// Configuration
// ============================================================================

const DUPLICATE_MIN_SIZE = 1024; // 1 KB minimum for duplicate reporting
const OLD_DOWNLOAD_DAYS = 90;
const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100 MB
const OLD_SCREENSHOT_DAYS = 30;

// Paths patterns for Downloads folder detection
const DOWNLOADS_PATTERNS = [
  /\/downloads\//i,
  /\\downloads\\/i,
  /^downloads\//i,
];

// Patterns for screenshot detection
const SCREENSHOT_PATTERNS = [
  /screenshot/i,
  /screen shot/i,
  /capture[_-]?\d/i,
  /^Screenshot \d{4}/i,
  /CleanShot/i,
];

// ============================================================================
// Core Engine
// ============================================================================

/**
 * Generate all recommendations from a scan result
 */
export function generateRecommendations(scan: ScanResult): RecommendationsData {
  const now = new Date().toISOString();
  const recommendations: Recommendation[] = [];

  // Run all recommendation generators
  recommendations.push(...findDuplicates(scan));
  recommendations.push(...findOldDownloads(scan.files));
  recommendations.push(...findLargeFiles(scan.files));
  recommendations.push(...findOldScreenshots(scan.files));
  recommendations.push(...findEmptyFolders(scan.files));

  // Sort by savings (highest first)
  recommendations.sort((a, b) => b.savings - a.savings);

  // Build summary
  const summary = buildSummary(recommendations);

  return {
    generated: now,
    deviceId: scan.device.id,
    scanTimestamp: scan.scan.timestamp,
    recommendations,
    summary,
  };
}

/**
 * Build recommendations summary stats
 */
function buildSummary(recommendations: Recommendation[]): RecommendationsSummary {
  return {
    total: recommendations.length,
    pending: recommendations.filter(r => r.status === 'pending').length,
    done: recommendations.filter(r => r.status === 'done').length,
    dismissed: recommendations.filter(r => r.status === 'dismissed').length,
    totalSavings: recommendations
      .filter(r => r.status === 'pending')
      .reduce((sum, r) => sum + r.savings, 0),
  };
}

/**
 * Generate a unique recommendation ID
 */
function makeId(type: RecommendationType, index: number): string {
  return `rec-${type}-${index}-${Date.now().toString(36)}`;
}

// ============================================================================
// Recommendation Generators
// ============================================================================

/**
 * Find duplicate files grouped by hash
 * Uses the scan's pre-computed duplicate groups
 */
export function findDuplicates(scan: ScanResult): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (!scan.duplicates?.details?.length) return recommendations;

  // Filter to meaningful duplicates (not tiny files)
  const meaningfulGroups = scan.duplicates.details
    .filter(g => g.size >= DUPLICATE_MIN_SIZE && g.files.length >= 2)
    .sort((a, b) => b.savings - a.savings);

  if (meaningfulGroups.length === 0) return recommendations;

  // Total savings across all groups
  const totalSavings = meaningfulGroups.reduce((sum, g) => sum + g.savings, 0);
  const totalFiles = meaningfulGroups.reduce((sum, g) => sum + g.count, 0);

  // Create one recommendation per duplicate group (top 20)
  const topGroups = meaningfulGroups.slice(0, 20);

  for (let i = 0; i < topGroups.length; i++) {
    const group = topGroups[i];
    const ext = group.files[0]?.split('.').pop()?.toLowerCase() || 'file';

    recommendations.push({
      id: makeId('duplicates', i),
      type: 'duplicates',
      title: `${group.count} duplicate .${ext} files`,
      description: `Found ${group.count} identical copies of a ${formatBytesCompact(group.size)} file. Removing extras saves ${formatBytesCompact(group.savings)}.`,
      savings: group.savings,
      files: group.files,
      confidence: 1.0, // Exact hash match = 100%
      action: 'delete',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  }

  // If there are more groups beyond top 20, add a summary recommendation
  if (meaningfulGroups.length > 20) {
    const remaining = meaningfulGroups.slice(20);
    const remainingSavings = remaining.reduce((sum, g) => sum + g.savings, 0);
    const remainingFiles = remaining.reduce((sum, g) => sum + g.count, 0);

    recommendations.push({
      id: makeId('duplicates', 999),
      type: 'duplicates',
      title: `${remaining.length} more duplicate groups`,
      description: `${remainingFiles} additional duplicate files across ${remaining.length} groups. Total additional savings: ${formatBytesCompact(remainingSavings)}.`,
      savings: remainingSavings,
      files: remaining.flatMap(g => g.files).slice(0, 50),
      confidence: 1.0,
      action: 'review',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  }

  return recommendations;
}

/**
 * Find old files in Downloads folder (older than 90 days)
 */
export function findOldDownloads(files: FileMetadata[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - OLD_DOWNLOAD_DAYS);
  const cutoffMs = cutoffDate.getTime();

  // Find files in Downloads directories that are old
  const oldDownloads = files.filter(f => {
    const isInDownloads = DOWNLOADS_PATTERNS.some(p => p.test(f.path));
    if (!isInDownloads) return false;

    const mtime = new Date(f.mtime).getTime();
    return mtime < cutoffMs;
  });

  if (oldDownloads.length === 0) return recommendations;

  // Sort by size (largest first)
  oldDownloads.sort((a, b) => b.size - a.size);

  const totalSavings = oldDownloads.reduce((sum, f) => sum + f.size, 0);
  const filePaths = oldDownloads.map(f => f.path);

  recommendations.push({
    id: makeId('old-downloads', 0),
    type: 'old-downloads',
    title: `${oldDownloads.length} old files in Downloads`,
    description: `Found ${oldDownloads.length} files in your Downloads folder older than ${OLD_DOWNLOAD_DAYS} days. These are likely already moved or no longer needed.`,
    savings: totalSavings,
    files: filePaths.slice(0, 100), // Cap at 100 files for display
    confidence: 0.7,
    action: 'review',
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  return recommendations;
}

/**
 * Find large files (>100MB) that haven't been accessed recently
 */
export function findLargeFiles(files: FileMetadata[]): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Large files (over threshold) — use mtime as proxy for access
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90); // Not modified in 90+ days
  const cutoffMs = cutoffDate.getTime();

  const largeOldFiles = files.filter(f => {
    if (f.size < LARGE_FILE_THRESHOLD) return false;
    const mtime = new Date(f.mtime).getTime();
    return mtime < cutoffMs;
  });

  if (largeOldFiles.length === 0) return recommendations;

  // Sort by size (largest first)
  largeOldFiles.sort((a, b) => b.size - a.size);

  const totalSavings = largeOldFiles.reduce((sum, f) => sum + f.size, 0);
  const filePaths = largeOldFiles.map(f => f.path);

  recommendations.push({
    id: makeId('large-files', 0),
    type: 'large-files',
    title: `${largeOldFiles.length} large unused files`,
    description: `Found ${largeOldFiles.length} files over 100 MB that haven't been modified in 90+ days. Review if they're still needed.`,
    savings: totalSavings,
    files: filePaths.slice(0, 50),
    confidence: 0.6,
    action: 'review',
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  return recommendations;
}

/**
 * Find old screenshots (older than 30 days)
 */
export function findOldScreenshots(files: FileMetadata[]): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - OLD_SCREENSHOT_DAYS);
  const cutoffMs = cutoffDate.getTime();

  // Find screenshots by filename pattern and image type
  const oldScreenshots = files.filter(f => {
    // Must be an image
    if (f.type !== 'images') return false;

    // Check filename for screenshot patterns
    const filename = f.path.split('/').pop() || f.path.split('\\').pop() || '';
    const isScreenshot = SCREENSHOT_PATTERNS.some(p => p.test(filename));
    if (!isScreenshot) return false;

    const mtime = new Date(f.mtime).getTime();
    return mtime < cutoffMs;
  });

  if (oldScreenshots.length === 0) return recommendations;

  // Sort by date (oldest first)
  oldScreenshots.sort((a, b) => new Date(a.mtime).getTime() - new Date(b.mtime).getTime());

  const totalSavings = oldScreenshots.reduce((sum, f) => sum + f.size, 0);
  const filePaths = oldScreenshots.map(f => f.path);

  recommendations.push({
    id: makeId('old-screenshots', 0),
    type: 'old-screenshots',
    title: `${oldScreenshots.length} old screenshots`,
    description: `Found ${oldScreenshots.length} screenshots older than ${OLD_SCREENSHOT_DAYS} days. Screenshots pile up quickly — review and clean up.`,
    savings: totalSavings,
    files: filePaths.slice(0, 100),
    confidence: 0.8,
    action: 'delete',
    status: 'pending',
    createdAt: new Date().toISOString(),
  });

  return recommendations;
}

/**
 * Find empty folders
 * Analyzes file paths to detect directories with no files
 */
export function findEmptyFolders(files: FileMetadata[]): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // Build set of directories that contain files
  const dirsWithFiles = new Set<string>();
  const allDirs = new Set<string>();

  for (const f of files) {
    // Get all parent directories of this file
    const parts = f.path.replace(/\\/g, '/').split('/');
    parts.pop(); // Remove filename

    let current = '';
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      allDirs.add(current);
      dirsWithFiles.add(current); // This dir has at least one file (direct or nested)
    }
  }

  // Find directories that are parents but have no direct files
  // This is approximate since we only have file paths, not directory listings
  // We look for dirs where all children are subdirectories (no direct files)
  const parentDirs = new Map<string, { directFiles: number; subdirs: Set<string> }>();

  for (const f of files) {
    const parts = f.path.replace(/\\/g, '/').split('/');
    if (parts.length < 2) continue;

    const parentDir = parts.slice(0, -1).join('/');
    if (!parentDirs.has(parentDir)) {
      parentDirs.set(parentDir, { directFiles: 0, subdirs: new Set() });
    }
    parentDirs.get(parentDir)!.directFiles++;
  }

  // Note: We can't truly detect empty folders from just file listings
  // since empty folders have no files to appear in the scan.
  // The scanner would need to explicitly report empty directories.
  // For now, return empty — this will work once scanner adds empty dir detection.

  return recommendations;
}

// ============================================================================
// Utility
// ============================================================================

/**
 * Compact byte formatter for use in descriptions
 */
function formatBytesCompact(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Get recommendation type icon (Material Symbols name)
 */
export function getRecommendationIcon(type: RecommendationType): string {
  const icons: Record<RecommendationType, string> = {
    duplicates: 'content_copy',
    'old-downloads': 'download',
    'large-files': 'hard_drive',
    'old-screenshots': 'screenshot_monitor',
    'empty-folders': 'folder_off',
  };
  return icons[type] || 'lightbulb';
}

/**
 * Get recommendation type color class
 */
export function getRecommendationColor(type: RecommendationType): string {
  const colors: Record<RecommendationType, string> = {
    duplicates: 'amber',
    'old-downloads': 'blue',
    'large-files': 'red',
    'old-screenshots': 'purple',
    'empty-folders': 'zinc',
  };
  return colors[type] || 'zinc';
}

/**
 * Get confidence label
 */
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return 'High';
  if (confidence >= 0.6) return 'Medium';
  return 'Low';
}
