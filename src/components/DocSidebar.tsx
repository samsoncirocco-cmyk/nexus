'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';

interface DocumentMeta {
  slug: string;
  title: string;
  category: string;
  date?: string;
  tags?: string[];
  description?: string;
}

interface DocSidebarProps {
  documents: Record<string, DocumentMeta[]>;
  activeSlug: string;
}

const categoryIcons: Record<string, string> = {
  accounts: 'account_balance',
  concepts: 'lightbulb',
  erate: 'bolt',
  intel: 'security',
  journal: 'auto_stories',
  projects: 'folder_open',
  reports: 'analytics',
};

export default function DocSidebar({ documents, activeSlug }: DocSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DocumentMeta[] | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setIsOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => searchRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') { setIsOpen(false); setSearchQuery(''); setSearchResults(null); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const performSearch = useCallback(async (query: string) => {
    if (!query) { setSearchResults(null); return; }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      setSearchResults(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => performSearch(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const categories = Object.keys(documents).sort();
  const displayDocs = searchResults
    ? Object.fromEntries(
        searchResults.reduce<Map<string, DocumentMeta[]>>((acc, doc) => {
          const cat = doc.category;
          if (!acc.has(cat)) acc.set(cat, []);
          acc.get(cat)!.push(doc);
          return acc;
        }, new Map())
      )
    : documents;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#0d1410]">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="material-symbols-outlined text-bg-dark font-bold" style={{ fontSize: 18 }}>rocket_launch</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Second Brain</h2>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" style={{ fontSize: 18 }}>search</span>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-bg-dark border border-white/5 rounded-lg text-sm placeholder:text-foreground-muted outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Categories */}
        <nav className="space-y-2">
          {Object.entries(displayDocs).sort(([a], [b]) => a.localeCompare(b)).map(([category, docs]) => {
            const isActiveCategory = activeSlug.startsWith(category);
            return (
              <div key={category}>
                <Link
                  href={`/doc/${category}`}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActiveCategory
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-foreground-muted hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                    {categoryIcons[category] || 'folder_open'}
                  </span>
                  <span className="font-medium capitalize flex-1">{category}</span>
                  <span className="text-[10px] text-foreground-muted">{docs.length}</span>
                </Link>

                {/* Show docs if category is active or search results */}
                {(isActiveCategory || searchResults) && docs.length > 0 && (
                  <div className="ml-4 pl-4 border-l border-white/5 mt-1 space-y-0.5">
                    {docs.slice(0, searchResults ? 10 : 20).map(doc => (
                      <Link
                        key={doc.slug}
                        href={`/doc/${doc.slug}`}
                        className={`block px-3 py-2 rounded-lg text-sm transition-colors truncate ${
                          activeSlug === doc.slug
                            ? 'text-primary bg-primary/5'
                            : 'text-foreground-muted hover:text-foreground hover:bg-white/5'
                        }`}
                      >
                        {doc.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 h-screen shrink-0 sticky top-0 overflow-y-auto border-r border-white/5">
        <SidebarContent />
      </aside>

      {/* Mobile toggle button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 z-40 lg:hidden size-10 bg-card-dark border border-white/10 rounded-full flex items-center justify-center"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>menu</span>
      </button>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={() => setIsOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 animate-slide-in overflow-y-auto">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-10 text-foreground-muted hover:text-primary"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
