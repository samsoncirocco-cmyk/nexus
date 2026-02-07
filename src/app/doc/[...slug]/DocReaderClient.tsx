'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface TocEntry {
  id: string;
  text: string;
  level: number;
}

export default function DocReaderClient({ htmlContent }: { htmlContent: string }) {
  const [progress, setProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [tocEntries, setTocEntries] = useState<TocEntry[]>([]);
  const [activeId, setActiveId] = useState('');
  const [tocOpen, setTocOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Parse headings from HTML content and inject IDs
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const headings = el.querySelectorAll('h1, h2, h3, h4');
    const entries: TocEntry[] = [];

    headings.forEach((heading, idx) => {
      const text = heading.textContent || '';
      const id = `heading-${idx}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
      heading.setAttribute('id', id);
      entries.push({
        id,
        text,
        level: parseInt(heading.tagName[1]),
      });
    });

    setTocEntries(entries);
  }, [htmlContent]);

  // Track reading progress & active heading
  const handleScroll = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const totalHeight = rect.height - window.innerHeight;
    if (totalHeight <= 0) {
      setProgress(100);
      return;
    }

    const scrolled = -rect.top;
    const pct = Math.min(100, Math.max(0, (scrolled / totalHeight) * 100));
    setProgress(pct);
    setShowBackToTop(scrolled > 400);

    // Find active heading
    const headings = el.querySelectorAll('[id^="heading-"]');
    let current = '';
    for (const h of headings) {
      const hRect = h.getBoundingClientRect();
      if (hRect.top <= 120) {
        current = h.id;
      }
    }
    setActiveId(current);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTocOpen(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-transparent">
        <div
          className="h-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Table of contents - desktop sidebar */}
      {tocEntries.length > 2 && (
        <aside className="hidden xl:block fixed right-6 top-24 w-56 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 14 }}>toc</span>
            On this page
          </div>
          <nav className="space-y-0.5">
            {tocEntries.map(entry => (
              <button
                key={entry.id}
                onClick={() => scrollToHeading(entry.id)}
                className={`block w-full text-left text-xs py-1 transition-colors truncate ${
                  activeId === entry.id
                    ? 'text-primary font-semibold'
                    : 'text-foreground-muted/60 hover:text-foreground-muted'
                }`}
                style={{ paddingLeft: `${(entry.level - 1) * 12}px` }}
              >
                {entry.text}
              </button>
            ))}
          </nav>
        </aside>
      )}

      {/* Table of contents - mobile floating button */}
      {tocEntries.length > 2 && (
        <div className="xl:hidden">
          <button
            onClick={() => setTocOpen(!tocOpen)}
            className={`fixed right-4 bottom-20 z-40 size-10 rounded-full shadow-lg flex items-center justify-center transition-all ${
              tocOpen ? 'bg-primary text-bg-dark' : 'bg-card-dark border border-white/10 text-foreground-muted'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>toc</span>
          </button>

          {tocOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setTocOpen(false)} />
              <div className="fixed right-4 bottom-32 z-40 w-64 max-h-72 overflow-y-auto bg-card-dark/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl animate-fade-slide-up">
                <div className="text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-2">On this page</div>
                <nav className="space-y-0.5">
                  {tocEntries.map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => scrollToHeading(entry.id)}
                      className={`block w-full text-left text-xs py-1.5 transition-colors truncate ${
                        activeId === entry.id
                          ? 'text-primary font-semibold'
                          : 'text-foreground-muted hover:text-foreground'
                      }`}
                      style={{ paddingLeft: `${(entry.level - 1) * 12}px` }}
                    >
                      {entry.text}
                    </button>
                  ))}
                </nav>
              </div>
            </>
          )}
        </div>
      )}

      {/* Document content wrapper with ref for scroll tracking */}
      <div
        ref={contentRef}
        className="document-content"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      {/* Back to top button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed right-4 bottom-6 z-40 size-10 rounded-full bg-primary text-bg-dark shadow-lg flex items-center justify-center hover:scale-110 transition-transform animate-fade-slide-up"
          aria-label="Back to top"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_upward</span>
        </button>
      )}
    </>
  );
}
