import fs from 'fs';
import path from 'path';

// Directives are in workspace, outside the second-brain project
const DIRECTIVES_PATH = path.join(process.cwd(), '../../directives');

export interface Directive {
  filename: string;
  title: string;
  content: string;
  category: string;
  wordCount: number;
  lastModified: Date;
}

const CATEGORY_MAP: Record<string, string> = {
  // Operations
  'heartbeat': 'operations',
  'auto-commit': 'operations',
  'vault-data-sync': 'operations',
  'nightshift-queue': 'operations',
  
  // Development
  'second-brain-development': 'development',
  'deploy-second-brain': 'development',
  'spawn-sub-agent': 'development',
  
  // Data
  'activity-logging': 'data',
  'memory-management': 'data',
  'google-drive-sync': 'data',
  
  // Content
  'book-editing': 'content',
  'sled-intel': 'content',
  'outlook-api': 'content',
  
  // Meta
  'self-annealing': 'meta',
};

function extractTitle(content: string): string {
  // Extract first # heading
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '';
}

function countWords(content: string): number {
  return content.trim().split(/\s+/).length;
}

export function getAllDirectives(): Directive[] {
  if (!fs.existsSync(DIRECTIVES_PATH)) {
    return [];
  }

  const files = fs.readdirSync(DIRECTIVES_PATH)
    .filter(f => f.endsWith('.md'));

  const directives = files.map(filename => {
    const filePath = path.join(DIRECTIVES_PATH, filename);
    const content = fs.readFileSync(filePath, 'utf-8');
    const stat = fs.statSync(filePath);
    const slug = filename.replace(/\.md$/, '');
    
    return {
      filename,
      title: extractTitle(content) || slug.replace(/-/g, ' '),
      content,
      category: CATEGORY_MAP[slug] || 'other',
      wordCount: countWords(content),
      lastModified: stat.mtime,
    };
  });

  // Sort by category, then by title
  return directives.sort((a, b) => {
    if (a.category !== b.category) {
      const catOrder = ['operations', 'development', 'data', 'content', 'meta', 'other'];
      return catOrder.indexOf(a.category) - catOrder.indexOf(b.category);
    }
    return a.title.localeCompare(b.title);
  });
}

export function getDirectivesByCategory(): Record<string, Directive[]> {
  const directives = getAllDirectives();
  const byCategory: Record<string, Directive[]> = {};
  
  for (const directive of directives) {
    if (!byCategory[directive.category]) {
      byCategory[directive.category] = [];
    }
    byCategory[directive.category].push(directive);
  }
  
  return byCategory;
}

export function searchDirectives(query: string): Directive[] {
  const directives = getAllDirectives();
  const q = query.toLowerCase();
  
  return directives.filter(d => {
    return (
      d.title.toLowerCase().includes(q) ||
      d.filename.toLowerCase().includes(q) ||
      d.content.toLowerCase().includes(q)
    );
  });
}
