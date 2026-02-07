import { getDocumentsByCategory, getAllDocuments, getAllTags } from '@/lib/documents';
import Link from 'next/link';
import DocSidebar from '@/components/DocSidebar';
import DocBrowserClient from './DocBrowserClient';

export const dynamic = 'force-dynamic';

const categoryIcons: Record<string, string> = {
  accounts: 'account_balance',
  concepts: 'lightbulb',
  erate: 'bolt',
  intel: 'security',
  journal: 'auto_stories',
  projects: 'rocket_launch',
  reports: 'analytics',
};

export default function DocsIndexPage() {
  const documentsByCategory = getDocumentsByCategory();
  const allDocs = getAllDocuments();
  const allTags = getAllTags();

  // Serialize for client component
  const serializedDocs = allDocs.map(d => ({
    ...d,
    lastModified: d.lastModified.toISOString(),
  }));

  const serializedByCategory = Object.fromEntries(
    Object.entries(documentsByCategory).map(([cat, docs]) => [
      cat,
      docs.map(d => ({ ...d, lastModified: d.lastModified.toISOString() })),
    ])
  );

  return (
    <div className="flex min-h-screen">
      <DocSidebar documents={documentsByCategory} activeSlug="" />

      <div className="flex-1 max-w-3xl mx-auto px-4 pt-8 pb-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Knowledge Base</span>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-1">
                Documents <span className="text-primary">.</span>
              </h1>
              <p className="text-foreground-muted text-sm mt-2">{allDocs.length} documents across {Object.keys(documentsByCategory).length} categories</p>
            </div>
            <Link
              href="/doc/new"
              className="shrink-0 px-4 py-2 bg-primary text-bg-dark rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span className="hidden sm:inline">New Document</span>
            </Link>
          </div>
        </div>

        <DocBrowserClient
          documentsByCategory={serializedByCategory}
          allDocs={serializedDocs}
          allTags={allTags}
          categoryIcons={categoryIcons}
        />
      </div>
    </div>
  );
}
