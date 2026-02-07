import { NextRequest, NextResponse } from 'next/server';
import { searchDocuments, getAllDocuments } from '@/lib/documents';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') || '').slice(0, 200);
  const tag = (searchParams.get('tag') || '').slice(0, 100);
  const highlight = searchParams.get('highlight') === '1';

  let results = query ? searchDocuments(query) : getAllDocuments();

  if (tag) {
    results = results.filter(doc => doc.tags?.includes(tag));
  }

  // Add highlight snippets if requested
  if (highlight && query) {
    const q = query.toLowerCase();
    const highlighted = results.map(doc => {
      const snippets: string[] = [];
      // Highlight in title
      if (doc.title.toLowerCase().includes(q)) {
        snippets.push(highlightText(doc.title, query));
      }
      // Highlight in description
      if (doc.description && doc.description.toLowerCase().includes(q)) {
        snippets.push(highlightText(doc.description, query));
      }
      return { ...doc, snippets };
    });
    return NextResponse.json(highlighted);
  }

  return NextResponse.json(results);
}

function highlightText(text: string, query: string): string {
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
