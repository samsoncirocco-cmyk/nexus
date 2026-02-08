import { NextRequest, NextResponse } from 'next/server';
import { searchDocuments, getDocumentCount } from '@/lib/search';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || undefined;
  const tag = searchParams.get('tag') || undefined;

  if (!query.trim()) {
    return NextResponse.json({
      results: [],
      count: 0,
      total: getDocumentCount(),
    });
  }

  const results = searchDocuments(query, {
    category,
    tag,
    limit: 20,
  });

  return NextResponse.json({
    results,
    count: results.length,
    total: getDocumentCount(),
    query,
  });
}
