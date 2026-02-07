import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';
import { getVaultPath } from '@/lib/vault-io';

const vaultPath = getVaultPath();
const CACHE_TTL_MS = 5000;
let cachedDocs: DocumentMeta[] | null = null;
let cacheTimestamp = 0;

export interface Document {
  slug: string;
  title: string;
  content: string;
  htmlContent?: string;
  category: string;
  date?: string;
  tags?: string[];
  description?: string;
  lastModified: Date;
}

export interface DocumentMeta {
  slug: string;
  title: string;
  category: string;
  date?: string;
  tags?: string[];
  description?: string;
  lastModified: Date;
}

function getAllFilesRecursive(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllFilesRecursive(fullPath, baseDir));
    } else if (item.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

export function getAllDocuments(): DocumentMeta[] {
  if (cachedDocs && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedDocs;
  }

  const files = getAllFilesRecursive(vaultPath);
  
  const documents = files.map((filePath) => {
    const relativePath = path.relative(vaultPath, filePath);
    const category = path.dirname(relativePath).split(path.sep)[0] || 'root';
    const slug = relativePath.replace(/\.md$/, '').replace(/\\/g, '/');
    
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data } = matter(fileContents);
    const stat = fs.statSync(filePath);
    
    return {
      slug,
      title: data.title || path.basename(filePath, '.md').replace(/-/g, ' '),
      category,
      date: data.date || undefined,
      tags: data.tags || [],
      description: data.description || undefined,
      lastModified: stat.mtime,
    };
  });
  
  // Sort by date (newest first), then by title
  const sorted = documents.sort((a, b) => {
    if (a.date && b.date) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title);
  });

  cachedDocs = sorted;
  cacheTimestamp = Date.now();
  return sorted;
}

export function getDocumentsByCategory(): Record<string, DocumentMeta[]> {
  const documents = getAllDocuments();
  const byCategory: Record<string, DocumentMeta[]> = {};
  
  for (const doc of documents) {
    if (!byCategory[doc.category]) {
      byCategory[doc.category] = [];
    }
    byCategory[doc.category].push(doc);
  }
  
  return byCategory;
}

export function getAllTags(): { tag: string; count: number }[] {
  const documents = getAllDocuments();
  const tagMap: Record<string, number> = {};
  
  for (const doc of documents) {
    if (doc.tags) {
      for (const tag of doc.tags) {
        tagMap[tag] = (tagMap[tag] || 0) + 1;
      }
    }
  }
  
  return Object.entries(tagMap)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

function fuzzyMatch(text: string, query: string): number {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  // Exact substring match
  if (lower.includes(q)) return 1;
  // Word-start match (each query word starts a word in text)
  const queryWords = q.split(/\s+/);
  const textWords = lower.split(/\s+/);
  const wordMatch = queryWords.every(qw => textWords.some(tw => tw.startsWith(qw)));
  if (wordMatch) return 0.8;
  // Character-level fuzzy (all chars in order)
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  if (qi === q.length) return 0.4;
  return 0;
}

export function searchDocuments(query: string): DocumentMeta[] {
  const files = getAllFilesRecursive(vaultPath);

  const results: (DocumentMeta & { score: number })[] = [];

  for (const filePath of files) {
    const relativePath = path.relative(vaultPath, filePath);
    const category = path.dirname(relativePath).split(path.sep)[0] || 'root';
    const slug = relativePath.replace(/\.md$/, '').replace(/\\/g, '/');

    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContents);
    const stat = fs.statSync(filePath);

    const title = (data.title || path.basename(filePath, '.md').replace(/-/g, ' '));
    const description = data.description || '';
    const tags: string[] = data.tags || [];

    let score = 0;

    // Title match (highest weight)
    const titleScore = fuzzyMatch(title, query);
    score += titleScore * 10;
    // Description match
    const descScore = fuzzyMatch(description, query);
    score += descScore * 5;
    // Tag match
    const tagScore = Math.max(0, ...tags.map(t => fuzzyMatch(t, query)));
    score += tagScore * 7;
    // Content match (exact only for performance)
    if (content.toLowerCase().includes(query.toLowerCase())) score += 3;

    if (score > 0) {
      results.push({
        slug,
        title,
        category,
        date: data.date || undefined,
        tags,
        description: description || undefined,
        lastModified: stat.mtime,
        score,
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...doc }) => doc);
}

export async function getDocument(slug: string): Promise<Document | null> {
  const filePath = path.join(vaultPath, `${slug}.md`);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);
  const stat = fs.statSync(filePath);
  
  const processedContent = await remark()
    .use(html)
    .process(content);
  
  const category = path.dirname(slug).split('/')[0] || 'root';
  
  return {
    slug,
    title: data.title || path.basename(slug).replace(/-/g, ' '),
    content,
    htmlContent: processedContent.toString(),
    category,
    date: data.date || undefined,
    tags: data.tags || [],
    description: data.description || undefined,
    lastModified: stat.mtime,
  };
}

export function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 230));
}

export function getRelatedDocuments(slug: string, limit: number = 5): DocumentMeta[] {
  const allDocs = getAllDocuments();
  const target = allDocs.find(d => d.slug === slug);
  if (!target) return [];

  const targetTags = new Set(target.tags || []);

  const scored = allDocs
    .filter(d => d.slug !== slug)
    .map(d => {
      let score = 0;
      // Same category
      if (d.category === target.category) score += 2;
      // Shared tags
      const shared = (d.tags || []).filter(t => targetTags.has(t)).length;
      score += shared * 3;
      return { doc: d, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(s => s.doc);
}

export function getCategories(): string[] {
  if (!fs.existsSync(vaultPath)) return [];
  
  return fs.readdirSync(vaultPath)
    .filter(item => fs.statSync(path.join(vaultPath, item)).isDirectory());
}
