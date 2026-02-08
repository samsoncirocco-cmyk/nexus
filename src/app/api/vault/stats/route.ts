import { NextResponse } from 'next/server';
import { getAllDocuments } from '@/lib/documents';
import { getActivity } from '@/app/actions/activity';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const documents = getAllDocuments();
    const activity = await getActivity();
    
    // Count unique categories
    const categories = new Set(documents.map(d => d.category)).size;

    return NextResponse.json({
      documentCount: documents.length,
      totalEvents: activity.length,
      categories,
    });
  } catch (error) {
    console.error('[API] Vault stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get vault stats' },
      { status: 500 }
    );
  }
}
