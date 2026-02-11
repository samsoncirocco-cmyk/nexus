import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

interface EmailDigestItem {
  from: string;
  subject: string;
  date: string;
  snippet: string;
  account: string;
}

export async function GET() {
  try {
    const scriptPath = '/home/samson/.openclaw/workspace/tools/gmail_api.py';
    const results: EmailDigestItem[] = [];
    
    // Fetch personal emails (5)
    try {
      const { stdout: personalStdout } = await execAsync(
        `python3 ${scriptPath} unread personal 5`,
        { timeout: 10000 }
      );
      const personalData: GmailApiResponse = JSON.parse(personalStdout);
      
      personalData.emails.forEach(email => {
        results.push({
          from: email.from,
          subject: email.subject,
          date: email.date,
          snippet: email.body_preview?.substring(0, 100) || '',
          account: 'personal'
        });
      });
    } catch (error) {
      console.error('Failed to fetch personal emails:', error);
    }
    
    // Fetch NAU emails (3)
    try {
      const { stdout: nauStdout } = await execAsync(
        `python3 ${scriptPath} unread nau 3`,
        { timeout: 10000 }
      );
      const nauData: GmailApiResponse = JSON.parse(nauStdout);
      
      nauData.emails.forEach(email => {
        results.push({
          from: email.from,
          subject: email.subject,
          date: email.date,
          snippet: email.body_preview?.substring(0, 100) || '',
          account: 'nau'
        });
      });
    } catch (error) {
      console.error('Failed to fetch NAU emails:', error);
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
    console.error('Email digest API error:', error);
    // Return empty array on error instead of 500
    return NextResponse.json({
      success: false,
      count: 0,
      emails: []
    });
  }
}
