import { getCommands } from '@/app/actions/commands';
import { format, formatDistanceToNow } from 'date-fns';
import CommandBar from '@/components/CommandBar';

export const dynamic = 'force-dynamic';

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return {
        label: 'PENDING',
        bg: 'bg-primary/15',
        text: 'text-primary',
        border: 'border-primary/30',
        icon: 'schedule',
        dot: 'bg-primary animate-pulse',
      };
    case 'processing':
      return {
        label: 'PROCESSING',
        bg: 'bg-blue-500/15',
        text: 'text-blue-400',
        border: 'border-blue-500/30',
        icon: 'sync',
        dot: 'bg-blue-400 animate-spin',
      };
    case 'done':
      return {
        label: 'DONE',
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-400',
        border: 'border-emerald-500/30',
        icon: 'check_circle',
        dot: 'bg-emerald-400',
      };
    default:
      return {
        label: status.toUpperCase(),
        bg: 'bg-zinc-700/20',
        text: 'text-zinc-400',
        border: 'border-zinc-700/30',
        icon: 'help',
        dot: 'bg-zinc-500',
      };
  }
}

export default async function CommandsPage() {
  const commands = await getCommands();

  const pending = commands.filter(c => c.status === 'pending');
  const processing = commands.filter(c => c.status === 'processing');
  const done = commands.filter(c => c.status === 'done');

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg-dark/80 backdrop-blur-md pt-6 md:pt-8 pb-4 px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Mission Control</span>
            <h1 className="text-2xl font-bold tracking-tight">Commands</h1>
          </div>
          <div className="flex items-center gap-2">
            {pending.length > 0 && (
              <span className="px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold border border-primary/20">
                {pending.length} pending
              </span>
            )}
            {processing.length > 0 && (
              <span className="px-3 py-1 rounded-full bg-blue-500/15 text-blue-400 text-xs font-bold border border-blue-500/20">
                {processing.length} active
              </span>
            )}
          </div>
        </div>

        {/* Command input */}
        <CommandBar placeholder="Give Paul a command..." variant="compact" />
      </header>

      {/* Commands List */}
      <main className="flex-1 px-6 pb-32">
        {commands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="size-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 animate-pulse-gold">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>bolt</span>
            </div>
            <h3 className="text-lg font-bold mb-2">No Commands Yet</h3>
            <p className="text-foreground-muted text-sm text-center max-w-xs">
              Use the input above to give Paul a task. Commands will appear here with their status.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {commands.map((cmd) => {
              const badge = getStatusBadge(cmd.status);
              return (
                <div
                  key={cmd.id}
                  className={`relative rounded-xl border ${badge.border} bg-card-dark/60 p-4 transition-all hover:border-primary/30`}
                >
                  {/* Status indicator line */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${
                    cmd.status === 'pending' ? 'bg-primary' :
                    cmd.status === 'processing' ? 'bg-blue-400' :
                    'bg-emerald-400'
                  }`} />

                  <div className="flex items-start gap-3 pl-2">
                    {/* Status icon */}
                    <div className={`shrink-0 size-9 rounded-lg ${badge.bg} flex items-center justify-center mt-0.5`}>
                      <span className={`material-symbols-outlined ${badge.text}`} style={{ fontSize: 18 }}>
                        {badge.icon}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-relaxed">{cmd.text}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`${badge.bg} ${badge.text} px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${badge.border}`}>
                          {badge.label}
                        </span>
                        <span className="text-foreground-muted text-[10px] font-medium" suppressHydrationWarning>
                          {(() => {
                            try {
                              return formatDistanceToNow(new Date(cmd.timestamp), { addSuffix: true });
                            } catch {
                              return '';
                            }
                          })()}
                        </span>
                        <span className="text-foreground-muted/50 text-[10px]" suppressHydrationWarning>
                          {(() => {
                            try {
                              return format(new Date(cmd.timestamp), 'MMM d, HH:mm');
                            } catch {
                              return '';
                            }
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
