import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const vaultPath = path.join(process.cwd(), 'vault');

export interface SearchResult {
  slug: string;
  title: string;
  category: string;
  tags?: string[];
  description?: string;
  snippet: string;
  score: number;
  lastModified: Date;
}

export interface SearchOptions {
  category?: string;
  tag?: string;
  limit?: number;
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

/**
 * Extract a relevant snippet from content based on query terms
 */
function extractSnippet(content: string, queryTerms: string[], maxLength: number = 200): string {
  const sentences = content.split(/[.!?]\s+/);
  let bestSentence = sentences[0] || '';
  let bestScore = 0;
  
  // Find the sentence with the most query term matches
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    const score = queryTerms.reduce((acc, term) => {
      return acc + (lowerSentence.includes(term.toLowerCase()) ? 1 : 0);
    }, 0);
    
    if (score > bestScore) {
      bestScore = score;
      bestSentence = sentence;
    }
  }
  
  // Truncate if too long
  if (bestSentence.length > maxLength) {
    const truncated = bestSentence.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...';
  }
  
  return bestSentence;
}

/**
 * Highlight query terms in text
 */
export function highlightSnippet(text: string, queryTerms: string[]): string {
  let highlighted = text;
  
  for (const term of queryTerms) {
    if (term.length < 2) continue; // Skip very short terms
    
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    highlighted = highlighted.replace(regex, '**$1**');
  }
  
  return highlighted;
}

/**
 * Calculate TF-IDF-like relevance score
 */
function calculateScore(
  title: string,
  description: string,
  tags: string[],
  content: string,
  queryTerms: string[]
): number {
  let score = 0;
  
  const titleLower = title.toLowerCase();
  const descriptionLower = description.toLowerCase();
  const tagsLower = tags.map(t => t.toLowerCase());
  const contentLower = content.toLowerCase();
  
  for (const term of queryTerms) {
    const termLower = term.toLowerCase();
    
    // Title matches (weight: 10)
    if (titleLower.includes(termLower)) {
      score += 10;
      // Extra points for exact word match
      if (titleLower.split(/\s+/).includes(termLower)) {
        score += 5;
      }
    }
    
    // Tag matches (weight: 7)
    if (tagsLower.some(tag => tag.includes(termLower))) {
      score += 7;
      // Exact tag match
      if (tagsLower.includes(termLower)) {
        score += 3;
      }
    }
    
    // Description matches (weight: 5)
    if (descriptionLower.includes(termLower)) {
      score += 5;
    }
    
    // Content matches (weight: 3, but count occurrences)
    const contentMatches = (contentLower.match(new RegExp(termLower, 'g')) || []).length;
    score += Math.min(contentMatches * 3, 15); // Cap at 15 points per term
  }
  
  return score;
}

/**
 * Search all vault documents with ranking and snippet extraction
 */
export function searchDocuments(query: string, options: SearchOptions = {}): SearchResult[] {
  if (!query.trim()) return [];
  
  const files = getAllFilesRecursive(vaultPath);
  const queryTerms = query.trim().split(/\s+/).filter(t => t.length > 0);
  const results: SearchResult[] = [];
  
  for (const filePath of files) {
    const relativePath = path.relative(vaultPath, filePath);
    const category = path.dirname(relativePath).split(path.sep)[0] || 'root';
    const slug = relativePath.replace(/\.md$/, '').replace(/\\/g, '/');
    
    // Apply category filter
    if (options.category && category !== options.category) {
      continue;
    }
    
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContents);
    const stat = fs.statSync(filePath);
    
    const title = (data.title || path.basename(filePath, '.md').replace(/-/g, ' ')).toString();
    const description = (data.description || '').toString();
    const tags: string[] = Array.isArray(data.tags) ? data.tags : [];
    
    // Apply tag filter
    if (options.tag && !tags.includes(options.tag)) {
      continue;
    }
    
    // Calculate relevance score
    const score = calculateScore(title, description, tags, content, queryTerms);
    
    if (score > 0) {
      // Extract relevant snippet
      const snippet = extractSnippet(content, queryTerms);
      const highlightedSnippet = highlightSnippet(snippet, queryTerms);
      
      results.push({
        slug,
        title,
        category,
        tags,
        description: description || undefined,
        snippet: highlightedSnippet,
        score,
        lastModified: stat.mtime,
      });
    }
  }
  
  // Sort by score (highest first), then by last modified
  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return b.lastModified.getTime() - a.lastModified.getTime();
  });
  
  // Apply limit
  const limit = options.limit || 20;
  return results.slice(0, limit);
}

/**
 * Get total document count for display
 */
export function getDocumentCount(): number {
  return getAllFilesRecursive(vaultPath).length;
}
