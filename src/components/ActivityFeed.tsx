'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { format, isToday, isYesterday, differenceInDays } from 'date-fns';
import Link from 'next/link';
import CommandBar from '@/components/CommandBar';
import RelatedNotes from '@/components/RelatedNotes';

/* ─── Types ─── */
interface ActivityEntry {
  id: string;
  timestamp: string;
  agent: string;
  type: 'completed' | 'started' | 'alert' | 'note' | 'command' | string;
  title: string;
  summary: string;
  output?: string[];
  tags: string[];
  status: 'done' | 'in-progress' | 'failed' | 'info';
  source?: 'vault' | 'gmail' | 'drive' | 'calendar';
}

/* ─── Source badge config ─── */
const SOURCE_BADGES: Record<string, { icon: string; label: string; cls: string }> = {
  gmail: { icon: 'mail', label: 'Gmail', cls: 'bg-red-500/15 text-red-400 border-red-500/30' },
  drive: { icon: 'folder', label: 'Drive', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  calendar: { icon: 'calendar_month', label: 'Calendar', cls: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
};

/* ─── Helpers (preserved from original) ─── */
function getAgentBadge(agent: string, type?: string) {
  if (type === 'command') {
    return { label: 'COMMAND', borderColor: 'border-primary', dotColor: 'bg-primary', bgColor: 'bg-primary/15', textColor: 'text-primary' };
  }
  const a = agent.toLowerCase();
  if (a.includes('samson'))
    return { label: 'SAMSON', borderColor: 'border-primary', dotColor: 'bg-primary', bgColor: 'bg-primary/15', textColor: 'text-primary' };
  if (a.includes('workhorse') || a.includes('paul'))
    return { label: a.includes('paul') ? 'PAUL' : 'WORKHORSE', borderColor: 'border-primary', dotColor: 'bg-primary', bgColor: 'bg-secondary-dark', textColor: 'text-emerald-400' };
  if (a.includes('system'))
    return { label: 'SYSTEM', borderColor: 'border-emerald-500', dotColor: 'bg-emerald-500', bgColor: 'bg-card-dark', textColor: 'text-zinc-400' };
  return { label: agent.toUpperCase(), borderColor: 'border-zinc-700', dotColor: 'bg-zinc-700', bgColor: 'bg-card-dark', textColor: 'text-zinc-400' };
}

function getActionVerb(type: string): string {
  switch (type) {
    case 'completed': return 'COMPLETED';
    case 'started': return 'INITIATED';
    case 'alert': return 'FLAGGED';
    case 'note': return 'LOGGED';
    case 'command': return 'COMMANDED';
    default: return 'PROCESSED';
  }
}

function getCommandStatusBadge(status?: string) {
  if (!status) return null;
  switch (status) {
    case 'pending':
      return { label: 'PENDING', cls: 'bg-primary/15 text-primary border-primary/30' };
    case 'processing':
      return { label: 'PROCESSING', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
    case 'done':
      return { label: 'DONE', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    default:
      return null;
  }
}

/* ─── Date grouping ─── */
type DateGroup = 'Today' | 'Yesterday' | 'This Week' | 'Earlier';

function getDateGroup(timestamp: string): DateGroup {
  const d = new Date(timestamp);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (differenceInDays(new Date(), d) <= 7) return 'This Week';
  return 'Earlier';
}

function groupByDate(entries: ActivityEntry[]): { group: DateGroup; entries: ActivityEntry[] }[] {
  const order: DateGroup[] = ['Today', 'Yesterday', 'This Week', 'Earlier'];
  const map = new Map<DateGroup, ActivityEntry[]>();
  for (const e of entries) {
    const g = getDateGroup(e.timestamp);
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(e);
  }
  return order.filter(g => map.has(g)).map(g => ({ group: g, entries: map.get(g)! }));
}

/* ─── Filter tabs ─── */
const FILTERS = ['All', 'Paul', 'Workhorse', 'System', 'Gmail', 'Drive', 'Calendar'] as const;
type Filter = (typeof FILTERS)[number];

function matchesFilter(entry: ActivityEntry, filter: Filter): boolean {
  if (filter === 'All') return true;
  // Source-based filters
  const fl = filter.toLowerCase();
  if (fl === 'gmail' || fl === 'drive' || fl === 'calendar') {
    return entry.source === fl;
  }
  // Agent-based filters
  const a = entry.agent.toLowerCase();
  return a.includes(fl);
}

function matchesSearch(entry: ActivityEntry, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    (entry.title?.toLowerCase().includes(q)) ||
    (entry.summary?.toLowerCase().includes(q)) ||
    (entry.agent?.toLowerCase().includes(q)) ||
    (entry.source?.toLowerCase().includes(q)) ||
    (entry.tags?.some(t => t.toLowerCase().includes(q)))
  );
}

/* ─── Export ─── */
function exportActivityLog(entries: ActivityEntry[]) {
  const rows = [
    ['ID', 'Timestamp', 'Agent', 'Type', 'Status', 'Source', 'Title', 'Summary', 'Tags', 'Output'].join('\t'),
    ...entries.map(e => [
      e.id,
      e.timestamp,
      e.agent,
      e.type,
      e.status,
      e.source || 'vault',
      (e.title || '').replace(/\t/g, ' '),
      (e.summary || '').replace(/\t/g, ' '),
      (e.tags || []).join(', '),
      (e.output || []).join(', '),
    ].join('\t')),
  ];
  const blob = new Blob([rows.join('\n')], { type: 'text/tab-separated-values' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `activity-log-${format(new Date(), 'yyyy-MM-dd-HHmm')}.tsv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Constants ─── */
const PAGE_SIZE = 15;
const POLL_INTERVAL = 10_000;

/* ─── Group icon ─── */
function groupIcon(group: DateGroup): string {
  switch (group) {
    case 'Today': return 'today';
    case 'Yesterday': return 'history';
    case 'This Week': return 'date_range';
    case 'Earlier': return 'schedule';
  }
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

export default function ActivityFeed({ initialEntries }: { initialEntries: ActivityEntry[] }) {
  const [allEntries, setAllEntries] = useState<ActivityEntry[]>(initialEntries);
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const knownIdsRef = useRef<Set<string>>(new Set(initialEntries.map(e => e.id)));

  /* ─── Polling ─── */
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/activity');
        if (!res.ok) return;
        const data: ActivityEntry[] = await res.json();
        const freshIds = new Set(data.map(e => e.id));
        const added = data.filter(e => !knownIdsRef.current.has(e.id));
        if (added.length > 0) {
          setNewIds(prev => {
            const next = new Set(prev);
            added.forEach(e => next.add(e.id));
            return next;
          });
          // Clear "new" highlight after 5s
          setTimeout(() => {
            setNewIds(prev => {
              const next = new Set(prev);
              added.forEach(e => next.delete(e.id));
              return next;
            });
          }, 5000);
        }
        knownIdsRef.current = freshIds;
        data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAllEntries(data);
      } catch { /* silent */ }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  /* ─── Focus search on open ─── */
  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  /* ─── Derived data (memoized for perf) ─── */
  const filtered = useMemo(
    () => allEntries.filter(e => matchesFilter(e, filter)).filter(e => matchesSearch(e, search)),
    [allEntries, filter, search]
  );

  const paginated = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const grouped = useMemo(() => groupByDate(paginated), [paginated]);
  const hasMore = visibleCount < filtered.length;

  const loadMore = useCallback(() => {
    setVisibleCount(v => Math.min(v + PAGE_SIZE, filtered.length));
  }, [filtered.length]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  /* ─── Render ─── */
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col min-h-screen">
      {/* Top App Bar */}
      <header className="sticky top-0 z-20 bg-bg-dark/80 backdrop-blur-md pt-6 md:pt-8 pb-4 px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Protocol Active</span>
            <h1 className="text-2xl font-bold tracking-tight">Activity Feed</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Search toggle */}
            <button
              onClick={() => { setSearchOpen(o => !o); if (searchOpen) setSearch(''); }}
              className={`flex items-center justify-center size-9 rounded-full border transition-colors ${searchOpen ? 'bg-primary/20 border-primary/40 text-primary' : 'bg-card-dark border-transparent text-foreground-muted hover:text-primary hover:border-primary/20'}`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>
            </button>
            {/* Export */}
            <button
              onClick={() => exportActivityLog(filtered)}
              disabled={filtered.length === 0}
              className="flex items-center justify-center size-9 rounded-full border border-transparent bg-card-dark text-foreground-muted hover:text-primary hover:border-primary/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Export activity log as TSV"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
            </button>
            <Link
              href="/commands"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>bolt</span>
              <span className="text-primary text-xs font-bold">Commands</span>
            </Link>
          </div>
        </div>

        {/* Command Bar */}
        <div className="mb-4">
          <CommandBar placeholder="Give Paul a command..." variant="compact" />
        </div>

        {/* Search Bar (collapsible) */}
        {searchOpen && (
          <div className="mb-3 animate-slide-up">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" style={{ fontSize: 18 }}>search</span>
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
                placeholder="Search activity by title, summary, agent, or tag..."
                className="w-full rounded-xl border border-primary/20 bg-card-dark pl-10 pr-10 py-2.5 text-sm text-foreground placeholder:text-foreground-muted/50 outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(250,222,41,0.1)] transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filter Tabs + Count Badge */}
        <div className="flex items-center gap-3">
          <div className="relative flex gap-2 overflow-x-auto hide-scrollbar pb-1 flex-1">
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); setVisibleCount(PAGE_SIZE); }}
                className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  filter === f
                    ? 'bg-primary text-bg-dark shadow-[0_0_12px_rgba(250,222,41,0.2)]'
                    : 'bg-card-dark text-foreground-muted hover:bg-secondary-dark/60 hover:text-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {/* Count badge */}
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card-dark border border-border-subtle">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>list_alt</span>
            <span className="text-xs font-bold tabular-nums">
              {filter === 'All' && !search ? (
                <span className="text-foreground-muted">{allEntries.length}</span>
              ) : (
                <>
                  <span className="text-primary">{filtered.length}</span>
                  <span className="text-foreground-muted">/{allEntries.length}</span>
                </>
              )}
            </span>
          </div>
        </div>
      </header>

      {/* Timeline Feed */}
      <main className="flex-1 px-6 pb-32">
        {filtered.length === 0 ? (
          /* ─── Empty State ─── */
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative mb-6">
              <div className="size-20 rounded-full bg-secondary-dark/30 border border-primary/10 flex items-center justify-center animate-breathe">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 36 }}>
                  {search ? 'search_off' : filter !== 'All' ? 'filter_list_off' : 'rocket_launch'}
                </span>
              </div>
              <div className="absolute -inset-3 rounded-full bg-primary/5 blur-xl -z-10" />
            </div>
            <h3 className="text-lg font-bold mb-2">
              {search ? 'No Matches Found' : filter !== 'All' ? `No ${filter} Activity` : 'No Activity Yet'}
            </h3>
            <p className="text-foreground-muted text-sm text-center max-w-xs leading-relaxed">
              {search
                ? `No entries match "${search}". Try a different search term or clear your filters.`
                : filter !== 'All'
                ? `No activity from ${filter} agents right now. Switch to All to see everything.`
                : 'Sub-agents will log their work here as they complete tasks. Issue a command to get started.'}
            </p>
            {(search || filter !== 'All') && (
              <button
                onClick={() => { setSearch(''); setFilter('All'); setSearchOpen(false); }}
                className="mt-4 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold hover:bg-primary/20 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Vertical Timeline Line */}
            <div
              className="absolute left-[11px] top-4 bottom-0 w-[2px] rounded-full"
              style={{ background: 'linear-gradient(to bottom, rgba(250,222,41,0.4), rgba(250,222,41,0.08) 40%, transparent)' }}
            />

            {grouped.map(({ group, entries }) => (
              <div key={group}>
                {/* Date Group Header */}
                <div className="relative flex items-center gap-2 mb-4 mt-8 first:mt-0">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 size-6 rounded-full bg-bg-dark border-2 border-primary/30 flex items-center justify-center z-10">
                    <span className="material-symbols-outlined text-primary/60" style={{ fontSize: 14 }}>{groupIcon(group)}</span>
                  </div>
                  <div className="pl-10 flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-[0.15em] font-bold text-primary/70">{group}</span>
                    <div className="h-px w-16 bg-primary/10" />
                    <span className="text-[10px] text-foreground-muted font-medium">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
                  </div>
                </div>

                <div className="space-y-8">
                  {entries.map((entry, idx) => {
                    const badge = getAgentBadge(entry.agent, entry.type);
                    const isCommand = entry.type === 'command';
                    const cmdStatus = isCommand ? getCommandStatusBadge(entry.status) : null;
                    const isExpanded = expandedId === entry.id;
                    const isNew = newIds.has(entry.id);

                    return (
                      <div
                        key={entry.id}
                        className={`relative pl-10 animate-slide-up ${isNew ? 'ring-1 ring-primary/30 rounded-xl -mx-2 px-12 py-2 bg-primary/[0.03]' : ''}`}
                        style={{ animationDelay: `${Math.min(idx, 7) * 75}ms`, willChange: 'transform, opacity', contain: 'layout style' }}
                      >
                        {/* Timeline Node */}
                        <div
                          className={`absolute left-0 top-1.5 w-[24px] h-[24px] rounded-full bg-bg-dark ${badge.borderColor} border-2 flex items-center justify-center z-10 transition-shadow hover:shadow-[0_0_10px_rgba(250,222,41,0.15)] ${isNew ? 'animate-glow-pulse' : ''}`}
                        >
                          {isCommand ? (
                            <span className="material-symbols-outlined text-primary" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>bolt</span>
                          ) : entry.type === 'completed' ? (
                            <span className="material-symbols-outlined text-emerald-500" style={{ fontSize: 14 }}>check_circle</span>
                          ) : (
                            <div className={`w-2 h-2 rounded-full ${badge.dotColor} ${entry.type === 'started' ? 'animate-pulse' : ''}`} />
                          )}
                        </div>

                        {/* Clickable Card */}
                        <div
                          onClick={() => toggleExpand(entry.id)}
                          className={`flex flex-col gap-2 cursor-pointer rounded-xl transition-all ${
                            isCommand
                              ? 'bg-primary/5 -mx-3 px-3 py-3 border border-primary/10 hover:border-primary/25'
                              : isExpanded
                              ? 'bg-card-dark/60 -mx-3 px-3 py-3 border border-border-subtle'
                              : 'hover:bg-card-dark/30 -mx-1 px-1 py-1'
                          }`}
                        >
                          {/* Agent Badge + Source Badge + Time */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`${badge.bgColor} px-3 py-0.5 rounded-full text-[10px] font-bold ${badge.textColor} tracking-wider border ${isCommand ? 'border-primary/30' : 'border-transparent'}`}>
                                {badge.label}
                              </span>
                              {entry.source && SOURCE_BADGES[entry.source] && (
                                <span className={`${SOURCE_BADGES[entry.source].cls} px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border inline-flex items-center gap-1`}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{SOURCE_BADGES[entry.source].icon}</span>
                                  {SOURCE_BADGES[entry.source].label}
                                </span>
                              )}
                              {cmdStatus && (
                                <span className={`${cmdStatus.cls} px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border`}>
                                  {cmdStatus.label}
                                </span>
                              )}
                              <span className="text-xs text-foreground-muted font-medium" suppressHydrationWarning>
                                {(() => { try { return format(new Date(entry.timestamp), 'HH:mm'); } catch { return ''; } })()}
                              </span>
                            </div>
                            <span
                              className={`material-symbols-outlined text-foreground-muted transition-transform ${isExpanded ? 'rotate-180 text-primary' : ''}`}
                              style={{ fontSize: 18 }}
                            >
                              expand_more
                            </span>
                          </div>

                          {/* Action Verb */}
                          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
                            {getActionVerb(entry.type)}
                          </h3>

                          {/* Summary */}
                          <p className={`text-base leading-relaxed ${isCommand ? 'text-primary/90 font-medium' : 'text-zinc-200'}`}>
                            {entry.summary || entry.title}
                          </p>

                          {/* Expanded Detail Panel */}
                          {isExpanded && (
                            <div className="mt-2 pt-3 border-t border-border-subtle animate-slide-up space-y-3">
                              {/* Full title if different from summary */}
                              {entry.title && entry.summary && entry.title !== entry.summary && (
                                <div>
                                  <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold">Title</span>
                                  <p className="text-sm text-zinc-300 mt-0.5">{entry.title}</p>
                                </div>
                              )}

                              {/* Timestamp detail */}
                              <div>
                                <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold">Timestamp</span>
                                <p className="text-sm text-zinc-300 mt-0.5" suppressHydrationWarning>
                                  {(() => { try { return format(new Date(entry.timestamp), 'PPpp'); } catch { return entry.timestamp; } })()}
                                </p>
                              </div>

                              {/* Agent */}
                              <div>
                                <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold">Agent</span>
                                <p className="text-sm text-zinc-300 mt-0.5">{entry.agent}</p>
                              </div>

                              {/* Source */}
                              {entry.source && entry.source !== 'vault' && (
                                <div>
                                  <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold">Source</span>
                                  <p className="text-sm text-zinc-300 mt-0.5 capitalize">{entry.source}</p>
                                </div>
                              )}

                              {/* Status */}
                              <div>
                                <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold">Status</span>
                                <p className="text-sm text-zinc-300 mt-0.5 capitalize">{entry.status}</p>
                              </div>

                              {/* Output files */}
                              {entry.output && entry.output.length > 0 && (
                                <div>
                                  <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold">Output Files</span>
                                  <div className="flex gap-2 mt-1.5 flex-wrap">
                                    {entry.output.map((file, i) => (
                                      <div
                                        key={i}
                                        className="h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center gap-1.5 px-3 cursor-pointer hover:bg-primary/20 transition-colors"
                                      >
                                        <span className="material-symbols-outlined text-primary text-sm">description</span>
                                        <span className="text-primary text-[10px] font-bold truncate max-w-[140px]">
                                          {file.split('/').slice(-1)[0]}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Tags */}
                              {entry.tags && entry.tags.length > 0 && (
                                <div>
                                  <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold">Tags</span>
                                  <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                    {entry.tags.map((tag) => (
                                      <span
                                        key={tag}
                                        className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary/80 font-medium"
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Entry ID */}
                              <div>
                                <span className="text-[10px] uppercase tracking-wider text-foreground-muted font-bold">ID</span>
                                <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">{entry.id}</p>
                              </div>

                              {/* Related Notes */}
                              <div className="mt-4 pt-4 border-t border-border-subtle">
                                <RelatedNotes activityId={entry.id} className="bg-transparent border-0 p-0" />
                              </div>
                            </div>
                          )}

                          {/* Collapsed: show output chips + tags inline */}
                          {!isExpanded && (
                            <>
                              {entry.output && entry.output.length > 0 && (
                                <div className="flex gap-2 mt-1 flex-wrap">
                                  {entry.output.map((file, i) => (
                                    <div
                                      key={i}
                                      className="h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center gap-1.5 px-2.5"
                                    >
                                      <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>description</span>
                                      <span className="text-primary text-[10px] font-bold truncate max-w-[100px]">
                                        {file.split('/').slice(-1)[0]}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {entry.tags && entry.tags.length > 0 && (
                                <div className="flex gap-1.5 mt-1 flex-wrap">
                                  {entry.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary/80 font-medium"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={loadMore}
                  className="group flex items-center gap-2 px-6 py-3 rounded-full bg-card-dark border border-border-subtle hover:border-primary/30 hover:bg-secondary-dark/40 transition-all"
                >
                  <span className="material-symbols-outlined text-primary group-hover:translate-y-0.5 transition-transform" style={{ fontSize: 18 }}>expand_more</span>
                  <span className="text-sm font-bold text-foreground-muted group-hover:text-foreground transition-colors">
                    Load More
                  </span>
                  <span className="text-[10px] font-bold text-primary/60 bg-primary/10 px-2 py-0.5 rounded-full">
                    {filtered.length - visibleCount} remaining
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
