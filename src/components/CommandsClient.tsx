'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';

/* ─── Types ─── */
export interface CommandEntry {
  id: string;
  timestamp: string;
  text: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  gatewayRunId?: string;
  gatewayStatus?: string;
  agentResponse?: string;
  category?: string;
  scheduled?: string;
}

type StatusFilter = 'all' | 'pending' | 'processing' | 'done' | 'failed';
type SortMode = 'newest' | 'oldest';

/* ─── Templates ─── */
interface CommandTemplate {
  label: string;
  text: string;
  icon: string;
  category: string;
}

const TEMPLATES: CommandTemplate[] = [
  { label: 'Daily Summary', text: 'Generate a daily summary of all activity, tasks, and deals', icon: 'summarize', category: 'Reports' },
  { label: 'Check Agents', text: 'Check the status of all running agents and report any issues', icon: 'smart_toy', category: 'Agents' },
  { label: 'Task Cleanup', text: 'Review all tasks and archive any that have been done for more than 7 days', icon: 'cleaning_services', category: 'Tasks' },
  { label: 'Pipeline Report', text: 'Generate a sales pipeline report with deal stages and expected close dates', icon: 'rocket_launch', category: 'Reports' },
  { label: 'Knowledge Sync', text: 'Scan the vault for any documents that need re-indexing and update the knowledge graph', icon: 'sync', category: 'Knowledge' },
  { label: 'Deploy Status', text: 'Check all deployment statuses and report any failures in the last 24 hours', icon: 'cloud_upload', category: 'DevOps' },
  { label: 'Backup Vault', text: 'Create a backup of all vault data and export to secondary storage', icon: 'backup', category: 'System' },
  { label: 'Email Digest', text: 'Compile an email digest of the most important updates from today', icon: 'mail', category: 'Reports' },
  { label: 'Kill Agent', text: 'Stop all currently running agents gracefully', icon: 'stop_circle', category: 'Agents' },
  { label: 'Analyze Trends', text: 'Analyze activity trends over the past 30 days and identify patterns', icon: 'analytics', category: 'Reports' },
];

const TEMPLATE_CATEGORIES = Array.from(new Set(TEMPLATES.map(t => t.category)));

/* ─── Status badge helper ─── */
function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return { label: 'PENDING', bg: 'bg-primary/15', text: 'text-primary', border: 'border-primary/30', icon: 'schedule', barColor: 'bg-primary' };
    case 'processing':
      return { label: 'PROCESSING', bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', icon: 'sync', barColor: 'bg-blue-400' };
    case 'done':
      return { label: 'DONE', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: 'check_circle', barColor: 'bg-emerald-400' };
    case 'failed':
      return { label: 'FAILED', bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30', icon: 'error', barColor: 'bg-red-400' };
    default:
      return { label: status.toUpperCase(), bg: 'bg-zinc-700/20', text: 'text-zinc-400', border: 'border-zinc-700/30', icon: 'help', barColor: 'bg-zinc-500' };
  }
}

/* ─── Infer category from command text ─── */
function inferCategory(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('agent') || lower.includes('spawn') || lower.includes('kill')) return 'Agents';
  if (lower.includes('task') || lower.includes('todo')) return 'Tasks';
  if (lower.includes('report') || lower.includes('summary') || lower.includes('digest') || lower.includes('analyz')) return 'Reports';
  if (lower.includes('deploy') || lower.includes('build') || lower.includes('ci')) return 'DevOps';
  if (lower.includes('vault') || lower.includes('knowledge') || lower.includes('index') || lower.includes('document')) return 'Knowledge';
  if (lower.includes('backup') || lower.includes('system') || lower.includes('config')) return 'System';
  if (lower.includes('deal') || lower.includes('pipeline') || lower.includes('sales')) return 'Sales';
  return 'General';
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Agents: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  Tasks: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  Reports: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  DevOps: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  Knowledge: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  System: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' },
  Sales: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  General: { bg: 'bg-primary/5', text: 'text-primary/60', border: 'border-primary/10' },
};

const MAX_CHARS = 500;

