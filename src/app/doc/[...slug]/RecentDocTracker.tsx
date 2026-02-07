'use client';

import { useEffect } from 'react';

const RECENT_KEY = 'second-brain-recent-docs';
const MAX_RECENT = 6;

export default function RecentDocTracker({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const stored: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      const filtered = stored.filter(s => s !== slug);
      filtered.unshift(slug);
      localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));
    } catch { /* ignore */ }
  }, [slug]);

  return null;
}
