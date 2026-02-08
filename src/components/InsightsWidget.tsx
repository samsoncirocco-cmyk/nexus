'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface InsightCard {
  id: string;
  icon: string;
  title: string;
  value: string;
  subtitle: string;
  color: string;
}

interface InsightsResponse {
  insights: InsightCard[];
  meta: {
    total_activities: number;
    last_24h: number;
    last_week: number;
    generated_at: string;
  };
}

const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  emerald: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    glow: 'shadow-[0_0_12px_rgba(52,211,153,0.1)]',
  },
  teal: {
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/20',
    glow: 'shadow-[0_0_12px_rgba(45,212,191,0.1)]',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    glow: 'shadow-[0_0_12px_rgba(251,191,36,0.1)]',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
    glow: 'shadow-[0_0_12px_rgba(168,85,247,0.1)]',
  },
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.1)]',
  },
  red: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
    glow: 'shadow-[0_0_12px_rgba(239,68,68,0.1)]',
  },
};

export function InsightsWidget() {
  const [insights, setInsights] = useState<InsightCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    try {
      const response = await fetch('/api/insights');
      if (!response.ok) throw new Error('Failed to fetch insights');
      const data: InsightsResponse = await response.json();
      setInsights(data.insights);
      setError(null);
    } catch (err) {
      console.error('[InsightsWidget]', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchInsights, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="px-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-primary animate-pulse" style={{ fontSize: 22 }}>
            insights
          </span>
          <h3 className="text-primary text-lg font-bold tracking-tight">Insights</h3>
          <div className="h-px w-12 bg-gradient-to-r from-primary/40 to-transparent" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-primary/5 bg-secondary-dark/30 p-4 animate-pulse"
            >
              <div className="h-4 w-24 bg-primary/10 rounded mb-2" />
              <div className="h-3 w-32 bg-primary/5 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>
            insights
          </span>
          <h3 className="text-primary text-lg font-bold tracking-tight">Insights</h3>
          <div className="h-px w-12 bg-gradient-to-r from-primary/40 to-transparent" />
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-400" style={{ fontSize: 20 }}>
              warning
            </span>
            <div>
              <p className="text-amber-400 text-sm font-semibold">Failed to load insights</p>
              <p className="text-amber-400/60 text-xs mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="px-6 mb-6 animate-slide-up delay-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>
            insights
          </span>
          <h3 className="text-primary text-lg font-bold tracking-tight">Insights</h3>
          <div className="h-px w-12 bg-gradient-to-r from-primary/40 to-transparent" />
        </div>
        <Link
          href="/activity"
          className="flex items-center gap-1 text-primary/60 text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors group"
        >
          View Feed
          <span className="material-symbols-outlined text-primary/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" style={{ fontSize: 14 }}>
            arrow_forward
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map((insight, i) => {
          const colors = colorMap[insight.color] || colorMap.emerald;
          return (
            <Link
              key={insight.id}
              href="/activity"
              className={`card-hover animate-slide-up delay-${i + 1} flex flex-col gap-3 rounded-xl p-4 bg-gradient-to-br from-secondary-dark to-secondary-dark/60 border ${colors.border} ${colors.glow} relative overflow-hidden group`}
            >
              {/* Decorative gradient blur */}
              <div className={`absolute -right-4 -top-4 size-20 ${colors.bg} rounded-full blur-2xl opacity-50 group-hover:opacity-70 transition-opacity`} />
              
              <div className="relative z-10">
                {/* Icon & Title */}
                <div className="flex items-start gap-3 mb-2">
                  <div className={`flex items-center justify-center rounded-xl shrink-0 size-11 border ${colors.bg} ${colors.border} group-hover:scale-110 transition-transform`}>
                    <span className={`material-symbols-outlined ${colors.text}`} style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>
                      {insight.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`${colors.text} text-sm font-bold leading-tight`}>
                      {insight.title}
                    </p>
                  </div>
                </div>

                {/* Subtitle */}
                <p className="text-primary/50 text-xs font-medium leading-relaxed truncate">
                  {insight.subtitle}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
