'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { format } from 'date-fns';
import { useState, useEffect, useRef, useCallback } from 'react';

interface DocumentMeta {
  slug: string;
  title: string;
  category: string;
  date?: string;
  tags?: string[];
  description?: string;
}

interface TagInfo {
  tag: string;
  count: number;
}

interface SidebarProps {
  documents: Record<string, DocumentMeta[]>;
  allTags: TagInfo[];
}

const categoryIcons: Record<string, string> = {
  concepts: '💡',
  journal: '📓',
  projects: '🚀',
  root: '📄',
};

const categoryLabels: Record<string, string> = {
  concepts: 'Concepts',
  journal: 'Journal',
  projects: 'Projects',
  root: 'Documents',
};

export default function Sidebar({ documents, allTags }: SidebarProps) {
  const pathname = usePathname();
  const currentSlug = pathname.replace('/doc/', '');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<DocumentMeta[] | null>(null);
  const [showTags, setShowTags] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileOpen]);

  // Keyboard shortcut: Cmd+K or Ctrl+K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsMobileOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setSearchQuery('');
        setSearchResults(null);
        setActiveTag(null);
        setIsMobileOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Debounced search
  const performSearch = useCallback(async (query: string, tag: string | null) => {
    if (!query && !tag) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (tag) params.set('tag', tag);
      
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setSearchResults(data);
    } catch {
      // Silently fail, keep showing sidebar docs
    }
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery, activeTag);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTag, performSearch]);

  const handleTagClick = (tag: string) => {
    if (activeTag === tag) {
      setActiveTag(null);
    } else {
      setActiveTag(tag);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setActiveTag(null);
    setSearchResults(null);
  };

  const isFiltered = searchQuery || activeTag;

  // When filtering, group search results by category
  const filteredByCategory = searchResults
    ? searchResults.reduce<Record<string, DocumentMeta[]>>((acc, doc) => {
        if (!acc[doc.category]) acc[doc.category] = [];
        acc[doc.category].push(doc);
        return acc;
      }, {})
    : documents;

  const categories = ['journal', 'concepts', 'projects', 'root'].filter(
    (cat) => filteredByCategory[cat]?.length
  );

  const totalResults = searchResults?.length ?? 0;

  const navLinks = [
    { href: '/deals', icon: '🎯', label: 'Pipeline' },
    { href: '/tasks', icon: '📋', label: 'Tasks' },
    { href: '/activity', icon: '⚡', label: 'Activity' },
  ];

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="p-4 border-b border-[#262626]">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <span className="text-2xl">🧠</span>
          <div>
            <span className="font-bold text-lg text-[#FAFAFA]">Second Brain</span>
            <div className="text-[10px] font-semibold tracking-widest text-[#FEE123] uppercase">Just Do It</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="px-3 py-2 border-b border-[#1f1f1f] space-y-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all tap-target ${
              pathname === link.href
                ? 'bg-[#154733] text-[#FEE123] font-semibold shadow-lg'
                : 'text-[#FAFAFA] hover:bg-[#1a1a1a]'
            }`}
          >
            <span className="text-lg">{link.icon}</span>
            <span className="font-medium">{link.label}</span>
            {pathname === link.href && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#FEE123]" />
            )}
          </Link>
        ))}
      </div>

      {/* Search */}
      <div className="p-3 border-b border-[#1f1f1f]">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search docs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-12 py-2.5 bg-[#0A0A0A] border border-[#262626] rounded-lg text-sm text-[#FAFAFA] placeholder:text-[#9CA3AF] outline-none focus:border-[#FEE123] focus:ring-1 focus:ring-[#FEE123]/30 transition-all"
          />
          {searchQuery ? (
            <button
              onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#FAFAFA] p-1.5 tap-target"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9CA3AF] opacity-50 hidden md:block">⌘K</span>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="px-3 pt-2 pb-1">
        <button
          onClick={() => setShowTags(!showTags)}
          className="flex items-center gap-2 text-xs font-semibold text-[#9CA3AF] hover:text-[#FEE123] transition-colors w-full uppercase tracking-wider"
        >
          <svg
            className={`w-3 h-3 transition-transform ${showTags ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>Tags</span>
          {activeTag && (
            <span className="ml-auto text-[#FEE123] text-xs normal-case">
              #{activeTag}
            </span>
          )}
        </button>
        
        {showTags && (
          <div className="flex flex-wrap gap-1.5 mt-3 pb-2">
            {allTags.map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`
                  text-xs px-2.5 py-1 rounded-full transition-all font-medium tap-target
                  ${activeTag === tag
                    ? 'bg-[#FEE123] text-[#004F27]'
                    : 'bg-[#154733] text-[#FAFAFA] hover:bg-[#FEE123] hover:text-[#004F27]'
                  }
                `}
              >
                #{tag}
                <span className="ml-1 opacity-70">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter status bar */}
      {isFiltered && (
        <div className="px-3 pb-2 flex items-center justify-between">
          <span className="text-xs text-[#9CA3AF]">
            {isSearching ? (
              <span className="animate-pulse text-[#FEE123]">Searching...</span>
            ) : (
              <span className="text-[#FEE123] font-medium">{totalResults} result{totalResults !== 1 ? 's' : ''}</span>
            )}
          </span>
          <button
            onClick={clearFilters}
            className="text-xs text-[#FEE123] hover:text-[#D4A843] transition-colors font-semibold"
          >
            Clear
          </button>
        </div>
      )}

      {/* Document list */}
      <nav className="flex-1 overflow-y-auto p-2 pb-20 md:pb-2">
        {categories.length === 0 && isFiltered ? (
          <div className="px-3 py-8 text-center">
            <div className="text-3xl mb-3">🔍</div>
            <p className="text-sm text-[#9CA3AF]">No documents found</p>
            <button
              onClick={clearFilters}
              className="text-xs text-[#FEE123] hover:underline mt-2 font-semibold"
            >
              Clear filters
            </button>
          </div>
        ) : (
          categories.map((category) => (
            <div key={category} className="mb-4">
              <div className="flex items-center gap-2 px-2 py-2 text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">
                <span>{categoryIcons[category]}</span>
                <span>{categoryLabels[category]}</span>
                <span className="ml-auto opacity-50 bg-[#154733] px-2 py-0.5 rounded-full text-[#FEE123]">
                  {filteredByCategory[category]?.length || 0}
                </span>
              </div>
              <ul className="space-y-1">
                {filteredByCategory[category]?.map((doc) => {
                  const isActive = currentSlug === doc.slug;
                  return (
                    <li key={doc.slug}>
                      <Link
                        href={`/doc/${doc.slug}`}
                        className={`
                          block px-3 py-3 rounded-lg text-sm transition-all tap-target
                          ${isActive 
                            ? 'bg-[#154733] border border-[#FEE123]/30 shadow-lg' 
                            : 'hover:bg-[#1a1a1a]'
                          }
                        `}
                      >
                        <div className={`font-semibold truncate ${isActive ? 'text-[#FEE123]' : 'text-[#FAFAFA]'}`}>
                          {doc.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {doc.date && (
                            <span suppressHydrationWarning className={`text-xs ${isActive ? 'text-[#FEE123]/70' : 'text-[#9CA3AF]'}`}>
                              {(() => { try { const d = new Date(doc.date); return isNaN(d.getTime()) ? '' : format(d, 'MMM d, yyyy'); } catch { return ''; } })()}
                            </span>
                          )}
                          {doc.tags && doc.tags.length > 0 && (
                            <span className={`text-xs truncate ${isActive ? 'text-[#FEE123]/50' : 'text-[#9CA3AF] opacity-60'}`}>
                              {doc.tags.slice(0, 2).map(t => `#${t}`).join(' ')}
                            </span>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </nav>

      {/* Footer */}
      <div className="hidden md:block p-3 border-t border-[#262626] text-xs text-[#9CA3AF]">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[#FEE123]">Paul × Samson</span>
          <span className="opacity-50">🦆 Go Ducks</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 h-screen bg-[#111111] border-r border-[#262626] flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Header Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 md:hidden bg-[#111111] border-b border-[#262626] px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <span className="font-bold text-[#FAFAFA]">Second Brain</span>
        </Link>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 text-[#FAFAFA] hover:text-[#FEE123] transition-colors tap-target"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Slide-out Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsMobileOpen(false)}
          />
          
          {/* Drawer */}
          <aside className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-[#111111] flex flex-col animate-slide-in shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="absolute top-4 right-4 p-2 text-[#9CA3AF] hover:text-[#FEE123] transition-colors tap-target z-10"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#111111] border-t border-[#262626] pb-safe">
        <div className="flex justify-around items-center py-2">
          <Link 
            href="/" 
            className={`mobile-nav-item ${pathname === '/' ? 'active' : ''}`}
          >
            <span className="text-xl">🏠</span>
            <span className="text-[10px] font-semibold">Home</span>
          </Link>
          <Link 
            href="/tasks" 
            className={`mobile-nav-item ${pathname === '/tasks' ? 'active' : ''}`}
          >
            <span className="text-xl">📋</span>
            <span className="text-[10px] font-semibold">Tasks</span>
          </Link>
          <Link 
            href="/activity" 
            className={`mobile-nav-item ${pathname === '/activity' ? 'active' : ''}`}
          >
            <span className="text-xl">⚡</span>
            <span className="text-[10px] font-semibold">Activity</span>
          </Link>
          <button 
            onClick={() => setIsMobileOpen(true)}
            className="mobile-nav-item"
          >
            <span className="text-xl">📚</span>
            <span className="text-[10px] font-semibold">Docs</span>
          </button>
        </div>
      </nav>
    </>
  );
}
