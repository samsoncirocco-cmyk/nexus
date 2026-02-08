'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface CommandBarProps {
  placeholder?: string;
  variant?: 'full' | 'compact';
}

interface SearchSuggestion {
  slug: string;
  title: string;
  category: string;
}

export default function CommandBar({ placeholder = 'Give Paul a command...', variant = 'full' }: CommandBarProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const router = useRouter();

  // Fetch search suggestions
  const fetchSuggestions = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions((data.results || []).slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    }
  };

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [text]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    // Navigate to search page
    setShowSuggestions(false);
    router.push(`/search?q=${encodeURIComponent(text.trim())}`);
    setText('');
  };

  const handleInputChange = (value: string) => {
    setText(value);
    setShowSuggestions(value.length >= 2);
  };

  if (variant === 'compact') {
    return (
      <div className="relative">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" style={{ fontSize: 18 }}>
              search
            </span>
            <input
              ref={inputRef}
              type="text"
              value={text}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => text.length >= 2 && setShowSuggestions(true)}
              placeholder="Search knowledge base..."
              disabled={sending}
              className="w-full rounded-xl border border-primary/20 bg-card-dark pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-foreground-muted/50 outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(250,222,41,0.1)] transition-all disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="shrink-0 size-11 rounded-xl bg-primary text-bg-dark flex items-center justify-center font-bold hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_16px_rgba(250,222,41,0.2)]"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_forward</span>
          </button>
        </form>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute top-full left-0 right-0 mt-2 bg-card-dark border border-primary/20 rounded-xl shadow-lg overflow-hidden z-50"
          >
            {suggestions.map((suggestion) => (
              <Link
                key={suggestion.slug}
                href={`/doc/${suggestion.slug}`}
                onClick={() => {
                  setShowSuggestions(false);
                  setText('');
                }}
                className="block px-4 py-3 hover:bg-primary/10 transition-colors border-b border-white/5 last:border-0"
              >
                <div className="font-medium text-sm text-foreground">{suggestion.title}</div>
                <div className="text-xs text-foreground-muted capitalize mt-0.5">{suggestion.category}</div>
              </Link>
            ))}
            <div className="px-4 py-2 bg-secondary-dark/40 border-t border-primary/10">
              <button
                onClick={handleSubmit}
                className="text-xs text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-1"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>search</span>
                See all results for &ldquo;{text}&rdquo;
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-secondary-dark/60 to-card-dark p-5 shadow-lg">
        {/* Ambient glow */}
        <div className="absolute -right-6 -top-6 size-28 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-4 -bottom-4 size-20 bg-secondary-dark/40 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>search</span>
            <h3 className="text-sm font-bold text-primary tracking-wide uppercase">Search Knowledge Base</h3>
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-foreground-muted" style={{ fontSize: 18 }}>
                search
              </span>
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => text.length >= 2 && setShowSuggestions(true)}
                placeholder="Search documents, tags, content..."
                disabled={sending}
                className="w-full rounded-xl border border-primary/30 bg-bg-dark/80 pl-11 pr-4 py-3.5 text-sm text-foreground placeholder:text-foreground-muted/50 outline-none focus:border-primary focus:shadow-[0_0_0_3px_rgba(250,222,41,0.15)] transition-all disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="shrink-0 h-[46px] px-5 rounded-xl bg-primary text-bg-dark flex items-center gap-2 font-bold text-sm hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(250,222,41,0.25)]"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 bg-card-dark border border-primary/20 rounded-xl shadow-lg overflow-hidden z-50"
        >
          {suggestions.map((suggestion) => (
            <Link
              key={suggestion.slug}
              href={`/doc/${suggestion.slug}`}
              onClick={() => {
                setShowSuggestions(false);
                setText('');
              }}
              className="block px-5 py-3 hover:bg-primary/10 transition-colors border-b border-white/5 last:border-0"
            >
              <div className="font-medium text-sm text-foreground">{suggestion.title}</div>
              <div className="text-xs text-foreground-muted capitalize mt-0.5">{suggestion.category}</div>
            </Link>
          ))}
          <div className="px-5 py-3 bg-secondary-dark/40 border-t border-primary/10">
            <button
              onClick={handleSubmit}
              className="text-xs text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-1"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>search</span>
              See all results for &ldquo;{text}&rdquo;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
