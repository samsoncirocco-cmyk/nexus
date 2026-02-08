'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * PageTransition - Smooth fade/slide transition wrapper for route changes
 * 
 * Applies a subtle fade-in + upward slide animation when the route changes.
 * Duration: 250ms with ease-out timing for snappy, professional feel.
 * Mobile-first design — no jank on slower devices.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    // If route changed, trigger transition
    if (pathname !== prevPathname.current) {
      setIsTransitioning(true);
      prevPathname.current = pathname;

      // Brief delay to allow content to update, then fade in
      const timer = setTimeout(() => {
        setDisplayChildren(children);
        setIsTransitioning(false);
      }, 20);

      return () => clearTimeout(timer);
    } else {
      // Initial mount or same route
      setDisplayChildren(children);
    }
  }, [pathname, children]);

  return (
    <div
      className="transition-page"
      style={{
        opacity: isTransitioning ? 0 : 1,
        transform: isTransitioning ? 'translateY(8px)' : 'translateY(0)',
        transition: 'opacity 250ms ease-out, transform 250ms ease-out',
        willChange: 'opacity, transform',
      }}
    >
      {displayChildren}
    </div>
  );
}
