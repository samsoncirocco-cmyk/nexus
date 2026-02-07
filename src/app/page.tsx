import { getDocumentsByCategory, getAllDocuments } from '@/lib/documents';
import { getActivity } from '@/app/actions/activity';
import { getTasks } from '@/app/actions/tasks';
import { getDeals } from '@/app/actions/deals';
import { getCommands } from '@/app/actions/commands';
import { getRunningAgents, getAgents } from '@/app/actions/agents';
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
  const agents = await getAgents();
  const runningAgents = await getRunningAgents();

  const activeTasks = tasks.filter(t => t.column !== 'Done').length;
  const activeDeals = deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost').length;
  const totalActivity = activity.length;
  const totalAgents = agents.length;
  const totalCommands = commands.length;
  const recentActivity = activity.slice(0, 3);

  const activityIcons: Record<string, string> = {
    completed: 'check_circle',
    started: 'sync',
    alert: 'warning',
    note: 'draw',
    command: 'bolt',
    deployed: 'rocket_launch',
  };

  const QUICK_LINKS = [
    { href: '/chat', icon: 'chat_bubble', label: 'Chat with Paul', desc: 'Talk to your AI' },
    { href: '/tasks', icon: 'checklist', label: 'Task Board', desc: `${activeTasks} active` },
    { href: '/agents', icon: 'smart_toy', label: 'Agent Fleet', desc: `${runningAgents.length} running` },
    { href: '/deals', icon: 'rocket_launch', label: 'Sales Pipeline', desc: `${activeDeals} deals` },
    { href: '/ask', icon: 'neurology', label: 'Ask Brain', desc: 'Search knowledge' },
    { href: '/commands', icon: 'bolt', label: 'Commands', desc: 'Issue orders' },
    { href: '/analytics', icon: 'analytics', label: 'Analytics', desc: 'Insights' },
    { href: '/activity', icon: 'data_usage', label: 'Activity Feed', desc: `${totalActivity} entries` },
    { href: '/graph', icon: 'hub', label: 'Knowledge Graph', desc: `${allDocs.length} nodes` },
    { href: '/doc', icon: 'folder_open', label: 'Documents', desc: `${Object.keys(documentsByCategory).length} categories` },
    { href: '/settings', icon: 'settings', label: 'Settings', desc: 'Configure' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Top App Bar */}
      <div className="flex items-center p-6 pb-2 justify-between">
        <div className="flex size-10 shrink-0 items-center overflow-hidden rounded-full border border-primary/30 bg-secondary-dark">
          <span className="material-symbols-outlined text-primary mx-auto" style={{ fontSize: 22 }}>person</span>
        </div>
        <div className="flex-1 px-4">
          <p className="text-xs font-medium uppercase tracking-widest text-primary/70">Welcome back</p>
          <h2 className="text-primary text-xl font-bold leading-tight tracking-tight">{getGreeting()}, Samson</h2>
        </div>
        <div className="flex gap-2 items-center">
          <Link
            href="/settings"
            className="flex items-center justify-center rounded-full size-10 bg-secondary-dark/20 text-foreground-muted border border-primary/10 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>settings</span>
          </Link>
          <Link
            href="/activity"
            className="flex items-center justify-center rounded-full size-10 bg-secondary-dark/20 text-primary border border-primary/10"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
          </Link>
        </div>
      </div>

      {/* Command Bar */}
      <div className="px-6 mt-4 mb-2">
        <CommandBar placeholder="What should Paul work on?" variant="full" />
      </div>

      {/* Stat Cards — Real Data */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4">
        <Link href="/activity" className="flex flex-col gap-2 rounded-xl p-4 bg-secondary-dark border border-primary/10 shadow-lg hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>data_usage</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary/40">Activity</span>
          </div>
          <p className="text-white tracking-tight text-3xl font-bold">{totalActivity}</p>
          <p className="text-primary/50 text-[10px] font-medium">Total entries</p>
        </Link>
        <Link href="/tasks" className="flex flex-col gap-2 rounded-xl p-4 bg-secondary-dark border border-primary/10 shadow-lg hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>task_alt</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary/40">Tasks</span>
          </div>
          <p className="text-white tracking-tight text-3xl font-bold">{activeTasks}</p>
          <p className="text-primary/50 text-[10px] font-medium">{tasks.length} total</p>
        </Link>
        <Link href="/agents" className="flex flex-col gap-2 rounded-xl p-4 bg-secondary-dark border border-primary/10 shadow-lg hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>smart_toy</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary/40">Agents</span>
          </div>
          <p className="text-white tracking-tight text-3xl font-bold">{totalAgents}</p>
          <p className="text-primary/50 text-[10px] font-medium">{runningAgents.length} running</p>
        </Link>
        <Link href="/commands" className="flex flex-col gap-2 rounded-xl p-4 bg-secondary-dark border border-primary/10 shadow-lg hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>bolt</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary/40">Commands</span>
          </div>
          <p className="text-white tracking-tight text-3xl font-bold">{totalCommands}</p>
          <p className="text-primary/50 text-[10px] font-medium">{commands.filter(c => c.status === 'pending').length} pending</p>
        </Link>
      </div>

      {/* Running Agents Card */}
      {runningAgents.length > 0 && (
        <div className="px-6 mb-4">
          <Link href="/agents" className="block">
            <div className="bg-gradient-to-br from-emerald-900/30 to-bg-dark rounded-xl p-5 border border-emerald-500/20 relative overflow-hidden hover:border-emerald-500/40 transition-colors">
              <div className="absolute -right-4 -top-4 size-20 bg-emerald-500/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: 20 }}>smart_toy</span>
                    <h4 className="text-emerald-400 font-bold text-sm uppercase tracking-wider">
                      {runningAgents.length} Agent{runningAgents.length !== 1 ? 's' : ''} Running
                    </h4>
                  </div>
                  <div className="relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-75" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {runningAgents.map((agent) => (
                    <span
                      key={agent.id}
                      className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium"
                    >
                      {agent.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}

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

      {/* What's New — 3 most recent activity entries */}
      <div className="px-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-primary text-lg font-bold tracking-tight">What&apos;s New</h3>
          <Link href="/activity" className="text-primary/60 text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors">
            View All
          </Link>
        </div>

        <div className="space-y-2">
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
      </div>

      {/* Quick Links Grid */}
      <div className="px-6 mb-8">
        <h3 className="text-primary text-lg font-bold tracking-tight mb-3">Quick Links</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 bg-secondary-dark/40 border border-primary/5 rounded-xl px-4 py-3 hover:border-primary/20 hover:bg-secondary-dark/60 transition-all group"
            >
              <div className="size-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
                  {link.icon}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{link.label}</p>
                <p className="text-primary/40 text-[10px] font-medium uppercase tracking-wider">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Access - Categories */}
      <div className="px-6 mb-8">
        <h3 className="text-primary text-lg font-bold tracking-tight mb-3">Vault Categories</h3>
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
