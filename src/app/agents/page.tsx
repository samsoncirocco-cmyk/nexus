'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface AgentEntry {
  id: string;
  label: string;
  status: 'running' | 'completed' | 'failed';
  model: string;
  startedAt: string;
  completedAt?: string;
  lastUpdate: string;
  summary: string;
}

function formatDuration(startedAt: string, completedAt?: string): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const diff = Math.max(0, end - start);

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function StatusIndicator({ status }: { status: AgentEntry['status'] }) {
  if (status === 'running') {
    return (
      <div className="relative flex items-center gap-2">
        <div className="relative">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-75" />
        </div>
        <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">Running</span>
      </div>
    );
  }
  if (status === 'completed') {
    return (
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>
          check_circle
        </span>
        <span className="text-primary text-xs font-bold uppercase tracking-wider">Done</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="material-symbols-outlined text-red-400" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>
        error
      </span>
      <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Failed</span>
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + 10s polling
  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 10000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  // Tick every second for live duration counters
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const running = agents.filter((a) => a.status === 'running');
  const completed = agents.filter((a) => a.status === 'completed');
  const failed = agents.filter((a) => a.status === 'failed');

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg-dark/80 backdrop-blur-md pt-6 md:pt-8 pb-4 px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Live Status</span>
            <h1 className="text-2xl font-bold tracking-tight">Agent Fleet</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
              </div>
              <span className="text-emerald-400 text-xs font-bold">{running.length} Active</span>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary-dark/40 border border-primary/10">
            <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: 18 }}>play_circle</span>
            <span className="text-white text-sm font-bold">{running.length}</span>
            <span className="text-foreground-muted text-xs">Running</span>
          </div>
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary-dark/40 border border-primary/10">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>check_circle</span>
            <span className="text-white text-sm font-bold">{completed.length}</span>
            <span className="text-foreground-muted text-xs">Done</span>
          </div>
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary-dark/40 border border-primary/10">
            <span className="material-symbols-outlined text-red-400" style={{ fontSize: 18 }}>error</span>
            <span className="text-white text-sm font-bold">{failed.length}</span>
            <span className="text-foreground-muted text-xs">Failed</span>
          </div>
        </div>
      </header>

      {/* Agent Cards */}
      <main className="flex-1 px-6 pb-32 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="size-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin mb-4" />
            <p className="text-foreground-muted text-sm">Loading agents...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="size-16 rounded-full bg-secondary-dark/40 border border-primary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>smart_toy</span>
            </div>
            <h3 className="text-lg font-bold mb-2">No Agents</h3>
            <p className="text-foreground-muted text-sm text-center max-w-xs">
              No agents are currently registered. They&apos;ll show up here when spawned.
            </p>
          </div>
        ) : (
          <>
            {/* Running Agents */}
            {running.length > 0 && (
              <div className="space-y-3">
                {running.map((agent) => (
                  <div
                    key={agent.id}
                    className="relative bg-gradient-to-br from-secondary-dark/80 to-bg-dark rounded-xl p-5 border border-emerald-500/20 overflow-hidden"
                  >
                    {/* Glow accent */}
                    <div className="absolute -right-6 -top-6 size-20 bg-emerald-500/10 rounded-full blur-2xl" />

                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="size-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: 22 }}>smart_toy</span>
                          </div>
                          <div>
                            <h3 className="text-white font-bold text-base leading-tight">{agent.label}</h3>
                            <p className="text-foreground-muted text-xs font-mono">{agent.id}</p>
                          </div>
                        </div>
                        <StatusIndicator status={agent.status} />
                      </div>

                      <p className="text-zinc-300 text-sm leading-relaxed mb-4">{agent.summary}</p>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-primary/60" style={{ fontSize: 14 }}>timer</span>
                          <span className="text-primary/80 font-mono font-bold">{formatDuration(agent.startedAt, agent.completedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-primary/60" style={{ fontSize: 14 }}>memory</span>
                          <span className="text-foreground-muted">{agent.model}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Completed Agents */}
            {completed.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-foreground-muted text-xs font-bold uppercase tracking-widest mt-6 mb-2">Completed</h3>
                {completed.map((agent) => (
                  <div
                    key={agent.id}
                    className="bg-secondary-dark/40 rounded-xl p-4 border border-primary/10"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-sm">{agent.label}</h3>
                          <p className="text-foreground-muted text-xs font-mono">{agent.id}</p>
                        </div>
                      </div>
                      <StatusIndicator status={agent.status} />
                    </div>
                    <p className="text-zinc-400 text-sm mb-3">{agent.summary}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary/60" style={{ fontSize: 14 }}>timer</span>
                        <span className="text-foreground-muted font-mono">{formatDuration(agent.startedAt, agent.completedAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary/60" style={{ fontSize: 14 }}>memory</span>
                        <span className="text-foreground-muted">{agent.model}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Failed Agents */}
            {failed.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-foreground-muted text-xs font-bold uppercase tracking-widest mt-6 mb-2">Failed</h3>
                {failed.map((agent) => (
                  <div
                    key={agent.id}
                    className="bg-red-500/5 rounded-xl p-4 border border-red-500/20"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                          <span className="material-symbols-outlined text-red-400" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>error</span>
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-sm">{agent.label}</h3>
                          <p className="text-foreground-muted text-xs font-mono">{agent.id}</p>
                        </div>
                      </div>
                      <StatusIndicator status={agent.status} />
                    </div>
                    <p className="text-zinc-400 text-sm mb-3">{agent.summary}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary/60" style={{ fontSize: 14 }}>timer</span>
                        <span className="text-foreground-muted font-mono">{formatDuration(agent.startedAt, agent.completedAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary/60" style={{ fontSize: 14 }}>memory</span>
                        <span className="text-foreground-muted">{agent.model}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
