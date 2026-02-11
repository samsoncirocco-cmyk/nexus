'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';

/* ─── Greeting (uses local timezone) ─── */
export function Greeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  return (
    <h2 className="text-primary text-xl font-bold leading-tight tracking-tight">
      {greeting ? `${greeting}, ${name}` : <span className="skeleton inline-block w-48 h-6" />}
    </h2>
  );
}

/* ─── Live Clock ─── */
export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <div className="skeleton w-32 h-4 rounded" />;
  }

  const time = now.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const date = now.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex items-center gap-3 animate-fade-in" suppressHydrationWarning>
      <div className="text-right">
        <p className="text-primary font-display text-sm font-bold tracking-tight tabular-nums" suppressHydrationWarning>
          {time}
        </p>
        <p className="text-primary/40 text-[10px] font-medium uppercase tracking-wider" suppressHydrationWarning>
          {date}
        </p>
      </div>
    </div>
  );
}

/* ─── Animated Count-Up Number ─── */
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    if (target === 0) { setValue(0); return; }

    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return { value, ref };
}

export function CountUpNumber({ target, className }: { target: number; className?: string }) {
  const { value, ref } = useCountUp(target);
  return (
    <span ref={ref} className={`animate-count-up ${className || ''}`}>
      {value}
    </span>
  );
}

/* ─── Keyboard Shortcut Hint ─── */
export function KeyboardHint() {
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(navigator.platform?.toLowerCase().includes('mac') ?? true);
  }, []);

  return (
    <div className="flex items-center gap-1.5 text-primary/30 text-[10px] font-medium uppercase tracking-wider mt-2">
      <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/5 border border-primary/10 text-primary/40 font-display text-[10px]">
        {isMac ? '⌘' : 'Ctrl'}
      </kbd>
      <span>+</span>
      <kbd className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/5 border border-primary/10 text-primary/40 font-display text-[10px]">
        K
      </kbd>
      <span className="ml-1">Quick Command</span>
    </div>
  );
}

