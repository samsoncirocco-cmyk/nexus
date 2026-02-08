'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Config {
  profile: { name: string; email: string; timezone: string };
  models: { main: string; heartbeat: string; subagent: string; workhorse: string };
  notifications: { email: boolean; browser: boolean; telegram: boolean };
  services: Record<string, string>;
}

interface GatewayStatus {
  status: string;
  tunnel?: string;
  uptime?: string;
  version?: string;
}

interface VaultStats {
  documentCount: number;
  totalEvents: number;
  categories: number;
}

const MODEL_LABELS: Record<string, string> = {
  'claude-opus-4-6': 'Claude Opus 4.6',
  'claude-sonnet-4-5': 'Claude Sonnet 4.5',
  'gemini-2-flash': 'Gemini 2.0 Flash',
  'gemini-3-pro': 'Gemini 3 Pro',
};

const SERVICE_META: Record<string, { icon: string; label: string; color: string }> = {
  gmail: { icon: 'mail', label: 'Gmail', color: 'text-red-400' },
  calendar: { icon: 'calendar_month', label: 'Google Calendar', color: 'text-blue-400' },
  drive: { icon: 'cloud', label: 'Google Drive', color: 'text-yellow-400' },
  salesforce: { icon: 'rocket_launch', label: 'Salesforce', color: 'text-cyan-400' },
  github: { icon: 'code', label: 'GitHub', color: 'text-purple-400' },
};

