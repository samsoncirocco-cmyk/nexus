'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

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

export default function NavShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Don't render shell on login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* ==================== DESKTOP SIDEBAR ==================== */}
      <aside className="hidden md:flex w-72 h-screen bg-bg-secondary border-r border-border flex-col shrink-0 sticky top-0">
        {/* Logo */}
        <div className="p-6 border-b border-border-subtle">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="size-9 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_16px_rgba(250,222,41,0.2)]">
              <span className="material-symbols-outlined text-bg-dark font-bold" style={{ fontSize: 22 }}>
                psychology
              </span>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-foreground">Second Brain</span>
              <div className="text-[9px] font-bold tracking-[0.2em] text-primary/60 uppercase">Protocol Active</div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {SIDEBAR_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <div key={link.href}>
                {link.href === '/settings' && (
                  <div className="my-2 mx-4 border-t border-border-subtle" />
                )}
                <Link
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                    active
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-foreground-muted hover:bg-white/5 hover:text-foreground'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined ${active ? 'text-primary' : ''}`}
                    style={{ fontSize: 20, fontVariationSettings: active ? "'FILL' 1" : undefined }}
                  >
                    {link.icon}
                  </span>
                  <span className="font-medium">{link.label}</span>
                  {active && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_#fade29]" />
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-secondary-dark/40 border border-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>person</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">Samson</div>
              <div className="text-[10px] text-foreground-muted">Paul × Samson 🦆</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="flex-1 overflow-y-auto min-h-screen pb-24 md:pb-0">
        {children}
      </main>

      {/* ==================== MOBILE BOTTOM NAV ==================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-bg-dark/90 backdrop-blur-xl border-t border-primary/10">
        <div className="flex items-center justify-between px-6 pt-3 pb-safe max-w-md mx-auto">
          {NAV_ITEMS.map((item, idx) => {
            const active = isActive(item.href);
            // Center elevated button
            if (idx === 2) {
              return (
                <Link key={item.href} href={item.href} className="flex flex-col items-center -mt-8">
                  <div className={`size-14 rounded-full flex items-center justify-center border-4 border-bg-dark shadow-xl transition-transform hover:scale-105 ${
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
                  <span className={`text-[10px] font-bold uppercase tracking-tighter mt-1 ${active ? 'text-primary' : 'text-foreground-muted'}`}>
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 group transition-opacity ${
                  active ? 'opacity-100' : 'opacity-40 hover:opacity-100'
                }`}
              >
                <div className="relative">
                  <span
                    className={`material-symbols-outlined ${active ? 'text-primary' : 'text-white'}`}
                    style={{ fontVariationSettings: active && item.fill ? "'FILL' 1" : undefined }}
                  >
                    {item.icon}
                  </span>
                  {active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
                  )}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-tighter ${active ? 'text-primary' : 'text-white'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
        {/* iOS home indicator */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/20 rounded-full" />
      </nav>
    </div>
  );
}
