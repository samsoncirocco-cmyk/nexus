'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface RelatedNote {
  title: string;
  path: string;
  category: string;
  score: number;
  matchReason: string;
  tags: string[];
}

interface RelatedNotesProps {
  docPath?: string;
  activityId?: string;
  className?: string;
}

const categoryColors: Record<string, string> = {
  concepts: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  projects: 'bg-green-500/10 text-green-400 border-green-500/20',
  accounts: 'bg-[#FEE123]/10 text-[#FEE123] border-[#FEE123]/20',
  journal: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  erate: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  intel: 'bg-red-500/10 text-red-400 border-red-500/20',
  reports: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

export default function RelatedNotes({ docPath, activityId, className = '' }: RelatedNotesProps) {
  const [related, setRelated] = useState<RelatedNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed on mobile
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRelated() {
      if (!docPath && !activityId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        if (docPath) params.set('path', docPath);
        if (activityId) params.set('activity_id', activityId);

        const response = await fetch(`/api/related?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch related notes');
        }

        const data = await response.json();
        setRelated(data.related || []);
      } catch (err) {
        console.error('Error fetching related notes:', err);
        setError('Failed to load related notes');
      } finally {
        setLoading(false);
      }
    }

    fetchRelated();
  }, [docPath, activityId]);

  if (loading) {
    return (
      <div className={`bg-card-dark border border-white/5 rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>link</span>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Related Notes</h3>
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-white/5 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-white/5 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || related.length === 0) {
    return (
      <div className={`bg-card-dark border border-white/5 rounded-xl p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>link</span>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Related Notes</h3>
        </div>
        <p className="text-sm text-foreground-muted italic">
          {error || 'No related notes found'}
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-card-dark border border-white/5 rounded-xl overflow-hidden ${className}`}>
      {/* Header - Always visible, clickable on mobile */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors lg:cursor-default"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>link</span>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Related Notes</h3>
          <span className="text-xs text-foreground-muted">({related.length})</span>
        </div>
        <span className="material-symbols-outlined text-foreground-muted lg:hidden" style={{ fontSize: 18 }}>
          {isCollapsed ? 'expand_more' : 'expand_less'}
        </span>
      </button>

      {/* Content - Collapsible on mobile, always visible on desktop */}
      <div className={`${isCollapsed ? 'hidden' : 'block'} lg:block px-4 pb-4 space-y-2`}>
        {related.map((note) => {
          // Calculate relevance (normalize score to 0-5 range, show as dots)
          const maxScore = Math.max(...related.map(r => r.score));
          const relevanceDots = Math.min(5, Math.max(1, Math.round((note.score / maxScore) * 5)));

          return (
            <Link
              key={note.path}
              href={`/doc/${note.path}`}
              className="block group"
            >
              <div className="flex items-start gap-3 p-3 rounded-lg border border-white/5 hover:border-primary/30 hover:bg-white/5 transition-all">
                <span className="material-symbols-outlined text-foreground-muted/40 group-hover:text-primary mt-0.5 transition-colors shrink-0" style={{ fontSize: 18 }}>
                  description
                </span>
                
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {note.title}
                  </p>
                  
                  {/* Category badge + Match reason */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${categoryColors[note.category] || 'bg-white/5 text-foreground-muted border-white/5'}`}>
                      {note.category}
                    </span>
                    <span className="text-[10px] text-foreground-muted/70">
                      {note.matchReason}
                    </span>
                  </div>

                  {/* Relevance dots */}
                  <div className="flex items-center gap-0.5 mt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          i < relevanceDots ? 'bg-primary' : 'bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Chevron */}
                <span className="material-symbols-outlined text-foreground-muted/30 group-hover:text-primary/50 transition-colors shrink-0 mt-0.5" style={{ fontSize: 16 }}>
                  chevron_right
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
