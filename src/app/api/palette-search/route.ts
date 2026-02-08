import { NextRequest, NextResponse } from 'next/server';
import { getAllDocuments } from '@/lib/documents';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q')?.toLowerCase() || '';
  
  if (!q || q.length < 2) {
    return NextResponse.json({ docs: [] });
  }

  try {
    const allDocs = getAllDocuments();
    
    // Simple fuzzy search on title, description, tags
    const matches = allDocs
      .map(doc => {
        let score = 0;
        
        // Title match (highest weight)
        if (doc.title.toLowerCase().includes(q)) score += 10;
        
        // Description match
        if (doc.description?.toLowerCase().includes(q)) score += 5;
        
        // Tag match
        if (doc.tags?.some(tag => tag.toLowerCase().includes(q))) score += 7;
        
        // Category match
        if (doc.category.toLowerCase().includes(q)) score += 3;
        
        return { doc, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // Limit to top 10 for performance
      .map(item => item.doc);

    return NextResponse.json({ docs: matches });
    
  } catch (error: any) {
    console.error('Palette search error:', error);
    return NextResponse.json({ docs: [], error: error.message }, { status: 500 });
  }
}
