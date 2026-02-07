import { getDocumentsByCategory, getAllDocuments } from '@/lib/documents';
import { getActivity } from '@/app/actions/activity';
import { getTasks } from '@/app/actions/tasks';
import { getDeals } from '@/app/actions/deals';
import { getCommands } from '@/app/actions/commands';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import CommandBar from '@/components/CommandBar';

export const dynamic = 'force-dynamic';

function getGreeting(): string {
  const hour = new Date().getUTCHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default async function Home() {
  const allDocs = getAllDocuments();
  const documentsByCategory = getDocumentsByCategory();
  const activity = await getActivity();
  const tasks = await getTasks();
  const deals = await getDeals();
  const commands = await getCommands();

  const activeTasks = tasks.filter(t => t.column !== 'Done').length;
  const activeDeals = deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost').length;
  const pendingCommands = commands.filter(c => c.status === 'pending').length;
  const recentActivity = activity.slice(0, 4);

  const activityIcons: Record<string, string> = {
    completed: 'check_circle',
    started: 'sync',
    alert: 'warning',
    note: 'draw',
    command: 'bolt',
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Top App Bar */}
      <div className="flex items-center p-6 pb-2 justify-between">
        <div className="flex size-10 shrink-0 items-center overflow-hidden rounded-full border border-primary/30 bg-secondary-dark">
          <span className="material-symbols-outlined text-primary mx-auto" style={{ fontSize: 22 }}>person</span>
        </div>
        <div className="flex-1 px-4">
          <p className="text-xs font-medium uppercase tracking-widest text-primary/70">Welcome back</p>
          <h2 className="text-primary text-xl font-bold leading-tight tracking-tight">{getGreeting()}, Samson</h2>
        </div>
        <div className="flex w-10 items-center justify-end">
          <Link
            href="/activity"
            className="flex items-center justify-center rounded-full size-10 bg-secondary-dark/20 text-primary border border-primary/10"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
          </Link>
        </div>
      </div>

      {/* Command Bar Card — prominent at the top */}
      <div className="px-6 mt-4 mb-2">
        <CommandBar placeholder="What should Paul work on?" variant="full" />
      </div>

      {/* Quick Stats Cards */}
      <div className="flex gap-3 p-6 overflow-x-auto hide-scrollbar">
        <Link href="/commands" className="flex min-w-[120px] flex-1 flex-col gap-3 rounded-xl p-5 bg-secondary-dark border border-primary/10 shadow-lg hover:border-primary/30 transition-colors">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 24, fontVariationSettings: "'FILL' 1" }}>bolt</span>
          <div>
            <p className="text-primary/60 text-xs font-medium uppercase tracking-wider">Commands</p>
            <p className="text-white tracking-tight text-3xl font-bold">{pendingCommands}</p>
          </div>
        </Link>
        <Link href="/tasks" className="flex min-w-[120px] flex-1 flex-col gap-3 rounded-xl p-5 bg-secondary-dark border border-primary/10 shadow-lg hover:border-primary/30 transition-colors">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>task_alt</span>
          <div>
            <p className="text-primary/60 text-xs font-medium uppercase tracking-wider">Tasks</p>
            <p className="text-white tracking-tight text-3xl font-bold">{activeTasks}</p>
          </div>
        </Link>
        <Link href="/deals" className="flex min-w-[120px] flex-1 flex-col gap-3 rounded-xl p-5 bg-secondary-dark border border-primary/10 shadow-lg hover:border-primary/30 transition-colors">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>handshake</span>
          <div>
            <p className="text-primary/60 text-xs font-medium uppercase tracking-wider">Deals</p>
            <p className="text-white tracking-tight text-3xl font-bold">{activeDeals}</p>
          </div>
        </Link>
      </div>

      {/* Brain Status Card */}
      <div className="px-6 mb-6">
        <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-5 border border-primary/20 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 size-24 bg-primary/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-primary font-bold text-lg">Brain Status: Optimal</h4>
              <p className="text-primary/70 text-sm">
                Your knowledge graph spans {allDocs.length} documents across {Object.keys(documentsByCategory).length} categories.
              </p>
            </div>
            <div className="size-12 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="flex items-center justify-between px-6 pb-2">
        <h3 className="text-primary text-lg font-bold tracking-tight">Recent Activity</h3>
        <Link href="/activity" className="text-primary/60 text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors">
          View All
        </Link>
      </div>

      <div className="px-4 space-y-2 mb-8">
        {recentActivity.length > 0 ? (
          recentActivity.map((entry) => (
            <div
              key={entry.id}
              className={`flex items-center gap-4 border px-4 py-4 rounded-xl ${
                entry.type === 'command'
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-secondary-dark/40 border-primary/5'
              }`}
            >
              <div className={`flex items-center justify-center rounded-lg shrink-0 size-11 border ${
                entry.type === 'command'
                  ? 'text-primary bg-primary/15 border-primary/30'
                  : 'text-primary bg-secondary-dark border-primary/20'
              }`}>
                <span className="material-symbols-outlined" style={entry.type === 'command' ? { fontVariationSettings: "'FILL' 1" } : undefined}>
                  {activityIcons[entry.type] || 'info'}
                </span>
              </div>
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm font-semibold leading-tight truncate">{entry.title}</p>
                  {entry.type === 'command' && (
                    <span className="shrink-0 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[9px] font-bold tracking-wider border border-primary/20">
                      CMD
                    </span>
                  )}
                </div>
                <p className="text-primary/50 text-xs font-normal leading-normal truncate">{entry.summary}</p>
              </div>
              <div className="shrink-0">
                <p className="text-primary font-medium text-[10px] uppercase tracking-tighter" suppressHydrationWarning>
                  {(() => { try { return formatDistanceToNow(new Date(entry.timestamp), { addSuffix: false }); } catch { return ''; } })()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10">
            <div className="size-16 rounded-full bg-secondary-dark/40 border border-primary/10 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>rocket_launch</span>
            </div>
            <p className="text-primary/50 text-sm">No recent activity yet. Sub-agents will log their work here.</p>
          </div>
        )}
      </div>

      {/* Quick Access - Categories */}
      <div className="px-6 mb-8">
        <h3 className="text-primary text-lg font-bold tracking-tight mb-3">Quick Access</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(documentsByCategory).slice(0, 6).map(([category, docs]) => {
            const icons: Record<string, string> = {
              journal: 'auto_stories',
              concepts: 'lightbulb',
              projects: 'rocket_launch',
              accounts: 'account_balance',
              erate: 'bolt',
              intel: 'security',
              reports: 'analytics',
            };
            return (
              <Link
                key={category}
                href={`/doc/${category}`}
                className="flex items-center gap-3 bg-secondary-dark/40 border border-primary/5 rounded-xl px-4 py-3 hover:border-primary/20 transition-colors"
              >
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                  {icons[category] || 'folder_open'}
                </span>
                <div>
                  <p className="text-white text-sm font-semibold capitalize">{category}</p>
                  <p className="text-primary/50 text-[10px] font-medium uppercase tracking-wider">{docs.length} docs</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
