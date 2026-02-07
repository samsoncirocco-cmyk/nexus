import { getActivity, type ActivityEntry } from '@/app/actions/activity';
import { getTasks, type Task } from '@/app/actions/tasks';
import { getCommands, type CommandEntry } from '@/app/actions/commands';
import { getAgents, type AgentEntry } from '@/app/actions/agents';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

/* ─── helpers ─── */

function countByDay(entries: ActivityEntry[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const e of entries) {
    const day = e.timestamp.slice(0, 10);
    map[day] = (map[day] || 0) + 1;
  }
  return map;
}

function countByAgent(entries: ActivityEntry[]): { name: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const e of entries) {
    const name = e.agent || 'unknown';
    map[name] = (map[name] || 0) + 1;
  }
  return Object.entries(map)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function tasksByColumn(tasks: Task[]): { column: string; count: number; color: string }[] {
  const columns: { key: string; color: string }[] = [
    { key: 'Backlog', color: '#6b7280' },
    { key: 'In Progress', color: '#3b82f6' },
    { key: 'Waiting on Samson', color: '#f59e0b' },
    { key: 'Done', color: '#10b981' },
  ];
  return columns.map(({ key, color }) => ({
    column: key,
    count: tasks.filter((t) => t.column === key).length,
    color,
  }));
}

