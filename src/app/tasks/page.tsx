'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Task, TaskLink, Column, Priority, getTasks, updateTask, createTask, deleteTask } from '../actions/tasks';

const COLUMNS: Column[] = ['Backlog', 'In Progress', 'Waiting on Samson', 'Done'];

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'medium',
    column: 'Backlog',
    tags: []
  });

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      const data = await getTasks();
      setTasks(data);
    } catch (e) {
      console.error('Failed to load tasks', e);
    } finally {
      setLoading(false);
    }
  }

  // --- Drag and Drop Handlers ---
  
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedTaskId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: Column) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    const task = tasks.find((t) => t.id === draggedTaskId);
    if (task && task.column !== targetColumn) {
      const updatedTask = { ...task, column: targetColumn };
      
      // Optimistic update
      setTasks((prev) => 
        prev.map((t) => (t.id === draggedTaskId ? updatedTask : t))
      );

      // Server update
      await updateTask(updatedTask);
    }
    setDraggedTaskId(null);
  };

  // --- Modal / Form Handlers ---

  const openNewTaskModal = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      column: 'Backlog',
      tags: []
    });
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

    if (editingTask) {
      // Update existing
      const updated = { ...editingTask, ...formData } as Task;
      await updateTask(updated);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      // Create new
      const newOne = await createTask(formData as any);
      setTasks((prev) => [...prev, newOne]);
    }
    closeModal();
  };

  const handleDelete = async () => {
    if (editingTask && confirm('Are you sure you want to delete this task?')) {
      await deleteTask(editingTask.id);
      setTasks((prev) => prev.filter((t) => t.id !== editingTask.id));
      closeModal();
    }
  };

  // --- Render Helpers ---

  const getPriorityStyles = (p: Priority) => {
    switch (p) {
      case 'high': return 'bg-[#FEE123]/20 text-[#FEE123] border-[#FEE123]/50';
      case 'medium': return 'bg-[#154733] text-[#4ADE80] border-[#4ADE80]/50';
      case 'low': return 'bg-[#1a1a1a] text-[#9CA3AF] border-[#262626]';
      default: return 'bg-[#1a1a1a] text-[#9CA3AF] border-[#262626]';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#FEE123] font-bold animate-pulse">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] pt-14 md:pt-0 pb-20 md:pb-0">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-40 md:hidden bg-[#111111] border-b border-[#262626] px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <span className="font-bold text-[#FAFAFA]">Tasks</span>
        </Link>
        <button 
          onClick={openNewTaskModal}
          className="bg-[#FEE123] text-[#004F27] px-3 py-1.5 rounded-lg text-sm font-bold tap-target"
        >
          + New
        </button>
      </div>

      <div className="p-4 md:p-6 lg:p-8">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl hover:scale-110 transition-transform">🧠</Link>
            <h1 className="text-2xl md:text-3xl font-bold text-[#FAFAFA]">Tasks Board</h1>
            <div className="w-16 h-1 bg-[#FEE123] rounded-full" />
          </div>
          <button 
            onClick={openNewTaskModal}
            className="bg-[#FEE123] hover:bg-[#FFE94D] text-[#004F27] px-5 py-2.5 rounded-lg font-bold transition-all hover:shadow-lg hover:shadow-[#FEE123]/20"
          >
            + New Task
          </button>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4 scroll-hidden kanban-container">
          {COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => t.column === col);
            return (
              <div 
                key={col}
                className="flex flex-col min-w-[280px] md:min-w-[300px] lg:min-w-[320px] kanban-column"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col)}
              >
                {/* Column Header */}
                <div className="gradient-oregon rounded-t-xl p-3 md:p-4 border border-[#FEE123]/20 border-b-0">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[#FAFAFA]">
                      {col}
                    </h2>
                    <span className="bg-[#FEE123] text-[#004F27] text-xs font-bold px-2 py-0.5 rounded-full">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>
                
                {/* Column Body */}
                <div className="flex-1 bg-[#111111] rounded-b-xl p-3 border border-[#262626] border-t-0 min-h-[300px] md:min-h-[400px] space-y-3">
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => openEditModal(task)}
                      className="cursor-pointer rounded-xl border border-[#262626] bg-[#0A0A0A] p-4 hover:border-[#FEE123] hover:shadow-lg hover:shadow-[#FEE123]/5 transition-all active:cursor-grabbing group tap-target"
                    >
                      {/* Priority Badge */}
                      <div className="mb-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${getPriorityStyles(task.priority)}`}>
                          {task.priority}
                        </span>
                      </div>
                      
                      {/* Title */}
                      <h3 className="font-semibold text-[#FAFAFA] group-hover:text-[#FEE123] transition-colors mb-2 leading-snug">
                        {task.title}
                      </h3>
                      
                      {/* Description */}
                      {task.description && (
                        <p className="text-xs text-[#9CA3AF] line-clamp-2 mb-3">{task.description}</p>
                      )}
                      
                      {/* Links */}
                      {task.links && task.links.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {task.links.map((link, i) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold bg-[#154733] text-[#FEE123] border border-[#FEE123]/30 hover:bg-[#FEE123] hover:text-[#004F27] transition-all tap-target"
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
                    </div>
                  ))}
                  
                  {/* Empty State */}
                  {columnTasks.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-[#9CA3AF] text-sm">
                      Drop tasks here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#111111] border-t border-[#262626] pb-safe">
        <div className="flex justify-around items-center py-2">
          <Link href="/" className="mobile-nav-item">
            <span className="text-xl">🏠</span>
            <span className="text-[10px] font-semibold">Home</span>
          </Link>
          <Link href="/tasks" className="mobile-nav-item active">
            <span className="text-xl">📋</span>
            <span className="text-[10px] font-semibold">Tasks</span>
          </Link>
          <Link href="/activity" className="mobile-nav-item">
            <span className="text-xl">⚡</span>
            <span className="text-[10px] font-semibold">Activity</span>
          </Link>
          <Link href="/deals" className="mobile-nav-item">
            <span className="text-xl">🎯</span>
            <span className="text-[10px] font-semibold">Pipeline</span>
          </Link>
        </div>
      </nav>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
          <div 
            className="w-full max-w-md rounded-2xl bg-[#111111] border border-[#262626] p-6 shadow-2xl animate-fade-in" 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-6 text-xl font-bold text-[#FAFAFA]">
              {editingTask ? 'Edit Task' : 'New Task'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#9CA3AF] mb-2 uppercase tracking-wider">Title</label>
                <input
                  type="text"
                  required
                  className="inp"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9CA3AF] mb-2 uppercase tracking-wider">Description</label>
                <textarea
                  className="inp h-24 resize-none"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#9CA3AF] mb-2 uppercase tracking-wider">Priority</label>
                  <select
                    className="inp"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9CA3AF] mb-2 uppercase tracking-wider">Column</label>
                  <select
                    className="inp"
                    value={formData.column}
                    onChange={(e) => setFormData({ ...formData, column: e.target.value as Column })}
                  >
                    {COLUMNS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {editingTask?.links && editingTask.links.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-[#9CA3AF] mb-2 uppercase tracking-wider">Linked Resources</label>
                  <div className="space-y-2">
                    {editingTask.links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-[#262626] bg-[#0A0A0A] px-3 py-2.5 text-sm text-[#FEE123] hover:bg-[#154733] transition-colors tap-target"
                      >
                        <span>
                          {link.type === 'drive' && '📁'}
                          {link.type === 'brain' && '🧠'}
                          {link.type === 'file' && '📄'}
                          {link.type === 'external' && '🔗'}
                        </span>
                        <span>{link.label}</span>
                        <span className="ml-auto text-[#9CA3AF] text-xs">↗</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-between pt-4 border-t border-[#262626]">
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
                    className="px-4 py-2 text-sm text-[#9CA3AF] hover:text-[#FAFAFA] transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-[#FEE123] hover:bg-[#FFE94D] text-[#004F27] px-5 py-2 rounded-lg font-bold transition-all"
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
