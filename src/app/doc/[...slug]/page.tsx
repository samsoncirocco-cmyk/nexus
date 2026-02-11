import { getDocument, getDocumentsByCategory, getAllDocuments, getAllTags, getCategories, estimateReadingTime, getRelatedDocuments } from '@/lib/documents';
import { format } from 'date-fns';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import DocSidebar from '@/components/DocSidebar';
import RecentDocTracker from './RecentDocTracker';
import DocReaderClient from './DocReaderClient';
import RelatedNotes from '@/components/RelatedNotes';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateStaticParams() {
  const documents = getAllDocuments();
  return documents.map((doc) => ({
    slug: doc.slug.split('/'),
  }));
}

export default async function DocumentPage({ params }: PageProps) {
  const { slug } = await params;
  const slugPath = slug.join('/');
  const documentsByCategory = getDocumentsByCategory();
  const categories = getCategories();

  // Check if it's a category index (e.g., /doc/projects)
  if (slug.length === 1 && categories.includes(slug[0])) {
    const categoryDocs = documentsByCategory[slug[0]] || [];
    const categoryIcons: Record<string, string> = {
      concepts: 'lightbulb', journal: 'auto_stories', projects: 'rocket_launch',
      accounts: 'account_balance', erate: 'bolt', intel: 'security', reports: 'analytics',
    };

    return (
      <div className="flex min-h-screen">
        <DocSidebar documents={documentsByCategory} activeSlug={slugPath} />

        <div className="flex-1 max-w-2xl mx-auto px-4 pt-8 pb-24">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm text-foreground-muted mb-6">
            <Link href="/doc" className="hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-xs">chevron_left</span>
            </Link>
            <span className="text-foreground-muted">Documents</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-primary capitalize">{slug[0]}</span>
          </div>

          <h1 className="text-white tracking-tight text-3xl font-bold leading-tight pb-2 capitalize">
            {slug[0]} <span className="text-primary">.</span>
          </h1>
          <p className="text-foreground-muted text-sm mb-8">{categoryDocs.length} documents</p>

          <div className="space-y-3">
            {categoryDocs.map(doc => (
              <Link
                key={doc.slug}
                href={`/doc/${doc.slug}`}
                className="block bg-card-dark border border-white/5 rounded-xl p-4 hover:border-primary/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold group-hover:text-primary transition-colors truncate">{doc.title}</h3>
                    {doc.description && <p className="text-sm text-foreground-muted mt-1 line-clamp-2">{doc.description}</p>}
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {doc.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary-dark text-foreground-muted">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {doc.date && (
                    <span className="text-xs text-foreground-muted whitespace-nowrap" suppressHydrationWarning>
                      {(() => { try { return format(new Date(doc.date), 'MMM d'); } catch { return ''; } })()}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Full document view
  const doc = await getDocument(slugPath);
  if (!doc) notFound();

  const readingTime = estimateReadingTime(doc.content);
  const relatedDocs = getRelatedDocuments(slugPath, 5);

  return (
    <div className="flex min-h-screen">
      <DocSidebar documents={documentsByCategory} activeSlug={slugPath} />
      <RecentDocTracker slug={slugPath} />

      <div className="flex-1 w-full lg:flex lg:gap-6 lg:max-w-6xl mx-auto px-4 pt-8 pb-24">
        {/* Main content column */}
        <div className="flex-1 max-w-2xl lg:max-w-none">
        {/* TopAppBar */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1">
            <Link href={`/doc/${doc.category}`} className="text-foreground-muted hover:text-primary transition-colors flex items-center">
              <span className="material-symbols-outlined">chevron_left</span>
            </Link>
            <h2 className="text-foreground-muted text-sm font-medium leading-tight tracking-wide flex items-center gap-1">
              <span className="capitalize">{doc.category}</span>
              <span className="material-symbols-outlined text-xs">chevron_right</span>
              <span className="text-foreground truncate max-w-[200px]">{doc.title}</span>
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/doc/edit/${slugPath}`}
              className="text-foreground-muted p-2 hover:bg-white/10 rounded-full transition-colors"
              title="Edit document"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>edit</span>
            </Link>
            <button className="text-foreground-muted p-2 hover:bg-white/10 rounded-full transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>share</span>
            </button>
          </div>
        </header>

        {/* Document Title */}
        <h1 className="text-white tracking-tight text-3xl md:text-4xl font-bold leading-tight pb-6 pt-2">
          {doc.title} <span className="text-primary">.</span>
        </h1>

        {/* Metadata Pills */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 hide-scrollbar flex-wrap">
          {doc.date && (
            <div className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-secondary-dark px-4 border border-white/5">
              <span className="material-symbols-outlined text-sm text-primary">calendar_today</span>
              <p className="text-zinc-200 text-xs font-semibold leading-normal uppercase tracking-wider" suppressHydrationWarning>
                {(() => { try { return format(new Date(doc.date), 'MMM d, yyyy'); } catch { return doc.date; } })()}
              </p>
            </div>
          )}
          <div className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary px-4">
            <span className="material-symbols-outlined text-sm text-bg-dark">science</span>
            <p className="text-bg-dark text-xs font-bold leading-normal uppercase tracking-wider capitalize">{doc.category}</p>
          </div>
          {/* Reading time */}
          <div className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-secondary-dark px-4 border border-white/5">
            <span className="material-symbols-outlined text-sm text-primary">schedule</span>
            <p className="text-zinc-200 text-xs font-semibold leading-normal uppercase tracking-wider">
              {readingTime} min read
            </p>
          </div>
          {doc.tags?.map(tag => (
            <div key={tag} className="flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full bg-secondary-dark px-4 border border-white/5">
              <p className="text-zinc-200 text-xs font-semibold leading-normal">#{tag}</p>
            </div>
          ))}
        </div>

        {/* Description as blockquote */}
        {doc.description && (
          <p className="text-zinc-300 text-lg font-light leading-relaxed italic border-l-2 border-primary/40 pl-4 py-1 mb-8">
            {doc.description}
          </p>
        )}

        {/* Markdown Content with Reading Progress, TOC, and Back-to-Top */}
        <DocReaderClient htmlContent={doc.htmlContent || ''} />

        {/* Related Documents / Backlinks */}
        {relatedDocs.length > 0 && (
          <div className="mt-16 pt-8 border-t border-white/5">
            <h3 className="text-xs font-bold text-foreground-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>link</span>
              Related Documents
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {relatedDocs.map(rel => (
                <Link
                  key={rel.slug}
                  href={`/doc/${rel.slug}`}
                  className="flex items-start gap-3 bg-card-dark border border-white/5 rounded-xl p-3 hover:border-primary/30 transition-all group"
                >
                  <span className="material-symbols-outlined text-foreground-muted/40 group-hover:text-primary mt-0.5 transition-colors" style={{ fontSize: 18 }}>description</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">{rel.title}</p>
                    <p className="text-[10px] text-foreground-muted uppercase tracking-wider">{rel.category}</p>
                    {rel.tags && rel.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {rel.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-foreground-muted/50">#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-white/5">
          <div className="flex items-center justify-between text-sm text-foreground-muted">
            <span suppressHydrationWarning>Last updated: {(() => { try { return format(new Date(doc.lastModified), "MMM d, yyyy 'at' h:mm a"); } catch { return 'Unknown'; } })()}</span>
            <Link href={`/doc/${doc.category}`} className="text-primary hover:underline font-bold flex items-center gap-1">
              <span>←</span> Back to {doc.category}
            </Link>
          </div>
        </footer>
        </div>

        {/* Sidebar column - Related Notes */}
        <aside className="lg:w-80 lg:shrink-0 mt-8 lg:mt-0 lg:sticky lg:top-8 lg:h-fit">
          <RelatedNotes docPath={`${slugPath}.md`} />
        </aside>
      </div>
    </div>
  );
}
