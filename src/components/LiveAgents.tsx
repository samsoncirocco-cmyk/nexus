'use client';

import { useEffect, useState } from 'react';

interface LiveAgent {
  id: string;
  label: string;
  status: 'running' | 'completed' | 'failed' | 'idle';
  model: string;
  startedAt: string;
  elapsedMs: number;
  lastMessage: string;
  sessionKey: string;
}

interface LiveAgentsResponse {
  mode: 'live' | 'fallback';
  agents: LiveAgent[];
  timestamp: string;
}

function formatElapsed(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function getStatusIcon(status: LiveAgent['status']): string {
  if (status === 'running') return 'play_circle';
  if (status === 'completed') return 'check_circle';
  if (status === 'failed') return 'error';
  return 'pause_circle';
}

function getStatusColor(status: LiveAgent['status']): string {
  if (status === 'running') return 'text-emerald-400';
  if (status === 'completed') return 'text-primary';
  if (status === 'failed') return 'text-red-400';
  return 'text-zinc-400';
}

export default function LiveAgents() {
  const [data, setData] = useState<LiveAgentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    async function fetchLive() {
      try {
        const res = await fetch('/api/agents/live', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }

    fetchLive();
    const interval = setInterval(fetchLive, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, []);

  // Update elapsed time every second
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-secondary-dark/60 to-bg-dark p-5 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="size-5 rounded bg-primary/20" />
          <div className="h-4 w-32 rounded bg-primary/20" />
        </div>
        <div className="h-12 rounded-lg bg-card-dark/60" />
      </div>
    );
  }

  if (!data || data.agents.length === 0) {
    return null; // Don't show section if no live agents
  }

  const runningAgents = data.agents.filter(a => a.status === 'running');

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-secondary-dark/80 to-bg-dark p-5 relative overflow-hidden scan-line">
      {/* Glow effect */}
      <div className="absolute -right-6 -top-6 size-24 bg-emerald-500/10 rounded-full blur-3xl" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            {runningAgents.length > 0 && (
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-75" />
            )}
          </div>
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
            Live Agents
          </h3>
          <span className="text-[10px] font-bold text-emerald-400/70 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            {runningAgents.length} Running
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: 12 }}>
            wifi
          </span>
          <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
            {data.mode}
          </span>
        </div>
      </div>

      {/* Agent List */}
      <div className="relative z-10 space-y-2">
        {data.agents.map((agent) => {
          const computedElapsed = Date.now() - new Date(agent.startedAt).getTime();
          
          return (
            <div
              key={agent.id}
              className="p-3 rounded-lg bg-card-dark/60 border border-border-subtle hover:border-emerald-500/20 transition-all cursor-default"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`material-symbols-outlined ${getStatusColor(agent.status)}`}
                    style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}
                  >
                    {getStatusIcon(agent.status)}
                  </span>
                  <span className="text-white text-sm font-bold truncate">
                    {agent.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-primary/60" style={{ fontSize: 12 }}>
                      timer
                    </span>
                    <span
                      className="text-primary text-xs font-mono font-bold"
                      suppressHydrationWarning
                    >
                      {formatElapsed(computedElapsed)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Last message */}
              <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2 mb-2">
                {agent.lastMessage}
              </p>

              {/* Model & Session Key */}
              <div className="flex items-center gap-3 text-[10px] text-foreground-muted">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: 10 }}>
                    memory
                  </span>
                  <span className="font-mono">{agent.model}</span>
                </div>
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <span className="material-symbols-outlined" style={{ fontSize: 10 }}>
                    key
                  </span>
                  <span className="font-mono truncate">{agent.sessionKey}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
