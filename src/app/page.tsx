import Sidebar from '@/components/Sidebar';
import { getDocumentsByCategory, getAllDocuments, getAllTags } from '@/lib/documents';
import { format } from 'date-fns';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function Home() {
  const documentsByCategory = getDocumentsByCategory();
  const allDocs = getAllDocuments();
  const allTags = getAllTags();
  const recentDocs = allDocs.slice(0, 5);

  const stats = {
    total: allDocs.length,
    concepts: documentsByCategory['concepts']?.length || 0,
    journal: documentsByCategory['journal']?.length || 0,
    projects: documentsByCategory['projects']?.length || 0,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar documents={documentsByCategory} allTags={allTags} />
      
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0 pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {/* Hero - Oregon Ducks Style */}
          <div className="gradient-oregon rounded-2xl p-6 md:p-10 mb-8 border border-[#FEE123]/20 glow-green">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl md:text-5xl">🧠</span>
              <div className="w-12 h-1 bg-[#FEE123] rounded-full" />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4 text-[#FAFAFA] tracking-tight">
              SECOND BRAIN
            </h1>
            <p className="text-lg md:text-xl text-[#FAFAFA]/80 font-medium">
              Your personal knowledge base. Built through our conversations.
            </p>
            <p className="text-[#FEE123] font-bold mt-4 text-sm tracking-widest uppercase">
              Just Do It. 🦆
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
            <div className="card-stat p-4 md:p-5">
              <div className="text-3xl md:text-4xl font-bold text-[#FEE123]">{stats.total}</div>
              <div className="text-sm text-[#FAFAFA]/70 font-medium mt-1">Total Docs</div>
            </div>
            <div className="bg-[#111111] rounded-xl p-4 md:p-5 border border-[#FEE123]/20 hover:border-[#FEE123]/50 transition-all">
              <div className="text-3xl md:text-4xl font-bold flex items-center gap-2">
                <span className="text-2xl">💡</span>
                <span className="text-[#FEE123]">{stats.concepts}</span>
              </div>
              <div className="text-sm text-[#9CA3AF] font-medium mt-1">Concepts</div>
            </div>
            <div className="bg-[#111111] rounded-xl p-4 md:p-5 border border-[#FEE123]/20 hover:border-[#FEE123]/50 transition-all">
              <div className="text-3xl md:text-4xl font-bold flex items-center gap-2">
                <span className="text-2xl">📓</span>
                <span className="text-[#FEE123]">{stats.journal}</span>
              </div>
              <div className="text-sm text-[#9CA3AF] font-medium mt-1">Journal</div>
            </div>
            <div className="bg-[#111111] rounded-xl p-4 md:p-5 border border-[#FEE123]/20 hover:border-[#FEE123]/50 transition-all">
              <div className="text-3xl md:text-4xl font-bold flex items-center gap-2">
                <span className="text-2xl">🚀</span>
                <span className="text-[#FEE123]">{stats.projects}</span>
              </div>
              <div className="text-sm text-[#9CA3AF] font-medium mt-1">Projects</div>
            </div>
          </div>

          {/* Recent Documents */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl md:text-2xl font-bold text-[#FAFAFA]">Recent Documents</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-[#FEE123]/30 to-transparent" />
            </div>
            {recentDocs.length > 0 ? (
              <div className="space-y-3">
                {recentDocs.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={`/doc/${doc.slug}`}
                    className="block bg-[#111111] rounded-xl p-4 md:p-5 border border-[#262626] hover:border-[#FEE123] transition-all group tap-target"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-[#FAFAFA] group-hover:text-[#FEE123] transition-colors truncate">
                          {doc.title}
                        </h3>
                        {doc.description && (
                          <p className="text-sm text-[#9CA3AF] mt-1 line-clamp-2">
                            {doc.description}
                          </p>
                        )}
                        <div className="flex items-center flex-wrap gap-2 mt-3">
                          <span className="text-xs px-2.5 py-1 rounded-full bg-[#154733] text-[#FEE123] font-semibold uppercase">
                            {doc.category}
                          </span>
                          {doc.tags?.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-1 rounded-full bg-[#1a1a1a] text-[#9CA3AF] border border-[#262626]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      {doc.date && (
                        <span className="text-xs text-[#9CA3AF] whitespace-nowrap font-medium">
                          {format(new Date(doc.date), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-[#111111] rounded-xl p-8 md:p-12 border border-[#262626] text-center">
                <div className="text-5xl mb-4">📝</div>
                <p className="text-[#9CA3AF] font-medium">
                  No documents yet. They&apos;ll appear here as we talk.
                </p>
              </div>
            )}
          </div>

          {/* How it works - Nike card style */}
          <div className="gradient-oregon rounded-2xl p-6 md:p-8 border border-[#FEE123]/20">
            <h2 className="text-xl md:text-2xl font-bold mb-6 text-[#FEE123] uppercase tracking-wide">How This Works</h2>
            <div className="grid md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-[#0A0A0A]/50 rounded-xl p-4 md:p-5 border border-[#FEE123]/10">
                <div className="text-3xl mb-3">📓</div>
                <h3 className="font-bold text-[#FAFAFA] mb-2">Journal</h3>
                <p className="text-sm text-[#FAFAFA]/70">
                  Daily entries summarizing our conversations
                </p>
              </div>
              <div className="bg-[#0A0A0A]/50 rounded-xl p-4 md:p-5 border border-[#FEE123]/10">
                <div className="text-3xl mb-3">💡</div>
                <h3 className="font-bold text-[#FAFAFA] mb-2">Concepts</h3>
                <p className="text-sm text-[#FAFAFA]/70">
                  Deep dives on important ideas we discuss
                </p>
              </div>
              <div className="bg-[#0A0A0A]/50 rounded-xl p-4 md:p-5 border border-[#FEE123]/10">
                <div className="text-3xl mb-3">🚀</div>
                <h3 className="font-bold text-[#FAFAFA] mb-2">Projects</h3>
                <p className="text-sm text-[#FAFAFA]/70">
                  Notes on things we&apos;re building together
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
