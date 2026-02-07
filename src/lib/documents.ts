import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const vaultPath = path.join(process.cwd(), 'vault');

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
  return documents.sort((a, b) => {
    if (a.date && b.date) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (a.date) return -1;
    if (b.date) return 1;
    return a.title.localeCompare(b.title);
  });
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

export function searchDocuments(query: string): DocumentMeta[] {
  const files = getAllFilesRecursive(vaultPath);
  const lowerQuery = query.toLowerCase();
  
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
    if (title.toLowerCase().includes(lowerQuery)) score += 10;
    // Description match
    if (description.toLowerCase().includes(lowerQuery)) score += 5;
    // Tag match
    if (tags.some(t => t.toLowerCase().includes(lowerQuery))) score += 7;
    // Content match
    if (content.toLowerCase().includes(lowerQuery)) score += 3;
    
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

export function getCategories(): string[] {
  if (!fs.existsSync(vaultPath)) return [];
  
  return fs.readdirSync(vaultPath)
    .filter(item => fs.statSync(path.join(vaultPath, item)).isDirectory());
}
