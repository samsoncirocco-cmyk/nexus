import { getActivity, type ActivityEntry } from '@/app/actions/activity';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import CommandBar from '@/components/CommandBar';
import ActivityFilters from '@/components/ActivityFilters';

export const dynamic = 'force-dynamic';

function getSourceBadge(source?: string): { emoji: string; label: string; borderColor: string; bgColor: string; textColor: string } {
  switch (source) {
    case 'gmail':
      return { emoji: '📧', label: 'EMAIL', borderColor: 'border-blue-500/30', bgColor: 'bg-blue-500/15', textColor: 'text-blue-400' };
    case 'calendar':
      return { emoji: '📅', label: 'CALENDAR', borderColor: 'border-purple-500/30', bgColor: 'bg-purple-500/15', textColor: 'text-purple-400' };
    case 'drive':
      return { emoji: '📁', label: 'DRIVE', borderColor: 'border-green-500/30', bgColor: 'bg-green-500/15', textColor: 'text-green-400' };
    case 'agent':
      return { emoji: '🤖', label: 'AGENT', borderColor: 'border-primary/30', bgColor: 'bg-primary/15', textColor: 'text-primary' };
    case 'manual':
    default:
      return { emoji: '📝', label: 'NOTE', borderColor: 'border-zinc-700/30', bgColor: 'bg-zinc-700/15', textColor: 'text-zinc-400' };
  }
}

function getAgentBadge(agent: string, type?: string): { label: string; borderColor: string; dotColor: string; bgColor: string; textColor: string } {
  // Command type gets special gold badge
  if (type === 'command') {
    return { label: 'COMMAND', borderColor: 'border-primary', dotColor: 'bg-primary', bgColor: 'bg-primary/15', textColor: 'text-primary' };
  }
  const a = agent.toLowerCase();
  if (a.includes('samson'))
    return { label: 'SAMSON', borderColor: 'border-primary', dotColor: 'bg-primary', bgColor: 'bg-primary/15', textColor: 'text-primary' };
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
    case 'command': return 'COMMANDED';
    default: return 'PROCESSED';
  }
}

function getCommandStatusBadge(status?: string) {
  if (!status) return null;
  switch (status) {
    case 'pending':
      return { label: 'PENDING', cls: 'bg-primary/15 text-primary border-primary/30' };
    case 'processing':
      return { label: 'PROCESSING', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
    case 'done':
      return { label: 'DONE', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
    default:
      return null;
  }
}

export default async function ActivityPage() {
  const activity = await getActivity();

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col min-h-screen">
      {/* Top App Bar */}
      <header className="sticky top-0 z-20 bg-bg-dark/80 backdrop-blur-md pt-6 md:pt-8 pb-4 px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Protocol Active</span>
            <h1 className="text-2xl font-bold tracking-tight">Activity Feed</h1>
          </div>
          <Link
            href="/commands"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
          >
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>bolt</span>
            <span className="text-primary text-xs font-bold">Commands</span>
          </Link>
        </div>

        {/* Command Bar */}
        <div className="mb-4">
          <CommandBar placeholder="Give Paul a command..." variant="compact" />
        </div>

        {/* Source Filter Pills */}
        <ActivityFilters activity={activity} />
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
                const badge = getAgentBadge(entry.agent, entry.type);
                const sourceBadge = getSourceBadge(entry.source);
                const isCommand = entry.type === 'command';
                const cmdStatus = isCommand ? getCommandStatusBadge(entry.status) : null;

                return (
                  <div key={entry.id} className="relative pl-10">
                    {/* Timeline Node */}
                    <div className={`absolute left-0 top-1.5 w-[24px] h-[24px] rounded-full bg-bg-dark ${badge.borderColor} border-2 flex items-center justify-center z-10`}>
                      {isCommand ? (
                        <span className="material-symbols-outlined text-primary" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>bolt</span>
                      ) : entry.type === 'completed' ? (
                        <span className="material-symbols-outlined text-emerald-500" style={{ fontSize: 14 }}>check_circle</span>
                      ) : (
                        <div className={`w-2 h-2 rounded-full ${badge.dotColor} ${entry.type === 'started' ? 'animate-pulse' : ''}`} />
                      )}
                    </div>

                    <div className={`flex flex-col gap-2 ${isCommand ? 'bg-primary/5 -mx-3 px-3 py-3 rounded-xl border border-primary/10' : ''}`}>
                      {/* Source + Agent Badge + Time */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`${sourceBadge.bgColor} px-2.5 py-0.5 rounded-full text-[10px] font-bold ${sourceBadge.textColor} tracking-wider border ${sourceBadge.borderColor} flex items-center gap-1`}>
                            <span>{sourceBadge.emoji}</span>
                            <span>{sourceBadge.label}</span>
                          </span>
                          <span className={`${badge.bgColor} px-3 py-0.5 rounded-full text-[10px] font-bold ${badge.textColor} tracking-wider border ${isCommand ? 'border-primary/30' : 'border-transparent'}`}>
                            {badge.label}
                          </span>
                          {cmdStatus && (
                            <span className={`${cmdStatus.cls} px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border`}>
                              {cmdStatus.label}
                            </span>
                          )}
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
                      <p className={`text-base leading-relaxed ${isCommand ? 'text-primary/90 font-medium' : 'text-zinc-200'}`}>
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
