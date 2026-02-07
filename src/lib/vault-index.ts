import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getVaultPath } from '@/lib/vault-io';

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
