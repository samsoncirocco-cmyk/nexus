'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(pathname);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    // Start progress
    setVisible(true);
    setProgress(0);

    // Rapidly move to ~70%
    requestAnimationFrame(() => setProgress(70));

    // Then finish
    timerRef.current = setTimeout(() => {
      setProgress(100);
      setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 200);
    }, 300);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9997] h-[2px] pointer-events-none">
      <div
        className="h-full bg-primary shadow-[0_0_8px_rgba(250,222,41,0.6)]"
        style={{
          width: `${progress}%`,
          transition: progress === 0 ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
