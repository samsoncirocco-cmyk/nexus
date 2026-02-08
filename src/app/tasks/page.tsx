'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { getTaskAge, getAgeBorderClass, getAgeTextClass } from '@/lib/tasks';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Priority = 'low' | 'medium' | 'high';
export type Column = 'Backlog' | 'In Progress' | 'Waiting on Samson' | 'Done';
export type SortMode = 'priority' | 'created' | 'due';

export interface TaskLink {
  label: string;
  url: string;
  type: 'drive' | 'brain' | 'file' | 'external';
}

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  column: Column;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  links?: TaskLink[];
  dueDate?: string;
  subtasks?: SubTask[];
  assignedTo?: string;
}

interface UndoAction {
  label: string;
  previousTasks: Task[];
  timestamp: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COLUMNS: Column[] = ['Backlog', 'In Progress', 'Waiting on Samson', 'Done'];

const colIcons: Record<Column, string> = {
  'Backlog': 'inbox',
  'In Progress': 'sync',
  'Waiting on Samson': 'hourglass_top',
  'Done': 'check_circle',
};

const colGradients: Record<Column, string> = {
  'Backlog': 'from-zinc-500/10 to-transparent',
  'In Progress': 'from-blue-500/10 to-transparent',
  'Waiting on Samson': 'from-amber-500/10 to-transparent',
  'Done': 'from-emerald-500/10 to-transparent',
};

const colAccent: Record<Column, string> = {
  'Backlog': 'text-zinc-400',
  'In Progress': 'text-blue-400',
  'Waiting on Samson': 'text-amber-400',
  'Done': 'text-emerald-400',
};

const priorityStripe: Record<Priority, string> = {
  high: 'border-l-primary',
  medium: 'border-l-emerald-500',
  low: 'border-l-zinc-600',
};

const priorityWeight: Record<Priority, number> = { high: 3, medium: 2, low: 1 };

const STORAGE_KEY = 'second-brain-tasks';
const UNDO_TIMEOUT = 6000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadTasksFromStorage(): Task[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

function saveTasksToStorage(tasks: Task[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function getDueDateStatus(dueDate?: string): 'overdue' | 'soon' | 'ok' | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'soon';
  return 'ok';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function sortTasks(tasks: Task[], mode: SortMode): Task[] {
  return [...tasks].sort((a, b) => {
    switch (mode) {
      case 'priority':
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'due': {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      default:
        return 0;
    }
  });
}

// Fire-and-forget API sync (localStorage is source of truth, API is backup)
function syncToApi(method: 'POST' | 'PUT' | 'DELETE', body: any) {
  fetch('/api/tasks', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
}

// ─── Animated Count Badge ────────────────────────────────────────────────────

function CountBadge({ count }: { count: number }) {
  const [displayCount, setDisplayCount] = useState(count);
  const [animating, setAnimating] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    if (prevCount.current !== count) {
      setAnimating(true);
      const t = setTimeout(() => {
        setDisplayCount(count);
        prevCount.current = count;
      }, 50);
      const t2 = setTimeout(() => setAnimating(false), 450);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
  }, [count]);

  return (
    <span className={`bg-primary text-bg-dark text-xs font-bold px-2 py-0.5 rounded-full inline-block ${animating ? 'animate-count-bounce' : ''}`}>
      {displayCount}
    </span>
  );
}

// ─── Undo Toast ──────────────────────────────────────────────────────────────

function UndoToast({ action, onUndo, onDismiss }: { action: UndoAction; onUndo: () => void; onDismiss: () => void }) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.max(0, 100 - (elapsed / UNDO_TIMEOUT) * 100);
      setProgress(pct);
      if (pct <= 0) { clearInterval(interval); onDismiss(); }
    }, 50);
    return () => clearInterval(interval);
  }, [action.timestamp, onDismiss]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="bg-bg-secondary border border-border rounded-xl shadow-2xl shadow-black/40 px-5 py-3 flex items-center gap-4 min-w-[300px]">
        <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>undo</span>
        <span className="text-sm text-foreground flex-1">{action.label}</span>
        <button onClick={onUndo} className="text-sm font-bold text-primary hover:text-primary-muted transition-colors">
          Undo
        </button>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5 rounded-b-xl overflow-hidden">
          <div className="h-full bg-primary transition-[width] duration-75" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ───────────────────────────────────────────────

function DeleteConfirmModal({ message, onConfirm, onCancel }: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-bg-secondary border border-red-500/30 p-6 shadow-2xl shadow-red-500/10 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-full bg-red-500/15 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-400" style={{ fontSize: 20 }}>warning</span>
          </div>
          <h3 className="text-lg font-bold text-foreground">Confirm Delete</h3>
        </div>
        <p className="text-sm text-foreground-muted mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition-colors font-semibold rounded-lg">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500 hover:text-white rounded-lg font-bold transition-all">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty Column Illustration ───────────────────────────────────────────────

function EmptyColumn({ column }: { column: Column }) {
  const illustrations: Record<Column, { icon: string; line1: string; line2: string }> = {
    'Backlog': { icon: 'lightbulb', line1: 'Nothing queued up', line2: 'Add tasks to plan ahead' },
    'In Progress': { icon: 'rocket_launch', line1: 'All clear', line2: 'Drag a task here to start working' },
    'Waiting on Samson': { icon: 'schedule', line1: 'No blockers', line2: 'Nothing waiting on review' },
    'Done': { icon: 'celebration', line1: 'No completions yet', line2: 'Finish tasks to see them here' },
  };
  const data = illustrations[column];
  return (
    <div className="flex flex-col items-center justify-center h-40 text-center px-4 border border-dashed border-white/10 rounded-xl">
      <div className="size-12 rounded-xl bg-white/5 flex items-center justify-center mb-3 animate-breathe">
        <span className={`material-symbols-outlined ${colAccent[column]}`} style={{ fontSize: 24 }}>{data.icon}</span>
      </div>
      <p className="text-sm font-semibold text-foreground-muted">{data.line1}</p>
      <p className="text-xs text-foreground-muted/60 mt-1">{data.line2}</p>
    </div>
  );
}

// ─── Subtask Progress Bar ────────────────────────────────────────────────────

function SubtaskProgress({ subtasks }: { subtasks: SubTask[] }) {
  if (!subtasks || subtasks.length === 0) return null;
  const done = subtasks.filter(s => s.done).length;
  const pct = Math.round((done / subtasks.length) * 100);
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-bold text-foreground-muted whitespace-nowrap">{done}/{subtasks.length}</span>
    </div>
  );
}

// ─── Statistics Bar ──────────────────────────────────────────────────────────

function StatsBar({ tasks }: { tasks: Task[] }) {
  const total = tasks.length;
  const done = tasks.filter(t => t.column === 'Done').length;
  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
  const highCount = tasks.filter(t => t.priority === 'high' && t.column !== 'Done').length;
  const overdueCount = tasks.filter(t => t.column !== 'Done' && getDueDateStatus(t.dueDate) === 'overdue').length;
  const inProgress = tasks.filter(t => t.column === 'In Progress').length;

  const stats = [
    { icon: 'donut_large', label: 'Complete', value: `${completionRate}%`, accent: 'text-primary' },
    { icon: 'local_fire_department', label: 'High Priority', value: String(highCount), accent: highCount > 0 ? 'text-primary' : 'text-foreground-muted' },
    { icon: 'error', label: 'Overdue', value: String(overdueCount), accent: overdueCount > 0 ? 'text-red-400' : 'text-foreground-muted' },
    { icon: 'trending_up', label: 'In Progress', value: String(inProgress), accent: 'text-blue-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 animate-fade-slide-up">
      {stats.map((s, i) => (
        <div key={s.label} className="flex items-center gap-3 bg-card-dark border border-white/5 rounded-xl px-4 py-3 animate-fade-slide-up" style={{ animationDelay: `${i * 75}ms` }}>
          <span className={`material-symbols-outlined ${s.accent}`} style={{ fontSize: 20 }}>{s.icon}</span>
          <div>
            <div className={`text-lg font-bold ${s.accent}`}>{s.value}</div>
            <div className="text-[10px] text-foreground-muted uppercase tracking-wider">{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Filter & Batch Bar ─────────────────────────────────────────────────────

function FilterBar({
  search, setSearch,
  priorityFilter, setPriorityFilter,
  tagFilter, setTagFilter,
  sortMode, setSortMode,
  allTags,
  batchMode, setBatchMode,
  selectedCount,
  onBatchMove, onBatchComplete, onBatchDelete,
  searchRef,
}: {
  search: string; setSearch: (v: string) => void;
  priorityFilter: Priority | 'all'; setPriorityFilter: (v: Priority | 'all') => void;
  tagFilter: string; setTagFilter: (v: string) => void;
  sortMode: SortMode; setSortMode: (v: SortMode) => void;
  allTags: string[];
  batchMode: boolean; setBatchMode: (v: boolean) => void;
  selectedCount: number;
  onBatchMove: (col: Column) => void;
  onBatchComplete: () => void;
  onBatchDelete: () => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="space-y-3 mb-6 animate-fade-slide-up" style={{ animationDelay: '100ms' }}>
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" style={{ fontSize: 18 }}>search</span>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search tasks...  ( / )"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="inp pl-10 !bg-card-dark"
          />
        </div>

        {/* Priority Filter */}
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')} className="inp !w-auto !bg-card-dark min-w-[120px]">
          <option value="all">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Tag Filter */}
        <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="inp !w-auto !bg-card-dark min-w-[120px]">
          <option value="">All Tags</option>
          {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
        </select>

        {/* Sort */}
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="inp !w-auto !bg-card-dark min-w-[130px]">
          <option value="priority">Sort: Priority</option>
          <option value="created">Sort: Newest</option>
          <option value="due">Sort: Due Date</option>
        </select>

        {/* Batch toggle */}
        <button
          onClick={() => setBatchMode(!batchMode)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${batchMode ? 'bg-primary/20 text-primary border-primary/40' : 'bg-card-dark text-foreground-muted border-white/5 hover:text-foreground'}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>checklist</span>
          Select
        </button>
      </div>

      {/* Batch actions bar */}
      {batchMode && selectedCount > 0 && (
        <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2.5 animate-slide-down">
          <span className="text-sm font-bold text-primary">{selectedCount} selected</span>
          <div className="flex-1" />
          <select
            onChange={(e) => { if (e.target.value) { onBatchMove(e.target.value as Column); e.target.value = ''; } }}
            className="inp !w-auto !bg-bg-dark !py-1.5 text-xs min-w-[120px]"
            defaultValue=""
          >
            <option value="" disabled>Move to...</option>
            {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={onBatchComplete} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary/20 text-primary hover:bg-primary hover:text-bg-dark transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
            Complete
          </button>
          <button onClick={onBatchDelete} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white transition-all">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Tag Input with Autocomplete ─────────────────────────────────────────────

function TagInput({ tags, onChange, allTags }: { tags: string[]; onChange: (t: string[]) => void; allTags: string[] }) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = allTags.filter(t => !tags.includes(t) && t.toLowerCase().includes(input.toLowerCase()));

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (input.trim()) addTag(input);
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="relative">
      <div className="inp !p-2 flex flex-wrap gap-1.5 items-center min-h-[42px]">
        {tags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 bg-secondary-dark text-primary text-xs font-semibold px-2 py-1 rounded-md border border-primary/20">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>close</span>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? 'Add tags...' : ''}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-foreground outline-none placeholder:text-foreground-muted"
        />
      </div>
      {showSuggestions && input && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-bg-secondary border border-border rounded-lg shadow-xl max-h-32 overflow-y-auto">
          {suggestions.slice(0, 6).map(s => (
            <button key={s} type="button" onMouseDown={() => addTag(s)} className="w-full text-left px-3 py-2 text-sm text-foreground-muted hover:bg-white/5 hover:text-primary transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Subtask Editor ──────────────────────────────────────────────────────────

function SubtaskEditor({ subtasks, onChange }: { subtasks: SubTask[]; onChange: (s: SubTask[]) => void }) {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (!newItem.trim()) return;
    onChange([...subtasks, { id: Math.random().toString(36).substring(2, 9), title: newItem.trim(), done: false }]);
    setNewItem('');
  };

  const toggleItem = (id: string) => {
    onChange(subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s));
  };

  const removeItem = (id: string) => {
    onChange(subtasks.filter(s => s.id !== id));
  };

  return (
    <div>
      <div className="space-y-1.5 mb-2">
        {subtasks.map(item => (
          <div key={item.id} className="flex items-center gap-2 group">
            <button type="button" onClick={() => toggleItem(item.id)} className={`size-5 rounded border flex items-center justify-center transition-all shrink-0 ${item.done ? 'bg-primary border-primary' : 'border-border hover:border-primary/50'}`}>
              {item.done && <span className="material-symbols-outlined text-bg-dark" style={{ fontSize: 14 }}>check</span>}
            </button>
            <span className={`text-sm flex-1 ${item.done ? 'line-through text-foreground-muted' : 'text-foreground'}`}>{item.title}</span>
            <button type="button" onClick={() => removeItem(item.id)} className="opacity-0 group-hover:opacity-100 text-foreground-muted hover:text-red-400 transition-all">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
          placeholder="Add checklist item..."
          className="inp !py-1.5 !text-xs flex-1"
        />
        <button type="button" onClick={addItem} className="px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-foreground-muted hover:text-primary">
          Add
        </button>
      </div>
    </div>
  );
}

// ─── Keyboard Shortcut Hint ──────────────────────────────────────────────────

function KbdHint() {
  return (
    <div className="hidden md:flex items-center gap-4 text-[10px] text-foreground-muted/50 uppercase tracking-wider mt-4 justify-center">
      <span><kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-foreground-muted/70">N</kbd> New task</span>
      <span><kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-foreground-muted/70">/</kbd> Search</span>
      <span><kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-foreground-muted/70">B</kbd> Batch select</span>
      <span><kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-foreground-muted/70">Esc</kbd> Close</span>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [agents, setAgents] = useState<{ id: string; label: string }[]>([]);

  // Batch selection
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Undo
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('priority');

  // Form state
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '', description: '', priority: 'medium', column: 'Backlog', tags: [], dueDate: '', subtasks: [], assignedTo: ''
  });

  const searchRef = useRef<HTMLInputElement>(null);

  // Persist with undo snapshot
  const persistTasks = useCallback((updated: Task[], undoLabel?: string) => {
    if (undoLabel) {
      setUndoAction({ label: undoLabel, previousTasks: tasks, timestamp: Date.now() });
    }
    setTasks(updated);
    saveTasksToStorage(updated);
  }, [tasks]);

  const handleUndo = useCallback(() => {
    if (undoAction) {
      setTasks(undoAction.previousTasks);
      saveTasksToStorage(undoAction.previousTasks);
      setUndoAction(null);
    }
  }, [undoAction]);

  // Load tasks + agents
  useEffect(() => {
    loadTasks();
    fetch('/api/agents').then(r => r.ok ? r.json() : []).then((data: any[]) => {
      setAgents(data.map((a: any) => ({ id: a.id, label: a.label })));
    }).catch(() => {});
  }, []);

  async function loadTasks() {
    const stored = loadTasksFromStorage();
    if (stored && stored.length > 0) {
      setTasks(stored);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
        saveTasksToStorage(data);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      if (e.key === 'Escape') {
        if (deleteTarget) { setDeleteTarget(null); return; }
        if (isModalOpen) { closeModal(); return; }
        if (batchMode) { setBatchMode(false); setSelectedIds(new Set()); return; }
      }

      if (isInput) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        openNewTaskModal();
      } else if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setBatchMode(prev => !prev);
        setSelectedIds(new Set());
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isModalOpen, deleteTarget, batchMode, handleUndo]);

  // Clear batch selection when exiting batch mode
  useEffect(() => {
    if (!batchMode) setSelectedIds(new Set());
  }, [batchMode]);

  // Compute all tags for autocomplete
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    tasks.forEach(t => t.tags?.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [tasks]);

  // Filter
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    if (priorityFilter !== 'all') {
      result = result.filter(t => t.priority === priorityFilter);
    }
    if (tagFilter) {
      result = result.filter(t => t.tags?.includes(tagFilter));
    }
    return result;
  }, [tasks, search, priorityFilter, tagFilter]);

  // Batch toggle
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Batch operations
  const batchMove = (col: Column) => {
    const ids = selectedIds;
    const updated = tasks.map(t => ids.has(t.id) ? { ...t, column: col, updatedAt: new Date().toISOString() } : t);
    persistTasks(updated, `Moved ${ids.size} task${ids.size > 1 ? 's' : ''} to ${col}`);
    ids.forEach(id => syncToApi('PUT', { id, column: col, updatedAt: new Date().toISOString() }));
    setSelectedIds(new Set());
  };

  const batchComplete = () => {
    const ids = selectedIds;
    const updated = tasks.map(t => ids.has(t.id) ? { ...t, column: 'Done' as Column, updatedAt: new Date().toISOString() } : t);
    persistTasks(updated, `Completed ${ids.size} task${ids.size > 1 ? 's' : ''}`);
    ids.forEach(id => syncToApi('PUT', { id, column: 'Done', updatedAt: new Date().toISOString() }));
    setSelectedIds(new Set());
  };

  const batchDelete = () => {
    const count = selectedIds.size;
    setDeleteTarget({
      message: `Delete ${count} selected task${count > 1 ? 's' : ''}? This cannot be undone.`,
      onConfirm: () => {
        const ids = selectedIds;
        const updated = tasks.filter(t => !ids.has(t.id));
        persistTasks(updated, `Deleted ${count} task${count > 1 ? 's' : ''}`);
        ids.forEach(id => syncToApi('DELETE', { id }));
        setSelectedIds(new Set());
        setDeleteTarget(null);
      }
    });
  };

  // Drag-and-drop handler
  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    
    // Dropped outside any droppable or in the same position
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }

    const sourceColumn = source.droppableId as Column;
    const destColumn = destination.droppableId as Column;
    const taskId = draggableId;
    const task = tasks.find(t => t.id === taskId);

    if (!task) return;

    // Update task column
    const updated = tasks.map(t => 
      t.id === taskId 
        ? { ...t, column: destColumn, updatedAt: new Date().toISOString() } 
        : t
    );

    persistTasks(updated, `Moved "${task.title}" to ${destColumn}`);
    syncToApi('PUT', { id: taskId, column: destColumn, updatedAt: new Date().toISOString() });
  };

  const moveTask = (taskId: string, direction: 'left' | 'right') => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const currentIndex = COLUMNS.indexOf(task.column);
    const newIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= COLUMNS.length) return;
    const newCol = COLUMNS[newIndex];
    const updated = tasks.map(t => t.id === taskId ? { ...t, column: newCol, updatedAt: new Date().toISOString() } : t);
    persistTasks(updated, `Moved "${task.title}" to ${newCol}`);
    syncToApi('PUT', { id: taskId, column: newCol, updatedAt: new Date().toISOString() });
  };

  const markDone = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const updated = tasks.map(t => t.id === taskId ? { ...t, column: 'Done' as Column, updatedAt: new Date().toISOString() } : t);
    persistTasks(updated, task ? `Completed "${task.title}"` : 'Task completed');
    syncToApi('PUT', { id: taskId, column: 'Done', updatedAt: new Date().toISOString() });
  };

  // Modal handlers
  const openNewTaskModal = () => {
    setEditingTask(null);
    setFormData({ title: '', description: '', priority: 'medium', column: 'Backlog', tags: [], dueDate: '', subtasks: [], assignedTo: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({ ...task, subtasks: task.subtasks || [], dueDate: task.dueDate || '', assignedTo: task.assignedTo || '' });
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingTask(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    if (editingTask) {
      const updatedTask = {
        ...editingTask,
        ...formData,
        dueDate: formData.dueDate || undefined,
        assignedTo: formData.assignedTo || undefined,
        subtasks: formData.subtasks && formData.subtasks.length > 0 ? formData.subtasks : undefined,
        updatedAt: new Date().toISOString()
      } as Task;
      const updated = tasks.map(t => t.id === editingTask.id ? updatedTask : t);
      persistTasks(updated);
      syncToApi('PUT', updatedTask);
    } else {
      const newTask: Task = {
        id: Math.random().toString(36).substring(2, 9),
        title: formData.title || '',
        description: formData.description || '',
        column: (formData.column as Column) || 'Backlog',
        priority: (formData.priority as Priority) || 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: formData.tags || [],
        dueDate: formData.dueDate || undefined,
        assignedTo: formData.assignedTo || undefined,
        subtasks: formData.subtasks && formData.subtasks.length > 0 ? formData.subtasks : undefined,
      };
      persistTasks([...tasks, newTask]);
      syncToApi('POST', newTask);
    }
    closeModal();
  };

  const handleDeleteRequest = () => {
    if (editingTask) {
      setDeleteTarget({
        message: `Delete "${editingTask.title}"? This cannot be undone.`,
        onConfirm: () => {
          persistTasks(tasks.filter(t => t.id !== editingTask.id), `Deleted "${editingTask.title}"`);
          syncToApi('DELETE', { id: editingTask.id });
          setDeleteTarget(null);
          closeModal();
        }
      });
    }
  };

  const getPriorityStyles = (p: Priority) => {
    switch (p) {
      case 'high': return 'bg-primary/20 text-primary border-primary/50';
      case 'medium': return 'bg-secondary-dark text-emerald-400 border-emerald-400/50';
      case 'low': return 'bg-card-dark text-foreground-muted border-border';
      default: return 'bg-card-dark text-foreground-muted border-border';
    }
  };

  const getDueBadge = (dueDate?: string, column?: Column) => {
    if (!dueDate || column === 'Done') return null;
    const status = getDueDateStatus(dueDate);
    const label = formatDate(dueDate);
    switch (status) {
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-400 bg-red-400/15 px-2 py-0.5 rounded-full border border-red-400/30">
            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>schedule</span>
            {label}
          </span>
        );
      case 'soon':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-400/15 px-2 py-0.5 rounded-full border border-amber-400/30">
            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>schedule</span>
            {label}
          </span>
        );
      case 'ok':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground-muted bg-white/5 px-2 py-0.5 rounded-full">
            <span className="material-symbols-outlined" style={{ fontSize: 11 }}>schedule</span>
            {label}
          </span>
        );
      default: return null;
    }
  };

  const getAgentLabel = (id?: string) => {
    if (!id) return null;
    const agent = agents.find(a => a.id === id);
    return agent?.label || id;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary font-bold animate-pulse">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg-dark/80 backdrop-blur-md px-4 md:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-lg p-1.5">
              <span className="material-symbols-outlined text-bg-dark font-bold" style={{ fontSize: 22 }}>checklist</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Protocol Active</span>
              <h1 className="text-xl font-bold tracking-tight">Task Board</h1>
            </div>
          </div>
          <button
            onClick={openNewTaskModal}
            className="size-12 bg-primary text-bg-dark rounded-full shadow-lg shadow-primary/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
            title="New task (N)"
          >
            <span className="material-symbols-outlined font-bold" style={{ fontSize: 24 }}>add</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        <StatsBar tasks={tasks} />

        <FilterBar
          search={search} setSearch={setSearch}
          priorityFilter={priorityFilter} setPriorityFilter={setPriorityFilter}
          tagFilter={tagFilter} setTagFilter={setTagFilter}
          sortMode={sortMode} setSortMode={setSortMode}
          allTags={allTags}
          batchMode={batchMode} setBatchMode={setBatchMode}
          selectedCount={selectedIds.size}
          onBatchMove={batchMove} onBatchComplete={batchComplete} onBatchDelete={batchDelete}
          searchRef={searchRef}
        />

        {/* Kanban Board */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
            {COLUMNS.map((col) => {
              const columnTasks = sortTasks(filteredTasks.filter(t => t.column === col), sortMode);
              return (
                <div
                  key={col}
                  className="flex flex-col min-w-[280px] md:min-w-[300px] lg:min-w-[320px] flex-1"
                >
                  {/* Column Header */}
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-t-xl bg-gradient-to-b ${colGradients[col]} border border-primary/10 border-b-0`}>
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
                      {colIcons[col]}
                    </span>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex-1">{col}</h2>
                    <CountBadge count={columnTasks.length} />
                  </div>

                  {/* Column Body with Droppable */}
                  <Droppable droppableId={col}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 bg-card-dark rounded-b-xl p-3 border border-t-0 min-h-[300px] md:min-h-[400px] space-y-3 transition-colors duration-200 ${snapshot.isDraggingOver ? 'border-primary/30 bg-primary/5' : 'border-white/5'}`}
                      >
                        {columnTasks.map((task, idx) => {
                          const colIdx = COLUMNS.indexOf(col);
                          const canMoveLeft = colIdx > 0;
                          const canMoveRight = colIdx < COLUMNS.length - 1;
                          const isDone = col === 'Done';
                          const dueBadge = getDueBadge(task.dueDate, task.column);
                          const isSelected = selectedIds.has(task.id);
                          const taskAge = getTaskAge(task, task.column);
                          return (
                            <Draggable key={task.id} draggableId={task.id} index={idx} isDragDisabled={batchMode}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={batchMode ? () => toggleSelect(task.id) : undefined}
                                  className={`relative rounded-xl border border-l-4 bg-bg-dark p-4 group animate-slide-up ${batchMode ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${isSelected ? 'border-primary/50 ring-1 ring-primary/30' : 'border-white/10'} ${snapshot.isDragging ? 'shadow-2xl shadow-primary/20 scale-105 rotate-2' : 'card-hover'} transition-all ${idx === 0 ? '' : idx === 1 ? 'delay-1' : idx === 2 ? 'delay-2' : idx === 3 ? 'delay-3' : idx === 4 ? 'delay-4' : 'delay-5'}`}
                                  style={{ borderLeftColor: taskAge.borderColor }}
                                >
                                  {/* Drag handle (mobile visual indicator) + Selection checkbox + Priority badge + due date + edit */}
                                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    {!batchMode && (
                                      <div className="md:hidden text-foreground-muted pointer-events-none">
                                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>drag_handle</span>
                                      </div>
                                    )}
                                    {batchMode && (
                                      <div className={`size-5 rounded border flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-border'}`}>
                                        {isSelected && <span className="material-symbols-outlined text-bg-dark" style={{ fontSize: 14 }}>check</span>}
                                      </div>
                                    )}
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${getPriorityStyles(task.priority)}`}>
                                      {task.priority}
                                    </span>
                                    {/* Task age indicator */}
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${getAgeTextClass(taskAge)} bg-opacity-15`} style={{ backgroundColor: `${taskAge.color}20` }}>
                                      <span className="material-symbols-outlined" style={{ fontSize: 11 }}>schedule</span>
                                      <span className="hidden sm:inline">{taskAge.label} in {task.column}</span>
                                      <span className="sm:hidden">{taskAge.label}</span>
                                    </span>
                                    {dueBadge}
                                    {task.assignedTo && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-foreground-muted bg-white/5 px-2 py-0.5 rounded-full">
                                        <span className="material-symbols-outlined" style={{ fontSize: 11 }}>smart_toy</span>
                                        {getAgentLabel(task.assignedTo)}
                                      </span>
                                    )}
                                    {!batchMode && (
                                      <button
                                        onClick={() => openEditModal(task)}
                                        className="ml-auto text-foreground-muted hover:text-primary transition-colors p-1"
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                                      </button>
                                    )}
                                  </div>

                                  <h3 className={`font-semibold group-hover:text-primary transition-colors mb-2 leading-snug ${isDone ? 'line-through text-foreground-muted' : 'text-foreground'}`}>
                                    {task.title}
                                  </h3>
                      {task.description && (
                        <p className="text-xs text-foreground-muted line-clamp-2 mb-3">{task.description}</p>
                      )}

                      <SubtaskProgress subtasks={task.subtasks || []} />

                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {task.tags.map(tag => (
                            <span key={tag} className="text-[10px] font-semibold text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {task.links && task.links.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {task.links.map((link, i) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold bg-secondary-dark text-primary border border-primary/30 hover:bg-primary hover:text-bg-dark transition-all"
                            >
                              {link.type === 'drive' && '📁'}
                              {link.type === 'brain' && '🧠'}
                              {link.type === 'file' && '📄'}
                              {link.type === 'external' && '🔗'}
                              {link.label}
                            </a>
                          ))}
                        </div>
                      )}

                                  {/* Action buttons (hidden in batch mode) */}
                                  {!batchMode && (
                                    <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                                      <button
                                        onClick={() => moveTask(task.id, 'left')}
                                        disabled={!canMoveLeft}
                                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95"
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>
                                      </button>
                                      {!isDone && (
                                        <button
                                          onClick={() => markDone(task.id)}
                                          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold bg-primary/20 text-primary hover:bg-primary hover:text-bg-dark transition-all active:scale-95"
                                        >
                                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                                          Done
                                        </button>
                                      )}
                                      <button
                                        onClick={() => moveTask(task.id, 'right')}
                                        disabled={!canMoveRight}
                                        className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95"
                                      >
                                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {columnTasks.length === 0 && (
                          <EmptyColumn column={col} />
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>

        <KbdHint />
      </div>

      {/* Task Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 pt-[10vh] backdrop-blur-sm animate-fade-in overflow-y-auto" onClick={closeModal}>
          <div
            className="w-full max-w-lg rounded-2xl bg-bg-secondary border border-border p-6 shadow-2xl animate-scale-in mb-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-primary/15 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>{editingTask ? 'edit_note' : 'add_task'}</span>
                </div>
                <h3 className="text-xl font-bold">{editingTask ? 'Edit Task' : 'New Task'}</h3>
              </div>
              <button onClick={closeModal} className="size-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-foreground-muted hover:text-foreground">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">Title</label>
                <input type="text" required className="inp" placeholder="What needs to be done?" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">Description</label>
                <textarea className="inp h-20 resize-none" placeholder="Add details..." value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>

              {/* Priority + Column + Due Date */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">Priority</label>
                  <select className="inp" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">Column</label>
                  <select className="inp" value={formData.column} onChange={(e) => setFormData({ ...formData, column: e.target.value as Column })}>
                    {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">Due Date</label>
                  <input type="date" className="inp" value={formData.dueDate || ''} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} />
                </div>
              </div>

              {/* Assign to agent */}
              {agents.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">Assign to Agent</label>
                  <select className="inp" value={formData.assignedTo || ''} onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}>
                    <option value="">Unassigned</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                </div>
              )}

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">Tags</label>
                <TagInput tags={formData.tags || []} onChange={(tags) => setFormData({ ...formData, tags })} allTags={allTags} />
              </div>

              {/* Subtasks / Checklist */}
              <div>
                <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">Checklist</label>
                <SubtaskEditor subtasks={formData.subtasks || []} onChange={(subtasks) => setFormData({ ...formData, subtasks })} />
              </div>

              {/* Linked Resources (edit mode only) */}
              {editingTask?.links && editingTask.links.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">Linked Resources</label>
                  <div className="space-y-2">
                    {editingTask.links.map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-border bg-bg-dark px-3 py-2.5 text-sm text-primary hover:bg-secondary-dark transition-colors">
                        <span>{link.type === 'drive' ? '📁' : link.type === 'brain' ? '🧠' : link.type === 'file' ? '📄' : '🔗'}</span>
                        <span>{link.label}</span>
                        <span className="ml-auto text-foreground-muted text-xs">↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-6 flex justify-between pt-4 border-t border-border">
                {editingTask && (
                  <button type="button" onClick={handleDeleteRequest} className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors font-semibold">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                    Delete
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition-colors font-semibold">Cancel</button>
                  <button type="submit" className="bg-primary hover:brightness-110 text-bg-dark px-5 py-2 rounded-lg font-bold transition-all">
                    {editingTask ? 'Save Changes' : 'Create Task'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          message={deleteTarget.message}
          onConfirm={deleteTarget.onConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Undo Toast */}
      {undoAction && (
        <UndoToast
          action={undoAction}
          onUndo={handleUndo}
          onDismiss={() => setUndoAction(null)}
        />
      )}
    </div>
  );
}
