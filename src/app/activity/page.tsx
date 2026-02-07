import Sidebar from '@/components/Sidebar';
import { getDocumentsByCategory, getAllTags } from '@/lib/documents';
import { getActivity } from '@/app/actions/activity';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const statusIcons: Record<string, string> = {
  'done': '✅',
  'in-progress': '🔄',
  'failed': '❌',
  'info': 'ℹ️',
};

const typeColors: Record<string, string> = {
  'completed': 'border-[#4ADE80]/30 bg-[#4ADE80]/5',
  'started': 'border-[#FEE123]/30 bg-[#FEE123]/5',
  'alert': 'border-[#F97316]/30 bg-[#F97316]/5',
  'note': 'border-[#262626] bg-[#111111]',
};

function getAgentEmoji(agent: string): string {
  if (agent.includes('workhorse')) return '🐴';
  if (agent.includes('book')) return '📖';
  if (agent.includes('erate')) return '📧';
  if (agent.includes('yc')) return '🚀';
  if (agent.includes('tatt')) return '💅';
  if (agent.includes('irl')) return '🛡️';
  if (agent.includes('sfdc')) return '☁️';
  return '🤖';
}

export default async function ActivityPage() {
  const documentsByCategory = getDocumentsByCategory();
  const allTags = getAllTags();
  const activity = await getActivity();

  // Group by date
  const grouped = activity.reduce<Record<string, typeof activity>>((acc, entry) => {
    const date = format(new Date(entry.timestamp), 'yyyy-MM-dd');
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort().reverse();

  const stats = {
    total: activity.length,
    done: activity.filter(a => a.status === 'done').length,
    inProgress: activity.filter(a => a.status === 'in-progress').length,
    today: activity.filter(a => {
      const d = new Date(a.timestamp);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length,
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar documents={documentsByCategory} allTags={allTags} />

      <main className="flex-1 overflow-y-auto pt-14 md:pt-0 pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-2xl md:text-3xl font-bold text-[#FAFAFA]">Activity Feed</h1>
              <span className="text-2xl md:text-3xl">⚡</span>
              <div className="flex-1 h-1 bg-gradient-to-r from-[#FEE123] to-transparent rounded-full" />
            </div>
            <p className="text-[#9CA3AF]">
              Live stream of everything Paul&apos;s sub-agents are building. Updated automatically.
            </p>
          </div>

          {/* Stats - Responsive Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
            <div className="card-stat p-4">
              <div className="text-2xl md:text-3xl font-bold text-[#FEE123]">{stats.total}</div>
              <div className="text-xs text-[#FAFAFA]/70 font-medium mt-1">Total Tasks</div>
            </div>
            <div className="bg-[#111111] rounded-xl p-4 border border-[#4ADE80]/30">
              <div className="text-2xl md:text-3xl font-bold text-[#4ADE80]">{stats.done}</div>
              <div className="text-xs text-[#9CA3AF] font-medium mt-1">Completed</div>
            </div>
            <div className="bg-[#111111] rounded-xl p-4 border border-[#FEE123]/30">
              <div className="text-2xl md:text-3xl font-bold text-[#FEE123]">{stats.inProgress}</div>
              <div className="text-xs text-[#9CA3AF] font-medium mt-1">In Progress</div>
            </div>
            <div className="bg-[#111111] rounded-xl p-4 border border-[#262626]">
              <div className="text-2xl md:text-3xl font-bold text-[#FAFAFA]">{stats.today}</div>
              <div className="text-xs text-[#9CA3AF] font-medium mt-1">Today</div>
            </div>
          </div>

          {/* Activity Timeline */}
          {dates.map((date) => (
            <div key={date} className="mb-8">
              <h2 className="text-sm font-bold text-[#9CA3AF] uppercase tracking-widest mb-4 flex items-center gap-3">
                <span className="w-3 h-3 rounded-full bg-[#FEE123] animate-pulse-gold" />
                {format(new Date(date + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
              </h2>

              <div className="space-y-3 relative">
                {/* Timeline line - Oregon Green */}
                <div className="absolute left-5 md:left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#154733] via-[#FEE123]/30 to-[#154733]" />

                {grouped[date].map((entry) => (
                  <div
                    key={entry.id}
                    className={`relative pl-12 md:pl-16 pr-4 py-4 rounded-xl border ${typeColors[entry.type] || typeColors.note} transition-all hover:border-[#FEE123]/50 tap-target`}
                  >
                    {/* Timeline dot - Gold */}
                    <div className="absolute left-3 md:left-4 top-5 w-5 h-5 rounded-full bg-[#154733] border-2 border-[#FEE123] flex items-center justify-center text-xs z-10 shadow-lg shadow-[#FEE123]/20">
                      {statusIcons[entry.status] || '•'}
                    </div>

                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-lg">{getAgentEmoji(entry.agent)}</span>
                        <h3 className="font-bold text-[#FAFAFA]">{entry.title}</h3>
                      </div>
                      <span className="text-xs text-[#9CA3AF] whitespace-nowrap font-medium" suppressHydrationWarning>
                        {(() => { try { return formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true }); } catch { return ''; } })()}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="text-sm text-[#9CA3AF] mb-3 leading-relaxed">
                      {entry.summary}
                    </p>

                    {/* Output files */}
                    {entry.output && entry.output.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-bold text-[#9CA3AF] mb-2 uppercase tracking-wider">Output files:</div>
                        <div className="flex flex-wrap gap-2">
                          {entry.output.map((file) => (
                            <span
                              key={file}
                              className="text-xs px-2.5 py-1 rounded-full bg-[#154733] text-[#FEE123] font-mono font-medium"
                            >
                              {file.split('/').slice(-1)[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags & Agent */}
                    <div className="flex items-center flex-wrap gap-2 mt-2">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[#154733] text-[#FAFAFA] font-semibold">
                        {entry.agent}
                      </span>
                      {entry.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 rounded-full bg-[#FEE123]/20 text-[#FEE123] font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {activity.length === 0 && (
            <div className="gradient-oregon rounded-2xl p-12 border border-[#FEE123]/20 text-center">
              <div className="text-5xl mb-4">🤖</div>
              <h3 className="text-xl font-bold mb-2 text-[#FAFAFA]">No activity yet</h3>
              <p className="text-[#FAFAFA]/70">
                Sub-agents will log their work here as they complete tasks.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
