'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface PaletteItem {
  href: string;
  icon: string;
  label: string;
  section: 'navigation' | 'recent';
}

const ALL_PAGES: PaletteItem[] = [
  { href: '/', icon: 'home', label: 'Dashboard', section: 'navigation' },
  { href: '/chat', icon: 'chat_bubble', label: 'Chat with Paul', section: 'navigation' },
  { href: '/agents', icon: 'smart_toy', label: 'Agent Fleet', section: 'navigation' },
  { href: '/analytics', icon: 'analytics', label: 'Analytics', section: 'navigation' },
  { href: '/commands', icon: 'bolt', label: 'Commands', section: 'navigation' },
  { href: '/ask', icon: 'neurology', label: 'Ask Brain', section: 'navigation' },
  { href: '/tasks', icon: 'checklist', label: 'Task Board', section: 'navigation' },
  { href: '/activity', icon: 'data_usage', label: 'Activity Feed', section: 'navigation' },
  { href: '/deals', icon: 'rocket_launch', label: 'Sales Pipeline', section: 'navigation' },
  { href: '/graph', icon: 'hub', label: 'Knowledge Graph', section: 'navigation' },
  { href: '/doc', icon: 'folder_open', label: 'Documents', section: 'navigation' },
  { href: '/settings', icon: 'settings', label: 'Settings', section: 'navigation' },
];

const RECENT_KEY = 'sb-recent-pages';
const MAX_RECENT = 5;

function getRecentPages(): PaletteItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentPage(item: PaletteItem) {
  try {
    const recent = getRecentPages().filter((r) => r.href !== item.href);
    recent.unshift({ ...item, section: 'recent' });
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // ignore
  }
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Keyboard shortcut to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Build filtered list
  const recentPages = getRecentPages();
  const filtered = query.trim()
    ? ALL_PAGES.filter((p) =>
        p.label.toLowerCase().includes(query.toLowerCase())
      )
    : [...recentPages.map((r) => ({ ...r, section: 'recent' as const })), ...ALL_PAGES];

  // Deduplicate (recent pages may overlap with nav)
  const seen = new Set<string>();
  const items: PaletteItem[] = [];
  for (const item of filtered) {
    if (!seen.has(item.href)) {
      seen.add(item.href);
      items.push(item);
    }
  }

  const navigate = useCallback(
    (item: PaletteItem) => {
      addRecentPage(item);
      setOpen(false);
      router.push(item.href);
    },
    [router]
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[activeIndex]) navigate(items[activeIndex]);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, activeIndex, items, navigate]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // Reset index on query change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!open) return null;

  // Group items by section for display
  const recentItems = items.filter((i) => i.section === 'recent');
  const navItems = items.filter((i) => i.section === 'navigation');

  return (
    <div className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh]" role="dialog" aria-modal="true" aria-label="Command palette">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg-dark/80 backdrop-blur-sm palette-backdrop-in"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-[90vw] max-w-lg bg-bg-secondary border border-primary/20 rounded-2xl shadow-2xl shadow-primary/5 palette-panel-in overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-subtle">
          <span className="material-symbols-outlined text-primary" aria-hidden="true" style={{ fontSize: 20 }}>
            search
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages..."
            aria-label="Search pages"
            aria-autocomplete="list"
            role="combobox"
            aria-expanded="true"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-muted/50 outline-none font-body"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/5 border border-border text-[10px] text-foreground-muted font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} role="listbox" aria-label="Search results" className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-foreground-muted text-sm">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {!query.trim() && recentItems.length > 0 && (
            <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-foreground-muted/60 font-body">
              Recent
            </div>
          )}
          {recentItems.map((item) => {
            const idx = items.indexOf(item);
            return (
              <button
                key={`recent-${item.href}`}
                role="option"
                aria-selected={idx === activeIndex}
                onClick={() => navigate(item)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors font-body ${
                  idx === activeIndex
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground-muted hover:bg-white/5'
                }`}
              >
                <span
                  className={`material-symbols-outlined ${idx === activeIndex ? 'text-primary' : ''}`}
                  style={{ fontSize: 18 }}
                >
                  {item.icon}
                </span>
                <span className="flex-1 font-medium">{item.label}</span>
                {idx === activeIndex && (
                  <span className="material-symbols-outlined text-primary/40" style={{ fontSize: 16 }}>
                    keyboard_return
                  </span>
                )}
              </button>
            );
          })}

          {!query.trim() && recentItems.length > 0 && navItems.length > 0 && (
            <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-foreground-muted/60 font-body">
              All Pages
            </div>
          )}
          {navItems.map((item) => {
            const idx = items.indexOf(item);
            return (
              <button
                key={item.href}
                role="option"
                aria-selected={idx === activeIndex}
                onClick={() => navigate(item)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors font-body ${
                  idx === activeIndex
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground-muted hover:bg-white/5'
                }`}
              >
                <span
                  className={`material-symbols-outlined ${idx === activeIndex ? 'text-primary' : ''}`}
                  style={{ fontSize: 18 }}
                >
                  {item.icon}
                </span>
                <span className="flex-1 font-medium">{item.label}</span>
                {idx === activeIndex && (
                  <span className="material-symbols-outlined text-primary/40" style={{ fontSize: 16 }}>
                    keyboard_return
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border-subtle text-[10px] text-foreground-muted/50">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white/5 border border-border font-mono">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white/5 border border-border font-mono">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white/5 border border-border font-mono">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
