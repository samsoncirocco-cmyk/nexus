'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { filterMockResults, type SearchResult } from '@/lib/searchMock';

export const dynamic = 'force-dynamic';

type SourceType = 'note' | 'email' | 'task' | 'agent';

const SOURCE_FILTERS = [
  { key: 'all', label: 'All', emoji: '🔍' },
  { key: 'note', label: 'Notes', emoji: '📝' },
  { key: 'email', label: 'Email', emoji: '📧' },
  { key: 'task', label: 'Tasks', emoji: '✅' },
  { key: 'agent', label: 'Agents', emoji: '🤖' },
] as const;

function getSourceBadge(source: SourceType): {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
} {
  switch (source) {
    case 'note':
      return {
        label: 'NOTE',
        bgColor: 'bg-emerald-500/15',
        textColor: 'text-emerald-400',
        borderColor: 'border-emerald-500/30',
      };
    case 'email':
      return {
        label: 'EMAIL',
        bgColor: 'bg-blue-500/15',
        textColor: 'text-blue-400',
        borderColor: 'border-blue-500/30',
      };
    case 'task':
      return {
        label: 'TASK',
        bgColor: 'bg-primary/15',
        textColor: 'text-primary',
        borderColor: 'border-primary/30',
      };
    case 'agent':
      return {
        label: 'AGENT',
        bgColor: 'bg-purple-500/15',
        textColor: 'text-purple-400',
        borderColor: 'border-purple-500/30',
      };
  }
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-primary/30 text-primary font-semibold">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function ResultSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-bg-dark p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-16 bg-white/10 rounded-full" />
        <div className="h-3 w-12 bg-white/5 rounded" />
      </div>
      <div className="h-5 bg-white/10 rounded w-3/4 mb-2" />
      <div className="h-4 bg-white/5 rounded w-full mb-1" />
      <div className="h-4 bg-white/5 rounded w-5/6" />
      <div className="flex items-center gap-3 mt-3">
        <div className="h-3 w-20 bg-white/5 rounded" />
        <div className="h-1 flex-1 bg-white/5 rounded" />
      </div>
    </div>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedSources, setSelectedSources] = useState<SourceType[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery.trim() && selectedSources.length === 0) {
      setResults([]);
      setIsSearchActive(false);
      return;
    }

    setLoading(true);
    setIsSearchActive(true);

    // Simulate API call with setTimeout
    const searchTimer = setTimeout(async () => {
      try {
        // Try calling the real API first
        const params = new URLSearchParams();
        if (debouncedQuery) params.set('q', debouncedQuery);
        if (selectedSources.length > 0) params.set('sources', selectedSources.join(','));

        const response = await fetch(`/api/search?${params.toString()}`);
        
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
        } else {
          // Fallback to mock data
          const mockResults = filterMockResults(debouncedQuery, selectedSources);
          setResults(mockResults);
        }
      } catch (error) {
        // Fallback to mock data on error
        const mockResults = filterMockResults(debouncedQuery, selectedSources);
        setResults(mockResults);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(searchTimer);
  }, [debouncedQuery, selectedSources]);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Global keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        router.push('/search');
        // Small delay to ensure component is mounted
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  const toggleSource = useCallback((source: SourceType) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedSources([]);
    setQuery('');
    setResults([]);
    setIsSearchActive(false);
  }, []);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg-dark/80 backdrop-blur-md px-4 md:px-6 pt-6 pb-4 border-b border-primary/10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary rounded-lg p-1.5">
              <span
                className="material-symbols-outlined text-bg-dark font-bold"
                style={{ fontSize: 22 }}
              >
                search
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
                Universal Search
              </span>
              <h1 className="text-xl font-bold tracking-tight">
                {results.length > 0
                  ? `${results.length} ${results.length === 1 ? 'Result' : 'Results'}`
                  : 'Search Everything'}
              </h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes, emails, tasks, agents..."
              className="w-full bg-card-dark border border-white/10 rounded-xl px-4 py-3.5 pl-12 text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              aria-label="Search input"
            />
            <span
              className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary"
              style={{ fontSize: 20 }}
            >
              search
            </span>
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                  close
                </span>
              </button>
            )}
          </div>

          {/* Source Filter Pills */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            {SOURCE_FILTERS.map(({ key, label, emoji }) => {
              const isActive =
                key === 'all' ? selectedSources.length === 0 : selectedSources.includes(key as SourceType);

              return (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'all') {
                      setSelectedSources([]);
                    } else {
                      toggleSource(key as SourceType);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-primary text-bg-dark'
                      : 'bg-white/5 text-foreground-muted hover:bg-white/10'
                  }`}
                  aria-pressed={isActive}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                </button>
              );
            })}
            {selectedSources.length > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                  close
                </span>
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Keyboard Hint */}
          <div className="mt-3 flex items-center gap-2 text-[10px] text-foreground-muted">
            <kbd className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-mono">⌘K</kbd>
            <span>to search from anywhere</span>
          </div>
        </div>
      </header>

      {/* Results */}
      <main className="px-4 md:px-6 py-6 max-w-3xl mx-auto">
        {/* Empty State - No Search */}
        {!isSearchActive && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-20 rounded-full bg-secondary-dark/40 border border-primary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>
                travel_explore
              </span>
            </div>
            <h3 className="text-lg font-bold mb-2">Start typing to search</h3>
            <p className="text-foreground-muted text-sm max-w-sm">
              Search across all your notes, emails, tasks, and agent activity. Use filters to narrow down
              results.
            </p>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && isSearchActive && (
          <div className="space-y-4 animate-fade-in">
            <ResultSkeleton />
            <ResultSkeleton />
            <ResultSkeleton />
          </div>
        )}

        {/* Empty State - No Results */}
        {!loading && isSearchActive && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-20 rounded-full bg-secondary-dark/40 border border-primary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 32 }}>
                search_off
              </span>
            </div>
            <h3 className="text-lg font-bold mb-2">No results found</h3>
            <p className="text-foreground-muted text-sm max-w-sm mb-4">
              Try adjusting your search query or filters
            </p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-semibold text-sm"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Results List */}
        {!loading && results.length > 0 && (
          <div className="space-y-4 animate-fade-in">
            {results.map((result) => {
              const badge = getSourceBadge(result.source);

              return (
                <a
                  key={result.id}
                  href={result.url || '#'}
                  className="block rounded-xl border border-white/10 bg-bg-dark hover:border-primary/40 transition-all p-4 group"
                >
                  {/* Header: Badge + Score + Timestamp */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`${badge.bgColor} ${badge.textColor} ${badge.borderColor} px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border`}
                      >
                        {badge.label}
                      </span>
                      {result.tags && result.tags.length > 0 && (
                        <div className="flex gap-1">
                          {result.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-foreground-muted"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-foreground-muted" suppressHydrationWarning>
                      {new Date(result.timestamp).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors mb-2 leading-snug">
                    {highlightText(result.title, query)}
                  </h3>

                  {/* Preview Snippet */}
                  <p className="text-sm text-foreground-muted line-clamp-2 leading-relaxed mb-3">
                    {highlightText(result.preview, query)}
                  </p>

                  {/* Footer: Score Bar */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-foreground-muted font-medium uppercase tracking-wider">
                      Relevance
                    </span>
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary-muted rounded-full transition-all"
                        style={{ width: `${result.score * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-primary font-bold">{Math.round(result.score * 100)}%</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
