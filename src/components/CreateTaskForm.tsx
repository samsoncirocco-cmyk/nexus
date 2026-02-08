'use client';

import { useState, useCallback, FormEvent } from 'react';

interface CreateTaskFormProps {
  onSuccess?: (task: any) => void;
  onCancel?: () => void;
}

export default function CreateTaskForm({ onSuccess, onCancel }: CreateTaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [status, setStatus] = useState<'todo' | 'in-progress' | 'done'>('todo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
          status,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create task');
      }

      const newTask = await response.json();
      
      // Show success state briefly
      setSuccess(true);
      
      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setStatus('todo');
      
      // Notify parent component
      if (onSuccess) {
        onSuccess(newTask);
      }

      // Auto-close after short delay (parent should handle this via onSuccess)
      setTimeout(() => {
        setSuccess(false);
      }, 1500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      setIsSubmitting(false);
    }
  }, [title, description, priority, status, onSuccess]);

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label htmlFor="task-title" className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">
          Title *
        </label>
        <input
          id="task-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          className="inp w-full"
          required
          disabled={isSubmitting}
          autoFocus
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="task-description" className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">
          Description
        </label>
        <textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details..."
          className="inp w-full h-24 resize-none"
          disabled={isSubmitting}
        />
      </div>

      {/* Priority and Status */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="task-priority" className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">
            Priority
          </label>
          <select
            id="task-priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
            className="inp w-full"
            disabled={isSubmitting}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label htmlFor="task-status" className="block text-xs font-bold text-foreground-muted mb-2 uppercase tracking-wider">
            Column
          </label>
          <select
            id="task-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as 'todo' | 'in-progress' | 'done')}
            className="inp w-full"
            disabled={isSubmitting}
          >
            <option value="todo">Backlog</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 flex items-center gap-3 animate-slide-down">
          <span className="material-symbols-outlined text-red-400" style={{ fontSize: 18 }}>
            error
          </span>
          <span className="text-sm text-red-400 flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
              close
            </span>
          </button>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="rounded-lg bg-primary/10 border border-primary/30 px-4 py-3 flex items-center gap-3 animate-slide-down">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
            check_circle
          </span>
          <span className="text-sm text-primary flex-1">Task created successfully!</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={handleCancel}
          className="px-5 py-2.5 text-sm text-foreground-muted hover:text-foreground transition-colors font-semibold rounded-lg disabled:opacity-50"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !title.trim()}
          className="px-5 py-2.5 text-sm bg-primary text-bg-dark rounded-lg font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>
                progress_activity
              </span>
              Creating...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                add_task
              </span>
              Create Task
            </>
          )}
        </button>
      </div>
    </form>
  );
}
