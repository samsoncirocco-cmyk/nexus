'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow, format, isToday, isTomorrow } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  allDay?: boolean;
}

interface CalendarData {
  events: CalendarEvent[];
  source: 'google' | 'mock';
}

interface GroupedEvents {
  today: CalendarEvent[];
  tomorrow: CalendarEvent[];
}

export default function CalendarWidget() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendar = async () => {
    try {
      setError(null);
      const res = await fetch('/api/calendar', { cache: 'no-store' });
      
      if (!res.ok) {
        throw new Error('Failed to fetch calendar');
      }

      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch calendar:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
    
    // Auto-refresh every 10 minutes
    const interval = setInterval(fetchCalendar, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Group events by day
  const groupedEvents: GroupedEvents = {
    today: [],
    tomorrow: [],
  };

  if (data?.events) {
    data.events.forEach(event => {
      const eventDate = new Date(event.start);
      
      if (isToday(eventDate)) {
        groupedEvents.today.push(event);
      } else if (isTomorrow(eventDate)) {
        groupedEvents.tomorrow.push(event);
      }
    });

    // Sort by start time
    groupedEvents.today.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    groupedEvents.tomorrow.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  const formatTimeRange = (start: string, end: string, allDay?: boolean) => {
    if (allDay) {
      return 'All day';
    }
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    return `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-[#154733]/40 to-secondary-dark rounded-xl p-5 border border-[#FEE123]/20 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 size-24 bg-[#FEE123]/10 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[#FEE123] animate-pulse" style={{ fontSize: 20 }}>
              calendar_today
            </span>
            <h4 className="text-[#FEE123] font-bold text-lg">Upcoming Events</h4>
          </div>
          
          <div className="space-y-3">
            <div className="h-16 bg-[#FEE123]/5 rounded-lg animate-pulse" />
            <div className="h-16 bg-[#FEE123]/5 rounded-lg animate-pulse" />
            <div className="h-16 bg-[#FEE123]/5 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-gradient-to-br from-[#154733]/40 to-secondary-dark rounded-xl p-5 border border-red-500/20 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-red-400" style={{ fontSize: 20 }}>
              error
            </span>
            <h4 className="text-red-400 font-bold text-lg">Calendar Error</h4>
          </div>
          <p className="text-red-400/70 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const totalEvents = groupedEvents.today.length + groupedEvents.tomorrow.length;

  // Empty state
  if (totalEvents === 0) {
    return (
      <div className="bg-gradient-to-br from-[#154733]/40 to-secondary-dark rounded-xl p-5 border border-[#FEE123]/20 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 size-24 bg-[#FEE123]/10 rounded-full blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-[#FEE123]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
              calendar_today
            </span>
            <h4 className="text-[#FEE123] font-bold text-lg">Upcoming Events</h4>
          </div>
          
          <div className="text-center py-6">
            <div className="size-12 rounded-full bg-[#FEE123]/10 border border-[#FEE123]/20 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-[#FEE123]" style={{ fontSize: 24 }}>
                event_available
              </span>
            </div>
            <p className="text-[#FEE123]/60 text-sm">No upcoming events in the next 48 hours</p>
            {data?.source === 'mock' && (
              <p className="text-[#FEE123]/40 text-xs mt-2">
                Connect Google Calendar for real events
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#154733]/40 to-secondary-dark rounded-xl p-5 border border-[#FEE123]/20 relative overflow-hidden group hover:border-[#FEE123]/30 transition-colors">
      <div className="absolute -right-4 -top-4 size-24 bg-[#FEE123]/10 rounded-full blur-2xl group-hover:bg-[#FEE123]/15 transition-colors" />
      <div className="absolute -left-8 -bottom-8 size-20 bg-[#154733]/60 rounded-full blur-2xl" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#FEE123]" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
              calendar_today
            </span>
            <h4 className="text-[#FEE123] font-bold text-lg">Upcoming Events</h4>
          </div>
          
          <div className="flex items-center gap-2">
            {data?.source === 'mock' && (
              <span className="px-2 py-0.5 rounded-full bg-[#FEE123]/15 text-[#FEE123] text-[9px] font-bold tracking-wider border border-[#FEE123]/20">
                DEMO
              </span>
            )}
            <span className="text-[#FEE123]/50 text-xs font-medium">
              {totalEvents} event{totalEvents !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Today's Events */}
          {groupedEvents.today.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <h5 className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  Today
                </h5>
                <div className="flex-1 h-px bg-gradient-to-r from-emerald-400/20 to-transparent" />
              </div>
              
              <div className="space-y-2">
                {groupedEvents.today.map((event) => (
                  <div
                    key={event.id}
                    className="bg-[#154733]/30 border border-[#FEE123]/10 rounded-lg p-3 hover:border-[#FEE123]/20 hover:bg-[#154733]/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-lg bg-[#FEE123]/10 border border-[#FEE123]/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#FEE123]" style={{ fontSize: 18 }}>
                          event
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold leading-tight mb-1">
                          {event.title}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <div className="flex items-center gap-1 text-[#FEE123]/70">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                              schedule
                            </span>
                            <span>{formatTimeRange(event.start, event.end, event.allDay)}</span>
                          </div>
                          
                          {event.location && (
                            <div className="flex items-center gap-1 text-[#FEE123]/70">
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                location_on
                              </span>
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-1">
                          <span className="text-[#FEE123]/50 text-[10px] font-medium" suppressHydrationWarning>
                            {formatDistanceToNow(new Date(event.start), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tomorrow's Events */}
          {groupedEvents.tomorrow.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <h5 className="text-blue-400 text-xs font-bold uppercase tracking-wider">
                  Tomorrow
                </h5>
                <div className="flex-1 h-px bg-gradient-to-r from-blue-400/20 to-transparent" />
              </div>
              
              <div className="space-y-2">
                {groupedEvents.tomorrow.map((event) => (
                  <div
                    key={event.id}
                    className="bg-[#154733]/30 border border-[#FEE123]/10 rounded-lg p-3 hover:border-[#FEE123]/20 hover:bg-[#154733]/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-10 rounded-lg bg-[#FEE123]/10 border border-[#FEE123]/20 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#FEE123]" style={{ fontSize: 18 }}>
                          event
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold leading-tight mb-1">
                          {event.title}
                        </p>
                        
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <div className="flex items-center gap-1 text-[#FEE123]/70">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                              schedule
                            </span>
                            <span>{formatTimeRange(event.start, event.end, event.allDay)}</span>
                          </div>
                          
                          {event.location && (
                            <div className="flex items-center gap-1 text-[#FEE123]/70">
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                location_on
                              </span>
                              <span className="truncate">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