/* ─── Status Summary Line ─── */
export function StatusSummary({
  agentsRunning,
  tasksActive,
  commandsPending,
}: {
  agentsRunning: number;
  tasksActive: number;
  commandsPending: number;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap text-[11px] font-medium text-primary/50 px-6 -mt-1 mb-3 animate-slide-up delay-3">
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-emerald-500 animate-status-dot" />
        {agentsRunning} agent{agentsRunning !== 1 ? 's' : ''} running
      </span>
      <span className="text-primary/20">·</span>
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-blue-400 animate-status-dot" style={{ animationDelay: '0.3s' }} />
        {tasksActive} task{tasksActive !== 1 ? 's' : ''} in progress
      </span>
      <span className="text-primary/20">·</span>
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-amber-400 animate-status-dot" style={{ animationDelay: '0.6s' }} />
        {commandsPending} pending command{commandsPending !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

/* ─── Neural Network SVG (animated) ─── */
export function NeuralNetworkSVG() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.10]"
      viewBox="0 0 400 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Layer 1 - input nodes */}
      <circle cx="30" cy="25" r="3" fill="var(--color-primary)" className="animate-neural-node" />
      <circle cx="30" cy="60" r="3" fill="var(--color-primary)" className="animate-neural-node" style={{ animationDelay: '0.5s' }} />
      <circle cx="30" cy="95" r="3" fill="var(--color-primary)" className="animate-neural-node" style={{ animationDelay: '1s' }} />

      {/* Layer 2 - hidden nodes */}
      <circle cx="120" cy="20" r="2.5" fill="var(--color-primary)" className="animate-neural-node" style={{ animationDelay: '0.3s' }} />
      <circle cx="120" cy="45" r="2.5" fill="var(--color-primary)" className="animate-neural-node" style={{ animationDelay: '0.8s' }} />
      <circle cx="120" cy="70" r="2.5" fill="var(--color-primary)" className="animate-neural-node" style={{ animationDelay: '1.3s' }} />
      <circle cx="120" cy="95" r="2.5" fill="var(--color-primary)" className="animate-neural-node" style={{ animationDelay: '0.6s' }} />

      {/* Layer 3 - hidden nodes */}
      <circle cx="210" cy="30" r="3" fill="var(--color-primary)" className="animate-neural-node" style={{ animationDelay: '0.2s' }} />
      <circle cx="210" cy="60" r="3" fill="var(--color-primary)" className="animate-neural-node" style={{ animationDelay: '0.7s' }} />
      <circle cx="210" cy="90" r="3" fill="var(--color-primary)" className="animate-neural-node" style={{ animationDelay: '1.2s' }} />

      {/* Layer 4 - hidden nodes */}
      <circle cx="300" cy="25" r="2.5" fill="var(--color-primary)" className="animate-neural-node" style={{ animationDelay: '0.4s' }} />
      <circle cx="300" cy="55" r="2.5" fill="var(--color-primary)" className="animate-neural-node" style={{ animationDelay: '0.9s' }} />
      <circle cx="300" cy="85" r="2.5" fill="var(--color-primary)" className="animate-neural-node" style={{ animationDelay: '1.4s' }} />

      {/* Layer 5 - output nodes */}
      <circle cx="370" cy="40" r="3.5" fill="var(--color-primary)" className="animate-neural-node" style={{ animationDelay: '0.1s' }} />
      <circle cx="370" cy="80" r="3.5" fill="var(--color-primary)" className="animate-neural-node" style={{ animationDelay: '0.6s' }} />

      {/* Layer 1 -> 2 connections */}
      <line x1="30" y1="25" x2="120" y2="20" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" />
      <line x1="30" y1="25" x2="120" y2="45" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '0.2s' }} />
      <line x1="30" y1="60" x2="120" y2="45" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '0.4s' }} />
      <line x1="30" y1="60" x2="120" y2="70" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '0.6s' }} />
      <line x1="30" y1="95" x2="120" y2="70" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '0.8s' }} />
      <line x1="30" y1="95" x2="120" y2="95" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '1s' }} />

      {/* Layer 2 -> 3 connections */}
      <line x1="120" y1="20" x2="210" y2="30" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '0.3s' }} />
      <line x1="120" y1="45" x2="210" y2="30" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '0.5s' }} />
      <line x1="120" y1="45" x2="210" y2="60" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '0.7s' }} />
      <line x1="120" y1="70" x2="210" y2="60" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '0.9s' }} />
      <line x1="120" y1="70" x2="210" y2="90" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '1.1s' }} />
      <line x1="120" y1="95" x2="210" y2="90" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '1.3s' }} />

      {/* Layer 3 -> 4 connections */}
      <line x1="210" y1="30" x2="300" y2="25" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '0.4s' }} />
      <line x1="210" y1="30" x2="300" y2="55" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '0.6s' }} />
      <line x1="210" y1="60" x2="300" y2="55" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '0.8s' }} />
      <line x1="210" y1="60" x2="300" y2="85" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '1s' }} />
      <line x1="210" y1="90" x2="300" y2="85" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '1.2s' }} />

      {/* Layer 4 -> 5 connections */}
      <line x1="300" y1="25" x2="370" y2="40" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '0.5s' }} />
      <line x1="300" y1="55" x2="370" y2="40" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '0.7s' }} />
      <line x1="300" y1="55" x2="370" y2="80" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '0.9s' }} />
      <line x1="300" y1="85" x2="370" y2="80" stroke="var(--color-primary)" strokeWidth="0.6" className="animate-neural-pulse" style={{ animationDelay: '1.1s' }} />

      {/* Animated data flow paths */}
      <path
        d="M30,25 C75,22 75,20 120,20 C165,20 165,30 210,30 C255,28 255,25 300,25 C345,30 345,40 370,40"
        stroke="var(--color-primary)"
        strokeWidth="1"
        strokeDasharray="4 4"
        fill="none"
        opacity="0.3"
        className="animate-dash-flow"
      />
      <path
        d="M30,95 C75,95 75,95 120,95 C165,92 165,90 210,90 C255,87 255,85 300,85 C345,82 345,80 370,80"
        stroke="var(--color-primary)"
        strokeWidth="1"
        strokeDasharray="4 4"
        fill="none"
        opacity="0.3"
        className="animate-dash-flow"
        style={{ animationDelay: '1s' }}
      />
    </svg>
  );
}

