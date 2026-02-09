import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getVaultPath, readJsonFile, getVaultFilePath } from '@/lib/vault-io';

const vaultPath = getVaultPath();
const MAX_CONTEXT_CHARS = Number(process.env.VAULT_CONTEXT_CHAR_LIMIT || 200000);

export interface VaultDoc {
  filePath: string;
  slug: string;
  title: string;
  category: string;
  tags: string[];
  content: string;
}

let cachedDocs: VaultDoc[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5000;

function scanVaultRecursive(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...scanVaultRecursive(fullPath));
    } else if (item.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files;
}

export function loadVaultDocs(forceReload = false): VaultDoc[] {
  if (cachedDocs && !forceReload && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedDocs;
  }

  const files = scanVaultRecursive(vaultPath);
  cachedDocs = files.map((filePath) => {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(raw);
    const relativePath = path.relative(vaultPath, filePath);
    const category = path.dirname(relativePath).split(path.sep)[0] || 'root';
    const slug = relativePath.replace(/\.md$/, '').replace(/\\/g, '/');

    return {
      filePath: relativePath,
      slug,
      title: data.title || path.basename(filePath, '.md').replace(/-/g, ' '),
      category,
      tags: data.tags || [],
      content,
    };
  });

  cacheTimestamp = Date.now();
  return cachedDocs;
}

export function buildVaultContext(): { context: string; docNames: string[] } {
  const docs = loadVaultDocs();
  const docNames: string[] = [];
  const parts: string[] = [];
  let currentLength = 0;

  for (const doc of docs) {
    const section = `--- DOCUMENT: ${doc.filePath} ---\nTitle: ${doc.title}\nCategory: ${doc.category}\nTags: ${doc.tags.join(', ') || 'none'}\n\n${doc.content}\n`;
    if (currentLength + section.length > MAX_CONTEXT_CHARS) {
      parts.push('\n--- CONTEXT TRUNCATED: vault exceeded context limit ---\n');
      break;
    }
    docNames.push(doc.filePath);
    parts.push(section);
    currentLength += section.length;
  }

  return { context: parts.join('\n'), docNames };
}

/* ================================================================
   DEVICE GRAPH NODES
   ================================================================ */

export interface DeviceGraphNode {
  id: string;
  title: string;
  category: 'device' | 'scan';
  tags: string[];
  connections: number;
  deviceId?: string;
  deviceType?: string;
  storageUsed?: number;
  storageTotal?: number;
  scanTimestamp?: string;
  fileCount?: number;
}

export interface DeviceGraphEdge {
  source: string;
  target: string;
  type: 'scanned';
}

interface DeviceRegistryEntry {
  id: string;
  name: string;
  type: string;
  lastScan: string;
  storageTotal?: number;
  storageUsed?: number;
  scanCount?: number;
}

interface DeviceRegistryData {
  devices: DeviceRegistryEntry[];
  lastUpdated: string;
}

interface ScanResultData {
  scan: { timestamp: string };
  summary: { totalFiles: number; totalSize: number };
}

/**
 * Load device and scan nodes for the knowledge graph.
 * Reads vault/devices/index.json for device registry,
 * then scans each device directory for scan result files.
 */
export async function loadDeviceGraphData(): Promise<{
  nodes: DeviceGraphNode[];
  edges: DeviceGraphEdge[];
}> {
  const nodes: DeviceGraphNode[] = [];
  const edges: DeviceGraphEdge[] = [];

  try {
    const registryPath = getVaultFilePath('devices/index.json');
    const registry = await readJsonFile<DeviceRegistryData>(registryPath, {
      devices: [],
      lastUpdated: '',
    });

    for (const device of registry.devices) {
      const deviceNodeId = `device:${device.id}`;

      // Device node
      nodes.push({
        id: deviceNodeId,
        title: device.name,
        category: 'device',
        tags: ['device', device.type],
        connections: 0,
        deviceId: device.id,
        deviceType: device.type,
        storageUsed: device.storageUsed,
        storageTotal: device.storageTotal,
      });

      // Find scan files for this device
      const deviceDir = getVaultFilePath(`devices/${device.id}`);
      try {
        const items = fs.readdirSync(deviceDir);
        const scanFiles = items
          .filter((f: string) => f.startsWith('scan-') && f.endsWith('.json'))
          .sort()
          .reverse()
          .slice(0, 5); // Limit to last 5 scans for graph readability

        for (const scanFile of scanFiles) {
          const scanPath = path.join(deviceDir, scanFile);
          try {
            const scanRaw = fs.readFileSync(scanPath, 'utf-8');
            const scanData: ScanResultData = JSON.parse(scanRaw);
            const scanTs = scanData.scan?.timestamp || scanFile.replace('scan-', '').replace('.json', '');
            const scanDate = new Date(scanTs);
            const scanLabel = scanDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const scanNodeId = `scan:${device.id}:${scanFile.replace('.json', '')}`;

            nodes.push({
              id: scanNodeId,
              title: `${scanLabel} Scan`,
              category: 'scan',
              tags: ['scan', device.type],
              connections: 0,
              deviceId: device.id,
              scanTimestamp: scanTs,
              fileCount: scanData.summary?.totalFiles,
            });

            edges.push({
              source: deviceNodeId,
              target: scanNodeId,
              type: 'scanned',
            });
          } catch {
            // Skip unreadable scan files
          }
        }
      } catch {
        // Device directory doesn't exist yet — no scans
      }
    }

    // Update connection counts
    for (const edge of edges) {
      const src = nodes.find(n => n.id === edge.source);
      const tgt = nodes.find(n => n.id === edge.target);
      if (src) src.connections++;
      if (tgt) tgt.connections++;
    }
  } catch (error) {
    console.error('Failed to load device graph data:', error);
  }

  return { nodes, edges };
}
