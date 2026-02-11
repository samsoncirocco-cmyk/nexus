import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO timestamp
  end: string; // ISO timestamp
  location?: string;
  allDay?: boolean;
}

interface CalendarResponse {
  events: CalendarEvent[];
  source: 'google' | 'mock';
}

// Mock data for when Google Calendar is unavailable
function getMockEvents(): CalendarEvent[] {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const events: CalendarEvent[] = [
    {
      id: 'mock-1',
      title: 'Daily Standup',
      start: new Date(now.setHours(9, 0, 0, 0)).toISOString(),
      end: new Date(now.setHours(9, 30, 0, 0)).toISOString(),
      location: 'Zoom',
    },
    {
      id: 'mock-2',
      title: 'Client Meeting',
      start: new Date(now.setHours(14, 0, 0, 0)).toISOString(),
      end: new Date(now.setHours(15, 0, 0, 0)).toISOString(),
      location: 'Conference Room A',
    },
    {
      id: 'mock-3',
      title: 'Code Review',
      start: new Date(tomorrow.setHours(10, 0, 0, 0)).toISOString(),
      end: new Date(tomorrow.setHours(11, 0, 0, 0)).toISOString(),
    },
  ];

  return events;
}

// Try to fetch from Google Calendar using gog CLI
async function fetchGoogleCalendar(): Promise<CalendarEvent[] | null> {
  try {
    // Try to get calendar events from gog
    // First, check if we have any stored accounts
    const { stdout: authList } = await execAsync('~/.local/bin/gog auth list 2>/dev/null');
    
    if (!authList.trim() || authList.includes('No tokens')) {
      return null; // No authenticated accounts
    }

    // Try to fetch events (without --account flag, hoping for a default)
    const { stdout } = await execAsync(
      '~/.local/bin/gog calendar list --days 2 --json 2>/dev/null',
      { timeout: 5000 }
    );

    if (!stdout.trim()) {
      return null;
    }

    const data = JSON.parse(stdout);
    
    // Parse gog calendar output format
    if (Array.isArray(data)) {
      return data.map((event: any) => ({
        id: event.id || event.Id || String(Math.random()),
        title: event.summary || event.Summary || event.title || 'Untitled Event',
        start: event.start?.dateTime || event.Start?.DateTime || event.start,
        end: event.end?.dateTime || event.End?.DateTime || event.end,
        location: event.location || event.Location || undefined,
        allDay: !!(event.start?.date || event.Start?.Date),
      }));
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch Google Calendar:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Try Google Calendar first
    const googleEvents = await fetchGoogleCalendar();
    
    if (googleEvents && googleEvents.length > 0) {
      // Filter to next 48 hours
      const now = Date.now();
      const fortyEightHours = 48 * 60 * 60 * 1000;
      const upcoming = googleEvents.filter(event => {
        const startTime = new Date(event.start).getTime();
        return startTime >= now && startTime <= now + fortyEightHours;
      });

      const response: CalendarResponse = {
        events: upcoming,
        source: 'google',
      };

      return NextResponse.json(response);
    }

    // Fallback to mock data
    const response: CalendarResponse = {
      events: getMockEvents(),
      source: 'mock',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Calendar API error:', error);
    
    // Return mock data on error
    const response: CalendarResponse = {
      events: getMockEvents(),
      source: 'mock',
    };

    return NextResponse.json(response);
  }
}
