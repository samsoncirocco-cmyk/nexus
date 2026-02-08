'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

interface SearchResult {
  slug: string;
  title: string;
  category: string;
  tags?: string[];
  description?: string;
  snippet: string;
  score: number;
}

const categoryIcons: Record<string, string> = {
  accounts: 'account_balance',
  concepts: 'lightbulb',
  erate: 'bolt',
  intel: 'security',
  journal: 'auto_stories',
  projects: 'rocket_launch',
  reports: 'analytics',
};

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams?.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalDocs, setTotalDocs] = useState(0);
  const [hasSearched, setHasSearched] = useState(!!initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Perform search
  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      
      setResults(data.results || []);
      setTotalDocs(data.total || 0);
      
      // Update URL without reloading
      router.replace(`/search?q=${encodeURIComponent(searchQuery)}`, { scroll: false });
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial search if query in URL
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    } else {
      // Get total doc count for empty state
      fetch('/api/search?q=').then(res => res.json()).then(data => {
        setTotalDocs(data.total || 0);
      });
    }
  }, []);

  // Debounced search on input change
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Parse markdown bold (**text**) in snippets
  const parseSnippet = (snippet: string) => {
    const parts = snippet.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => 
      i % 2 === 1 ? <mark key={i} className="bg-primary/20 text-primary px-1 rounded">{part}</mark> : part
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-8 pb-24">
      {/* Header */}
      <div className="mb-8">
        <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Knowledge Base</span>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">
          Search <span className="text-primary">.</span>
        </h1>
        <p className="text-foreground-muted text-sm mt-2">Search across {totalDocs} documents</p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted" style={{ fontSize: 20 }}>
            search
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents, tags, content..."
            className="w-full rounded-xl border border-primary/20 bg-card-dark pl-12 pr-12 py-4 text-foreground placeholder:text-foreground-muted/50 outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(250,222,41,0.1)] transition-all"
          />
          {loading && (
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-primary animate-spin" style={{ fontSize: 20 }}>
              progress_activity
            </span>
          )}
          {query && !loading && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setHasSearched(false);
                inputRef.current?.focus();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {!hasSearched && !loading && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center size-16 rounded-full bg-secondary-dark border border-primary/20 mb-4">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>search</span>
          </div>
          <h3 className="text-lg font-bold mb-2">Search Your Knowledge Base</h3>
          <p className="text-foreground-muted text-sm max-w-md mx-auto">
            Start typing to search across all {totalDocs} documents. Search by title, tags, description, or content.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            <span className="text-xs text-foreground-muted">Try:</span>
            {['fortinet', 'e-rate', 'project', 'sales'].map(term => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className="px-3 py-1 rounded-full bg-secondary-dark border border-primary/20 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Results State */}
      {hasSearched && !loading && results.length === 0 && query.trim() && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center size-16 rounded-full bg-secondary-dark border border-primary/20 mb-4">
            <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 32 }}>search_off</span>
          </div>
          <h3 className="text-lg font-bold mb-2">No documents match &ldquo;{query}&rdquo;</h3>
          <p className="text-foreground-muted text-sm max-w-md mx-auto">
            Try adjusting your search terms or browse documents by category.
          </p>
          <Link
            href="/doc"
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>folder_open</span>
            Browse Documents
          </Link>
        </div>
      )}

      {/* Results */}
      {hasSearched && results.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-foreground-muted mb-4">
            Found {results.length} {results.length === 1 ? 'result' : 'results'}
          </div>
          
          {results.map((result) => (
            <Link
              key={result.slug}
              href={`/doc/${result.slug}`}
              className="block group bg-card-dark border border-white/5 rounded-xl p-5 hover:border-primary/30 transition-all"
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-2">
                <div className="size-10 rounded-lg bg-secondary-dark flex items-center justify-center border border-primary/20 shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
                    {categoryIcons[result.category] || 'description'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {result.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-foreground-muted capitalize">{result.category}</span>
                    {result.tags && result.tags.length > 0 && (
                      <>
                        <span className="text-foreground-muted/30">•</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {result.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20"
                            >
                              {tag}
                            </span>
                          ))}
                          {result.tags.length > 3 && (
                            <span className="text-[10px] text-foreground-muted">+{result.tags.length - 3}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <span className="material-symbols-outlined text-foreground-muted group-hover:text-primary transition-colors shrink-0">
                  arrow_forward
                </span>
              </div>

              {/* Description */}
              {result.description && (
                <p className="text-sm text-foreground-muted mb-2 line-clamp-1">
                  {result.description}
                </p>
              )}

              {/* Snippet */}
              <p className="text-sm text-foreground-muted/80 line-clamp-2">
                {parseSnippet(result.snippet)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin size-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm text-foreground-muted">Loading search...</p>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
