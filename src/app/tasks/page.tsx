'use client';

import { useState, useEffect, useCallback } from 'react';

export type Priority = 'low' | 'medium' | 'high';
export type Column = 'Backlog' | 'In Progress' | 'Waiting on Samson' | 'Done';

export interface TaskLink {
  label: string;
  url: string;
  type: 'drive' | 'brain' | 'file' | 'external';
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
}

const COLUMNS: Column[] = ['Backlog', 'In Progress', 'Waiting on Samson', 'Done'];

const colIcons: Record<Column, string> = {
  'Backlog': 'inbox',
  'In Progress': 'sync',
  'Waiting on Samson': 'hourglass_top',
  'Done': 'check_circle',
};

const STORAGE_KEY = 'second-brain-tasks';

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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '', description: '', priority: 'medium', column: 'Backlog', tags: []
  });

  const persistTasks = useCallback((updated: Task[]) => {
    setTasks(updated);
    saveTasksToStorage(updated);
  }, []);

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    // Try localStorage first (has latest state), fall back to server seed
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

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id); e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const handleDrop = (e: React.DragEvent, targetColumn: Column) => {
    e.preventDefault();
    if (!draggedTaskId) return;
    const task = tasks.find(t => t.id === draggedTaskId);
    if (task && task.column !== targetColumn) {
      const updated = tasks.map(t => t.id === draggedTaskId ? { ...t, column: targetColumn, updatedAt: new Date().toISOString() } : t);
      persistTasks(updated);
    }
    setDraggedTaskId(null);
  };

  const moveTask = (taskId: string, direction: 'left' | 'right') => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const currentIndex = COLUMNS.indexOf(task.column);
    const newIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex < 0 || newIndex >= COLUMNS.length) return;
    const updated = tasks.map(t => t.id === taskId ? { ...t, column: COLUMNS[newIndex], updatedAt: new Date().toISOString() } : t);
    persistTasks(updated);
  };

  const markDone = (taskId: string) => {
    const updated = tasks.map(t => t.id === taskId ? { ...t, column: 'Done' as Column, updatedAt: new Date().toISOString() } : t);
    persistTasks(updated);
  };

  const openNewTaskModal = () => {
    setEditingTask(null);
    setFormData({ title: '', description: '', priority: 'medium', column: 'Backlog', tags: [] });
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task); setFormData({ ...task }); setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditingTask(null); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;
    if (editingTask) {
      const updated = tasks.map(t => t.id === editingTask.id ? { ...editingTask, ...formData, updatedAt: new Date().toISOString() } as Task : t);
      persistTasks(updated);
    } else {
      const newTask: Task = {
        ...(formData as Task),
        id: Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: formData.tags || [],
      };
      persistTasks([...tasks, newTask]);
    }
    closeModal();
  };

  const handleDelete = () => {
    if (editingTask && confirm('Delete this task?')) {
      persistTasks(tasks.filter(t => t.id !== editingTask.id));
      closeModal();
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
          >
            <span className="material-symbols-outlined font-bold" style={{ fontSize: 24 }}>add</span>
          </button>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="p-4 md:p-6 lg:p-8">
        <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
          {COLUMNS.map((col) => {
            const columnTasks = tasks.filter(t => t.column === col);
            return (
              <div
                key={col}
                className="flex flex-col min-w-[280px] md:min-w-[300px] lg:min-w-[320px] flex-1"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col)}
              >
                {/* Column Header */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-t-xl bg-secondary-dark border border-primary/10 border-b-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
                    {colIcons[col]}
                  </span>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex-1">{col}</h2>
                  <span className="bg-primary text-bg-dark text-xs font-bold px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>

                {/* Column Body */}
                <div className="flex-1 bg-card-dark rounded-b-xl p-3 border border-white/5 border-t-0 min-h-[300px] md:min-h-[400px] space-y-3">
                  {columnTasks.map((task) => {
                    const colIdx = COLUMNS.indexOf(col);
                    const canMoveLeft = colIdx > 0;
                    const canMoveRight = colIdx < COLUMNS.length - 1;
                    const isDone = col === 'Done';
                    return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className="rounded-xl border border-white/10 bg-bg-dark p-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${getPriorityStyles(task.priority)}`}>
                          {task.priority}
                        </span>
                        <button
                          onClick={() => openEditModal(task)}
                          className="text-foreground-muted hover:text-primary transition-colors p-1"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
                        </button>
                      </div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-2 leading-snug">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-xs text-foreground-muted line-clamp-2 mb-3">{task.description}</p>
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
                      {/* Action buttons — mobile-friendly */}
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
                    </div>
                    );
                  })}
                  {columnTasks.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-foreground-muted text-sm border border-dashed border-white/10 rounded-xl">
                      Drop tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
          <div
            className="w-full max-w-md rounded-2xl bg-bg-secondary border border-border p-6 shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-6 text-xl font-bold">{editingTask ? 'Edit Task' : 'New Task'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">Title</label>
                <input type="text" required className="inp" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">Description</label>
                <textarea className="inp h-24 resize-none" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              </div>

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

              <div className="mt-6 flex justify-between pt-4 border-t border-border">
                {editingTask && (
                  <button type="button" onClick={handleDelete} className="text-sm text-red-400 hover:text-red-300 transition-colors font-semibold">Delete</button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition-colors font-semibold">Cancel</button>
                  <button type="submit" className="bg-primary hover:brightness-110 text-bg-dark px-5 py-2 rounded-lg font-bold transition-all">Save</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