/* ─── Main Component ─── */
export default function CommandsClient({ commands: initialCommands }: { commands: CommandEntry[] }) {
  const router = useRouter();
  const [commands, setCommands] = useState(initialCommands);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [commandText, setCommandText] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Real-time polling for status updates (every 5s if there are pending/processing commands)
  useEffect(() => {
    const hasPending = commands.some(c => c.status === 'pending' || c.status === 'processing');
    if (!hasPending) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/command');
        if (res.ok) {
          const fresh: CommandEntry[] = await res.json();
          setCommands(fresh);
        }
      } catch { /* silent */ }
    }, 5000);

    return () => clearInterval(interval);
  }, [commands]);

  // Filtered + sorted commands
  const filteredCommands = useMemo(() => {
    let result = commands.map(c => ({
      ...c,
      category: c.category || inferCategory(c.text),
    }));

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.text.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
    }

    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }

    result.sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return sortMode === 'newest' ? tb - ta : ta - tb;
    });

    return result;
  }, [commands, search, statusFilter, sortMode]);

  // Stats
  const stats = useMemo(() => ({
    pending: commands.filter(c => c.status === 'pending').length,
    processing: commands.filter(c => c.status === 'processing').length,
    done: commands.filter(c => c.status === 'done').length,
    failed: commands.filter(c => c.status === 'failed').length,
    total: commands.length,
  }), [commands]);

  // Send command
  const sendCommand = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        const newCmd: CommandEntry = {
          id: data.id,
          timestamp: new Date().toISOString(),
          text: text.trim(),
          status: 'processing',
          category: inferCategory(text.trim()),
        };
        setCommands(prev => [newCmd, ...prev]);
        setCommandText('');
        setScheduledTime('');
        setShowScheduler(false);
        setSent(true);
        setTimeout(() => setSent(false), 2500);
      }
    } catch (err) {
      console.error('Failed to send command:', err);
    } finally {
      setSending(false);
    }
  }, [sending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendCommand(commandText);
  };

  // Bulk status update
  const bulkUpdateStatus = useCallback(async (newStatus: 'done' | 'failed') => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        await fetch('/api/command', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: newStatus }),
        });
      } catch { /* continue */ }
    }
    setCommands(prev => prev.map(c => selectedIds.has(c.id) ? { ...c, status: newStatus } : c));
    setSelectedIds(new Set());
    setBulkMode(false);
  }, [selectedIds]);

  // Delete command
  const deleteCommand = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/command?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        setCommands(prev => prev.filter(c => c.id !== id));
        if (expandedId === id) setExpandedId(null);
      }
    } catch (err) {
      console.error('Failed to delete command:', err);
    } finally {
      setDeletingId(null);
    }
  }, [expandedId]);

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter pills config
  const STATUS_FILTERS: { key: StatusFilter; label: string; count: number; color: string }[] = [
    { key: 'all', label: 'All', count: stats.total, color: 'text-foreground' },
    { key: 'pending', label: 'Pending', count: stats.pending, color: 'text-primary' },
    { key: 'processing', label: 'Active', count: stats.processing, color: 'text-blue-400' },
    { key: 'done', label: 'Done', count: stats.done, color: 'text-emerald-400' },
    { key: 'failed', label: 'Failed', count: stats.failed, color: 'text-red-400' },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg-dark/80 backdrop-blur-md pt-6 md:pt-8 pb-4 px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Mission Control</span>
            <h1 className="text-2xl font-bold tracking-tight">Commands</h1>
          </div>
          <div className="flex items-center gap-2">
            {stats.pending > 0 && (
              <span className="px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold border border-primary/20 animate-fade-in">
                {stats.pending} pending
              </span>
            )}
            {stats.processing > 0 && (
              <span className="px-3 py-1 rounded-full bg-blue-500/15 text-blue-400 text-xs font-bold border border-blue-500/20 animate-fade-in">
                {stats.processing} active
              </span>
            )}
          </div>
        </div>

        {/* Command Input */}
        <form onSubmit={handleSubmit} className="mb-3">
          <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-secondary-dark/40 to-card-dark shadow-lg focus-within:border-primary/40 focus-within:shadow-[0_0_0_3px_rgba(250,222,41,0.08)] transition-all">
            {/* Header row */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>bolt</span>
                <span className="text-[10px] font-bold text-primary/60 uppercase tracking-wider">Command</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-primary/30" style={{ fontSize: 13 }}>smart_toy</span>
                <span className="text-[9px] text-primary/30 font-medium tracking-wide">Paul Agent</span>
              </div>
            </div>

            {/* Textarea */}
            <div className="px-4 py-2">
              <textarea
                ref={textareaRef}
                value={commandText}
                onChange={e => {
                  if (e.target.value.length <= MAX_CHARS) setCommandText(e.target.value);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Describe what Paul should do..."
                disabled={sending}
                rows={2}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground-muted/40 outline-none disabled:opacity-50 resize-none leading-relaxed"
              />
            </div>

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-4 pb-3 gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowTemplates(v => !v)}
                  className={`size-8 rounded-lg flex items-center justify-center transition-colors ${showTemplates ? 'bg-primary/20 text-primary' : 'text-foreground-muted/50 hover:text-primary hover:bg-primary/10'}`}
                  title="Command templates"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>library_books</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowScheduler(v => !v)}
                  className={`size-8 rounded-lg flex items-center justify-center transition-colors ${showScheduler ? 'bg-primary/20 text-primary' : 'text-foreground-muted/50 hover:text-primary hover:bg-primary/10'}`}
                  title="Schedule command"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>schedule_send</span>
                </button>
                {/* Character count */}
                <span className={`text-[10px] font-medium ml-2 tabular-nums ${
                  commandText.length > MAX_CHARS * 0.9
                    ? 'text-red-400'
                    : commandText.length > MAX_CHARS * 0.7
                    ? 'text-amber-400/60'
                    : 'text-foreground-muted/30'
                }`}>
                  {commandText.length}/{MAX_CHARS}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {sent && (
                  <span className="flex items-center gap-1 text-emerald-400 text-xs font-bold animate-fade-in">
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>
                    Dispatched
                  </span>
                )}
                <span className="text-[10px] text-foreground-muted/30 hidden sm:inline">Shift+Enter for newline</span>
                <button
                  type="submit"
                  disabled={!commandText.trim() || sending || commandText.length > MAX_CHARS}
                  className="h-8 px-4 rounded-lg bg-primary text-bg-dark flex items-center gap-1.5 font-bold text-xs hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(250,222,41,0.15)]"
                >
                  {sending ? (
                    <>
                      <span className="material-symbols-outlined animate-spin" style={{ fontSize: 14 }}>progress_activity</span>
                      Sending
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>send</span>
                      Send
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Scheduler row */}
            {showScheduler && (
              <div className="px-4 pb-3 pt-1 border-t border-primary/10 flex items-center gap-3 animate-slide-down">
                <span className="material-symbols-outlined text-primary/50" style={{ fontSize: 16 }}>event</span>
                <input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={e => setScheduledTime(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-foreground outline-none [color-scheme:dark]"
                />
                {scheduledTime && (
                  <span className="text-[10px] text-primary/50 font-medium">
                    Scheduled
                  </span>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Templates Panel */}
        {showTemplates && (
          <div className="mb-3 rounded-xl border border-primary/15 bg-card-dark/80 backdrop-blur-md overflow-hidden animate-slide-down">
            <div className="px-4 py-3 border-b border-primary/10 flex items-center justify-between">
              <h3 className="text-xs font-bold text-primary uppercase tracking-wider">Command Templates</h3>
              <button onClick={() => setShowTemplates(false)} className="text-foreground-muted hover:text-primary transition-colors">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            </div>
            {/* Category pills */}
            <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setTemplateCategory('all')}
                className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                  templateCategory === 'all'
                    ? 'bg-primary/15 text-primary border-primary/30'
                    : 'bg-transparent text-foreground-muted border-primary/10 hover:border-primary/20'
                }`}
              >
                All
              </button>
              {TEMPLATE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setTemplateCategory(cat)}
                  className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                    templateCategory === cat
                      ? 'bg-primary/15 text-primary border-primary/30'
                      : 'bg-transparent text-foreground-muted border-primary/10 hover:border-primary/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {/* Template grid */}
            <div className="px-4 pb-3 grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
              {TEMPLATES
                .filter(t => templateCategory === 'all' || t.category === templateCategory)
                .map(t => (
                  <button
                    key={t.label}
                    onClick={() => {
                      setCommandText(t.text);
                      setShowTemplates(false);
                      textareaRef.current?.focus();
                    }}
                    className="text-left p-3 rounded-lg border border-primary/10 bg-secondary-dark/30 hover:border-primary/25 hover:bg-secondary-dark/50 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-primary/60 group-hover:text-primary transition-colors" style={{ fontSize: 16 }}>
                        {t.icon}
                      </span>
                      <span className="text-xs font-semibold text-white group-hover:text-primary transition-colors truncate">{t.label}</span>
                    </div>
                    <p className="text-[10px] text-foreground-muted/60 line-clamp-2 leading-relaxed">{t.text}</p>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Search + Filters */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted/40" style={{ fontSize: 18 }}>search</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search commands..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-primary/10 bg-card-dark/40 text-sm text-foreground placeholder:text-foreground-muted/40 outline-none focus:border-primary/30 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-primary">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
              </button>
            )}
          </div>
          <button
            onClick={() => setSortMode(m => m === 'newest' ? 'oldest' : 'newest')}
            className="size-9 rounded-lg border border-primary/10 bg-card-dark/40 flex items-center justify-center text-foreground-muted hover:text-primary hover:border-primary/20 transition-colors"
            title={`Sort: ${sortMode}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              {sortMode === 'newest' ? 'arrow_downward' : 'arrow_upward'}
            </span>
          </button>
          <button
            onClick={() => { setBulkMode(m => !m); setSelectedIds(new Set()); }}
            className={`size-9 rounded-lg border flex items-center justify-center transition-colors ${
              bulkMode
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'border-primary/10 bg-card-dark/40 text-foreground-muted hover:text-primary hover:border-primary/20'
            }`}
            title="Bulk operations"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>checklist</span>
          </button>
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wider border transition-all ${
                statusFilter === f.key
                  ? `${f.key === 'all' ? 'bg-primary/15 text-primary border-primary/30' : f.key === 'pending' ? 'bg-primary/15 text-primary border-primary/30' : f.key === 'processing' ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : f.key === 'done' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}`
                  : 'bg-transparent text-foreground-muted border-primary/10 hover:border-primary/20'
              }`}
            >
              {f.label}
              <span className={`text-[10px] ${statusFilter === f.key ? 'opacity-80' : 'opacity-50'}`}>{f.count}</span>
            </button>
          ))}
        </div>

        {/* Bulk actions bar */}
        {bulkMode && selectedIds.size > 0 && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 animate-slide-down">
            <span className="text-xs font-bold text-primary">{selectedIds.size} selected</span>
            <div className="flex-1" />
            <button
              onClick={() => bulkUpdateStatus('done')}
              className="px-3 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors"
            >
              Mark Done
            </button>
            <button
              onClick={() => bulkUpdateStatus('failed')}
              className="px-3 py-1 rounded-lg bg-red-500/15 text-red-400 text-xs font-bold border border-red-500/20 hover:bg-red-500/25 transition-colors"
            >
              Mark Failed
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1 rounded-lg text-foreground-muted text-xs font-bold hover:text-primary transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </header>

      {/* Commands List */}
      <main className="flex-1 px-6 pb-32">
        {filteredCommands.length === 0 && commands.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16">
            {/* Decorative illustration */}
            <div className="relative mb-6">
              <div className="size-24 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary-dark/40 border border-primary/15 flex items-center justify-center animate-breathe">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 40, fontVariationSettings: "'FILL' 1" }}>bolt</span>
              </div>
              <div className="absolute -top-2 -right-2 size-8 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: 14 }}>smart_toy</span>
              </div>
              <div className="absolute -bottom-1 -left-3 size-7 rounded-full bg-blue-500/10 border border-blue-500/15 flex items-center justify-center animate-pulse" style={{ animationDelay: '1s' }}>
                <span className="material-symbols-outlined text-blue-400" style={{ fontSize: 12 }}>terminal</span>
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2">Command Center Ready</h3>
            <p className="text-foreground-muted text-sm text-center max-w-xs mb-1">
              Issue commands to Paul and he will execute them autonomously.
            </p>
            <p className="text-foreground-muted/50 text-xs text-center max-w-xs mb-5">
              Try a template to get started, or type your own command above.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTemplates(true)}
                className="px-4 py-2.5 rounded-lg bg-primary/15 text-primary text-sm font-bold border border-primary/20 hover:bg-primary/25 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>library_books</span>
                Browse Templates
              </button>
              <button
                onClick={() => textareaRef.current?.focus()}
                className="px-4 py-2.5 rounded-lg bg-secondary-dark/40 text-foreground-muted text-sm font-medium border border-primary/10 hover:border-primary/20 hover:text-primary transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                Write Command
              </button>
            </div>
          </div>
        ) : filteredCommands.length === 0 ? (
          /* No results for filter/search */
          <div className="flex flex-col items-center justify-center py-16">
            <span className="material-symbols-outlined text-foreground-muted/30 mb-3" style={{ fontSize: 40 }}>search_off</span>
            <p className="text-foreground-muted text-sm">No commands match your filters</p>
            <button
              onClick={() => { setSearch(''); setStatusFilter('all'); }}
              className="mt-2 text-primary text-xs font-bold hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] text-foreground-muted/50 font-medium">
                {filteredCommands.length} command{filteredCommands.length !== 1 ? 's' : ''}
                {search && ` matching "${search}"`}
              </p>
            </div>

            {/* Command cards */}
            <div className="space-y-2.5">
              {filteredCommands.map((cmd, i) => {
                const badge = getStatusBadge(cmd.status);
                const catColor = CATEGORY_COLORS[cmd.category] || CATEGORY_COLORS.General;
                const isExpanded = expandedId === cmd.id;
                const isSelected = selectedIds.has(cmd.id);

                return (
                  <div
                    key={cmd.id}
                    className={`animate-slide-up ${i < 8 ? `delay-${i + 1}` : ''} relative rounded-xl border ${
                      isSelected ? 'border-primary/40 bg-primary/5' : `${badge.border} bg-card-dark/60`
                    } transition-all hover:border-primary/30 group`}
                  >
                    {/* Status indicator line */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${badge.barColor}`} />

                    <div className="p-4 pl-5">
                      <div className="flex items-start gap-3">
                        {/* Checkbox (bulk mode) or status icon */}
                        {bulkMode ? (
                          <button
                            onClick={() => toggleSelect(cmd.id)}
                            className={`shrink-0 size-9 rounded-lg flex items-center justify-center mt-0.5 transition-colors ${
                              isSelected ? 'bg-primary/20 text-primary' : 'bg-card-dark text-foreground-muted hover:text-primary'
                            }`}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                              {isSelected ? 'check_box' : 'check_box_outline_blank'}
                            </span>
                          </button>
                        ) : (
                          <div className={`shrink-0 size-9 rounded-lg ${badge.bg} flex items-center justify-center mt-0.5`}>
                            <span className={`material-symbols-outlined ${badge.text} ${cmd.status === 'processing' ? 'animate-spin' : ''}`} style={{ fontSize: 18 }}>
                              {badge.icon}
                            </span>
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground leading-relaxed">{cmd.text}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`${badge.bg} ${badge.text} px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider border ${badge.border}`}>
                              {badge.label}
                            </span>
                            <span className={`${catColor.bg} ${catColor.text} px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider border ${catColor.border}`}>
                              {cmd.category}
                            </span>
                            <span className="text-foreground-muted/50 text-[10px] font-medium" suppressHydrationWarning>
                              {(() => {
                                try { return formatDistanceToNow(new Date(cmd.timestamp), { addSuffix: true }); }
                                catch { return ''; }
                              })()}
                            </span>
                            <span className="text-foreground-muted/30 text-[10px]" suppressHydrationWarning>
                              {(() => {
                                try { return format(new Date(cmd.timestamp), 'MMM d, HH:mm'); }
                                catch { return ''; }
                              })()}
                            </span>
                          </div>
                        </div>

                        {/* Actions: expand + delete */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          {cmd.agentResponse && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : cmd.id)}
                              className="size-8 rounded-lg flex items-center justify-center text-foreground-muted hover:text-primary hover:bg-primary/10 transition-all"
                              title="View output"
                            >
                              <span className="material-symbols-outlined transition-transform" style={{ fontSize: 18, transform: isExpanded ? 'rotate(180deg)' : undefined }}>
                                expand_more
                              </span>
                            </button>
                          )}
                          <button
                            onClick={() => deleteCommand(cmd.id)}
                            disabled={deletingId === cmd.id}
                            className="size-8 rounded-lg flex items-center justify-center text-foreground-muted/30 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                            title="Delete command"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                              {deletingId === cmd.id ? 'progress_activity' : 'delete'}
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Expanded output viewer */}
                      {isExpanded && cmd.agentResponse && (
                        <div className="mt-3 pt-3 border-t border-primary/10 animate-slide-down">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="material-symbols-outlined text-primary/50" style={{ fontSize: 14 }}>terminal</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary/50">Agent Response</span>
                          </div>
                          <div className="rounded-lg bg-bg-dark/60 border border-primary/10 p-3 max-h-48 overflow-y-auto">
                            <pre className="text-xs text-foreground-muted leading-relaxed whitespace-pre-wrap font-display">
                              {cmd.agentResponse}
                            </pre>
                          </div>
                          {cmd.gatewayRunId && (
                            <p className="mt-2 text-[10px] text-foreground-muted/30 font-mono">
                              Run ID: {cmd.gatewayRunId}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
