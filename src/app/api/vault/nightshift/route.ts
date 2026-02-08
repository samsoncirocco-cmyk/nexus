import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const NIGHTSHIFT_FILE = path.join(process.cwd(), '..', '..', 'NIGHTSHIFT.md');

interface NightshiftItem {
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export async function GET() {
  try {
    const content = await fs.readFile(NIGHTSHIFT_FILE, 'utf-8');
    
    // Parse NIGHTSHIFT.md for tasks
    const items: NightshiftItem[] = [];
    const lines = content.split('\n');
    
    let currentPriority: 'critical' | 'high' | 'medium' | 'low' = 'medium';
    
    for (const line of lines) {
      // Detect priority sections
      if (line.includes('🔴 CRITICAL')) {
        currentPriority = 'critical';
      } else if (line.includes('🟡 MEDIUM')) {
        currentPriority = 'medium';
      } else if (line.toLowerCase().includes('high priority')) {
        currentPriority = 'high';
      }
      
      // Extract numbered tasks (e.g., "1. **Task Name**")
      const match = line.match(/^\s*\d+\.\s+\*\*(.*?)\*\*/);
      if (match) {
        items.push({
          title: match[1].trim(),
          priority: currentPriority,
        });
      }
    }
    
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Failed to read NIGHTSHIFT.md:', error);
    return NextResponse.json({ items: [] });
  }
}
