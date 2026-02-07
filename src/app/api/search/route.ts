import { NextRequest, NextResponse } from 'next/server';
import { searchDocuments, getAllDocuments } from '@/lib/documents';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const tag = searchParams.get('tag') || '';

  let results = query ? searchDocuments(query) : getAllDocuments();

  if (tag) {
    results = results.filter(doc => doc.tags?.includes(tag));
  }

  return NextResponse.json(results);
}