/* ─── Skeleton Card ─── */
export function SkeletonStatCard() {
  return (
    <div className="flex flex-col gap-2 rounded-xl p-4 bg-gradient-to-br from-secondary-dark to-secondary-dark/60 border border-primary/10 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="skeleton size-6 rounded" />
        <div className="skeleton w-12 h-3 rounded" />
      </div>
      <div className="skeleton w-16 h-8 rounded mt-1" />
      <div className="skeleton w-20 h-3 rounded" />
    </div>
  );
}

export function SkeletonActivityCard() {
  return (
    <div className="flex items-center gap-4 border px-4 py-4 rounded-xl bg-secondary-dark/40 border-primary/5">
      <div className="skeleton size-11 rounded-lg shrink-0" />
      <div className="flex flex-col gap-2 flex-1">
        <div className="skeleton w-3/4 h-4 rounded" />
        <div className="skeleton w-1/2 h-3 rounded" />
      </div>
      <div className="skeleton w-12 h-3 rounded shrink-0" />
    </div>
  );
}

/* ─── Sparkline Mini-Chart ─── */
export function Sparkline({
  data,
  color = 'var(--color-primary)',
  width = 64,
  height = 24,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = padding + ((max - v) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const linePath = `M${points.join(' L')}`;
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 opacity-60 group-hover:opacity-100 transition-opacity"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`sparkGrad-${color.replace(/[^a-z0-9]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#sparkGrad-${color.replace(/[^a-z0-9]/gi, '')})`}
      />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={width}
        cy={padding + ((max - data[data.length - 1]) / range) * (height - padding * 2)}
        r="2"
        fill={color}
      />
    </svg>
  );
}

/* ─── Datalake Events Badge ─── */
export function DatalakeEventsBadge({
  count,
  sourceCounts,
}: {
  count: number;
  sourceCounts: Record<string, number>;
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const sourceLabels = Object.entries(sourceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([src, n]) => `${n} ${src}`)
    .join(', ');

  return (
    <span
      className="relative cursor-default"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/20 text-blue-300 text-[9px] font-bold">
        <span className="material-symbols-outlined" style={{ fontSize: 10 }}>cloud</span>
        +{count}
      </span>
      {showTooltip && sourceLabels && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded-lg bg-bg-dark border border-primary/20 text-primary/70 text-[10px] whitespace-nowrap shadow-lg z-20">
          Today: {sourceLabels}
        </span>
      )}
    </span>
  );
}

/* ─── AI Insights Card ─── */
const insightTypeIcons: Record<string, string> = {
  pattern_detection: 'pattern',
  sentiment: 'mood',
  classification: 'category',
  summarization: 'summarize',
  extraction: 'data_object',
};

const observationTypeIcons: Record<string, string> = {
  status_change: 'swap_horiz',
  anomaly: 'error_outline',
  trend: 'trending_up',
  milestone: 'flag',
};

export function InsightsCard({
  analyses,
  observations,
}: {
  analyses: Record<string, unknown>[];
  observations: Record<string, unknown>[];
}) {
  const [expanded, setExpanded] = useState(false);
  const total = analyses.length + observations.length;

  if (total === 0) return null;

  const visibleAnalyses = expanded ? analyses : analyses.slice(0, 2);
  const visibleObservations = expanded ? observations : observations.slice(0, 2);

  return (
    <div className="px-6 mb-6 animate-slide-up delay-4">
      <div className="bg-gradient-to-br from-purple-900/20 to-bg-dark rounded-xl p-5 border border-purple-500/15 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 size-24 bg-purple-500/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400" style={{ fontSize: 20 }}>neurology</span>
              <h4 className="text-purple-400 font-bold text-sm uppercase tracking-wider">AI Insights</h4>
              <span className="text-purple-400/50 text-xs">({total})</span>
            </div>
            {total > 2 && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-purple-400/60 text-xs font-bold uppercase tracking-wider hover:text-purple-400 transition-colors"
              >
                {expanded ? 'Show less' : 'Show all'}
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {visibleAnalyses.map((a, i) => {
              const analysisType = String(a.analysis_type || 'analysis');
              const icon = insightTypeIcons[analysisType] || 'psychology';
              const confidence = typeof a.confidence === 'number' ? Math.round(a.confidence * 100) : null;
              return (
                <div
                  key={String(a.analysis_id || i)}
                  className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10"
                >
                  <div className="flex items-center justify-center size-8 rounded-lg bg-purple-500/10 border border-purple-500/15 shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-purple-400" style={{ fontSize: 16 }}>{icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white text-xs font-semibold truncate">
                        {String(a.input_summary || analysisType).slice(0, 80)}
                      </p>
                      {confidence !== null && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-[9px] font-bold">
                          {confidence}%
                        </span>
                      )}
                    </div>
                    <p className="text-purple-300/50 text-[11px] truncate">
                      {String(a.output_raw || '').slice(0, 120)}
                    </p>
                  </div>
                </div>
              );
            })}

            {visibleObservations.map((o, i) => {
              const obsType = String(o.observation_type || 'observation');
              const icon = observationTypeIcons[obsType] || 'visibility';
              const confidence = typeof o.confidence === 'number' ? Math.round(o.confidence * 100) : null;
              return (
                <div
                  key={String(o.observation_id || `obs-${i}`)}
                  className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10"
                >
                  <div className="flex items-center justify-center size-8 rounded-lg bg-blue-500/10 border border-blue-500/15 shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 16 }}>{icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white text-xs font-semibold truncate">
                        {String(o.entity_type || '')} {String(o.entity_id || '')}
                      </p>
                      <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 text-[9px] font-bold uppercase">
                        {obsType.replace(/_/g, ' ')}
                      </span>
                      {confidence !== null && (
                        <span className="shrink-0 text-blue-300/40 text-[9px] font-bold">
                          {confidence}%
                        </span>
                      )}
                    </div>
                    <p className="text-blue-300/50 text-[11px] truncate">
                      {String(o.value || '').slice(0, 120)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Quick Actions FAB (Mobile) ─── */
const FAB_ACTIONS = [
  { href: '/doc/new', icon: 'note_add', label: 'New Doc' },
  { href: '/chat', icon: 'chat_bubble', label: 'Chat' },
  { href: '/commands', icon: 'bolt', label: 'Command' },
  { href: '/ask', icon: 'neurology', label: 'Ask Brain' },
  { href: '/tasks', icon: 'add_task', label: 'New Task' },
];

export function QuickActionsFAB() {
  const [open, setOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, handleClose]);

  return (
    <div ref={fabRef} className="fixed bottom-24 right-5 z-50 sm:hidden">
      {/* Expanded action buttons */}
      {open && (
        <div className="absolute bottom-16 right-0 flex flex-col-reverse gap-3 mb-2 animate-fade-in">
          {FAB_ACTIONS.map((action, i) => (
            <Link
              key={action.href}
              href={action.href}
              onClick={handleClose}
              className="flex items-center gap-2 animate-slide-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="text-primary/70 text-xs font-bold uppercase tracking-wider whitespace-nowrap bg-bg-dark/90 border border-primary/10 rounded-lg px-2.5 py-1.5 shadow-lg">
                {action.label}
              </span>
              <div className="size-11 rounded-full bg-secondary-dark border border-primary/20 flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                  {action.icon}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`size-14 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(250,222,41,0.25)] transition-all active:scale-90 ${
          open
            ? 'bg-primary/80 rotate-45'
            : 'bg-primary hover:shadow-[0_4px_30px_rgba(250,222,41,0.4)]'
        }`}
        aria-label={open ? 'Close quick actions' : 'Open quick actions'}
      >
        <span className="material-symbols-outlined text-bg-dark transition-transform" style={{ fontSize: 26 }}>
          {open ? 'close' : 'add'}
        </span>
      </button>
    </div>
  );
}
