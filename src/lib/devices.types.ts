/**
 * TypeScript types for Device Knowledge Graph data models
 * Phase 1: Scanner script + data model
 */

// ============================================================================
// Device Registry Types
// ============================================================================

export interface DeviceRegistry {
  devices: Device[];
  lastUpdated: string | null;
  version: string;
}

export interface Device {
  id: string;
  name: string;
  type: 'mac' | 'windows' | 'linux' | 'iphone' | 'android';
  hostname?: string;
  os?: string;
  lastScan: string | null;
  storageTotal?: number;
  storageUsed?: number;
  totalFiles?: number;
  duplicateGroups?: number;
  potentialSavings?: number;
}

// ============================================================================
// Scan Results Types
// ============================================================================

export interface ScanResult {
  device: ScanDeviceInfo;
  scan: ScanMetadata;
  summary: ScanSummary;
  duplicates: DuplicatesSummary;
  files: FileMetadata[];
}

export interface ScanDeviceInfo {
  id: string;
  name: string;
  type: string;
  hostname: string;
  os: string;
}

export interface ScanMetadata {
  timestamp: string;
  duration: number;
  root: string;
}

export interface ScanSummary {
  totalFiles: number;
  totalSize: number;
  errors: number;
  byType: Record<string, CategoryStats>;
  byAge: Record<string, CategoryStats>;
  bySize: Record<string, CategoryStats>;
}

export interface CategoryStats {
  count: number;
  size: number;
}

export interface DuplicatesSummary {
  groups: number;
  totalFiles: number;
  totalSavings: number;
  details: DuplicateGroup[];
}

export interface DuplicateGroup {
  hash: string;
  files: string[];
  count: number;
  size: number;
  savings: number;
}

export interface FileMetadata {
  path: string;
  size: number;
  mtime: string;
  type: string;
  extension: string;
  hash?: string;
}

// ============================================================================
// Recommendations Types (Phase 4)
// ============================================================================

export interface RecommendationsData {
  generated: string;
  deviceId: string;
  scanTimestamp: string;
  recommendations: Recommendation[];
  summary: RecommendationsSummary;
}

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  savings: number;
  files: string[];
  confidence: number;
  action: 'delete' | 'review' | 'archive';
  status: 'pending' | 'done' | 'dismissed';
  createdAt: string;
  completedAt?: string;
}

export type RecommendationType =
  | 'duplicates'
  | 'old-downloads'
  | 'large-files'
  | 'empty-folders'
  | 'old-screenshots';

export interface RecommendationsSummary {
  total: number;
  pending: number;
  done: number;
  dismissed: number;
  totalSavings: number;
}

// ============================================================================
// UI Types
// ============================================================================

export interface DeviceCardProps {
  device: Device;
}

export interface StorageBreakdownProps {
  summary: ScanSummary;
}

export interface RecommendationCardProps {
  recommendation: Recommendation;
  onMarkDone?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

// ============================================================================
// API Types
// ============================================================================

export interface SyncPayload {
  scan: ScanResult;
}

export interface SyncResponse {
  success: boolean;
  deviceId: string;
  scanTimestamp: string;
  message?: string;
  error?: string;
}

// ============================================================================
// Helper Types
// ============================================================================

export type FileType =
  | 'images'
  | 'videos'
  | 'documents'
  | 'audio'
  | 'archives'
  | 'code'
  | 'spreadsheets'
  | 'presentations'
  | 'other';

export type AgeBucket = '0-30d' | '31-90d' | '91-180d' | '181-365d' | '1y+';

export type SizeBucket = '0-1MB' | '1-10MB' | '10-100MB' | '100MB-1GB' | '1GB+';
