'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/* ─── Types ─── */

interface EventsByDay {
  day: string;
  count: number;
}

interface EventsByType {
  type: string;
  count: number;
}

interface EventsBySource {
  source: string;
  count: number;
}

interface RecentEvent {
  id: string;
  timestamp: string;
  agent: string;
  type: string;
  source: string;
  summary: string;
  metadata: any;
}

interface AnalyticsData {
  summary: {
    totalEvents: number;
    eventsToday: number;
    activeAgents: number;
    uniqueSources: number;
    uniqueTypes: number;
  };
  eventsByDay: EventsByDay[];
  eventsByType: EventsByType[];
  eventsBySource: EventsBySource[];
  recentEvents: RecentEvent[];
}

/* ─── Helpers ─── */

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

/* ─── Main Component ─── */

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics', { cache: 'no-store' });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-foreground-muted text-sm">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full max-w-5xl mx-auto flex items-center justify-center min-h-screen">
        <div className="bg-card-dark rounded-2xl border border-red-500/20 p-8 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-red-500" style={{ fontSize: 32 }}>
              error
            </span>
            <h2 className="text-xl font-bold">Analytics Error</h2>
          </div>
          <p className="text-foreground-muted mb-4">{error || 'Failed to load analytics data'}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl hover:bg-primary/20 transition-colors text-primary font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const maxPerDay = Math.max(...data.eventsByDay.map((e) => e.count), 1);
  const maxByType = Math.max(...data.eventsByType.map((e) => e.count), 1);
  const maxBySource = Math.max(...data.eventsBySource.map((e) => e.count), 1);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg-dark/80 backdrop-blur-md pt-6 md:pt-8 pb-4 px-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
              BigQuery Analytics
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Event Analytics</h1>
          </div>
          <Link
            href="/activity"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
          >
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>
              history
            </span>
            <span className="text-primary text-xs font-bold">Activity</span>
          </Link>
        </div>
        <p className="text-foreground-muted text-sm">
          Real-time event tracking & analysis (last 7 days)
        </p>
      </header>

      <main className="flex-1 px-6 pb-32 space-y-8">
        {/* ─────── SUMMARY CARDS ─────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon="database"
            label="Total Events"
            value={data.summary.totalEvents}
            sub="last 7 days"
          />
          <SummaryCard
            icon="today"
            label="Events Today"
            value={data.summary.eventsToday}
            sub={data.summary.eventsToday === 0 ? 'quiet day' : 'active'}
            accent="emerald"
          />
          <SummaryCard
            icon="source"
            label="Unique Sources"
            value={data.summary.uniqueSources}
            sub={`${data.summary.uniqueTypes} event types`}
            accent="blue"
          />
          <SummaryCard
            icon="smart_toy"
            label="Active Agents"
            value={data.summary.activeAgents}
            sub="unique agents"
            accent="orange"
          />
        </div>

        {/* ─────── EVENTS OVER TIME ─────── */}
        <section className="bg-card-dark rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
            >
              show_chart
            </span>
            <h2 className="text-lg font-bold">Events Over Time</h2>
            <span className="text-xs text-foreground-muted ml-auto">Last 7 days</span>
          </div>

          {data.eventsByDay.length === 0 ? (
            <p className="text-foreground-muted text-sm py-8 text-center">
              No events in the last 7 days.
            </p>
          ) : (
            <div className="space-y-3">
              {data.eventsByDay.map((entry) => {
                const pct = (entry.count / maxPerDay) * 100;
                return (
                  <div key={entry.day} className="flex items-center gap-4">
                    <span className="text-xs text-foreground-muted font-mono w-16 shrink-0">
                      {shortDate(entry.day)}
                    </span>
                    <div className="flex-1 h-8 bg-bg-dark rounded-lg overflow-hidden relative">
                      <div
                        className="h-full rounded-lg transition-all duration-700"
                        style={{
                          width: `${Math.max(pct, 4)}%`,
                          background: 'linear-gradient(90deg, #154733 0%, #FEE123 100%)',
                        }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground">
                        {entry.count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ─────── 2-COL: EVENTS BY TYPE + SOURCE ─────── */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Events by Type */}
          <section className="bg-card-dark rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-6">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
              >
                category
              </span>
              <h2 className="text-lg font-bold">Events by Type</h2>
            </div>

            {data.eventsByType.length === 0 ? (
              <p className="text-foreground-muted text-sm py-4 text-center">No data.</p>
            ) : (
              <div className="space-y-3">
                {data.eventsByType.slice(0, 10).map((entry) => {
                  const pct = (entry.count / maxByType) * 100;
                  return (
                    <div key={entry.type}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium truncate pr-2">{entry.type}</span>
                        <span className="text-xs font-bold text-primary shrink-0">
                          {entry.count}
                        </span>
                      </div>
                      <div className="h-6 bg-bg-dark rounded-lg overflow-hidden">
                        <div
                          className="h-full rounded-lg transition-all duration-700"
                          style={{
                            width: `${Math.max(pct, 4)}%`,
                            background: '#FEE123',
                            opacity: 0.8,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Events by Source */}
          <section className="bg-card-dark rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-6">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
              >
                hub
              </span>
              <h2 className="text-lg font-bold">Events by Source</h2>
            </div>

            {data.eventsBySource.length === 0 ? (
              <p className="text-foreground-muted text-sm py-4 text-center">No data.</p>
            ) : (
              <div className="space-y-3">
                {data.eventsBySource.slice(0, 10).map((entry) => {
                  const pct = (entry.count / maxBySource) * 100;
                  return (
                    <div key={entry.source}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium truncate pr-2">{entry.source}</span>
                        <span className="text-xs font-bold text-primary shrink-0">
                          {entry.count}
                        </span>
                      </div>
                      <div className="h-6 bg-bg-dark rounded-lg overflow-hidden">
                        <div
                          className="h-full rounded-lg transition-all duration-700"
                          style={{
                            width: `${Math.max(pct, 4)}%`,
                            background: '#FEE123',
                            opacity: 0.8,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* ─────── RECENT ACTIVITY TIMELINE ─────── */}
        <section className="bg-card-dark rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
            >
              schedule
            </span>
            <h2 className="text-lg font-bold">Recent Activity</h2>
            <span className="ml-auto text-xs text-foreground-muted">Last 10 events</span>
          </div>

          {data.recentEvents.length === 0 ? (
            <p className="text-foreground-muted text-sm py-8 text-center">
              No recent events found.
            </p>
          ) : (
            <div className="space-y-4">
              {data.recentEvents.map((event, idx) => (
                <div
                  key={event.id || idx}
                  className="bg-bg-dark rounded-xl border border-border-subtle p-4 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* Timeline dot */}
                    <div className="shrink-0 mt-1">
                      <div className="size-2 rounded-full bg-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Header: type + source + time */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-md">
                          {event.type}
                        </span>
                        <span className="text-xs text-foreground-muted">from</span>
                        <span className="text-xs font-semibold text-foreground">
                          {event.source}
                        </span>
                        {event.agent && event.agent !== 'system' && (
                          <>
                            <span className="text-xs text-foreground-muted">•</span>
                            <span className="text-xs text-foreground-muted">
                              agent: {event.agent}
                            </span>
                          </>
                        )}
                        <span className="text-xs text-foreground-muted ml-auto">
                          {formatTimestamp(event.timestamp)}
                        </span>
                      </div>

                      {/* Summary */}
                      <p className="text-sm text-foreground-muted line-clamp-2">
                        {event.summary}
                      </p>

                      {/* Timestamp */}
                      <div className="text-[10px] text-foreground-muted/60 mt-2 font-mono">
                        {formatTime(event.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─────── FOOTER INFO ─────── */}
        <div className="text-center text-xs text-foreground-muted space-y-1 pb-8">
          <p>Data source: BigQuery (tatt-pro.openclaw.events)</p>
          <p>Auto-refreshes every 30 seconds</p>
          <p className="text-primary">Real-time event analytics from your Second Brain</p>
        </div>
      </main>
    </div>
  );
}

/* ─── Summary Card Component ─── */

function SummaryCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: string;
  label: string;
  value: number | string;
  sub: string;
  accent?: 'emerald' | 'blue' | 'orange';
}) {
  const accentColors = {
    emerald: {
      icon: 'text-emerald-400',
      ring: 'border-emerald-500/20',
      glow: 'shadow-emerald-500/10',
    },
    blue: { icon: 'text-blue-400', ring: 'border-blue-500/20', glow: 'shadow-blue-500/10' },
    orange: {
      icon: 'text-orange-400',
      ring: 'border-orange-500/20',
      glow: 'shadow-orange-500/10',
    },
  };
  const colors = accent
    ? accentColors[accent]
    : { icon: 'text-primary', ring: 'border-primary/20', glow: 'shadow-primary/10' };

  return (
    <div className="bg-card-dark rounded-2xl border border-border p-5 hover:border-primary/20 transition-colors group">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`size-10 rounded-xl bg-bg-dark border ${colors.ring} flex items-center justify-center shadow-lg ${colors.glow}`}
        >
          <span
            className={`material-symbols-outlined ${colors.icon}`}
            style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>
        <span className="text-xs text-foreground-muted font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-foreground-muted mt-1">{sub}</div>
    </div>
  );
}
