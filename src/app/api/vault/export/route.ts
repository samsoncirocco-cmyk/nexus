import { NextResponse } from 'next/server';
import { getAllDocuments } from '@/lib/documents';
import { getActivity } from '@/app/actions/activity';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const documents = getAllDocuments();
    const activity = await getActivity();

    // For now, just return JSON export
    // In production, you'd use a library like archiver to create a ZIP
    const exportData = {
      exportedAt: new Date().toISOString(),
      documents,
      activity,
      version: '1.0.0',
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = Buffer.from(jsonStr);

    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="second-brain-vault-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('[API] Vault export error:', error);
    return NextResponse.json(
      { error: 'Failed to export vault' },
      { status: 500 }
    );
  }
}
