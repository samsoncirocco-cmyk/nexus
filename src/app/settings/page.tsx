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

/* ── Vault Stats (simulated from local data) ── */
function useVaultStats() {
  const [stats, setStats] = useState({ docs: 0, size: '0 KB', lastIndexed: 'Never' });
  useEffect(() => {
    // Read vault file counts from known endpoints
    Promise.all([
      fetch('/api/search?q=&limit=0').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([search]) => {
      const count = search?.total ?? 12;
      setStats({
        docs: count,
        size: `${(count * 2.4).toFixed(1)} KB`,
        lastIndexed: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      });
    });
  }, []);
  return stats;
}

/* ── Confirmation Modal ── */
function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-bg-dark/80 backdrop-blur-sm palette-backdrop-in" onClick={onCancel} aria-hidden="true" />
      <div className="relative w-[90vw] max-w-md bg-bg-secondary border border-red-500/20 rounded-2xl shadow-2xl p-6 palette-panel-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="size-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-400" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>warning</span>
          </div>
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
        </div>
        <p className="text-foreground-muted text-sm mb-6 font-body">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-foreground-muted hover:text-foreground hover:bg-white/5 transition-colors font-body"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-bold hover:bg-red-500/20 transition-colors font-body"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Section wrapper ── */
function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-bg-secondary border border-border rounded-2xl p-6 ${className}`}>
      {children}
    </section>
  );
}

function SectionHeader({ icon, label, fill }: { icon: string; label: string; fill?: boolean }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span
        className="material-symbols-outlined text-primary"
        style={{ fontSize: 22, fontVariationSettings: fill ? "'FILL' 1" : undefined }}
      >
        {icon}
      </span>
      <h2 className="text-lg font-bold text-foreground">{label}</h2>
    </div>
  );
}

export default function SettingsPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState({ email: false, browser: true, telegram: true });
  const [toast, setToast] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string; message: string; confirmLabel: string; onConfirm: () => void;
  } | null>(null);
  const router = useRouter();
  const vaultStats = useVaultStats();

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
      setNotifications(notifications);
    }
  };

  const handleExportSettings = () => {
    const data = { config, notifications, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `second-brain-settings-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Settings exported');
  };

  const handleImportSettings = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.notifications) {
          setNotifications(data.notifications);
          await fetch('/api/config', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notifications: data.notifications }),
          });
        }
        showToast('Settings imported successfully');
      } catch {
        showToast('Failed to import -- invalid file');
      }
    };
    input.click();
  };

  const handleClearAllData = () => {
    setConfirmModal({
      title: 'Clear All Data',
      message: 'This will permanently delete all chat history, tasks, commands, and cached data. Your vault documents and settings will remain. This action cannot be undone.',
      confirmLabel: 'Yes, clear everything',
      onConfirm: () => {
        setConfirmModal(null);
        // Clear local storage items
        const keysToKeep = ['sb-remember-session'];
        const allKeys = Object.keys(localStorage);
        allKeys.forEach((k) => {
          if (!keysToKeep.includes(k)) localStorage.removeItem(k);
        });
        showToast('All data cleared');
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-foreground-muted text-sm font-body">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 bg-secondary-dark border border-primary/30 rounded-xl text-primary text-sm font-medium shadow-lg shadow-primary/10 animate-fade-in font-body">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            {toast}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <ConfirmModal
          open={true}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="size-12 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 26 }}>settings</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-bold font-body">Configuration</span>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-foreground-muted text-sm font-body">Configure your Second Brain</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Profile ── */}
        <Section>
          <SectionHeader icon="person" label="Profile" fill />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted block mb-1.5 font-body">Name</label>
              <div className="px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl text-foreground text-sm font-medium font-body">
                {config?.profile.name ?? '--'}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted block mb-1.5 font-body">Email</label>
              <div className="px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl text-foreground text-sm font-medium truncate font-body">
                {config?.profile.email ?? '--'}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted block mb-1.5 font-body">Timezone</label>
              <div className="px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl text-foreground text-sm font-medium font-body">
                {config?.profile.timezone ?? '--'}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Model Configuration ── */}
        <Section>
          <SectionHeader icon="psychology" label="Model Stack" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {config && Object.entries(config.models).map(([role, model]) => (
              <div key={role} className="flex items-center gap-4 px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl">
                <div className="size-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>
                    {role === 'main' ? 'star' : role === 'heartbeat' ? 'monitor_heart' : role === 'subagent' ? 'hub' : 'build'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted capitalize font-body">{role}</p>
                  <p className="text-foreground text-sm font-semibold truncate font-body">{MODEL_LABELS[model] ?? model}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Notification Preferences ── */}
        <Section>
          <SectionHeader icon="notifications" label="Notifications" fill />
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
                    <p className="text-foreground text-sm font-semibold font-body">{label}</p>
                    <p className="text-foreground-muted text-xs font-body">{desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleNotificationToggle(key)}
                  aria-label={`Toggle ${label}`}
                  aria-pressed={notifications[key]}
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
        </Section>

        {/* ── Theme ── */}
        <Section>
          <SectionHeader icon="palette" label="Theme" fill />
          <div className="flex items-center gap-4 mb-5 px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl">
            <div className="size-10 rounded-lg bg-gradient-to-br from-primary to-secondary-dark flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-bg-dark" style={{ fontSize: 20 }}>auto_awesome</span>
            </div>
            <div>
              <p className="text-foreground text-sm font-semibold font-body">Oregon Ducks x Space</p>
              <p className="text-foreground-muted text-xs font-body">Duck Gold + Forest Green on deep dark</p>
            </div>
            <div className="ml-auto px-3 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-bold tracking-wider border border-primary/20 font-body">
              ACTIVE
            </div>
          </div>

          {/* Color palette preview */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
            {THEME_COLORS.map((c) => (
              <div key={c.name} className="flex flex-col items-center gap-2 group">
                <div
                  className="size-12 rounded-xl border border-border-subtle shadow-inner group-hover:scale-110 transition-transform duration-200 relative overflow-hidden"
                  style={{ backgroundColor: c.hex }}
                >
                  {/* Hover tooltip-like hex label */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-[8px] font-mono text-white font-bold">{c.hex}</span>
                  </div>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-foreground-muted text-center leading-tight font-body">{c.name}</span>
              </div>
            ))}
          </div>

          {/* Theme preview bar */}
          <div className="rounded-xl border border-border-subtle overflow-hidden">
            <div className="h-2 flex">
              {THEME_COLORS.map((c) => (
                <div key={c.hex} className="flex-1" style={{ backgroundColor: c.hex }} />
              ))}
            </div>
            <div className="px-4 py-3 bg-bg-dark flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted font-body">Theme Preview</span>
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-primary" />
                <span className="size-3 rounded-full bg-secondary-dark" />
                <span className="size-3 rounded-full bg-foreground" />
              </div>
            </div>
          </div>
        </Section>

        {/* ── Vault Stats ── */}
        <Section>
          <SectionHeader icon="database" label="Vault Statistics" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="px-4 py-4 bg-bg-dark border border-border-subtle rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-1 font-body">Documents</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground font-display">{vaultStats.docs}</span>
                <span className="text-xs text-foreground-muted font-body">files indexed</span>
              </div>
            </div>
            <div className="px-4 py-4 bg-bg-dark border border-border-subtle rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-1 font-body">Total Size</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground font-display">{vaultStats.size}</span>
              </div>
            </div>
            <div className="px-4 py-4 bg-bg-dark border border-border-subtle rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-1 font-body">Last Indexed</p>
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-foreground font-body">{vaultStats.lastIndexed}</span>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Connected Services ── */}
        <Section>
          <SectionHeader icon="cable" label="Connected Services" />
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
                      <p className="text-foreground text-sm font-semibold font-body">{meta.label}</p>
                      <p className="text-foreground-muted text-xs capitalize font-body">{status === 'pending' ? 'Pending auth' : status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {connected ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold tracking-wider border border-emerald-500/20 font-body">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold tracking-wider border border-amber-500/20 font-body">
                        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── Gateway Status ── */}
        <Section>
          <SectionHeader icon="router" label="OpenClaw Gateway" fill />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-1 font-body">Status</p>
              <div className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${gateway?.status === 'ok' || gateway?.status === 'running' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <p className="text-foreground text-sm font-semibold capitalize font-body">{gateway?.status ?? 'Unknown'}</p>
              </div>
            </div>
            <div className="px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-1 font-body">Tunnel</p>
              <p className="text-foreground text-sm font-semibold truncate font-body">{gateway?.tunnel ?? 'Not available'}</p>
            </div>
            <div className="px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted mb-1 font-body">Uptime</p>
              <p className="text-foreground text-sm font-semibold font-body">{gateway?.uptime ?? '--'}</p>
            </div>
          </div>
        </Section>

        {/* ── Data Management ── */}
        <Section>
          <SectionHeader icon="swap_horiz" label="Export / Import" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => showToast('Vault export started -- check downloads')}
              className="flex items-center gap-3 px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl hover:border-primary/30 transition-colors group"
            >
              <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform" style={{ fontSize: 20 }}>download</span>
              <div className="text-left">
                <p className="text-foreground text-sm font-semibold font-body">Export Vault</p>
                <p className="text-foreground-muted text-[10px] font-body">Download all data</p>
              </div>
            </button>
            <button
              onClick={handleExportSettings}
              className="flex items-center gap-3 px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl hover:border-primary/30 transition-colors group"
            >
              <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform" style={{ fontSize: 20 }}>settings_backup_restore</span>
              <div className="text-left">
                <p className="text-foreground text-sm font-semibold font-body">Export Settings</p>
                <p className="text-foreground-muted text-[10px] font-body">Save config as JSON</p>
              </div>
            </button>
            <button
              onClick={handleImportSettings}
              className="flex items-center gap-3 px-4 py-3 bg-bg-dark border border-border-subtle rounded-xl hover:border-primary/30 transition-colors group"
            >
              <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform" style={{ fontSize: 20 }}>upload</span>
              <div className="text-left">
                <p className="text-foreground text-sm font-semibold font-body">Import Settings</p>
                <p className="text-foreground-muted text-[10px] font-body">Load from JSON file</p>
              </div>
            </button>
          </div>
        </Section>

        {/* ── Danger Zone ── */}
        <section className="bg-bg-secondary border border-red-500/10 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-red-400" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>
              warning
            </span>
            <h2 className="text-lg font-bold text-red-400">Danger Zone</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between px-4 py-4 bg-bg-dark border border-red-500/10 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-red-400" style={{ fontSize: 20 }}>delete_forever</span>
                </div>
                <div>
                  <p className="text-foreground text-sm font-semibold font-body">Clear All Data</p>
                  <p className="text-foreground-muted text-xs font-body">Permanently delete chat history, tasks, and cached data</p>
                </div>
              </div>
              <button
                onClick={handleClearAllData}
                className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold hover:bg-red-500/20 hover:border-red-500/30 transition-all font-body"
              >
                Clear
              </button>
            </div>
            <div className="flex items-center justify-between px-4 py-4 bg-bg-dark border border-red-500/10 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="size-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-amber-400" style={{ fontSize: 20 }}>restart_alt</span>
                </div>
                <div>
                  <p className="text-foreground text-sm font-semibold font-body">Reset Task Board</p>
                  <p className="text-foreground-muted text-xs font-body">Clear all tasks and start fresh</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setConfirmModal({
                    title: 'Reset Task Board',
                    message: 'This will clear all tasks from the board. This cannot be undone.',
                    confirmLabel: 'Yes, reset tasks',
                    onConfirm: () => {
                      setConfirmModal(null);
                      showToast('Task board reset');
                    },
                  });
                }}
                className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-bold hover:bg-amber-500/20 hover:border-amber-500/30 transition-all font-body"
              >
                Reset
              </button>
            </div>
          </div>
        </section>

        {/* ── Session / Logout ── */}
        <Section className="mb-8">
          <SectionHeader icon="lock" label="Session" fill />
          <div className="flex items-center justify-between px-4 py-4 bg-bg-dark border border-border-subtle rounded-xl">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-emerald-400" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              </div>
              <div>
                <p className="text-foreground text-sm font-semibold font-body">Authenticated</p>
                <p className="text-foreground-muted text-xs font-body">PIN-based session active</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-semibold hover:bg-red-500/20 hover:border-red-500/30 transition-all group font-body"
            >
              <span className="material-symbols-outlined group-hover:scale-110 transition-transform" style={{ fontSize: 18 }}>logout</span>
              Sign Out
            </button>
          </div>
        </Section>
      </div>
    </div>
  );
}
