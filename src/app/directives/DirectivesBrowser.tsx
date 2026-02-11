'use client';

import { useState, useMemo } from 'react';

interface Directive {
  filename: string;
  title: string;
  content: string;
  category: string;
  wordCount: number;
  lastModified: string; // ISO date string
}

interface DirectivesBrowserProps {
  directives: Directive[];
  categories: string[];
  categoryIcons: Record<string, string>;
  categoryLabels: Record<string, string>;
}

function DirectiveCard({ directive }: { directive: Directive }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-start gap-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="material-symbols-outlined text-primary mt-0.5" style={{ fontSize: 20 }}>
          description
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground mb-1 font-display">
            {directive.title}
          </h3>
          <div className="flex items-center gap-3 text-xs text-foreground-muted font-body flex-wrap">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>folder</span>
              {directive.filename}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>calendar_today</span>
              {new Date(directive.lastModified).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>article</span>
              {directive.wordCount} words
            </span>
          </div>
        </div>
        <span className={`material-symbols-outlined text-foreground-muted transition-transform ${expanded ? 'rotate-180' : ''}`} style={{ fontSize: 20 }}>
          expand_more
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-border-subtle">
          <pre className="text-xs text-foreground-muted font-mono whitespace-pre-wrap mt-4 leading-relaxed bg-bg-dark/50 rounded-lg p-4 overflow-x-auto">
            {directive.content}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function DirectivesBrowser({
  directives,
  categories,
  categoryIcons,
  categoryLabels,
}: DirectivesBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter directives
  const filteredDirectives = useMemo(() => {
    let filtered = directives;

    if (selectedCategory) {
      filtered = filtered.filter(d => d.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.filename.toLowerCase().includes(q) ||
        d.content.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [directives, selectedCategory, searchQuery]);

  return (
    <>
      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" style={{ fontSize: 18 }}>
            search
          </span>
          <input
            type="text"
            placeholder="Search directives..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-bg-secondary border border-border rounded-lg text-sm text-foreground placeholder-foreground-muted focus:outline-none focus:border-primary/50 transition-colors font-body"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all font-body ${
              selectedCategory === null
                ? 'bg-primary text-bg-dark'
                : 'bg-bg-secondary text-foreground-muted border border-border hover:border-primary/30'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 font-body ${
                selectedCategory === cat
                  ? 'bg-primary text-bg-dark'
                  : 'bg-bg-secondary text-foreground-muted border border-border hover:border-primary/30'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                {categoryIcons[cat] || 'folder'}
              </span>
              {categoryLabels[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-foreground-muted font-body">
        {filteredDirectives.length === directives.length ? (
          <span>Showing all {directives.length} directives</span>
        ) : (
          <span>Found {filteredDirectives.length} of {directives.length} directives</span>
        )}
      </div>

      {/* Directives list */}
      {filteredDirectives.length === 0 ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-foreground-muted mb-3" style={{ fontSize: 48 }}>
            search_off
          </span>
          <p className="text-foreground-muted font-body">No directives found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDirectives.map(directive => (
            <DirectiveCard key={directive.filename} directive={directive} />
          ))}
        </div>
      )}
    </>
  );
}
