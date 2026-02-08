import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface Email {
  from: string;
  to: string;
  subject: string;
  date: string;
  body_preview?: string;
  account: string;
  isUnread: boolean;
}

interface GmailApiResponse {
  account: string;
  total: number;
  showing: number;
  emails: Array<{
    from: string;
    to: string;
    subject: string;
    date: string;
    body_preview?: string;
  }>;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const account = searchParams.get('account') || 'all'; // personal/nau/all
  const filter = searchParams.get('filter') || 'unread'; // unread/all
  const count = parseInt(searchParams.get('count') || '20');

  try {
    const results: Email[] = [];
    const scriptPath = '/home/samson/.openclaw/workspace/tools/gmail_api.py';
    
    // Determine which accounts to fetch
    const accounts = account === 'all' ? ['personal', 'nau'] : [account];
    
    // Determine command (unread vs recent)
    const command = filter === 'unread' ? 'unread' : 'recent';
    
    // Fetch from each account
    for (const acc of accounts) {
      const accountCount = acc === 'personal' ? count : Math.floor(count / 2);
      const cmd = `python3 ${scriptPath} ${command} ${acc} ${accountCount}`;
      
      try {
        const { stdout } = await execAsync(cmd);
        const data: GmailApiResponse = JSON.parse(stdout);
        
        // Transform emails to include account and isUnread flag
        const emails = data.emails.map(email => ({
          ...email,
          account: acc,
          isUnread: command === 'unread' // If using 'unread' command, all are unread
        }));
        
        results.push(...emails);
      } catch (error) {
        console.error(`Error fetching from ${acc}:`, error);
        // Continue with other accounts even if one fails
      }
    }
    
    // Sort by date descending (most recent first)
    results.sort((a, b) => {
      try {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      } catch {
        return 0;
      }
    });
    
    return NextResponse.json({
      success: true,
      count: results.length,
      emails: results
    });
    
  } catch (error) {
    console.error('Inbox API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}
