'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import LiveAgents from '@/components/LiveAgents';

/* ─── Types ─── */
interface AgentEntry {
  id: string;
  label: string;
  status: 'running' | 'completed' | 'failed';
  model: string;
  startedAt: string;
  completedAt?: string;
  lastUpdate: string;
  summary: string;
  source?: 'gateway' | 'local';
  tokens?: { input: number; output: number; total: number };
  contextTokens?: number;
  sessionKey?: string;
}

interface GatewayStatus {
  bridge: string;
  reachable: boolean;
  mode: 'live' | 'fallback';
  error?: string;
}

interface GatewayPing {
  time: string;
  reachable: boolean;
}

/* ─── Helpers ─── */
function formatDuration(startedAt: string, completedAt?: string): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const diff = Math.max(0, end - start);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function formatTimeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

/* ─── Agent type classification ─── */
function getAgentTypeLabel(agent: AgentEntry): string {
  const l = agent.label.toLowerCase();
  if (l.includes('sub-agent') || l.includes('subagent')) return 'Sub-Agent';
  if (l.includes('cron')) return 'Cron Job';
  if (l.includes('main')) return 'Main';
  if (l.includes('paul')) return 'Paul';
  if (l.includes('workhorse')) return 'Workhorse';
  return 'Agent';
}

function getAgentIcon(agent: AgentEntry): string {
  const l = agent.label.toLowerCase();
  if (l.includes('cron')) return 'schedule';
  if (l.includes('sub')) return 'account_tree';
  if (l.includes('main') || l.includes('paul')) return 'psychology';
  return 'smart_toy';
}

/* ─── Performance metrics ─── */
function computeMetrics(agents: AgentEntry[]) {
  const completed = agents.filter(a => a.status === 'completed');
  const failed = agents.filter(a => a.status === 'failed');
  const total = completed.length + failed.length;
  const successRate = total > 0 ? (completed.length / total) * 100 : 0;

  const durations = completed
    .filter(a => a.completedAt)
    .map(a => new Date(a.completedAt!).getTime() - new Date(a.startedAt).getTime());
  const avgDuration = durations.length > 0 ? durations.reduce((s, d) => s + d, 0) / durations.length : 0;

  const totalTokensUsed = agents.reduce((s, a) => s + (a.tokens?.total || 0), 0);

  return { successRate, avgDuration, totalTokensUsed, totalCompleted: completed.length, totalFailed: failed.length };
}

function formatMs(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/* ─── Sub-components ─── */

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
        <span className="material-symbols-outlined text-primary" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        <span className="text-primary text-xs font-bold uppercase tracking-wider">Done</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="material-symbols-outlined text-red-400" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>error</span>
      <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Failed</span>
    </div>
  );
}

function SourceBadge({ source }: { source?: 'gateway' | 'local' }) {
  if (source === 'gateway') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-500/10 border border-zinc-500/20 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
      Local
    </span>
  );
}

function TokenBar({ tokens, contextTokens }: { tokens?: { input: number; output: number; total: number }; contextTokens?: number }) {
  if (!tokens || tokens.total === 0) return null;
  const pct = contextTokens && contextTokens > 0 ? Math.min(100, (tokens.total / contextTokens) * 100) : 0;
  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-foreground-muted uppercase tracking-wider">Context</span>
        <span className="text-foreground-muted font-mono">
          {formatTokens(tokens.total)} {contextTokens ? `/ ${formatTokens(contextTokens)}` : ''}
          {pct > 0 && <span className="ml-1 text-primary">{pct.toFixed(0)}%</span>}
        </span>
      </div>
      {contextTokens && contextTokens > 0 && (
        <div className="w-full h-1.5 bg-secondary-dark/60 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${pct}%`,
              background: pct > 80 ? 'linear-gradient(90deg, #ef4444, #f87171)' : pct > 60 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #fade29, #fde68a)',
              boxShadow: `0 0 8px ${pct > 80 ? 'rgba(239,68,68,0.3)' : pct > 60 ? 'rgba(245,158,11,0.3)' : 'rgba(250,222,41,0.3)'}`,
            }}
          />
        </div>
      )}
      <div className="flex gap-4 text-[10px] text-foreground-muted">
        <span>In: {formatTokens(tokens.input)}</span>
        <span>Out: {formatTokens(tokens.output)}</span>
      </div>
    </div>
  );
}

