import Sidebar from '@/components/Sidebar';
import { getDocument, getDocumentsByCategory, getAllDocuments, getAllTags } from '@/lib/documents';
import { format } from 'date-fns';
import Link from 'next/link';
import { notFound } from 'next/navigation';

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
  const doc = await getDocument(slugPath);
  const documentsByCategory = getDocumentsByCategory();
  const allTags = getAllTags();

  if (!doc) {
    notFound();
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar documents={documentsByCategory} allTags={allTags} />
      
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0 pb-20 md:pb-0">
        <article className="max-w-3xl mx-auto p-4 md:p-8">
          {/* Header */}
          <header className="mb-8 pb-8 border-b border-[#262626]">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-[#9CA3AF] mb-4">
              <Link href="/" className="hover:text-[#FEE123] transition-colors font-medium">
                Home
              </Link>
              <span className="text-[#FEE123]">/</span>
              <span className="capitalize text-[#FEE123] font-semibold">{doc.category}</span>
            </div>
            
            {/* Title */}
            <h1 className="text-2xl md:text-4xl font-bold mb-4 text-[#FAFAFA] tracking-tight leading-tight">
              {doc.title}
            </h1>
            
            {/* Description */}
            {doc.description && (
              <p className="text-[#9CA3AF] mb-4 text-base md:text-lg leading-relaxed">{doc.description}</p>
            )}
            
            {/* Meta */}
            <div className="flex items-center flex-wrap gap-4 text-sm text-[#9CA3AF]">
              {doc.date && (
                <span className="flex items-center gap-1.5">
                  <span className="text-[#FEE123]">📅</span>
                  {format(new Date(doc.date), 'MMMM d, yyyy')}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <span className="text-[#FEE123]">🕐</span>
                {format(doc.lastModified, 'h:mm a')}
              </span>
            </div>
            
            {/* Tags */}
            {doc.tags && doc.tags.length > 0 && (
              <div className="flex items-center flex-wrap gap-2 mt-4">
                {doc.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-3 py-1.5 rounded-full bg-[#154733] text-[#FEE123] font-semibold border border-[#FEE123]/30"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Content */}
          <div
            className="document-content"
            dangerouslySetInnerHTML={{ __html: doc.htmlContent || '' }}
          />

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-[#262626]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm text-[#9CA3AF]">
              <span className="font-medium">
                Last updated: {format(doc.lastModified, 'MMM d, yyyy \'at\' h:mm a')}
              </span>
              <Link 
                href="/" 
                className="text-[#FEE123] hover:text-[#FFE94D] transition-colors font-bold flex items-center gap-2"
              >
                <span>←</span>
                <span>Back to overview</span>
              </Link>
            </div>
          </footer>
        </article>
      </main>
    </div>
  );
}