function activeStreak(entries: ActivityEntry[]): number {
  if (!entries.length) return 0;
  const days = new Set(entries.map((e) => e.timestamp.slice(0, 10)));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (days.has(ds)) {
      streak++;
    } else if (i === 0) {
      // today might not have activity yet, check yesterday first
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/* ─── page ─── */

export default async function AnalyticsPage() {
  const [activity, tasks, commands, agents] = await Promise.all([
    getActivity(),
    getTasks(),
    getCommands(),
    getAgents(),
  ]);

  const totalRuns = activity.length + agents.length;
  const tasksDone = tasks.filter((t) => t.column === 'Done').length;
  const commandsProcessed = commands.length;
  const streak = activeStreak(activity);

  const byDay = countByDay(activity);
  const dayEntries = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b));
  const maxPerDay = Math.max(...dayEntries.map(([, c]) => c), 1);

  const leaderboard = countByAgent(activity);
  const maxAgent = Math.max(...leaderboard.map((l) => l.count), 1);

  const taskFlow = tasksByColumn(tasks);
  const maxTasks = Math.max(...taskFlow.map((t) => t.count), 1);

  const recentDone = activity
    .filter((a) => a.status === 'done' || a.type === 'completed' || a.type === 'deployed')
    .slice(0, 10);

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg-dark/80 backdrop-blur-md pt-6 md:pt-8 pb-4 px-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">
              Protocol Active
            </span>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          </div>
          <Link
            href="/activity"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
          >
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>
              data_usage
            </span>
            <span className="text-primary text-xs font-bold">Activity</span>
          </Link>
        </div>
        <p className="text-foreground-muted text-sm">
          Agent performance, task metrics & activity timeline
        </p>
      </header>

      <main className="flex-1 px-6 pb-32 space-y-8">
        {/* ─────── SUMMARY CARDS ─────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon="smart_toy"
            label="Agents Run"
            value={totalRuns}
            sub={`${agents.filter((a) => a.status === 'completed').length} completed`}
          />
          <SummaryCard
            icon="task_alt"
            label="Tasks Done"
            value={tasksDone}
            sub={`of ${tasks.length} total`}
            accent="emerald"
          />
          <SummaryCard
            icon="bolt"
            label="Commands"
            value={commandsProcessed}
            sub={commandsProcessed > 0 ? 'processed' : 'none yet'}
            accent="blue"
          />
          <SummaryCard
            icon="local_fire_department"
            label="Active Streak"
            value={streak}
            sub={streak === 1 ? 'day' : 'days'}
            accent="orange"
          />
        </div>

        {/* ─────── AGENT ACTIVITY TIMELINE ─────── */}
        <section className="bg-card-dark rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
            >
              bar_chart
            </span>
            <h2 className="text-lg font-bold">Agent Activity Timeline</h2>
          </div>

          {dayEntries.length === 0 ? (
            <p className="text-foreground-muted text-sm py-8 text-center">
              No activity recorded yet.
            </p>
          ) : (
            <div className="space-y-3">
              {dayEntries.map(([day, count]) => {
                const pct = (count / maxPerDay) * 100;
                return (
                  <div key={day} className="flex items-center gap-4">
                    <span className="text-xs text-foreground-muted font-mono w-20 shrink-0">
                      {shortDate(day)}
                    </span>
                    <div className="flex-1 h-8 bg-bg-dark rounded-lg overflow-hidden relative">
                      <div
                        className="h-full rounded-lg transition-all duration-700"
                        style={{
                          width: `${Math.max(pct, 4)}%`,
                          background: 'linear-gradient(90deg, #154733 0%, #fade29 100%)',
                        }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-foreground">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ─────── 2-COL: LEADERBOARD + TASK FLOW ─────── */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Agent Leaderboard */}
          <section className="bg-card-dark rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-6">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
              >
                leaderboard
              </span>
              <h2 className="text-lg font-bold">Agent Leaderboard</h2>
            </div>

            {leaderboard.length === 0 ? (
              <p className="text-foreground-muted text-sm py-4 text-center">No data.</p>
            ) : (
              <div className="space-y-3">
                {leaderboard.map((agent, i) => {
                  const pct = (agent.count / maxAgent) * 100;
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={agent.name} className="flex items-center gap-3">
                      <span className="text-base w-6 text-center shrink-0">
                        {i < 3 ? medals[i] : <span className="text-foreground-muted text-xs">{i + 1}</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold truncate">{agent.name}</span>
                          <span className="text-xs text-primary font-bold ml-2">{agent.count}</span>
                        </div>
                        <div className="h-2 bg-bg-dark rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.max(pct, 6)}%`,
                              background:
                                i === 0
                                  ? '#fade29'
                                  : i === 1
                                    ? '#d4a843'
                                    : i === 2
                                      ? '#8B7355'
                                      : '#154733',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Task Flow */}
          <section className="bg-card-dark rounded-2xl border border-border p-6">
            <div className="flex items-center gap-2 mb-6">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
              >
                view_kanban
              </span>
              <h2 className="text-lg font-bold">Task Flow</h2>
            </div>

            <div className="space-y-4">
              {taskFlow.map((tf) => {
                const pct = (tf.count / maxTasks) * 100;
                return (
                  <div key={tf.column}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">{tf.column}</span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          color: tf.color,
                          background: `${tf.color}20`,
                        }}
                      >
                        {tf.count}
                      </span>
                    </div>
                    <div className="h-6 bg-bg-dark rounded-lg overflow-hidden">
                      <div
                        className="h-full rounded-lg transition-all duration-700 flex items-center justify-end pr-2"
                        style={{
                          width: `${Math.max(pct, 6)}%`,
                          background: tf.color,
                          opacity: 0.8,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between">
              <span className="text-sm text-foreground-muted">Total tasks</span>
              <span className="text-lg font-bold text-primary">{tasks.length}</span>
            </div>
          </section>
        </div>

        {/* ─────── RECENT COMPLETIONS ─────── */}
        <section className="bg-card-dark rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
            >
              history
            </span>
            <h2 className="text-lg font-bold">Recent Completions</h2>
          </div>

          {recentDone.length === 0 ? (
            <p className="text-foreground-muted text-sm py-6 text-center">No completions yet.</p>
          ) : (
            <div className="space-y-1">
              {recentDone.map((entry, i) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-4 py-3 border-b border-border-subtle last:border-0 group"
                >
                  {/* Index */}
                  <div className="w-7 h-7 rounded-full bg-secondary-dark/40 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[11px] font-bold text-primary">{i + 1}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold truncate">{entry.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-foreground-muted">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          smart_toy
                        </span>
                        {entry.agent}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          schedule
                        </span>
                        {timeAgo(entry.timestamp)}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                        style={{
                          background:
                            entry.type === 'deployed'
                              ? 'rgba(59,130,246,0.15)'
                              : 'rgba(16,185,129,0.15)',
                          color: entry.type === 'deployed' ? '#60a5fa' : '#34d399',
                        }}
                      >
                        {entry.type}
                      </span>
                    </div>
                  </div>

                  {/* Check icon */}
                  <span
                    className="material-symbols-outlined text-emerald-500 shrink-0 mt-1"
                    style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─────── AGENT FLEET STATUS ─────── */}
        <section className="bg-card-dark rounded-2xl border border-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <span
              className="material-symbols-outlined text-primary"
              style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
            >
              hub
            </span>
            <h2 className="text-lg font-bold">Agent Fleet Status</h2>
          </div>

          {agents.length === 0 ? (
            <p className="text-foreground-muted text-sm py-4 text-center">No agents in fleet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="bg-bg-dark rounded-xl border border-border-subtle p-4 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold truncate pr-2">{agent.label}</span>
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        agent.status === 'running'
                          ? 'bg-primary animate-pulse'
                          : agent.status === 'completed'
                            ? 'bg-emerald-500'
                            : 'bg-red-500'
                      }`}
                    />
                  </div>
                  <p className="text-xs text-foreground-muted line-clamp-2 mb-2">{agent.summary}</p>
                  <div className="flex items-center justify-between text-[10px] text-foreground-muted">
                    <span className="uppercase tracking-wider font-bold">{agent.model}</span>
                    <span>{agent.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/* ─── Summary Card Component ─── */

function SummaryCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: string;
  label: string;
  value: number;
  sub: string;
  accent?: 'emerald' | 'blue' | 'orange';
}) {
  const accentColors = {
    emerald: { icon: 'text-emerald-400', ring: 'border-emerald-500/20', glow: 'shadow-emerald-500/10' },
    blue: { icon: 'text-blue-400', ring: 'border-blue-500/20', glow: 'shadow-blue-500/10' },
    orange: { icon: 'text-orange-400', ring: 'border-orange-500/20', glow: 'shadow-orange-500/10' },
  };
  const colors = accent ? accentColors[accent] : { icon: 'text-primary', ring: 'border-primary/20', glow: 'shadow-primary/10' };

  return (
    <div
      className="bg-card-dark rounded-2xl border border-border p-5 hover:border-primary/20 transition-colors group"
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`size-10 rounded-xl bg-bg-dark border ${colors.ring} flex items-center justify-center shadow-lg ${colors.glow}`}
        >
          <span
            className={`material-symbols-outlined ${colors.icon}`}
            style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}
          >
            {icon}
          </span>
        </div>
        <span className="text-xs text-foreground-muted font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
      <div className="text-xs text-foreground-muted mt-1">{sub}</div>
    </div>
  );
}
