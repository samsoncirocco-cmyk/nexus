'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LABEL_MAP: Record<string, string> = {
  '': 'Dashboard',
  chat: 'Chat',
  agents: 'Agent Fleet',
  analytics: 'Analytics',
  commands: 'Commands',
  ask: 'Ask Brain',
  tasks: 'Task Board',
  activity: 'Activity Feed',
  deals: 'Sales Pipeline',
  graph: 'Knowledge Graph',
  doc: 'Documents',
  settings: 'Settings',
  login: 'Login',
};

export default function Breadcrumbs() {
  const pathname = usePathname();

  if (pathname === '/' || pathname === '/login') return null;

  const segments = pathname.split('/').filter(Boolean);

  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/');
    const label = LABEL_MAP[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
    const isLast = i === segments.length - 1;
    return { href, label, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs font-body text-foreground-muted/60 px-6 pt-4 md:px-8">
      <Link
        href="/"
        className="hover:text-primary transition-colors flex items-center gap-1"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>home</span>
        <span className="hidden sm:inline">Home</span>
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-foreground-muted/30" style={{ fontSize: 14 }}>
            chevron_right
          </span>
          {crumb.isLast ? (
            <span className="text-foreground-muted" aria-current="page">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-primary transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
