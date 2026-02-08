'use client';

import { useState, useEffect } from 'react';

export type Priority = 'low' | 'medium' | 'high';
export type Column = 'todo' | 'in-progress' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  column: Column;
  priority: Priority;
  assignee?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface NightshiftItem {
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

const COLUMNS: { key: Column; label: string; icon: string }[] = [
  { key: 'todo', label: 'To Do', icon: 'inbox' },
  { key: 'in-progress', label: 'In Progress', icon: 'sync' },
  { key: 'done', label: 'Done', icon: 'check_circle' },
];

const AGENT_LABELS = ['paul', 'nightshift', 'tatt-agent', 'brain-agent', 'sled-agent'];

export default function TasksPage() {
  const [tasksByColumn, setTasksByColumn] = useState<Record<Column, Task[]>>({
    todo: [],
    'in-progress': [],
    done: [],
  });
  const [nightshiftQueue, setNightshiftQueue] = useState<NightshiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'medium',
    assignee: '',
    tags: [],
  });

  useEffect(() => {
    loadTasks();
    loadNightshiftQueue();
  }, []);

  async function loadTasks() {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasksByColumn(data);
      }
    } catch (e) {
      console.error('Failed to load tasks:', e);
    }
    setLoading(false);
  }

  async function loadNightshiftQueue() {
    try {
      const res = await fetch('/api/vault/nightshift');
      if (res.ok) {
        const data = await res.json();
        setNightshiftQueue(data.items || []);
      }
    } catch (e) {
      console.error('Failed to load nightshift queue:', e);
    }
  }

  async function moveTask(taskId: string, newColumn: Column) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, column: newColumn }),
      });

      if (res.ok) {
        await loadTasks();
      }
    } catch (e) {
      console.error('Failed to move task:', e);
    }
  }

  async function assignTask(taskId: string, assignee: string) {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, assignee }),
      });

      if (res.ok) {
        await loadTasks();
      }
    } catch (e) {
      console.error('Failed to assign task:', e);
    }
  }

  const openNewTaskModal = () => {
    setEditingTask(null);
    setFormData({ title: '', description: '', priority: 'medium', assignee: '', tags: [] });
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({ ...task });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    try {
      if (editingTask) {
        // Update existing task
        const res = await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingTask.id, ...formData }),
        });
        if (res.ok) {
          await loadTasks();
          closeModal();
        }
      } else {
        // Create new task
        const res = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          await loadTasks();
          closeModal();
        }
      }
    } catch (e) {
      console.error('Failed to save task:', e);
    }
  };

  const handleDelete = async () => {
    if (!editingTask || !confirm('Delete this task?')) return;

    try {
      const res = await fetch(`/api/tasks?id=${editingTask.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadTasks();
        closeModal();
      }
    } catch (e) {
      console.error('Failed to delete task:', e);
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-400 border-red-400/50 bg-red-400/10';
      case 'medium':
        return 'text-primary border-primary/50 bg-primary/10';
      case 'low':
        return 'text-emerald-400 border-emerald-400/50 bg-emerald-400/10';
    }
  };

  const toggleExpand = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-primary font-bold animate-pulse">Loading tasks...</div>
      </div>
    );
  }

  const allTasks = [...tasksByColumn.todo, ...tasksByColumn['in-progress'], ...tasksByColumn.done];
  const totalTasks = allTasks.length;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg-dark/80 backdrop-blur-md px-4 md:px-8 pt-6 pb-4 border-b border-primary/10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-lg p-1.5">
              <span className="material-symbols-outlined text-bg-dark font-bold" style={{ fontSize: 22 }}>
                checklist
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Task Board</span>
              <h1 className="text-xl font-bold tracking-tight">
                {totalTasks} {totalTasks === 1 ? 'Task' : 'Tasks'}
              </h1>
            </div>
          </div>
          <button
            onClick={openNewTaskModal}
            className="size-12 bg-primary text-bg-dark rounded-full shadow-lg shadow-primary/20 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined font-bold" style={{ fontSize: 24 }}>
              add
            </span>
          </button>
        </div>
      </header>

      {/* Kanban Board */}
      <div className="p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto mb-8">
          {COLUMNS.map(({ key, label, icon }) => {
            const tasks = tasksByColumn[key] || [];
            return (
              <div key={key} className="flex flex-col">
                {/* Column Header */}
                <div className="flex items-center gap-3 px-4 py-3 rounded-t-xl bg-secondary-dark border border-primary/10 border-b-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
                    {icon}
                  </span>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground flex-1">{label}</h2>
                  <span className="bg-primary text-bg-dark text-xs font-bold px-2 py-0.5 rounded-full">
                    {tasks.length}
                  </span>
                </div>

                {/* Column Body */}
                <div className="flex-1 bg-card-dark rounded-b-xl p-3 border border-white/5 border-t-0 min-h-[400px] space-y-3">
                  {tasks.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-foreground-muted text-sm border border-dashed border-white/10 rounded-xl">
                      No tasks
                    </div>
                  )}
                  {tasks.map((task) => {
                    const isExpanded = expandedTaskId === task.id;
                    return (
                      <div
                        key={task.id}
                        className="rounded-xl border border-white/10 bg-bg-dark hover:border-primary/40 transition-all group"
                      >
                        {/* Card Header - Always Visible */}
                        <div
                          className="p-4 cursor-pointer"
                          onClick={() => toggleExpand(task.id)}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${getPriorityColor(
                                task.priority
                              )}`}
                            >
                              {task.priority}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(task);
                              }}
                              className="text-foreground-muted hover:text-primary transition-colors p-1"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                                edit
                              </span>
                            </button>
                          </div>

                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors mb-2 leading-snug">
                            {task.title}
                          </h3>

                          {task.assignee && (
                            <div className="flex items-center gap-1.5 text-xs text-primary mb-2">
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                                person
                              </span>
                              <span className="font-medium">{task.assignee}</span>
                            </div>
                          )}

                          {task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {task.tags.slice(0, 3).map((tag, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-foreground-muted"
                                >
                                  {tag}
                                </span>
                              ))}
                              {task.tags.length > 3 && (
                                <span className="text-[10px] px-2 py-0.5 text-foreground-muted">
                                  +{task.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                            {task.description && (
                              <p className="text-sm text-foreground-muted pt-3">{task.description}</p>
                            )}

                            {/* Move To Dropdown */}
                            <div>
                              <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">
                                Move to
                              </label>
                              <select
                                className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                                value={task.column}
                                onChange={(e) => moveTask(task.id, e.target.value as Column)}
                              >
                                {COLUMNS.map((col) => (
                                  <option key={col.key} value={col.key}>
                                    {col.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Assign to Agent */}
                            <div>
                              <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">
                                Assign to Agent
                              </label>
                              <select
                                className="w-full bg-bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                                value={task.assignee || ''}
                                onChange={(e) => assignTask(task.id, e.target.value)}
                              >
                                <option value="">Unassigned</option>
                                {AGENT_LABELS.map((agent) => (
                                  <option key={agent} value={agent}>
                                    {agent}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* NIGHTSHIFT Queue */}
        {nightshiftQueue.length > 0 && (
          <div className="max-w-7xl mx-auto">
            <div className="rounded-xl border border-primary/20 bg-secondary-dark p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>
                  schedule
                </span>
                <h2 className="text-lg font-bold uppercase tracking-wider">Nightshift Queue</h2>
                <span className="text-xs text-foreground-muted">(read-only)</span>
              </div>
              <div className="space-y-2">
                {nightshiftQueue.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-lg bg-bg-dark border border-white/10"
                  >
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                        item.priority === 'critical'
                          ? 'bg-red-500/20 text-red-400'
                          : item.priority === 'high'
                          ? 'bg-primary/20 text-primary'
                          : item.priority === 'medium'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {item.priority}
                    </span>
                    <span className="text-sm text-foreground">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-bg-secondary border border-border p-6 shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-6 text-xl font-bold">{editingTask ? 'Edit Task' : 'New Task'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">
                  Title
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-bg-dark border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-primary transition-colors"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  className="w-full bg-bg-dark border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-primary transition-colors h-24 resize-none"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">
                    Priority
                  </label>
                  <select
                    className="w-full bg-bg-dark border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-primary transition-colors"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">
                    Assignee
                  </label>
                  <select
                    className="w-full bg-bg-dark border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-primary transition-colors"
                    value={formData.assignee || ''}
                    onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {AGENT_LABELS.map((agent) => (
                      <option key={agent} value={agent}>
                        {agent}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  className="w-full bg-bg-dark border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:border-primary transition-colors"
                  value={formData.tags?.join(', ') || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                    })
                  }
                  placeholder="dev, urgent, feature"
                />
              </div>

              <div className="mt-6 flex justify-between pt-4 border-t border-border">
                {editingTask && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors font-semibold"
                  >
                    Delete
                  </button>
                )}
                <div className="flex gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-primary hover:brightness-110 text-bg-dark px-5 py-2 rounded-lg font-bold transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