const THEME_COLORS = [
  { name: 'Duck Gold', hex: '#FEE123', tw: 'bg-primary' },
  { name: 'Forest Green', hex: '#154733', tw: 'bg-secondary-dark' },
  { name: 'Deep Green', hex: '#004F27', tw: 'bg-secondary-dark-deep' },
  { name: 'Void Black', hex: '#0a0a0a', tw: 'bg-bg-dark' },
  { name: 'Card Dark', hex: '#111111', tw: 'bg-bg-secondary' },
  { name: 'Foreground', hex: '#FAFAFA', tw: 'bg-foreground' },
];

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);
  const [vaultStats, setVaultStats] = useState<VaultStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [compactMode, setCompactMode] = useState(false);
  const [notifications, setNotifications] = useState({ email: false, browser: true, telegram: true });
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      router.push('/login');
      router.refresh();
    } catch {
      window.location.href = '/login';
    }
  }, [router]);

  useEffect(() => {
    // Load theme and compact mode from localStorage
    const savedTheme = localStorage.getItem('second-brain-theme') as 'dark' | 'light' | null;
    const savedCompact = localStorage.getItem('second-brain-compact') === 'true';
    if (savedTheme) setTheme(savedTheme);
    setCompactMode(savedCompact);

    Promise.all([
      fetch('/api/config').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/gateway').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/vault/stats').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([cfg, gw, stats]) => {
      if (cfg) {
        setConfig(cfg);
        setNotifications(cfg.notifications);
      }
      setGateway(gw);
      setVaultStats(stats);
      setLoading(false);
    });
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('second-brain-theme', newTheme);
    showToast(`Theme set to ${newTheme} mode`);
    // In a real app, you'd apply the theme class to <html> or <body>
  };

  const handleCompactToggle = () => {
    const newCompact = !compactMode;
    setCompactMode(newCompact);
    localStorage.setItem('second-brain-compact', String(newCompact));
    showToast(`Compact mode ${newCompact ? 'enabled' : 'disabled'}`);
  };

  const handleNotificationToggle = async (key: keyof typeof notifications) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    try {
      await fetch('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications: updated }),
      });
      showToast(`${key.charAt(0).toUpperCase() + key.slice(1)} notifications ${updated[key] ? 'enabled' : 'disabled'}`);
    } catch {
      setNotifications(notifications);
    }
  };

  const handleRevalidateCache = async () => {
    showToast('Revalidating cache...');
    try {
      const res = await fetch('/api/revalidate', { method: 'POST' });
      if (res.ok) {
        showToast('✅ Cache revalidated successfully');
        router.refresh();
      } else {
        showToast('❌ Cache revalidation failed');
      }
    } catch {
      showToast('❌ Error revalidating cache');
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Clear all chat history? This cannot be undone.')) {
      localStorage.removeItem('second-brain-chat-history');
      showToast('🗑️ Chat history cleared');
    }
  };

  const handleExportVault = async () => {
    showToast('Preparing vault export...');
    try {
      const res = await fetch('/api/vault/export');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `second-brain-vault-${new Date().toISOString().split('T')[0]}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('📦 Vault exported successfully');
      } else {
        showToast('❌ Vault export failed');
      }
    } catch {
      showToast('❌ Error exporting vault');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-foreground-muted text-sm">Loading settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-32 md:pb-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-4 md:right-6 z-50 px-4 md:px-5 py-3 bg-secondary-dark border border-primary/30 rounded-xl text-primary text-sm font-medium shadow-lg shadow-primary/10 animate-fade-in max-w-[calc(100vw-2rem)]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <span className="truncate">{toast}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6 md:mb-8">
        <div className="size-12 md:size-14 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 28 }}>settings</span>
        </div>
        <div className="min-w-0">
          <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Configuration</span>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight truncate">Settings</h1>
          <p className="text-foreground-muted text-sm hidden md:block">Configure your Second Brain</p>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* ── Display Settings ── */}
        <section className="bg-bg-secondary border border-border rounded-2xl p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4 md:mb-5">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>palette</span>
            <h2 className="text-lg font-bold text-foreground">Display</h2>
          </div>
          <div className="space-y-3 md:space-y-4">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl min-h-[60px]">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
                    {theme === 'dark' ? 'dark_mode' : 'light_mode'}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-foreground text-sm font-semibold">Theme</p>
                  <p className="text-foreground-muted text-xs truncate">Currently: {theme === 'dark' ? 'Dark' : 'Light'}</p>
                </div>
              </div>
              <button
                onClick={handleThemeToggle}
                className={`relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 min-h-[44px] flex items-center ${
                  theme === 'dark' ? 'bg-primary' : 'bg-border'
                }`}
                aria-label="Toggle theme"
              >
                <div
                  className={`absolute top-1 size-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Compact Mode */}
            <div className="flex items-center justify-between px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl min-h-[60px]">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>density_medium</span>
                </div>
                <div className="min-w-0">
                  <p className="text-foreground text-sm font-semibold">Compact Mode</p>
                  <p className="text-foreground-muted text-xs truncate">Reduce spacing throughout the app</p>
                </div>
              </div>
              <button
                onClick={handleCompactToggle}
                className={`relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 min-h-[44px] flex items-center ${
                  compactMode ? 'bg-primary' : 'bg-border'
                }`}
                aria-label="Toggle compact mode"
              >
                <div
                  className={`absolute top-1 size-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    compactMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Theme Colors Preview */}
          <div className="mt-4 md:mt-5 pt-4 md:pt-5 border-t border-border-subtle">
            <p className="text-xs font-bold uppercase tracking-wider text-foreground-muted mb-3">Current Theme: Oregon Ducks</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 md:gap-3">
              {THEME_COLORS.map((c) => (
                <div key={c.name} className="flex flex-col items-center gap-2">
                  <div
                    className="size-10 md:size-12 rounded-xl border border-border-subtle shadow-inner"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-foreground-muted text-center leading-tight">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── System Info ── */}
        <section className="bg-bg-secondary border border-border rounded-2xl p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4 md:mb-5">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>info</span>
            <h2 className="text-lg font-bold text-foreground">System Info</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {/* Gateway Version & Status */}
            <div className="px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className={`size-2 rounded-full ${gateway?.status === 'ok' || gateway?.status === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">OpenClaw Gateway</p>
              </div>
              <p className="text-foreground text-sm font-semibold">{gateway?.version || 'v1.0.0'}</p>
              <p className="text-foreground-muted text-xs">Uptime: {gateway?.uptime || '—'}</p>
            </div>

            {/* Active Model */}
            <div className="px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-2">Active Model</p>
              <p className="text-foreground text-sm font-semibold">{MODEL_LABELS[config?.models.main || ''] || config?.models.main || 'Claude Opus 4.6'}</p>
              <p className="text-foreground-muted text-xs">Main agent model</p>
            </div>

            {/* Vault Documents */}
            <div className="px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-2">Vault Documents</p>
              <p className="text-foreground text-2xl font-bold">{vaultStats?.documentCount || 0}</p>
              <p className="text-foreground-muted text-xs">{vaultStats?.categories || 0} categories</p>
            </div>

            {/* Total Events */}
            <div className="px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-2">Total Events</p>
              <p className="text-foreground text-2xl font-bold">{vaultStats?.totalEvents || 0}</p>
              <p className="text-foreground-muted text-xs">Activity entries logged</p>
            </div>
          </div>
        </section>

        {/* ── Quick Actions ── */}
        <section className="bg-bg-secondary border border-border rounded-2xl p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4 md:mb-5">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>bolt</span>
            <h2 className="text-lg font-bold text-foreground">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={handleRevalidateCache}
              className="flex flex-col gap-2 px-4 py-4 bg-bg-dark border border-border-subtle rounded-xl hover:border-primary/30 transition-colors group text-left min-h-[72px]"
            >
              <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform" style={{ fontSize: 24 }}>cached</span>
              <div>
                <p className="text-foreground text-sm font-semibold">Revalidate Cache</p>
                <p className="text-foreground-muted text-[10px]">Refresh all data</p>
              </div>
            </button>

            <button
              onClick={handleClearChat}
              className="flex flex-col gap-2 px-4 py-4 bg-bg-dark border border-border-subtle rounded-xl hover:border-amber-500/30 transition-colors group text-left min-h-[72px]"
            >
              <span className="material-symbols-outlined text-amber-400 group-hover:scale-110 transition-transform" style={{ fontSize: 24 }}>delete_sweep</span>
              <div>
                <p className="text-foreground text-sm font-semibold">Clear Chat</p>
                <p className="text-foreground-muted text-[10px]">Reset chat history</p>
              </div>
            </button>

            <button
              onClick={handleExportVault}
              className="flex flex-col gap-2 px-4 py-4 bg-bg-dark border border-border-subtle rounded-xl hover:border-emerald-500/30 transition-colors group text-left min-h-[72px]"
            >
              <span className="material-symbols-outlined text-emerald-400 group-hover:scale-110 transition-transform" style={{ fontSize: 24 }}>download</span>
              <div>
                <p className="text-foreground text-sm font-semibold">Export Vault</p>
                <p className="text-foreground-muted text-[10px]">Download as ZIP</p>
              </div>
            </button>
          </div>
        </section>

        {/* ── Model Configuration ── */}
        <section className="bg-bg-secondary border border-border rounded-2xl p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4 md:mb-5">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>psychology</span>
            <h2 className="text-lg font-bold text-foreground">Model Stack</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {config && Object.entries(config.models).map(([role, model]) => (
              <div key={role} className="flex items-center gap-3 md:gap-4 px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl">
                <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
                    {role === 'main' ? 'star' : role === 'heartbeat' ? 'monitor_heart' : role === 'subagent' ? 'hub' : 'build'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted capitalize">{role}</p>
                  <p className="text-foreground text-sm font-semibold truncate">{MODEL_LABELS[model] ?? model}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Connected Services ── */}
        <section className="bg-bg-secondary border border-border rounded-2xl p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4 md:mb-5">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>cable</span>
            <h2 className="text-lg font-bold text-foreground">Connected Services</h2>
          </div>
          <div className="space-y-3">
            {config && Object.entries(config.services).map(([key, status]) => {
              const meta = SERVICE_META[key] ?? { icon: 'extension', label: key, color: 'text-foreground-muted' };
              const connected = status === 'connected';
              return (
                <div key={key} className="flex items-center justify-between px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl min-h-[60px]">
                  <div className="flex items-center gap-3 md:gap-4 min-w-0">
                    <div className={`size-10 rounded-lg border flex items-center justify-center shrink-0 ${
                      connected ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'
                    }`}>
                      <span className={`material-symbols-outlined ${meta.color}`} style={{ fontSize: 20 }}>{meta.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground text-sm font-semibold truncate">{meta.label}</p>
                      <p className="text-foreground-muted text-xs capitalize truncate">{status === 'pending' ? 'Pending auth' : status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {connected ? (
                      <span className="flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold tracking-wider border border-emerald-500/20">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        <span className="hidden sm:inline">Connected</span>
                        <span className="sm:hidden">✓</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold tracking-wider border border-amber-500/20">
                        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span className="hidden sm:inline">Pending</span>
                        <span className="sm:hidden">⏳</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── About ── */}
        <section className="bg-bg-secondary border border-border rounded-2xl p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4 md:mb-5">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>info</span>
            <h2 className="text-lg font-bold text-foreground">About</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="size-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 24 }}>psychology</span>
              </div>
              <div>
                <p className="text-foreground text-sm font-semibold">Second Brain</p>
                <p className="text-foreground-muted text-xs">Version 1.0.0</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://github.com/fortinet-se/second-brain"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-bg-dark border border-border-subtle rounded-lg hover:border-primary/30 transition-colors text-sm min-h-[44px]"
              >
                <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 18 }}>code</span>
                <span className="text-foreground font-medium">GitHub</span>
              </a>
              <a
                href="https://brain.6eyes.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-bg-dark border border-border-subtle rounded-lg hover:border-primary/30 transition-colors text-sm min-h-[44px]"
              >
                <span className="material-symbols-outlined text-foreground-muted" style={{ fontSize: 18 }}>description</span>
                <span className="text-foreground font-medium">Docs</span>
              </a>
            </div>
            <div className="pt-4 border-t border-border-subtle text-xs text-foreground-muted">
              <p>Built with ❤️ by Paul × Samson</p>
              <p className="mt-1">Powered by OpenClaw • Next.js • Tailwind CSS</p>
            </div>
          </div>
        </section>

        {/* ── Session / Logout ── */}
        <section className="bg-bg-secondary border border-border rounded-2xl p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4 md:mb-5">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>lock</span>
            <h2 className="text-lg font-bold text-foreground">Session</h2>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 py-4 bg-bg-dark border border-border-subtle rounded-xl">
            <div className="flex items-center gap-3 md:gap-4 min-w-0">
              <div className="size-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              </div>
              <div className="min-w-0">
                <p className="text-foreground text-sm font-semibold">Authenticated</p>
                <p className="text-foreground-muted text-xs truncate">PIN-based session active</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-semibold hover:bg-red-500/20 hover:border-red-500/30 transition-all group min-h-[44px] w-full sm:w-auto justify-center"
            >
              <span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontSize: 18 }}>logout</span>
              Sign Out
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
