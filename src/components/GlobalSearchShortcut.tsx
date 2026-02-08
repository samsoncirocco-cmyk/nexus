'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function GlobalSearchShortcut() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        
        // Only navigate if not already on search page
        if (pathname !== '/search') {
          router.push('/search');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, pathname]);

  return null; // This component doesn't render anything
}
