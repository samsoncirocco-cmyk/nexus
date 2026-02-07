'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';

interface DocMeta {
  slug: string;
  title: string;
  category: string;
  date?: string;
  tags?: string[];
  description?: string;
  lastModified: string;
}

interface Props {
  documentsByCategory: Record<string, DocMeta[]>;
  allDocs: DocMeta[];
  allTags: { tag: string; count: number }[];
  categoryIcons: Record<string, string>;
}

const RECENT_KEY = 'second-brain-recent-docs';
const MAX_RECENT = 6;

function getRecentDocs(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch { return []; }
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

export default function DocBrowserClient({ documentsByCategory, allDocs, allTags, categoryIcons }: Props) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [showTagCloud, setShowTagCloud] = useState(false);
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [hoveredDoc, setHoveredDoc] = useState<{ slug: string; x: number; y: number } | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setRecentSlugs(getRecentDocs());
  }, []);

  const recentDocs = useMemo(() => {
    return recentSlugs
      .map(slug => allDocs.find(d => d.slug === slug))
      .filter(Boolean) as DocMeta[];
  }, [recentSlugs, allDocs]);

  // Filter docs
  const filteredByCategory = useMemo(() => {
    if (!search && !selectedTag) return documentsByCategory;
    const q = search.toLowerCase();
    const result: Record<string, DocMeta[]> = {};
    for (const [cat, docs] of Object.entries(documentsByCategory)) {
      const filtered = docs.filter(d => {
        const matchesSearch = !q || d.title.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q);
        const matchesTag = !selectedTag || d.tags?.includes(selectedTag);
        return matchesSearch && matchesTag;
      });
      if (filtered.length > 0) result[cat] = filtered;
    }
    return result;
  }, [documentsByCategory, search, selectedTag]);

  // Hover preview handlers
  const handleDocMouseEnter = useCallback((slug: string, e: React.MouseEvent) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHoveredDoc({ slug, x: e.clientX, y: e.clientY });
    }, 400);
  }, []);

  const handleDocMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHoveredDoc(null);
  }, []);

  const hoveredDocData = useMemo(() => {
    if (!hoveredDoc) return null;
    return allDocs.find(d => d.slug === hoveredDoc.slug) || null;
  }, [hoveredDoc, allDocs]);

  // Tag size scaling
  const maxTagCount = allTags.length > 0 ? allTags[0].count : 1;

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" style={{ fontSize: 18 }}>search</span>
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="inp pl-10 !bg-card-dark"
          />
        </div>

        <button
          onClick={() => setShowTagCloud(!showTagCloud)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${showTagCloud ? 'bg-primary/20 text-primary border-primary/40' : 'bg-card-dark text-foreground-muted border-white/5 hover:text-foreground'}`}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sell</span>
          Tags
        </button>

        <div className="flex items-center bg-card-dark border border-white/5 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 text-xs font-bold transition-colors ${viewMode === 'grid' ? 'text-primary bg-primary/10' : 'text-foreground-muted hover:text-foreground'}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>grid_view</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-xs font-bold transition-colors ${viewMode === 'list' ? 'text-primary bg-primary/10' : 'text-foreground-muted hover:text-foreground'}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>view_list</span>
          </button>
        </div>
      </div>

      {/* Tag Cloud */}
      {showTagCloud && (
        <div className="bg-card-dark border border-white/5 rounded-xl p-4 animate-slide-down">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-foreground-muted uppercase tracking-wider">Tag Cloud</h3>
            {selectedTag && (
              <button onClick={() => setSelectedTag('')} className="text-xs text-primary hover:text-primary-muted transition-colors">
                Clear filter
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map(({ tag, count }) => {
              const scale = 0.7 + (count / maxTagCount) * 0.6;
              const isActive = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(isActive ? '' : tag)}
                  className={`px-2.5 py-1 rounded-lg border transition-all ${isActive ? 'bg-primary/20 text-primary border-primary/40' : 'bg-white/5 text-foreground-muted border-white/5 hover:border-primary/20 hover:text-foreground'}`}
                  style={{ fontSize: `${scale}rem` }}
                >
                  #{tag}
                  <span className="ml-1 text-foreground-muted/50" style={{ fontSize: '0.65rem' }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recently Viewed */}
      {recentDocs.length > 0 && !search && !selectedTag && (
        <div>
          <h3 className="text-xs font-bold text-foreground-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>history</span>
            Recently Viewed
          </h3>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {recentDocs.map(doc => (
              <Link
                key={doc.slug}
                href={`/doc/${doc.slug}`}
                className="shrink-0 w-48 bg-card-dark border border-white/5 rounded-xl p-3 hover:border-primary/30 transition-all group"
              >
                <p className="text-xs text-primary/60 uppercase tracking-wider font-bold mb-1">{doc.category}</p>
                <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{doc.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(filteredByCategory).map(([category, docs]) => (
            <Link
              key={category}
              href={`/doc/${category}`}
              className="group bg-card-dark border border-white/5 rounded-xl p-5 hover:border-primary/30 transition-all card-hover"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="size-10 rounded-lg bg-secondary-dark flex items-center justify-center border border-primary/20">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                    {categoryIcons[category] || 'folder_open'}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold capitalize group-hover:text-primary transition-colors">{category}</h3>
                  <p className="text-[10px] text-foreground-muted uppercase tracking-wider font-bold">{docs.length} docs</p>
                </div>
                <span className="material-symbols-outlined text-foreground-muted group-hover:text-primary transition-colors">arrow_forward</span>
              </div>
              {docs[0] && (
                <p className="text-xs text-foreground-muted truncate">
                  Latest: {docs[0].title}
                </p>
              )}
              {/* Tag preview */}
              {docs.slice(0, 3).some(d => d.tags && d.tags.length > 0) && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {[...new Set(docs.flatMap(d => d.tags || []))].slice(0, 4).map(tag => (
                    <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-foreground-muted/60">#{tag}</span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(filteredByCategory).map(([category, docs]) => (
            <div key={category}>
              <div className="flex items-center gap-2 px-2 py-2">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
                  {categoryIcons[category] || 'folder_open'}
                </span>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground capitalize">{category}</h3>
                <span className="text-[10px] text-foreground-muted bg-white/5 px-2 py-0.5 rounded-full">{docs.length}</span>
              </div>
              <div className="space-y-1 ml-2">
                {docs.map(doc => (
                  <Link
                    key={doc.slug}
                    href={`/doc/${doc.slug}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group"
                    onMouseEnter={(e) => handleDocMouseEnter(doc.slug, e)}
                    onMouseLeave={handleDocMouseLeave}
                  >
                    <span className="material-symbols-outlined text-foreground-muted/40 group-hover:text-primary transition-colors" style={{ fontSize: 16 }}>description</span>
                    <span className="flex-1 text-sm text-foreground group-hover:text-primary transition-colors truncate">{doc.title}</span>
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="hidden sm:flex gap-1">
                        {doc.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-foreground-muted/50">#{tag}</span>
                        ))}
                      </div>
                    )}
                    {doc.date && (
                      <span className="text-xs text-foreground-muted/40 hidden sm:block">{formatDate(doc.date)}</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.keys(filteredByCategory).length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-outlined text-foreground-muted/30 mb-3" style={{ fontSize: 48 }}>search_off</span>
          <p className="text-sm text-foreground-muted">No documents match your search</p>
          <button onClick={() => { setSearch(''); setSelectedTag(''); }} className="text-xs text-primary mt-2 hover:text-primary-muted transition-colors">
            Clear filters
          </button>
        </div>
      )}

      {/* Hover preview popover */}
      {hoveredDoc && hoveredDocData && (
        <div
          className="fixed z-50 pointer-events-none animate-fade-in"
          style={{
            left: Math.min(hoveredDoc.x + 16, typeof window !== 'undefined' ? window.innerWidth - 320 : 600),
            top: Math.min(hoveredDoc.y - 10, typeof window !== 'undefined' ? window.innerHeight - 140 : 500),
          }}
        >
          <div className="bg-card-dark/95 backdrop-blur-xl border border-primary/20 rounded-xl p-3 shadow-2xl w-72">
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary/60 mb-1">{hoveredDocData.category}</div>
            <div className="text-sm font-bold text-foreground mb-1 truncate">{hoveredDocData.title}</div>
            {hoveredDocData.description && (
              <p className="text-xs text-foreground-muted line-clamp-3 leading-relaxed">{hoveredDocData.description}</p>
            )}
            {hoveredDocData.tags && hoveredDocData.tags.length > 0 && (
              <div className="flex gap-1 mt-2 flex-wrap">
                {hoveredDocData.tags.slice(0, 4).map(tag => (
                  <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-foreground-muted/60">#{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
