'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import Breadcrumbs from './Breadcrumbs';

/* ── Badge config: which nav items show unread counts ── */
const BADGE_MAP: Record<string, number> = {
  '/tasks': 3,
  '/activity': 2,
  '/agents': 1,
};

const NAV_ITEMS = [
  { href: '/', icon: 'home', label: 'Home', fill: true },
  { href: '/tasks', icon: 'checklist', label: 'Tasks', fill: true },
  { href: '/chat', icon: 'chat_bubble', label: 'Chat', fill: true },
  { href: '/commands', icon: 'bolt', label: 'Commands', fill: true },
  { href: '/agents', icon: 'smart_toy', label: 'Agents', fill: true },
];

const SIDEBAR_LINKS = [
  { href: '/', icon: 'home', label: 'Dashboard' },
  { href: '/chat', icon: 'chat_bubble', label: 'Chat with Paul' },
  { href: '/agents', icon: 'smart_toy', label: 'Agent Fleet' },
  { href: '/analytics', icon: 'analytics', label: 'Analytics' },
  { href: '/commands', icon: 'bolt', label: 'Commands' },
  { href: '/ask', icon: 'neurology', label: 'Ask Brain' },
  { href: '/tasks', icon: 'checklist', label: 'Task Board' },
  { href: '/activity', icon: 'data_usage', label: 'Activity Feed' },
  { href: '/deals', icon: 'rocket_launch', label: 'Sales Pipeline' },
  { href: '/graph', icon: 'hub', label: 'Knowledge Graph' },
  { href: '/doc', icon: 'folder_open', label: 'Documents' },
  { href: '/settings', icon: 'settings', label: 'Settings' },
];

/* SVG noise texture for sidebar background */
const NOISE_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;

/* ── Badge pill component ── */
function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold leading-none font-body">
      {count}
    </span>
  );
}

/* ── Mobile badge dot ── */
function BadgeDot() {
  return (
    <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary shadow-[0_0_6px_rgba(250,222,41,0.5)]" />
  );
}

