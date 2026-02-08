import { NextRequest, NextResponse } from 'next/server';
import { getTasks } from '@/app/actions/tasks';
import { readWithFallback, VAULT_PATH } from '@/lib/paths';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface HotTopic {
  topic: string;
  count: number;
  sources: string[];
}

interface ActionItem {
  id: string;
  title: string;
  column: string;
  age: number; // days
  priority: string;
}

interface StaleAlert {
  id: string;
  title: string;
  daysStale: number;
}

interface RecentDoc {
  title: string;
  path: string;
  modified: string;
}

interface WhatMattersResponse {
  hotTopics: HotTopic[];
  actionItems: ActionItem[];
  staleAlerts: StaleAlert[];
  recentDocs: RecentDoc[];
}

// Extract keywords from text (basic topic extraction)
function extractKeywords(text: string): string[] {
  // Remove common words and extract meaningful keywords
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do',
    'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'can',
    'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 50); // Limit to first 50 words for performance
}

// Group topics by frequency
function groupTopics(activities: any[]): HotTopic[] {
  const topicMap = new Map<string, { count: number; sources: Set<string> }>();

  for (const activity of activities) {
    const text = `${activity.title || ''} ${activity.summary || ''} ${activity.message || ''}`;
    const keywords = extractKeywords(text);
    const source = activity.agent || activity.source || 'unknown';

    for (const keyword of keywords) {
      if (!topicMap.has(keyword)) {
        topicMap.set(keyword, { count: 0, sources: new Set() });
      }
      const topic = topicMap.get(keyword)!;
      topic.count++;
      topic.sources.add(source);
    }
  }

  // Convert to array and sort by count
  const topics = Array.from(topicMap.entries())
    .map(([topic, data]) => ({
      topic,
      count: data.count,
      sources: Array.from(data.sources),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 topics

  return topics.filter(t => t.count >= 2); // Only show topics mentioned 2+ times
}

// Get recent vault document changes
async function getRecentVaultChanges(): Promise<RecentDoc[]> {
  try {
    // Try git log first
    const gitCmd = `cd ${VAULT_PATH} && git log --pretty=format:"%H|%at|%s" --name-only --since="7 days ago" -- "*.md" | grep -E "\.md$|^[a-f0-9]{40}" | head -50`;
    
    try {
      const { stdout } = await execAsync(gitCmd);
      const lines = stdout.trim().split('\n');
      const docs = new Map<string, { timestamp: number; title: string }>();

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.includes('|')) {
          // Commit line: hash|timestamp|message
          const [, timestamp] = line.split('|');
          const ts = parseInt(timestamp, 10);
          
          // Next lines are files until we hit another commit
          for (let j = i + 1; j < lines.length; j++) {
            const file = lines[j].trim();
            if (!file || file.includes('|')) break;
            
            if (file.endsWith('.md')) {
              const title = path.basename(file, '.md')
                .replace(/-/g, ' ')
                .replace(/^\d{4}-\d{2}-\d{2}-/, '');
              
              if (!docs.has(file) || docs.get(file)!.timestamp < ts) {
                docs.set(file, { timestamp: ts, title });
              }
            }
          }
        }
      }

      return Array.from(docs.entries())
        .map(([filePath, data]) => ({
          title: data.title,
          path: filePath,
          modified: new Date(data.timestamp * 1000).toISOString(),
        }))
        .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
        .slice(0, 5);
    } catch (gitError) {
      // Fallback to file mtime
      const { stdout } = await execAsync(`find ${VAULT_PATH} -name "*.md" -type f -printf "%T@ %p\n" | sort -rn | head -5`);
      const lines = stdout.trim().split('\n');
      
      return lines
        .filter(line => line.trim())
        .map(line => {
          const [timestamp, filePath] = line.split(' ', 2);
          const title = path.basename(filePath, '.md')
            .replace(/-/g, ' ')
            .replace(/^\d{4}-\d{2}-\d{2}-/, '');
          
          return {
            title,
            path: path.relative(VAULT_PATH, filePath),
            modified: new Date(parseFloat(timestamp) * 1000).toISOString(),
          };
        });
    }
  } catch (error) {
    console.error('Failed to get recent vault changes:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    // 1. Get recent activity (last 48h)
    const activityData = await readWithFallback(
      path.join(VAULT_PATH, 'activity.json'),
      '[]'
    );
    const allActivity = JSON.parse(activityData);
    
    const now = Date.now();
    const fortyEightHoursAgo = now - 48 * 60 * 60 * 1000;
    const recentActivity = allActivity.filter((a: any) => {
      const timestamp = new Date(a.timestamp).getTime();
      return timestamp >= fortyEightHoursAgo;
    });

    // 2. Extract hot topics
    const hotTopics = groupTopics(recentActivity);

    // 3. Get tasks
    const tasks = await getTasks();
    const activeTasks = tasks.filter(t => t.column === 'Backlog' || t.column === 'In Progress' || t.column === 'Waiting on Samson');

    // Calculate task age in days
    const tasksWithAge = activeTasks.map(task => {
      const createdAt = new Date(task.createdAt || task.updatedAt).getTime();
      const age = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
      return { ...task, age };
    });

    // 4. Action items (sorted by age, oldest first)
    const actionItems: ActionItem[] = tasksWithAge
      .sort((a, b) => b.age - a.age)
      .slice(0, 5)
      .map(task => ({
        id: task.id,
        title: task.title,
        column: task.column,
        age: task.age,
        priority: task.priority,
      }));

    // 5. Stale alerts (In Progress for >3 days)
    const staleAlerts: StaleAlert[] = tasksWithAge
      .filter(task => task.column === 'In Progress' && task.age > 3)
      .map(task => ({
        id: task.id,
        title: task.title,
        daysStale: task.age,
      }))
      .sort((a, b) => b.daysStale - a.daysStale);

    // 6. Recent vault changes
    const recentDocs = await getRecentVaultChanges();

    const response: WhatMattersResponse = {
      hotTopics,
      actionItems,
      staleAlerts,
      recentDocs,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('What Matters API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch what matters data' },
      { status: 500 }
    );
  }
}