/* ─── Session Timeline Visualization ─── */
function SessionTimeline({ agent }: { agent: AgentEntry }) {
  const start = new Date(agent.startedAt).getTime();
  const end = agent.completedAt ? new Date(agent.completedAt).getTime() : Date.now();
  const duration = end - start;

  // Create timeline segments
  const segments = [];
  const segCount = 12;
  for (let i = 0; i < segCount; i++) {
    const segTime = start + (duration / segCount) * i;
    const isActive = agent.status === 'running' && i === segCount - 1;
    const opacity = 0.3 + (i / segCount) * 0.7;
    segments.push({ time: segTime, isActive, opacity });
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-[10px] text-foreground-muted mb-1.5">
        <span>{formatTime(agent.startedAt)}</span>
        <span>{agent.completedAt ? formatTime(agent.completedAt) : 'now'}</span>
      </div>
      <div className="flex gap-0.5 h-2">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm transition-all ${
              agent.status === 'failed' ? 'bg-red-500' :
              agent.status === 'completed' ? 'bg-primary' :
              seg.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-emerald-500'
            }`}
            style={{ opacity: seg.opacity }}
          />
        ))}
      </div>
      <div className="text-[10px] text-foreground-muted mt-1 font-mono">
        Duration: {formatDuration(agent.startedAt, agent.completedAt)}
      </div>
    </div>
  );
}

/* ─── Gateway Connection History ─── */
function GatewayHistory({ pings }: { pings: GatewayPing[] }) {
  if (pings.length === 0) return null;
  const last10 = pings.slice(-20);
  return (
    <div className="mt-3">
      <div className="text-[10px] text-foreground-muted uppercase tracking-wider mb-1.5">Connection History</div>
      <div className="flex gap-0.5 items-end h-4">
        {last10.map((p, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm ${p.reachable ? 'bg-emerald-500' : 'bg-red-400'}`}
            style={{ height: p.reachable ? '100%' : '40%', opacity: 0.4 + (i / last10.length) * 0.6 }}
            title={`${formatTime(p.time)} - ${p.reachable ? 'Connected' : 'Disconnected'}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] text-foreground-muted mt-1">
        <span>{last10.filter(p => p.reachable).length}/{last10.length} successful</span>
        <span>{formatTimeAgo(last10[last10.length - 1].time)}</span>
      </div>
    </div>
  );
}

/* ─── Model options ─── */
const MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
];

/* ─── Spawn Agent Modal ─── */
function SpawnModal({ open, onClose, onSpawn, spawning }: {
  open: boolean;
  onClose: () => void;
  onSpawn: (label: string, task: string, model: string) => void;
  spawning: boolean;
}) {
  const [label, setLabel] = useState('');
  const [task, setTask] = useState('');
  const [model, setModel] = useState(MODEL_OPTIONS[0].value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setLabel('');
      setTask('');
      setModel(MODEL_OPTIONS[0].value);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-bg-dark border border-primary/20 rounded-2xl p-6 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute -right-4 -top-4 size-24 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2 mb-5">
          <div className="size-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>add_circle</span>
          </div>
          <div>
            <h3 className="text-lg font-bold">Spawn Agent</h3>
            <p className="text-foreground-muted text-xs">Deploy a new sub-agent with a task</p>
          </div>
          <button onClick={onClose} className="ml-auto text-foreground-muted hover:text-foreground transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold block mb-1.5">Agent Label</label>
            <input
              ref={inputRef}
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Research Agent, Code Review..."
              className="w-full rounded-xl border border-primary/20 bg-card-dark px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/50 outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(250,222,41,0.1)] transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold block mb-1.5">Task / Message</label>
            <textarea
              value={task}
              onChange={e => setTask(e.target.value)}
              placeholder="Describe what this agent should do..."
              rows={3}
              className="w-full rounded-xl border border-primary/20 bg-card-dark px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/50 outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(250,222,41,0.1)] transition-all resize-none"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold block mb-1.5">Model</label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              className="inp"
            >
              {MODEL_OPTIONS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => onSpawn(label || 'Sub-Agent', task, model)}
            disabled={!task.trim() || spawning}
            className="w-full py-3 rounded-xl bg-primary text-bg-dark font-bold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_16px_rgba(250,222,41,0.2)]"
          >
            {spawning ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span>
                Spawning...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>rocket_launch</span>
                Deploy Agent
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Agent Detail Panel ─── */
function AgentDetail({ agent, onClose, onStop, onRestart, stopping }: {
  agent: AgentEntry;
  onClose: () => void;
  onStop: () => void;
  onRestart: () => void;
  stopping: boolean;
}) {
  const [logExpanded, setLogExpanded] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-bg-dark border border-primary/20 rounded-t-2xl sm:rounded-2xl p-6 max-h-[85vh] overflow-y-auto animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute -right-4 -top-4 size-24 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`size-12 rounded-xl flex items-center justify-center ${
              agent.status === 'running' ? 'bg-emerald-500/15 border border-emerald-500/30' :
              agent.status === 'failed' ? 'bg-red-500/15 border border-red-500/30' :
              'bg-primary/10 border border-primary/20'
            }`}>
              <span className={`material-symbols-outlined ${
                agent.status === 'running' ? 'text-emerald-400' :
                agent.status === 'failed' ? 'text-red-400' : 'text-primary'
              }`} style={{ fontSize: 26 }}>{getAgentIcon(agent)}</span>
            </div>
            <div>
              <h3 className="text-lg font-bold">{agent.label}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <StatusIndicator status={agent.status} />
                <SourceBadge source={agent.source} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-foreground-muted hover:text-foreground transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        {/* Summary */}
        <div className="mb-5 p-3 rounded-xl bg-card-dark/80 border border-border-subtle">
          <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold">Summary</span>
          <p className="text-sm text-zinc-300 mt-1 leading-relaxed">{agent.summary}</p>
        </div>

        {/* Agent Log Viewer */}
        <div className="mb-5">
          <button
            onClick={() => setLogExpanded(e => !e)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-card-dark/60 border border-border-subtle hover:border-primary/20 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary/60" style={{ fontSize: 16 }}>terminal</span>
              <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold">Agent Log</span>
            </div>
            <span className={`material-symbols-outlined text-foreground-muted transition-transform ${logExpanded ? 'rotate-180' : ''}`} style={{ fontSize: 16 }}>expand_more</span>
          </button>
          {logExpanded && (
            <div className="mt-2 p-3 rounded-xl bg-bg-dark border border-border-subtle font-mono text-xs animate-slide-up overflow-x-auto">
              <div className="space-y-1.5 text-zinc-400">
                <div className="flex gap-2">
                  <span className="text-foreground-muted shrink-0">[{formatTime(agent.startedAt)}]</span>
                  <span className="text-emerald-400">SPAWN</span>
                  <span>Agent &quot;{agent.label}&quot; initialized</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-foreground-muted shrink-0">[{formatTime(agent.startedAt)}]</span>
                  <span className="text-blue-400">MODEL</span>
                  <span>{agent.model}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-foreground-muted shrink-0">[{formatTime(agent.startedAt)}]</span>
                  <span className="text-primary">TASK</span>
                  <span className="text-zinc-300">{agent.summary}</span>
                </div>
                {agent.tokens && agent.tokens.total > 0 && (
                  <div className="flex gap-2">
                    <span className="text-foreground-muted shrink-0">[{formatTime(agent.lastUpdate)}]</span>
                    <span className="text-amber-400">TOKENS</span>
                    <span>in={formatTokens(agent.tokens.input)} out={formatTokens(agent.tokens.output)} total={formatTokens(agent.tokens.total)}</span>
                  </div>
                )}
                {agent.status === 'completed' && agent.completedAt && (
                  <div className="flex gap-2">
                    <span className="text-foreground-muted shrink-0">[{formatTime(agent.completedAt)}]</span>
                    <span className="text-emerald-400">DONE</span>
                    <span>Completed in {formatDuration(agent.startedAt, agent.completedAt)}</span>
                  </div>
                )}
                {agent.status === 'failed' && (
                  <div className="flex gap-2">
                    <span className="text-foreground-muted shrink-0">[{formatTime(agent.lastUpdate)}]</span>
                    <span className="text-red-400">FAIL</span>
                    <span>Agent encountered an error</span>
                  </div>
                )}
                {agent.status === 'running' && (
                  <div className="flex gap-2">
                    <span className="text-foreground-muted shrink-0">[{formatTime(agent.lastUpdate)}]</span>
                    <span className="text-emerald-400 animate-pulse">ACTIVE</span>
                    <span>Processing... ({formatDuration(agent.startedAt)} elapsed)</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-3 rounded-xl bg-card-dark/60 border border-border-subtle">
            <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold">Model</span>
            <p className="text-sm text-zinc-300 mt-0.5 font-mono">{agent.model}</p>
          </div>
          <div className="p-3 rounded-xl bg-card-dark/60 border border-border-subtle">
            <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold">Duration</span>
            <p className="text-sm text-zinc-300 mt-0.5 font-mono">{formatDuration(agent.startedAt, agent.completedAt)}</p>
          </div>
          <div className="p-3 rounded-xl bg-card-dark/60 border border-border-subtle">
            <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold">Type</span>
            <p className="text-sm text-zinc-300 mt-0.5">{getAgentTypeLabel(agent)}</p>
          </div>
          <div className="p-3 rounded-xl bg-card-dark/60 border border-border-subtle">
            <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold">Last Update</span>
            <p className="text-sm text-zinc-300 mt-0.5">{formatTimeAgo(agent.lastUpdate)}</p>
          </div>
        </div>

        {/* Session ID */}
        <div className="mb-5 p-3 rounded-xl bg-card-dark/60 border border-border-subtle">
          <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold">Session Key</span>
          <p className="text-[11px] text-zinc-500 mt-0.5 font-mono break-all">{agent.sessionKey || agent.id}</p>
        </div>

        {/* Token Usage */}
        <TokenBar tokens={agent.tokens} contextTokens={agent.contextTokens} />

        {/* Session Timeline */}
        <SessionTimeline agent={agent} />

        {/* Controls */}
        <div className="flex gap-2 mt-5 pt-4 border-t border-border-subtle">
          {agent.status === 'running' && (
            <button
              onClick={onStop}
              disabled={stopping}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 transition-all disabled:opacity-30"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>stop_circle</span>
              {stopping ? 'Stopping...' : 'Stop'}
            </button>
          )}
          {(agent.status === 'completed' || agent.status === 'failed') && (
            <button
              onClick={onRestart}
              disabled={stopping}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm font-bold hover:bg-primary/20 transition-all disabled:opacity-30"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>restart_alt</span>
              Restart
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-card-dark border border-border-subtle text-foreground-muted text-sm font-bold hover:text-foreground hover:border-primary/20 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Collapsible Status Section ─── */
function StatusSection({ title, icon, iconColor, count, children, defaultOpen = true }: {
  title: string;
  icon: string;
  iconColor: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 mt-6 mb-3 group"
      >
        <span className={`material-symbols-outlined ${iconColor}`} style={{ fontSize: 16 }}>{icon}</span>
        <span className="text-foreground-muted text-xs font-bold uppercase tracking-widest">{title}</span>
        <span className="text-[10px] font-bold text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full">{count}</span>
        <div className="h-px flex-1 bg-border-subtle" />
        <span className={`material-symbols-outlined text-foreground-muted transition-transform ${open ? 'rotate-180' : ''}`} style={{ fontSize: 16 }}>expand_more</span>
      </button>
      {open && <div className="space-y-3">{children}</div>}
    </div>
  );
}

/* ─── Agent Card (shared) ─── */
function AgentCard({ agent, onClick, variant, onStop }: {
  agent: AgentEntry;
  onClick: () => void;
  variant: 'running' | 'completed' | 'failed';
  onStop?: () => void;
}) {
  const borderCls = variant === 'running' ? 'border-emerald-500/20' : variant === 'failed' ? 'border-red-500/20' : 'border-primary/10';
  const bgCls = variant === 'running'
    ? 'bg-gradient-to-br from-secondary-dark/80 to-bg-dark'
    : variant === 'failed' ? 'bg-red-500/5' : 'bg-secondary-dark/40';
  const glowCls = variant === 'running' ? 'bg-emerald-500/10' : variant === 'failed' ? 'bg-red-500/10' : '';
  const iconColor = variant === 'running' ? 'text-emerald-400' : variant === 'failed' ? 'text-red-400' : 'text-primary';
  const iconBgCls = variant === 'running' ? 'bg-emerald-500/15 border-emerald-500/30' : variant === 'failed' ? 'bg-red-500/10 border-red-500/20' : 'bg-primary/10 border-primary/20';

  return (
    <div
      onClick={onClick}
      className={`relative ${bgCls} rounded-xl p-5 border ${borderCls} overflow-hidden cursor-pointer card-hover ${variant === 'running' ? 'scan-line' : ''}`}
      style={variant === 'running' ? { boxShadow: '0 0 20px rgba(16,185,129,0.06)', contain: 'layout style' } : { contain: 'layout style' }}
    >
      {glowCls && <div className={`absolute -right-6 -top-6 size-20 ${glowCls} rounded-full blur-2xl`} />}

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-lg ${iconBgCls} border flex items-center justify-center`}>
              <span className={`material-symbols-outlined ${iconColor}`} style={{ fontSize: 22 }}>{getAgentIcon(agent)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-base leading-tight">{agent.label}</h3>
                <SourceBadge source={agent.source} />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-foreground-muted text-xs font-mono">{agent.sessionKey || agent.id}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-card-dark text-foreground-muted border border-border-subtle">{getAgentTypeLabel(agent)}</span>
              </div>
            </div>
          </div>
          <StatusIndicator status={agent.status} />
        </div>

        <p className={`${variant === 'running' ? 'text-zinc-300' : 'text-zinc-400'} text-sm leading-relaxed mb-4`}>{agent.summary}</p>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary/60" style={{ fontSize: 14 }}>timer</span>
            <span className={`${variant === 'running' ? 'text-primary/80' : 'text-foreground-muted'} font-mono font-bold`}>{formatDuration(agent.startedAt, agent.completedAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary/60" style={{ fontSize: 14 }}>memory</span>
            <span className="text-foreground-muted">{agent.model}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary/60" style={{ fontSize: 14 }}>schedule</span>
            <span className="text-foreground-muted">{formatTimeAgo(agent.lastUpdate)}</span>
          </div>
        </div>

        <TokenBar tokens={agent.tokens} contextTokens={agent.contextTokens} />

        {/* Inline stop for running agents */}
        {variant === 'running' && onStop && (
          <div className="mt-3 pt-3 border-t border-border-subtle">
            <button
              onClick={e => { e.stopPropagation(); onStop(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>stop_circle</span>
              Stop Agent
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [gwStatus, setGwStatus] = useState<GatewayStatus | null>(null);
  const [gwPings, setGwPings] = useState<GatewayPing[]>([]);
  const [, setTick] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<AgentEntry | null>(null);
  const [spawnOpen, setSpawnOpen] = useState(false);
  const [spawning, setSpawning] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [groupByType, setGroupByType] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<number>(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
        setLastFetchedAt(Date.now());
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  const fetchGatewayStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/gateway', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setGwStatus(data);
        setGwPings(prev => [...prev.slice(-19), { time: new Date().toISOString(), reachable: data.reachable }]);
      }
    } catch {
      setGwStatus({ bridge: 'offline', reachable: false, mode: 'fallback' });
      setGwPings(prev => [...prev.slice(-19), { time: new Date().toISOString(), reachable: false }]);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    fetchGatewayStatus();
    const agentInterval = setInterval(fetchAgents, 10000);
    const gwInterval = setInterval(fetchGatewayStatus, 30000);
    return () => { clearInterval(agentInterval); clearInterval(gwInterval); };
  }, [fetchAgents, fetchGatewayStatus]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
      setSecondsAgo(Math.floor((Date.now() - lastFetchedAt) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastFetchedAt]);

  /* ─── Derived ─── */
  const running = useMemo(() => agents.filter(a => a.status === 'running'), [agents]);
  const completed = useMemo(() => agents.filter(a => a.status === 'completed'), [agents]);
  const failed = useMemo(() => agents.filter(a => a.status === 'failed'), [agents]);
  const metrics = useMemo(() => computeMetrics(agents), [agents]);

  /* ─── Grouped by type ─── */
  const typeGroups = useMemo(() => {
    const map = new Map<string, AgentEntry[]>();
    for (const a of agents) {
      const t = getAgentTypeLabel(a);
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(a);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [agents]);

  /* ─── Actions ─── */
  const handleSpawn = async (label: string, task: string, model: string) => {
    setSpawning(true);
    try {
      // Dispatch via command API
      const cmdRes = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: `[${label}] ${task}` }),
      });
      // Also register the agent locally
      await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `agent-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          label,
          status: 'running',
          model,
          startedAt: new Date().toISOString(),
          lastUpdate: new Date().toISOString(),
          summary: task,
        }),
      });
      if (cmdRes.ok) {
        setSpawnOpen(false);
        await fetchAgents();
      }
    } catch { /* silent */ } finally {
      setSpawning(false);
    }
  };

  const handleStop = async (agent: AgentEntry) => {
    setStopping(true);
    try {
      await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: agent.id, status: 'completed', completedAt: new Date().toISOString(), lastUpdate: new Date().toISOString() }),
      });
      setSelectedAgent(null);
      await fetchAgents();
    } catch { /* silent */ } finally {
      setStopping(false);
    }
  };

  const handleRestart = async (agent: AgentEntry) => {
    setStopping(true);
    try {
      await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: agent.id, status: 'running', lastUpdate: new Date().toISOString(), completedAt: undefined }),
      });
      setSelectedAgent(null);
      await fetchAgents();
    } catch { /* silent */ } finally {
      setStopping(false);
    }
  };

  /* ─── Render ─── */
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
            {/* Gateway Status with quality indicator */}
            {gwStatus && (
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${
                  gwStatus.reachable
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : gwStatus.mode === 'fallback'
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
                title={gwPings.length > 0 ? `Last checked: ${formatTime(gwPings[gwPings.length - 1].time)}` : 'Checking...'}
              >
                <div className="relative">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    gwStatus.reachable ? 'bg-emerald-500' : gwStatus.mode === 'fallback' ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  {gwStatus.reachable && <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping opacity-75" />}
                </div>
                <span>{gwStatus.reachable ? 'Gateway' : gwStatus.mode === 'fallback' ? 'Fallback' : 'Offline'}</span>
                {gwPings.length > 0 && (
                  <span className="opacity-60 normal-case" suppressHydrationWarning>{formatTime(gwPings[gwPings.length - 1].time)}</span>
                )}
              </div>
            )}
            {/* Active count */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                {running.length > 0 && <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />}
              </div>
              <span className="text-emerald-400 text-xs font-bold">{running.length} Active</span>
            </div>
            {/* Spawn button */}
            <button
              onClick={() => setSpawnOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>add_circle</span>
              <span className="text-primary text-xs font-bold">Spawn</span>
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary-dark/40 border border-primary/10 hover:bg-secondary-dark/60 transition-all cursor-default">
            <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: 18 }}>play_circle</span>
            <span className="text-white text-sm font-bold">{running.length}</span>
            <span className="text-foreground-muted text-xs">Running</span>
          </div>
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary-dark/40 border border-primary/10 hover:bg-secondary-dark/60 transition-all cursor-default">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>check_circle</span>
            <span className="text-white text-sm font-bold">{completed.length}</span>
            <span className="text-foreground-muted text-xs">Done</span>
          </div>
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary-dark/40 border border-primary/10 hover:bg-secondary-dark/60 transition-all cursor-default">
            <span className="material-symbols-outlined text-red-400" style={{ fontSize: 18 }}>error</span>
            <span className="text-white text-sm font-bold">{failed.length}</span>
            <span className="text-foreground-muted text-xs">Failed</span>
          </div>
        </div>

        {/* View toggles + auto-refresh indicator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGroupByType(g => !g)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              groupByType ? 'bg-primary text-bg-dark' : 'bg-card-dark text-foreground-muted hover:text-foreground'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>category</span>
            Group by Type
          </button>
          <button
            onClick={() => setShowMetrics(m => !m)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              showMetrics ? 'bg-primary text-bg-dark' : 'bg-card-dark text-foreground-muted hover:text-foreground'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>monitoring</span>
            Metrics
          </button>
          {/* Auto-refresh indicator */}
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-foreground-muted" suppressHydrationWarning>
            <span className={`material-symbols-outlined ${secondsAgo < 3 ? 'text-emerald-400' : 'text-foreground-muted'}`} style={{ fontSize: 12 }}>sync</span>
            <span>{secondsAgo < 3 ? 'Just updated' : `${secondsAgo}s ago`}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 pb-32 space-y-4">
        {/* Live Agents Status */}
        <LiveAgents />

        {/* Performance Metrics Panel */}
        {showMetrics && agents.length > 0 && (
          <div className="rounded-xl border border-primary/15 bg-gradient-to-br from-secondary-dark/60 to-bg-dark p-5 animate-slide-up">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>monitoring</span>
              <h3 className="text-sm font-bold text-primary uppercase tracking-wide">Fleet Metrics</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-card-dark/60 border border-border-subtle text-center">
                <div className="text-2xl font-bold text-primary">{metrics.successRate.toFixed(0)}%</div>
                <div className="text-[10px] text-foreground-muted uppercase tracking-wider mt-1">Success Rate</div>
              </div>
              <div className="p-3 rounded-lg bg-card-dark/60 border border-border-subtle text-center">
                <div className="text-2xl font-bold text-foreground">{metrics.avgDuration > 0 ? formatMs(metrics.avgDuration) : '--'}</div>
                <div className="text-[10px] text-foreground-muted uppercase tracking-wider mt-1">Avg Duration</div>
              </div>
              <div className="p-3 rounded-lg bg-card-dark/60 border border-border-subtle text-center">
                <div className="text-2xl font-bold text-foreground">{formatTokens(metrics.totalTokensUsed)}</div>
                <div className="text-[10px] text-foreground-muted uppercase tracking-wider mt-1">Total Tokens</div>
              </div>
              <div className="p-3 rounded-lg bg-card-dark/60 border border-border-subtle text-center">
                <div className="text-2xl font-bold text-foreground">{agents.length}</div>
                <div className="text-[10px] text-foreground-muted uppercase tracking-wider mt-1">Total Agents</div>
              </div>
            </div>

            {/* Gateway Connection History */}
            <GatewayHistory pings={gwPings} />
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative size-12 mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
              <div className="absolute inset-2 rounded-full border border-transparent border-t-primary/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            </div>
            <p className="text-foreground-muted text-sm">Loading agents...</p>
          </div>
        ) : agents.length === 0 ? (
          /* ─── Empty State ─── */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative mb-6">
              <div className="size-20 rounded-full bg-secondary-dark/30 border border-primary/10 flex items-center justify-center animate-breathe">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 36 }}>smart_toy</span>
              </div>
              <div className="absolute -inset-3 rounded-full bg-primary/5 blur-xl -z-10" />
            </div>
            <h3 className="text-lg font-bold mb-2">No Agents</h3>
            <p className="text-foreground-muted text-sm text-center max-w-xs leading-relaxed">
              {gwStatus?.reachable
                ? 'No active sessions on the gateway. Spawn an agent to get started.'
                : 'Gateway offline. Spawn an agent or issue a command to begin.'}
            </p>
            <button
              onClick={() => setSpawnOpen(true)}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold hover:bg-primary/20 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add_circle</span>
              Spawn Agent
            </button>
          </div>
        ) : groupByType ? (
          /* ─── Grouped by Type View ─── */
          <div className="space-y-6">
            {typeGroups.map(([type, typeAgents]) => (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] uppercase tracking-[0.15em] font-bold text-primary/70">{type}</span>
                  <div className="h-px flex-1 bg-primary/10" />
                  <span className="text-[10px] text-foreground-muted font-medium bg-card-dark px-2 py-0.5 rounded-full">{typeAgents.length}</span>
                </div>
                <div className="space-y-3">
                  {typeAgents.map(agent => (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      variant={agent.status}
                      onClick={() => setSelectedAgent(agent)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ─── Default Status View (collapsible sections) ─── */
          <>
            <StatusSection title="Running" icon="play_circle" iconColor="text-emerald-400" count={running.length} defaultOpen={true}>
              {running.map(agent => (
                <AgentCard key={agent.id} agent={agent} variant="running" onClick={() => setSelectedAgent(agent)} onStop={() => handleStop(agent)} />
              ))}
            </StatusSection>

            <StatusSection title="Completed" icon="check_circle" iconColor="text-primary" count={completed.length} defaultOpen={true}>
              {completed.map(agent => (
                <AgentCard key={agent.id} agent={agent} variant="completed" onClick={() => setSelectedAgent(agent)} />
              ))}
            </StatusSection>

            <StatusSection title="Failed" icon="error" iconColor="text-red-400" count={failed.length} defaultOpen={true}>
              {failed.map(agent => (
                <AgentCard key={agent.id} agent={agent} variant="failed" onClick={() => setSelectedAgent(agent)} />
              ))}
            </StatusSection>
          </>
        )}
      </main>

      {/* Spawn Modal */}
      <SpawnModal
        open={spawnOpen}
        onClose={() => setSpawnOpen(false)}
        onSpawn={handleSpawn}
        spawning={spawning}
      />

      {/* Agent Detail Panel */}
      {selectedAgent && (
        <AgentDetail
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onStop={() => handleStop(selectedAgent)}
          onRestart={() => handleRestart(selectedAgent)}
          stopping={stopping}
        />
      )}
    </div>
  );
}