export default function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [tappedIdx, setTappedIdx] = useState<number | null>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  /* Haptic-style flash on mobile tap */
  const handleMobileTap = useCallback((idx: number) => {
    setTappedIdx(idx);
    setTimeout(() => setTappedIdx(null), 200);
  }, []);

  // Don't render shell on login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[10000] focus:px-4 focus:py-2 focus:bg-primary focus:text-bg-dark focus:rounded-lg focus:text-sm focus:font-bold focus:font-body"
      >
        Skip to content
      </a>

      {/* ==================== DESKTOP SIDEBAR ==================== */}
      <aside
        aria-label="Main navigation"
        className="hidden md:flex h-screen bg-bg-secondary border-r border-border flex-col shrink-0 sticky top-0 relative sidebar-transition"
        style={{
          width: collapsed ? 72 : 288,
          backgroundImage: NOISE_BG,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px',
          backgroundBlendMode: 'overlay',
        }}
      >
        {/* Logo */}
        <div className="p-4 border-b border-border-subtle flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group min-w-0">
            <div
              className="size-9 bg-primary rounded-lg flex items-center justify-center shrink-0 transition-shadow duration-300"
              style={{ boxShadow: '0 0 16px rgba(250,222,41,0.2)' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 24px rgba(250,222,41,0.45)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 16px rgba(250,222,41,0.2)';
              }}
            >
              <span className="material-symbols-outlined text-bg-dark font-bold" style={{ fontSize: 22 }}>
                psychology
              </span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <span className="text-lg font-bold tracking-tight text-foreground font-display">Second Brain</span>
                <div className="text-[9px] font-bold tracking-[0.2em] text-primary/60 uppercase font-body">Protocol Active</div>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="ml-auto p-1.5 rounded-lg hover:bg-white/5 text-foreground-muted hover:text-foreground transition-colors"
              title="Collapse sidebar"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mx-auto mt-2 p-1.5 rounded-lg hover:bg-white/5 text-foreground-muted hover:text-foreground transition-colors"
            title="Expand sidebar"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
          </button>
        )}

        {/* Cmd+K shortcut hint */}
        {!collapsed && (
          <button
            onClick={() => {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
            }}
            className="mx-3 mt-3 flex items-center gap-2 px-3 py-2 rounded-xl border border-border-subtle bg-white/[0.02] hover:bg-white/5 text-foreground-muted hover:text-foreground transition-colors text-xs font-body"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span>
            <span className="flex-1 text-left">Search...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-border text-[10px] font-mono">
              {typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent) ? '⌘' : 'Ctrl'}K
            </kbd>
          </button>
        )}

        {/* Navigation */}
        <nav aria-label="Sidebar navigation" className="flex-1 p-3 space-y-1 overflow-y-auto relative">
          {SIDEBAR_LINKS.map((link, idx) => {
            const active = isActive(link.href);
            const badge = BADGE_MAP[link.href] || 0;
            return (
              <div key={link.href}>
                {link.href === '/settings' && (
                  <div
                    className="my-2 mx-4 h-px"
                    style={{
                      background: 'linear-gradient(90deg, rgba(250,222,41,0.1), transparent)',
                    }}
                  />
                )}
                <Link
                  href={link.href}
                  title={collapsed ? link.label : undefined}
                  className={`flex items-center gap-3 rounded-xl text-sm font-body animate-slide-up transition-all ${
                    collapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'
                  } ${
                    active
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_12px_rgba(250,222,41,0.06)]'
                      : 'text-foreground-muted hover:bg-white/5 hover:text-foreground'
                  }`}
                  style={{ animationDelay: `${idx * 40}ms` }}
                >
                  <span
                    className={`material-symbols-outlined relative ${active ? 'text-primary' : ''}`}
                    style={{ fontSize: 20, fontVariationSettings: active ? "'FILL' 1" : undefined }}
                  >
                    {link.icon}
                    {collapsed && badge > 0 && (
                      <span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary shadow-[0_0_6px_rgba(250,222,41,0.5)]" />
                    )}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="font-medium font-body flex-1">{link.label}</span>
                      {badge > 0 && <Badge count={badge} />}
                      {active && badge === 0 && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse-gold shadow-[0_0_8px_#fade29]" />
                      )}
                    </>
                  )}
                </Link>
              </div>
            );
          })}

          {/* Gradient fade at bottom for scroll indication */}
          <div
            className="sticky bottom-0 left-0 right-0 h-12 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, var(--color-bg-secondary), transparent)',
            }}
          />
        </nav>

        {/* Footer — mini status dashboard */}
        <div className="p-4 border-t border-border-subtle">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <div className="size-8 rounded-full bg-secondary-dark/40 border border-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>person</span>
              </div>
              <div className="size-2 rounded-full bg-emerald-400 animate-status-dot" title="System online" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="size-9 rounded-full bg-secondary-dark/40 border border-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>person</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate font-body">Samson</div>
                  <div className="text-[10px] text-foreground-muted font-body">Paul x Samson</div>
                </div>
              </div>
              {/* Mini status row */}
              <div className="flex items-center gap-3 px-1 text-[10px] text-foreground-muted/60 font-body">
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-status-dot" />
                  Online
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>bolt</span>
                  3 agents
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>task_alt</span>
                  {BADGE_MAP['/tasks'] || 0} tasks
                </span>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* ==================== MAIN CONTENT ==================== */}
      <main id="main-content" role="main" className="flex-1 overflow-y-auto min-h-screen pb-24 md:pb-0">
        <Breadcrumbs />
        <div className="page-enter">
          {children}
        </div>
      </main>

      {/* ==================== MOBILE BOTTOM NAV ==================== */}
      <nav aria-label="Mobile navigation" className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-bg-dark/90 backdrop-blur-2xl border-t border-primary/10 shadow-[0_-1px_12px_rgba(250,222,41,0.04)]">
        <div className="flex items-center justify-between px-6 pt-3 pb-safe max-w-md mx-auto">
          {NAV_ITEMS.map((item, idx) => {
            const active = isActive(item.href);
            const badge = BADGE_MAP[item.href] || 0;
            const isTapped = tappedIdx === idx;

            // Center elevated button
            if (idx === 2) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center -mt-8"
                  onClick={() => handleMobileTap(idx)}
                >
                  <div className="relative">
                    {active && (
                      <div
                        className="absolute inset-0 rounded-full animate-pulse-gold"
                        style={{ margin: '-4px' }}
                      />
                    )}
                    <div className={`size-14 rounded-full flex items-center justify-center border-4 border-bg-dark shadow-xl transition-transform duration-200 hover:scale-105 ${
                      isTapped ? 'scale-90' : ''
                    } ${
                      active
                        ? 'bg-primary shadow-[0_0_20px_rgba(250,222,41,0.4)]'
                        : 'bg-secondary-dark border-primary/30'
                    }`}>
                      <span
                        className={`material-symbols-outlined font-bold ${active ? 'text-bg-dark' : 'text-primary'}`}
                        style={{ fontSize: 28 }}
                      >
                        {item.icon}
                      </span>
                    </div>
                    {badge > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary text-bg-dark text-[9px] font-bold">
                        {badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-tighter mt-1 font-body ${active ? 'text-primary' : 'text-foreground-muted'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 group transition-all duration-200 ${
                  active ? 'opacity-100' : 'opacity-40 hover:opacity-100'
                }`}
                style={{ transition: 'opacity 0.2s ease, transform 0.15s ease' }}
                onClick={() => handleMobileTap(idx)}
              >
                <div className={`relative transition-transform duration-150 ${isTapped ? 'mobile-tap-flash scale-90' : 'active:translate-y-[-2px]'}`}>
                  <span
                    className={`material-symbols-outlined ${active ? 'text-primary' : 'text-white'}`}
                    style={{ fontVariationSettings: active && item.fill ? "'FILL' 1" : undefined }}
                  >
                    {item.icon}
                  </span>
                  {badge > 0 && <BadgeDot />}
                  {active && (
                    <>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
                      <div
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 rounded-full"
                        style={{ boxShadow: '0 4px 8px rgba(250,222,41,0.3)', pointerEvents: 'none' }}
                      />
                    </>
                  )}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-tighter font-body ${active ? 'text-primary' : 'text-white'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
        {/* iOS home indicator — primary tint */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-primary/15 rounded-full" />
      </nav>
    </div>
  );
}
