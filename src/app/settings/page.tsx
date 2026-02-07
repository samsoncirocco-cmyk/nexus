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

const MODEL_LABELS: Record<string, string> = {
  'claude-opus-4-6': 'Claude Opus 4.6',
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
  { name: 'Duck Gold', hex: '#fade29', tw: 'bg-primary' },
  { name: 'Forest Green', hex: '#154733', tw: 'bg-secondary-dark' },
  { name: 'Deep Green', hex: '#004F27', tw: 'bg-secondary-dark-deep' },
  { name: 'Void Black', hex: '#0a0f0c', tw: 'bg-bg-dark' },
  { name: 'Card Dark', hex: '#111111', tw: 'bg-bg-secondary' },
  { name: 'Foreground', hex: '#FAFAFA', tw: 'bg-foreground' },
];

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState({ email: false, browser: true, telegram: true });
  const [toast, setToast] = useState<string | null>(null);
  const router = useRouter();

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      router.push('/login');
      router.refresh();
    } catch {
      // Force redirect even on error
      window.location.href = '/login';
    }
  }, [router]);

  useEffect(() => {
    Promise.all([
      fetch('/api/config').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/gateway').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([cfg, gw]) => {
      if (cfg) {
        setConfig(cfg);
        setNotifications(cfg.notifications);
      }
      setGateway(gw);
      setLoading(false);
    });
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
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
      // revert on failure
      setNotifications(notifications);
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
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 bg-secondary-dark border border-primary/30 rounded-xl text-primary text-sm font-medium shadow-lg shadow-primary/10 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            {toast}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="size-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 26 }}>settings</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold">Configuration</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-foreground-muted text-sm">Configure your Second Brain</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Profile ── */}
        <section className="bg-bg-secondary border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>person</span>
            <h2 className="text-lg font-bold text-foreground">Profile</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted block mb-1.5">Name</label>
              <div className="px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl text-foreground text-sm font-medium">
                {config?.profile.name ?? '—'}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted block mb-1.5">Email</label>
              <div className="px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl text-foreground text-sm font-medium truncate">
                {config?.profile.email ?? '—'}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted block mb-1.5">Timezone</label>
              <div className="px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl text-foreground text-sm font-medium">
                {config?.profile.timezone ?? '—'}
              </div>
            </div>
          </div>
        </section>

        {/* ── Model Configuration ── */}
        <section className="bg-bg-secondary border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>psychology</span>
            <h2 className="text-lg font-bold text-foreground">Model Stack</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {config && Object.entries(config.models).map(([role, model]) => (
              <div key={role} className="flex items-center gap-4 px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl">
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

        {/* ── Notification Preferences ── */}
        <section className="bg-bg-secondary border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>notifications</span>
            <h2 className="text-lg font-bold text-foreground">Notifications</h2>
          </div>
          <div className="space-y-4">
            {([
              { key: 'email' as const, icon: 'mail', label: 'Email Alerts', desc: 'Daily digest and urgent notifications' },
              { key: 'browser' as const, icon: 'web', label: 'Browser Notifications', desc: 'Push notifications in this browser' },
              { key: 'telegram' as const, icon: 'send', label: 'Telegram Alerts', desc: 'Real-time messages via Telegram bot' },
            ]).map(({ key, icon, label, desc }) => (
              <div key={key} className="flex items-center justify-between px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>{icon}</span>
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-semibold">{label}</p>
                    <p className="text-foreground-muted text-xs">{desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleNotificationToggle(key)}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 ${
                    notifications[key] ? 'bg-primary' : 'bg-border'
                  }`}
                >
                  <div
                    className={`absolute top-1 size-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                      notifications[key] ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Theme ── */}
        <section className="bg-bg-secondary border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>palette</span>
            <h2 className="text-lg font-bold text-foreground">Theme</h2>
          </div>
          <div className="flex items-center gap-4 mb-5 px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl">
            <div className="size-10 rounded-lg bg-gradient-to-br from-primary to-secondary-dark flex items-center justify-center shrink-0">
              <span className="text-lg">🦆</span>
            </div>
            <div>
              <p className="text-foreground text-sm font-semibold">Oregon Ducks × Space</p>
              <p className="text-foreground-muted text-xs">Duck Gold + Forest Green on deep dark</p>
            </div>
            <div className="ml-auto px-3 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-bold tracking-wider border border-primary/20">
              ACTIVE
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {THEME_COLORS.map((c) => (
              <div key={c.name} className="flex flex-col items-center gap-2">
                <div
                  className="size-12 rounded-xl border border-border-subtle shadow-inner"
                  style={{ backgroundColor: c.hex }}
                />
                <span className="text-[9px] font-bold uppercase tracking-wider text-foreground-muted text-center leading-tight">{c.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Connected Services ── */}
        <section className="bg-bg-secondary border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>cable</span>
            <h2 className="text-lg font-bold text-foreground">Connected Services</h2>
          </div>
          <div className="space-y-3">
            {config && Object.entries(config.services).map(([key, status]) => {
              const meta = SERVICE_META[key] ?? { icon: 'extension', label: key, color: 'text-foreground-muted' };
              const connected = status === 'connected';
              return (
                <div key={key} className="flex items-center justify-between px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className={`size-10 rounded-lg border flex items-center justify-center shrink-0 ${
                      connected ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'
                    }`}>
                      <span className={`material-symbols-outlined ${meta.color}`} style={{ fontSize: 20 }}>{meta.icon}</span>
                    </div>
                    <div>
                      <p className="text-foreground text-sm font-semibold">{meta.label}</p>
                      <p className="text-foreground-muted text-xs capitalize">{status === 'pending' ? 'Pending auth' : status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {connected ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold tracking-wider border border-emerald-500/20">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold tracking-wider border border-amber-500/20">
                        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Gateway Status ── */}
        <section className="bg-bg-secondary border border-border rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>router</span>
            <h2 className="text-lg font-bold text-foreground">OpenClaw Gateway</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-1">Status</p>
              <div className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${gateway?.status === 'ok' || gateway?.status === 'running' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <p className="text-foreground text-sm font-semibold capitalize">{gateway?.status ?? 'Unknown'}</p>
              </div>
            </div>
            <div className="px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-1">Tunnel</p>
              <p className="text-foreground text-sm font-semibold truncate">{gateway?.tunnel ?? 'Not available'}</p>
            </div>
            <div className="px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-1">Uptime</p>
              <p className="text-foreground text-sm font-semibold">{gateway?.uptime ?? '—'}</p>
            </div>
          </div>
        </section>

        {/* ── Data Management ── */}
        <section className="bg-bg-secondary border border-border rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 22 }}>database</span>
            <h2 className="text-lg font-bold text-foreground">Data Management</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => showToast('Vault export started — check downloads')}
              className="flex items-center gap-3 px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl hover:border-primary/30 transition-colors group"
            >
              <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform" style={{ fontSize: 20 }}>download</span>
              <div className="text-left">
                <p className="text-foreground text-sm font-semibold">Export Vault</p>
                <p className="text-foreground-muted text-[10px]">Download all data</p>
              </div>
            </button>
            <button
              onClick={() => showToast('Chat history cleared')}
              className="flex items-center gap-3 px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl hover:border-amber-500/30 transition-colors group"
            >
              <span className="material-symbols-outlined text-amber-400 group-hover:scale-110 transition-transform" style={{ fontSize: 20 }}>delete_sweep</span>
              <div className="text-left">
                <p className="text-foreground text-sm font-semibold">Clear Chat</p>
                <p className="text-foreground-muted text-[10px]">Reset chat history</p>
              </div>
            </button>
            <button
              onClick={() => showToast('Task board reset')}
              className="flex items-center gap-3 px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl hover:border-red-500/30 transition-colors group"
            >
              <span className="material-symbols-outlined text-red-400 group-hover:scale-110 transition-transform" style={{ fontSize: 20 }}>restart_alt</span>
              <div className="text-left">
                <p className="text-foreground text-sm font-semibold">Reset Tasks</p>
                <p className="text-foreground-muted text-[10px]">Clear task board</p>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
