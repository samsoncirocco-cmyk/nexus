import { getDocumentsByCategory, getAllDocuments, getCategories } from '@/lib/documents';
import Link from 'next/link';
import DocSidebar from '@/components/DocSidebar';

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

  return (
    <div className="flex min-h-screen">
      <DocSidebar documents={documentsByCategory} activeSlug="" />

      <div className="flex-1 max-w-2xl mx-auto px-4 pt-8 pb-24">
        {/* Header */}
        <div className="mb-8">
          <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Knowledge Base</span>
          <h1 className="text-3xl font-bold tracking-tight mt-1">
            Documents <span className="text-primary">.</span>
          </h1>
          <p className="text-foreground-muted text-sm mt-2">{allDocs.length} documents across {Object.keys(documentsByCategory).length} categories</p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(documentsByCategory).map(([category, docs]) => (
            <Link
              key={category}
              href={`/doc/${category}`}
              className="group bg-card-dark border border-white/5 rounded-xl p-5 hover:border-primary/30 transition-all"
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
              {/* Preview latest doc */}
              {docs[0] && (
                <p className="text-xs text-foreground-muted truncate">
                  Latest: {docs[0].title}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
