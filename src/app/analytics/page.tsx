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

interface ModelUsage {
  model: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

interface AnalyticsData {
  summary: {
    totalEvents: number;
    eventsToday: number;
    activeAgents: number;
    vaultDocs: number;
  };
  eventsByDay: EventsByDay[];
  eventsByType: EventsByType[];
  eventsBySource: EventsBySource[];
  modelUsage: ModelUsage[];
  totalCost: number;
}

/* ─── Helpers ─── */

function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return '<$0.01';
  return `$${cost.toFixed(2)}`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
            <h1 className="text-2xl font-bold tracking-tight">Cost Tracking</h1>
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
          Model usage, token consumption & cost estimates (last 7 days)
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
            icon="smart_toy"
            label="Active Agents"
            value={data.summary.activeAgents}
            sub="unique agents"
            accent="blue"
          />
          <SummaryCard
            icon="attach_money"
            label="Estimated Cost"
            value={formatCost(data.totalCost)}
            sub="last 7 days"
            accent="orange"
            isPrice
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
                {data.eventsByType.map((entry) => {
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
                source
              </span>
              <h2 className="text-lg font-bold">Events by Source</h2>
            </div>

            {data.eventsBySource.length === 0 ? (
              <p className="text-foreground-muted text-sm py-4 text-center">No data.</p>
            ) : (
              <div className="space-y-3">
                {data.eventsBySource.map((entry) => {
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

        {/* ─────── MODEL USAGE & COST ─────── */}
        <section className="bg-card-dark rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
            >
              psychology
            </span>
            <h2 className="text-lg font-bold">Model Usage & Cost</h2>
            <span className="ml-auto text-xl font-bold text-primary">
              {formatCost(data.totalCost)}
            </span>
          </div>

          {data.modelUsage.length === 0 ? (
            <p className="text-foreground-muted text-sm py-8 text-center">
              No model usage data available. Token tracking may not be enabled.
            </p>
          ) : (
            <div className="space-y-4">
              {data.modelUsage.map((usage) => (
                <div
                  key={usage.model}
                  className="bg-bg-dark rounded-xl border border-border-subtle p-4 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold mb-1">{usage.model}</h3>
                      <p className="text-xs text-foreground-muted">{usage.calls} API calls</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">
                        {formatCost(usage.estimatedCost)}
                      </div>
                      <div className="text-[10px] text-foreground-muted uppercase tracking-wider">
                        Estimated
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border-subtle">
                    <div>
                      <div className="text-xs text-foreground-muted mb-1">Input Tokens</div>
                      <div className="text-sm font-bold text-emerald-400">
                        {formatTokens(usage.inputTokens)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-foreground-muted mb-1">Output Tokens</div>
                      <div className="text-sm font-bold text-blue-400">
                        {formatTokens(usage.outputTokens)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    <div className="text-xs text-foreground-muted mb-2">Token Distribution</div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-bg-dark">
                      <div
                        className="bg-emerald-500"
                        style={{
                          width: `${(usage.inputTokens / (usage.inputTokens + usage.outputTokens)) * 100}%`,
                        }}
                      />
                      <div
                        className="bg-blue-500"
                        style={{
                          width: `${(usage.outputTokens / (usage.inputTokens + usage.outputTokens)) * 100}%`,
                        }}
                      />
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
          <p className="text-primary">Cost estimates based on public API pricing</p>
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
  isPrice,
}: {
  icon: string;
  label: string;
  value: number | string;
  sub: string;
  accent?: 'emerald' | 'blue' | 'orange';
  isPrice?: boolean;
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
      <div className={`${isPrice ? 'text-2xl' : 'text-3xl'} font-bold tracking-tight`}>
        {value}
      </div>
      <div className="text-xs text-foreground-muted mt-1">{sub}</div>
    </div>
  );
}
