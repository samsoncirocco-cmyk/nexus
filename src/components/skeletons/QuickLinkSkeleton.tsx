/**
 * QuickLinkSkeleton - Skeleton loader for dashboard quick links
 */

import { Skeleton } from './Skeleton';

export function QuickLinkSkeleton({ featured = false }: { featured?: boolean }) {
  return (
    <div className={`flex items-center gap-3 border rounded-xl px-4 bg-secondary-dark/30 border-primary/5 transition-all ${
      featured ? 'py-5' : 'py-3.5'
    }`}>
      <Skeleton className={featured ? 'size-11' : 'size-9'} rounded="xl" />
      <div className="flex-1 min-w-0 space-y-1">
        <Skeleton className={`h-4 ${featured ? 'w-24' : 'w-20'}`} rounded="sm" />
        <Skeleton className="h-2 w-16" rounded="sm" />
      </div>
    </div>
  );
}

/**
 * Quick links grid skeleton
 */
export function QuickLinksGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <QuickLinkSkeleton key={i} featured={i < 3} />
      ))}
    </div>
  );
}
