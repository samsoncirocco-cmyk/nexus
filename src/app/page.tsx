import { getDocumentsByCategory, getAllDocuments } from '@/lib/documents';
import { getActivity } from '@/app/actions/activity';
import { getTasks } from '@/app/actions/tasks';
import { getDeals } from '@/app/actions/deals';
import { getCommands } from '@/app/actions/commands';
import { getRunningAgents, getAgents } from '@/app/actions/agents';
import { getInsights, getRecentEvents } from '@/app/actions/datalake';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import CommandBar from '@/components/CommandBar';
import CalendarWidget from '@/components/CalendarWidget';
import {
  Greeting,
  LiveClock,
  CountUpNumber,
  KeyboardHint,
  StatusSummary,
  NeuralNetworkSVG,
  Sparkline,
  QuickActionsFAB,
  InsightsCard,
  DatalakeEventsBadge,
} from '@/components/DashboardClient';
import EmailDigest from '@/components/EmailDigest';
import { InsightsWidget } from '@/components/InsightsWidget';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const allDocs = getAllDocuments();
  const documentsByCategory = getDocumentsByCategory();
  const [activity, tasks, deals, commands, agents, runningAgents, insights, recentEvents] =
    await Promise.all([
      getActivity(),
      getTasks(),
      getDeals(),
      getCommands(),
      getAgents(),
      getRunningAgents(),
      getInsights().catch(() => ({ analyses: [], observations: [], counts: { analyses: 0, observations: 0 }, filters: { days: 7, limit: 20 } })),
      getRecentEvents(undefined, 24).catch(() => ({ events: [], count: 0, filters: { source: null, hours: 24, limit: 50 } })),
    ]);

  const activeTasks = tasks.filter(t => t.column !== 'Done').length;
  const activeDeals = deals.filter(d => d.stage !== 'Closed Won' && d.stage !== 'Closed Lost').length;
  const totalActivity = activity.length;
  const totalAgents = agents.length;
  const totalCommands = commands.length;
  const pendingCommands = commands.filter(c => c.status === 'pending').length;
  const recentActivity = activity.slice(0, 4);

  // Datalake cross-source event counts
  const datalakeEventCount = recentEvents.count || 0;
  const eventSourceCounts: Record<string, number> = {};
  if (recentEvents.events) {
    for (const evt of recentEvents.events) {
      const src = String(evt.source || 'unknown');
      eventSourceCounts[src] = (eventSourceCounts[src] || 0) + 1;
    }
  }

  // AI insights for display
  const insightAnalyses = (insights.analyses || []).slice(0, 3);
  const insightObservations = (insights.observations || []).slice(0, 3);

  // Generate sparkline trend data from activity timestamps (last 7 data points)
  const activitySparkline = (() => {
    if (activity.length === 0) return [0, 0, 0, 0, 0, 0, 0];
    const now = Date.now();
    const dayMs = 86400000;
    const buckets = Array(7).fill(0);
    activity.forEach(a => {
      const daysAgo = Math.floor((now - new Date(a.timestamp).getTime()) / dayMs);
      if (daysAgo >= 0 && daysAgo < 7) buckets[6 - daysAgo]++;
    });
    return buckets;
  })();

  const taskSparkline = (() => {
    const base = Math.max(0, activeTasks - 3);
    return [base, base + 1, base + 2, base + 1, base + 3, base + 2, activeTasks];
  })();

  const agentSparkline = (() => {
    const base = Math.max(0, totalAgents - 2);
    return [base, base + 1, base, base + 2, base + 1, base + 1, totalAgents];
  })();

  const commandSparkline = (() => {
    const base = Math.max(0, totalCommands - 4);
    return [base, base + 2, base + 1, base + 3, base + 2, base + 4, totalCommands];
  })();

  const activityIcons: Record<string, string> = {
    completed: 'check_circle',
    started: 'sync',
    alert: 'warning',
    note: 'draw',
    command: 'bolt',
    deployed: 'rocket_launch',
  };

  const activityAccentColors: Record<string, string> = {
    command: 'bg-primary',
    completed: 'bg-emerald-500',
    started: 'bg-blue-500',
    deployed: 'bg-purple-500',
    alert: 'bg-amber-500',
    note: 'bg-primary/60',
  };

  const activityGradients: Record<string, string> = {
    command: 'from-primary/8 to-transparent',
    completed: 'from-emerald-500/8 to-transparent',
    started: 'from-blue-500/8 to-transparent',
    deployed: 'from-purple-500/8 to-transparent',
    alert: 'from-amber-500/8 to-transparent',
    note: 'from-primary/5 to-transparent',
  };

  const QUICK_LINKS = [
    { href: '/doc/new', icon: 'note_add', label: 'New Document', desc: 'Create new doc', gradient: 'from-primary/10 to-secondary-dark/30' },
    { href: '/chat', icon: 'chat_bubble', label: 'Chat with Paul', desc: 'Talk to your AI', gradient: 'from-primary/10 to-secondary-dark/30' },
    { href: '/tasks', icon: 'checklist', label: 'Task Board', desc: `${activeTasks} active`, gradient: 'from-emerald-900/20 to-secondary-dark/30' },
    { href: '/agents', icon: 'smart_toy', label: 'Agent Fleet', desc: `${runningAgents.length} running`, gradient: 'from-teal-900/20 to-secondary-dark/30' },
    { href: '/deals', icon: 'rocket_launch', label: 'Sales Pipeline', desc: `${activeDeals} deals`, gradient: 'from-purple-900/15 to-secondary-dark/30' },
    { href: '/ask', icon: 'neurology', label: 'Ask Brain', desc: 'Search knowledge', gradient: 'from-blue-900/15 to-secondary-dark/30' },
    { href: '/commands', icon: 'bolt', label: 'Commands', desc: 'Issue orders', gradient: 'from-amber-900/15 to-secondary-dark/30' },
    { href: '/analytics', icon: 'analytics', label: 'Analytics', desc: 'Insights', gradient: '' },
    { href: '/devices', icon: 'storage', label: 'Devices', desc: 'Storage & cleanup', gradient: 'from-emerald-900/15 to-secondary-dark/30' },
    { href: '/activity', icon: 'data_usage', label: 'Activity Feed', desc: `${totalActivity} entries`, gradient: '' },
    { href: '/graph', icon: 'hub', label: 'Knowledge Graph', desc: `${allDocs.length} nodes`, gradient: '' },
    { href: '/doc', icon: 'folder_open', label: 'Documents', desc: `${Object.keys(documentsByCategory).length} categories`, gradient: '' },
    { href: '/settings', icon: 'settings', label: 'Settings', desc: 'Configure', gradient: '' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Top App Bar */}
      <div className="flex items-center p-6 pb-2 justify-between">
        <div className="flex size-10 shrink-0 items-center overflow-hidden rounded-full border border-primary/30 bg-secondary-dark animate-scale-in">
          <span className="material-symbols-outlined text-primary mx-auto" style={{ fontSize: 22 }}>person</span>
        </div>
        <div className="flex-1 px-4 animate-slide-up">
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/70">Welcome back</p>
            <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
          </div>
          <Greeting name="Samson" />
        </div>
        <div className="flex gap-3 items-center animate-slide-up delay-1">
          <LiveClock />
          <div className="w-px h-6 bg-primary/10" />
          <Link
            href="/settings"
            className="flex items-center justify-center rounded-full size-10 bg-secondary-dark/20 text-foreground-muted border border-primary/10 hover:text-primary hover:border-primary/30 transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>settings</span>
          </Link>
          <Link
            href="/activity"
            className="flex items-center justify-center rounded-full size-10 bg-secondary-dark/20 text-primary border border-primary/10 hover:border-primary/30 transition-all"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
          </Link>
        </div>
      </div>

      {/* Command Bar */}
      <div className="px-6 mt-4 mb-1 scan-line animate-slide-up delay-2">
        <CommandBar placeholder="What should Paul work on?" variant="full" />
        <KeyboardHint />
      </div>

      {/* Status Summary */}
      <StatusSummary
        agentsRunning={runningAgents.length}
        tasksActive={activeTasks}
        commandsPending={pendingCommands}
      />

      {/* Stat Cards with Animated Count-Up and Sparklines */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3">
        <Link href="/activity" className="card-hover animate-slide-up delay-1 flex flex-col gap-2 rounded-xl p-4 bg-gradient-to-br from-secondary-dark to-secondary-dark/60 border border-primary/10 shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>data_usage</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary/40">Activity</span>
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-white tracking-tight text-3xl font-bold">
              <CountUpNumber target={totalActivity} />
            </p>
            <Sparkline data={activitySparkline} color="var(--color-primary)" />
          </div>
          <div className="flex items-center gap-1">
            <p className="text-primary/50 text-[10px] font-medium">Total entries</p>
            {datalakeEventCount > 0 && (
              <DatalakeEventsBadge count={datalakeEventCount} sourceCounts={eventSourceCounts} />
            )}
          </div>
        </Link>
        <Link href="/tasks" className="card-hover animate-slide-up delay-2 flex flex-col gap-2 rounded-xl p-4 bg-gradient-to-br from-secondary-dark to-emerald-900/20 border border-primary/10 shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform" style={{ fontSize: 22 }}>task_alt</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary/40">Tasks</span>
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-white tracking-tight text-3xl font-bold">
              <CountUpNumber target={activeTasks} />
            </p>
            <Sparkline data={taskSparkline} color="#34d399" />
          </div>
          <p className="text-primary/50 text-[10px] font-medium">{tasks.length} total</p>
        </Link>
        <Link href="/agents" className="card-hover animate-slide-up delay-3 flex flex-col gap-2 rounded-xl p-4 bg-gradient-to-br from-secondary-dark to-teal-900/20 border border-primary/10 shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform" style={{ fontSize: 22 }}>smart_toy</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary/40">Agents</span>
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-white tracking-tight text-3xl font-bold">
              <CountUpNumber target={totalAgents} />
            </p>
            <Sparkline data={agentSparkline} color="#2dd4bf" />
          </div>
          <p className="text-primary/50 text-[10px] font-medium">{runningAgents.length} running</p>
        </Link>
        <Link href="/commands" className="card-hover animate-slide-up delay-4 flex flex-col gap-2 rounded-xl p-4 bg-gradient-to-br from-secondary-dark to-yellow-900/10 border border-primary/10 shadow-lg group">
          <div className="flex items-center justify-between">
            <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>bolt</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary/40">Commands</span>
          </div>
          <div className="flex items-end justify-between gap-2">
            <p className="text-white tracking-tight text-3xl font-bold">
              <CountUpNumber target={totalCommands} />
            </p>
            <Sparkline data={commandSparkline} color="#fbbf24" />
          </div>
          <p className="text-primary/50 text-[10px] font-medium">{pendingCommands} pending</p>
        </Link>
      </div>

      {/* Running Agents Card */}
      {runningAgents.length > 0 && (
        <div className="px-6 mb-4 animate-slide-up delay-3">
          <Link href="/agents" className="block">
            <div className="scan-line bg-gradient-to-br from-emerald-900/30 to-bg-dark rounded-xl p-5 border border-emerald-500/20 relative overflow-hidden hover:border-emerald-500/40 transition-colors animate-glow-pulse" style={{ '--tw-shadow-color': 'rgba(16, 185, 129, 0.06)' } as React.CSSProperties}>
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
      <div className="px-6 mb-6 animate-slide-up delay-4">
        <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-5 border border-primary/20 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <NeuralNetworkSVG />
          <div className="absolute -right-4 -top-4 size-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/15 transition-colors" />
          <div className="absolute -left-8 -bottom-8 size-20 bg-secondary-dark/60 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <div className="size-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">Online</span>
              </div>
              <h4 className="text-primary font-bold text-lg">Brain Status: Optimal</h4>
              <p className="text-primary/70 text-sm mt-1">
                Your knowledge graph spans <span className="text-white font-semibold">{allDocs.length}</span> documents across <span className="text-white font-semibold">{Object.keys(documentsByCategory).length}</span> categories.
              </p>
            </div>
            <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center animate-breathe group-hover:bg-primary/15 transition-colors">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 28, fontVariationSettings: "'FILL' 1" }}>psychology</span>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights from Datalake */}
      {(insightAnalyses.length > 0 || insightObservations.length > 0) && (
        <InsightsCard analyses={insightAnalyses} observations={insightObservations} />
      )}

      {/* Activity Insights Widget */}
      <InsightsWidget />

      {/* Email Digest */}
      <div className="px-6 mb-6 animate-slide-up delay-5">
        <EmailDigest />
      </div>

      {/* Calendar Widget */}
      <div className="px-6 mb-6 animate-slide-up delay-6">
        <CalendarWidget />
      </div>

      {/* What's New */}
      <div className="px-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-primary text-lg font-bold tracking-tight">What&apos;s New</h3>
            <div className="h-px w-12 bg-gradient-to-r from-primary/40 to-transparent" />
          </div>
          <Link href="/activity" className="flex items-center gap-1 text-primary/60 text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors group">
            View All
            <span className="material-symbols-outlined text-primary/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" style={{ fontSize: 14 }}>arrow_forward</span>
          </Link>
        </div>

        <div className="space-y-2.5">
          {recentActivity.length > 0 ? (
            recentActivity.map((entry, i) => (
              <div
                key={entry.id}
                className={`animate-slide-up ${i === 0 ? 'delay-1' : i === 1 ? 'delay-2' : i === 2 ? 'delay-3' : 'delay-4'} card-hover flex items-center gap-4 border px-4 py-4 rounded-xl relative overflow-hidden bg-gradient-to-r ${activityGradients[entry.type] || 'from-primary/5 to-transparent'} ${
                  entry.type === 'command'
                    ? 'border-primary/20'
                    : 'border-primary/5'
                }`}
              >
                {/* Left accent bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${activityAccentColors[entry.type] || 'bg-primary/40'}`} />
                <div className={`flex items-center justify-center rounded-xl shrink-0 size-11 border ${
                  entry.type === 'command'
                    ? 'text-primary bg-primary/15 border-primary/30 shadow-[0_0_12px_rgba(250,222,41,0.1)]'
                    : entry.type === 'completed'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : entry.type === 'deployed'
                    ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
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
                    {entry.type === 'deployed' && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-[9px] font-bold tracking-wider border border-purple-500/20">
                        DEPLOY
                      </span>
                    )}
                  </div>
                  <p className="text-primary/50 text-xs font-normal leading-normal truncate mt-0.5">{entry.summary}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-primary/40 font-medium text-[10px] uppercase tracking-tighter" suppressHydrationWarning>
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
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-primary text-lg font-bold tracking-tight">Quick Links</h3>
          <div className="h-px w-12 bg-gradient-to-r from-primary/40 to-transparent" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {QUICK_LINKS.map((link, i) => {
            const isFeatured = i < 3;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`card-hover animate-slide-up ${
                  i <= 8 ? `delay-${i + 1}` : ''
                } flex items-center gap-3 border rounded-xl px-4 group relative overflow-hidden ${
                  isFeatured
                    ? `py-5 bg-gradient-to-br ${link.gradient} border-primary/15 hover:border-primary/30`
                    : 'py-3.5 bg-secondary-dark/30 border-primary/5 hover:border-primary/20 hover:bg-secondary-dark/50'
                } transition-all`}
              >
                {isFeatured && (
                  <div className="absolute -right-4 -top-4 size-16 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
                <div className={`rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/20 group-hover:shadow-[0_0_16px_rgba(250,222,41,0.12)] group-hover:border-primary/30 transition-all ${
                  isFeatured ? 'size-11' : 'size-9'
                }`}>
                  <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform" style={{ fontSize: isFeatured ? 22 : 18 }}>
                    {link.icon}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className={`text-white font-semibold truncate group-hover:text-primary transition-colors ${isFeatured ? 'text-base' : 'text-sm'}`}>{link.label}</p>
                  <p className="text-primary/40 text-[10px] font-medium uppercase tracking-wider">{link.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Quick Access - Categories */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-primary text-lg font-bold tracking-tight">Vault Categories</h3>
          <div className="h-px w-12 bg-gradient-to-r from-primary/40 to-transparent" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(documentsByCategory).slice(0, 6).map(([category, docs], i) => {
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
                className={`card-hover animate-slide-up delay-${i + 1} flex items-center gap-3 bg-secondary-dark/30 border border-primary/5 rounded-xl px-4 py-3.5 group hover:border-primary/20 hover:bg-secondary-dark/50 transition-all`}
              >
                <div className="size-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/20 group-hover:border-primary/30 transition-all">
                  <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform" style={{ fontSize: 18 }}>
                    {icons[category] || 'folder_open'}
                  </span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold capitalize group-hover:text-primary transition-colors">{category}</p>
                  <p className="text-primary/50 text-[10px] font-medium uppercase tracking-wider">{docs.length} docs</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile Quick Actions FAB */}
      <QuickActionsFAB />
    </div>
  );
}
