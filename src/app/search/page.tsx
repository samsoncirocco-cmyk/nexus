'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SearchResult, filterMockResults } from '@/lib/searchMock';

type SourceType = 'note' | 'email' | 'task' | 'agent';

const SOURCE_FILTERS = [
  { key: 'all', label: 'All', icon: '🔍' },
  { key: 'note', label: 'Notes', icon: '📝' },
  { key: 'email', label: 'Email', icon: '📧' },
  { key: 'task', label: 'Tasks', icon: '✅' },
  { key: 'agent', label: 'Agents', icon: '🤖' },
] as const;

function getSourceBadge(source: SourceType) {
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

function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() 
      ? <mark key={i} className="bg-primary/30 text-primary font-medium">{part}</mark>
      : part
  );
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [activeSource, setActiveSource] = useState<string>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Auto-focus search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Perform search with debouncing
  const performSearch = useCallback(async (searchQuery: string, source: string) => {
    setLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (source !== 'all') params.set('sources', source);
      
      // Try API first
      const response = await fetch(`/api/search?${params.toString()}`);
      
      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        // Fallback to mock data
        const sources = source === 'all' ? undefined : [source as SourceType];
        const mockResults = filterMockResults(searchQuery, sources);
        setResults(mockResults);
      }
    } catch (err) {
      // Fallback to mock data on error
      const sources = source === 'all' ? undefined : [source as SourceType];
      const mockResults = filterMockResults(searchQuery, sources);
      setResults(mockResults);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (query.trim().length > 0) {
        performSearch(query, activeSource);
      } else {
        setResults([]);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, activeSource, performSearch]);

  const handleSourceToggle = (source: string) => {
    setActiveSource(source);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg-dark/80 backdrop-blur-md px-4 md:px-8 pt-6 pb-4 border-b border-primary/10">
        <div className="max-w-3xl mx-auto">
          {/* Title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-primary rounded-lg p-1.5">
              <span className="material-symbols-outlined text-bg-dark font-bold" style={{ fontSize: 22 }}>
                search
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Unified Search</span>
              <h1 className="text-xl font-bold tracking-tight">Find Anything</h1>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary" style={{ fontSize: 20 }}>
              search
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes, emails, tasks, agents..."
              className="w-full bg-secondary-dark border border-primary/20 rounded-xl pl-12 pr-4 py-3.5 text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              aria-label="Search"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
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
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {SOURCE_FILTERS.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => handleSourceToggle(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  activeSource === key
                    ? 'bg-primary text-bg-dark font-bold shadow-lg shadow-primary/20'
                    : 'bg-secondary-dark/50 text-foreground-muted hover:bg-secondary-dark border border-white/10'
                }`}
                aria-pressed={activeSource === key}
              >
                <span>{icon}</span>
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>

          {/* Results count */}
          {query && results.length > 0 && (
            <div className="mt-3 text-sm text-foreground-muted">
              Found <span className="text-primary font-bold">{results.length}</span> result{results.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 md:px-8 py-6">
        {/* Empty State - No Query */}
        {!query && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="size-20 rounded-full bg-secondary-dark/40 border border-primary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>
                search
              </span>
            </div>
            <h3 className="text-lg font-bold mb-2">Start typing to search</h3>
            <p className="text-foreground-muted text-sm text-center max-w-xs">
              Search across your notes, emails, tasks, and agent activity
            </p>
            <div className="mt-8 flex flex-wrap gap-2 justify-center">
              <span className="text-xs text-foreground-muted bg-secondary-dark/50 px-3 py-1.5 rounded-full border border-white/10">
                💡 Try: "E-Rate"
              </span>
              <span className="text-xs text-foreground-muted bg-secondary-dark/50 px-3 py-1.5 rounded-full border border-white/10">
                💡 Try: "Fortinet"
              </span>
              <span className="text-xs text-foreground-muted bg-secondary-dark/50 px-3 py-1.5 rounded-full border border-white/10">
                💡 Try: "security"
              </span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && query && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-card-dark p-5 animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-16 bg-white/10 rounded-full"></div>
                  <div className="h-4 w-12 bg-white/5 rounded"></div>
                </div>
                <div className="h-6 bg-white/10 rounded mb-2 w-3/4"></div>
                <div className="h-4 bg-white/5 rounded mb-2"></div>
                <div className="h-4 bg-white/5 rounded w-5/6"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State - No Results */}
        {!loading && query && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="size-20 rounded-full bg-secondary-dark/40 border border-primary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 32 }}>
                search_off
              </span>
            </div>
            <h3 className="text-lg font-bold mb-2">No results found</h3>
            <p className="text-foreground-muted text-sm text-center max-w-xs">
              Try adjusting your search or changing the source filter
            </p>
          </div>
        )}

        {/* Results List */}
        {!loading && results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, index) => {
              const badge = getSourceBadge(result.source);
              const resultUrl = result.url || '#';

              return (
                <Link
                  key={result.id}
                  href={resultUrl}
                  className="block rounded-xl border border-white/10 bg-card-dark hover:border-primary/40 transition-all group p-5 animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Header: Badge + Score + Time */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`${badge.bgColor} ${badge.textColor} ${badge.borderColor} px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border`}
                      >
                        {badge.label}
                      </span>
                      {/* Score indicator */}
                      <div className="flex items-center gap-1">
                        <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${result.score * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] text-foreground-muted font-medium">
                          {Math.round(result.score * 100)}%
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-foreground-muted" suppressHydrationWarning>
                      {new Date(result.timestamp).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors mb-2 leading-snug">
                    {highlightText(result.title, query)}
                  </h3>

                  {/* Preview */}
                  <p className="text-sm text-foreground-muted leading-relaxed line-clamp-2 mb-3">
                    {highlightText(result.preview, query)}
                  </p>

                  {/* Tags */}
                  {result.tags && result.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {result.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/5 text-foreground-muted border border-white/10"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* External link indicator */}
                  {result.url && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <div className="flex items-center gap-1.5 text-primary text-xs font-medium">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          open_in_new
                        </span>
                        <span>View details</span>
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
