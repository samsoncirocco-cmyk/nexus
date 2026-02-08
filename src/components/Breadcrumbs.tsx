'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

/* ── Label map for standard routes ── */
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
  memory: 'Memory',
  inbox: 'Inbox',
  search: 'Search',
  edit: 'Edit',
  new: 'New Document',
};

/* ── Category icons ── */
const CATEGORY_ICONS: Record<string, string> = {
  concepts: 'lightbulb',
  journal: 'auto_stories',
  projects: 'rocket_launch',
  accounts: 'account_balance',
  erate: 'bolt',
  intel: 'security',
  reports: 'analytics',
  marketing: 'campaign',
  repos: 'folder_open',
};

interface DocMeta {
  title: string;
  category: string;
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const [docMeta, setDocMeta] = useState<Record<string, DocMeta>>({});

  // Don't show breadcrumbs on home or login
  if (pathname === '/' || pathname === '/login') return null;

  // Parse pathname into segments
  const segments = pathname.split('/').filter(Boolean);

  // Fetch document metadata for doc routes
  useEffect(() => {
    if (segments[0] === 'doc' && segments.length > 1) {
      // Extract the actual doc slug (skip 'edit' or 'new' if present)
      let docSlug = '';
      let startIdx = 1;
      
      if (segments[1] === 'edit' && segments.length > 2) {
        docSlug = segments.slice(2).join('/');
      } else if (segments[1] !== 'new') {
        docSlug = segments.slice(1).join('/');
      }

      if (docSlug) {
        // Fetch document metadata
        fetch(`/api/search?q=${encodeURIComponent(docSlug)}`)
          .then(res => res.json())
          .then(data => {
            const doc = data.results?.find((d: any) => d.slug === docSlug);
            if (doc) {
              setDocMeta(prev => ({
                ...prev,
                [docSlug]: { title: doc.title, category: doc.category }
              }));
            }
          })
          .catch(() => {
            // Silently fail - will show slug instead
          });
      }
    }
  }, [pathname]);

  // Build breadcrumb trail
  const crumbs = [];
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const href = '/' + segments.slice(0, i + 1).join('/');
    const isLast = i === segments.length - 1;
    
    // Special handling for doc routes
    if (segments[0] === 'doc') {
      if (i === 0) {
        // "Documents" root
        crumbs.push({
          href,
          label: LABEL_MAP[segment] || 'Documents',
          icon: 'folder_open',
          isLast: false
        });
      } else if (i === 1 && segment === 'edit') {
        // Skip 'edit' segment in breadcrumbs
        continue;
      } else if (i === 1 && segment === 'new') {
        // "New Document"
        crumbs.push({
          href,
          label: 'New Document',
          icon: 'add',
          isLast: true
        });
      } else if (i === 1) {
        // Category level (e.g., 'concepts', 'projects')
        crumbs.push({
          href,
          label: segment.charAt(0).toUpperCase() + segment.slice(1),
          icon: CATEGORY_ICONS[segment] || 'folder',
          isLast: segments.length === 2 && !segments.includes('edit')
        });
      } else {
        // Document or deeper path
        const docSlug = segments.slice(1).join('/');
        const meta = docMeta[docSlug];
        
        if (meta) {
          crumbs.push({
            href,
            label: meta.title,
            icon: 'description',
            isLast: isLast || (segments.includes('edit') && i === segments.length - 1)
          });
        } else {
          // Fallback to slug
          const label = segment.replace(/-/g, ' ').split(' ').map(w => 
            w.charAt(0).toUpperCase() + w.slice(1)
          ).join(' ');
          
          crumbs.push({
            href,
            label,
            icon: 'description',
            isLast: isLast || (segments.includes('edit') && i === segments.length - 1)
          });
        }
      }
    } else {
      // Standard routes
      const label = LABEL_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      crumbs.push({
        href,
        label,
        icon: undefined,
        isLast
      });
    }
  }

  return (
    <nav 
      aria-label="Breadcrumb" 
      className="flex items-center gap-1.5 text-xs font-body px-4 pt-3 pb-2 md:px-6 md:pt-4 md:pb-3 overflow-x-auto hide-scrollbar"
    >
      {/* Home link */}
      <Link
        href="/"
        className="flex items-center gap-1 shrink-0 text-foreground-muted/60 hover:text-primary transition-colors group"
        aria-label="Home"
      >
        <span 
          className="material-symbols-outlined transition-colors" 
          style={{ fontSize: 16 }}
        >
          home
        </span>
        <span className="hidden sm:inline">Home</span>
      </Link>

      {/* Breadcrumb trail */}
      {crumbs.map((crumb, idx) => (
        <span key={crumb.href} className="flex items-center gap-1.5 shrink-0">
          {/* Chevron separator */}
          <span 
            className="material-symbols-outlined text-foreground-muted/30" 
            style={{ fontSize: 14 }}
            aria-hidden="true"
          >
            chevron_right
          </span>
          
          {crumb.isLast ? (
            // Current page (not a link)
            <span 
              className="flex items-center gap-1 text-foreground-muted font-medium"
              aria-current="page"
            >
              {crumb.icon && (
                <span 
                  className="material-symbols-outlined text-primary" 
                  style={{ fontSize: 14 }}
                  aria-hidden="true"
                >
                  {crumb.icon}
                </span>
              )}
              <span className="max-w-[200px] truncate">{crumb.label}</span>
            </span>
          ) : (
            // Link to ancestor page
            <Link 
              href={crumb.href} 
              className="flex items-center gap-1 text-foreground-muted/60 hover:text-primary transition-colors group"
            >
              {crumb.icon && (
                <span 
                  className="material-symbols-outlined group-hover:text-primary transition-colors" 
                  style={{ fontSize: 14 }}
                  aria-hidden="true"
                >
                  {crumb.icon}
                </span>
              )}
              <span className="max-w-[150px] truncate group-hover:text-primary transition-colors">
                {crumb.label}
              </span>
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
