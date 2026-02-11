import { NextRequest, NextResponse } from 'next/server';
import { getAllDocuments, getDocument } from '@/lib/documents';
import { readWithFallback, VAULT_PATH } from '@/lib/paths';
import matter from 'gray-matter';
import path from 'path';

interface RelatedNote {
  title: string;
  path: string;
  category: string;
  score: number;
  matchReason: string;
  tags: string[];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const docPath = searchParams.get('path');
  const activityId = searchParams.get('activity_id');

  if (!docPath && !activityId) {
    return NextResponse.json({ error: 'Missing path or activity_id parameter' }, { status: 400 });
  }

  try {
    let sourceDoc: { title: string; tags: string[]; content: string } | null = null;

    if (docPath) {
      // Get source document
      const doc = await getDocument(docPath.replace(/\.md$/, ''));
      if (!doc) {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 });
      }
      sourceDoc = {
        title: doc.title,
        tags: doc.tags || [],
        content: doc.content,
      };
    } else if (activityId) {
      // Get activity item from activity.json
      const activityPath = path.join(VAULT_PATH, 'activity.json');
      const activityData = await readWithFallback(activityPath, '[]');
      const activities = JSON.parse(activityData);
      const activity = activities.find((a: any) => a.id === activityId);
      
      if (!activity) {
        return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
      }

      sourceDoc = {
        title: activity.title || activity.message || '',
        tags: activity.tags || [],
        content: activity.message || '',
      };
    }

    if (!sourceDoc) {
      return NextResponse.json({ error: 'Failed to load source' }, { status: 500 });
    }

    // Extract keywords from source document
    const sourceTags = new Set(sourceDoc.tags.map((t: string) => t.toLowerCase()));
    const titleWords = extractKeywords(sourceDoc.title);
    const contentWords = extractKeywords(sourceDoc.content);

    // Get all documents and score them
    const allDocs = getAllDocuments();
    const scored: RelatedNote[] = [];

    for (const doc of allDocs) {
      // Skip the source document itself
      if (docPath && doc.slug === docPath.replace(/\.md$/, '')) {
        continue;
      }

      let score = 0;
      const matchReasons: string[] = [];

      // Exact tag matches (high score)
      const docTags = new Set((doc.tags || []).map((t: string) => t.toLowerCase()));
      const sharedTags = [...sourceTags].filter(t => docTags.has(t));
      if (sharedTags.length > 0) {
        score += sharedTags.length * 10;
        matchReasons.push(`shared tag: ${sharedTags[0]}`);
      }

      // Title word overlap (medium score)
      const docTitleWords = extractKeywords(doc.title);
      const titleOverlap = [...titleWords].filter(w => docTitleWords.has(w));
      if (titleOverlap.length > 0) {
        score += titleOverlap.length * 5;
        if (matchReasons.length === 0) {
          matchReasons.push('similar topic');
        }
      }

      // Same category (low score bonus)
      if (docPath && doc.category === path.dirname(docPath.replace(/\.md$/, '')).split('/')[0]) {
        score += 2;
        if (matchReasons.length === 0) {
          matchReasons.push(`same category: ${doc.category}`);
        }
      }

      // Content keyword overlap (low score) - only check if we have some score already
      if (score > 0) {
        const contentOverlap = [...contentWords].filter(w => {
          const docTitleLower = doc.title.toLowerCase();
          return docTitleLower.includes(w);
        });
        if (contentOverlap.length > 0) {
          score += contentOverlap.length * 1;
        }
      }

      if (score > 0) {
        scored.push({
          title: doc.title,
          path: doc.slug,
          category: doc.category,
          score,
          matchReason: matchReasons[0] || 'related',
          tags: doc.tags || [],
        });
      }
    }

    // Sort by score and return top 5
    const related = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return NextResponse.json({ related });
  } catch (error) {
    console.error('Related notes API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'this', 'but', 'they', 'have', 'had',
    'what', 'when', 'where', 'who', 'which', 'why', 'how',
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));

  return new Set(words);
}
