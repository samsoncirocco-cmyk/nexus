import { getActivity } from '@/app/actions/activity';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function getAgentBadge(agent: string): { label: string; borderColor: string; dotColor: string; bgColor: string; textColor: string } {
  const a = agent.toLowerCase();
  if (a.includes('workhorse') || a.includes('paul'))
    return { label: a.includes('paul') ? 'PAUL' : 'WORKHORSE', borderColor: 'border-primary', dotColor: 'bg-primary', bgColor: 'bg-secondary-dark', textColor: 'text-emerald-400' };
  if (a.includes('system'))
    return { label: 'SYSTEM', borderColor: 'border-emerald-500', dotColor: 'bg-emerald-500', bgColor: 'bg-card-dark', textColor: 'text-zinc-400' };
  return { label: agent.toUpperCase(), borderColor: 'border-zinc-700', dotColor: 'bg-zinc-700', bgColor: 'bg-card-dark', textColor: 'text-zinc-400' };
}

function getActionVerb(type: string): string {
  switch (type) {
    case 'completed': return 'COMPLETED';
    case 'started': return 'INITIATED';
    case 'alert': return 'FLAGGED';
    case 'note': return 'LOGGED';
    default: return 'PROCESSED';
  }
}

export default async function ActivityPage() {
  const activity = await getActivity();

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col min-h-screen">
      {/* Top App Bar */}
      <header className="sticky top-0 z-20 bg-bg-dark/80 backdrop-blur-md pt-6 md:pt-8 pb-4 px-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Protocol Active</span>
            <h1 className="text-2xl font-bold tracking-tight">Activity Feed</h1>
          </div>
          <Link
            href="/api/activity"
            className="w-10 h-10 rounded-full bg-card-dark flex items-center justify-center hover:bg-secondary-dark transition-colors"
          >
            <span className="material-symbols-outlined text-xl">search</span>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          <button className="px-5 py-2 rounded-full bg-primary text-bg-dark text-sm font-bold whitespace-nowrap">All</button>
          <button className="px-5 py-2 rounded-full bg-card-dark text-sm font-medium whitespace-nowrap hover:bg-secondary-dark/60 transition-colors">Paul</button>
          <button className="px-5 py-2 rounded-full bg-card-dark text-sm font-medium whitespace-nowrap hover:bg-secondary-dark/60 transition-colors">Workhorse</button>
          <button className="px-5 py-2 rounded-full bg-card-dark text-sm font-medium whitespace-nowrap hover:bg-secondary-dark/60 transition-colors">System</button>
        </div>
      </header>

      {/* Timeline Feed */}
      <main className="flex-1 px-6 pb-32">
        {activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="size-16 rounded-full bg-secondary-dark/40 border border-primary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>rocket_launch</span>
            </div>
            <h3 className="text-lg font-bold mb-2">No Activity Yet</h3>
            <p className="text-foreground-muted text-sm text-center max-w-xs">
              Sub-agents will log their work here as they complete tasks. Stay tuned.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical Timeline Line */}
            <div className="absolute left-[11px] top-4 bottom-0 w-[2px] bg-timeline-line rounded-full" />

            <div className="space-y-10">
              {activity.map((entry) => {
                const badge = getAgentBadge(entry.agent);
                return (
                  <div key={entry.id} className="relative pl-10">
                    {/* Timeline Node */}
                    <div className={`absolute left-0 top-1.5 w-[24px] h-[24px] rounded-full bg-bg-dark ${badge.borderColor} border-2 flex items-center justify-center z-10`}>
                      {entry.type === 'completed' ? (
                        <span className="material-symbols-outlined text-emerald-500" style={{ fontSize: 14 }}>check_circle</span>
                      ) : (
                        <div className={`w-2 h-2 rounded-full ${badge.dotColor} ${entry.type === 'started' ? 'animate-pulse' : ''}`} />
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* Agent Badge + Time */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`${badge.bgColor} px-3 py-0.5 rounded-full text-[10px] font-bold ${badge.textColor} tracking-wider`}>
                            {badge.label}
                          </span>
                          <span className="text-xs text-foreground-muted font-medium" suppressHydrationWarning>
                            {(() => { try { return format(new Date(entry.timestamp), 'HH:mm'); } catch { return ''; } })()}
                          </span>
                        </div>
                        {entry.output && entry.output.length > 0 && (
                          <span className="material-symbols-outlined text-primary text-lg cursor-pointer">open_in_new</span>
                        )}
                      </div>

                      {/* Action Verb */}
                      <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
                        {getActionVerb(entry.type)}
                      </h3>

                      {/* Summary */}
                      <p className="text-base leading-relaxed text-zinc-200">
                        {entry.summary || entry.title}
                      </p>

                      {/* Output Icons */}
                      {entry.output && entry.output.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {entry.output.map((file, i) => (
                            <div
                              key={i}
                              className="h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center gap-1.5 px-3 cursor-pointer hover:bg-primary/20 transition-colors"
                            >
                              <span className="material-symbols-outlined text-primary text-sm">description</span>
                              <span className="text-primary text-[10px] font-bold truncate max-w-[100px]">
                                {file.split('/').slice(-1)[0]}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Tags */}
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          {entry.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary/80 font-medium"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
