/**
 * StatCardSkeleton - Skeleton loader for dashboard stat cards
 */

import { Skeleton } from './Skeleton';

export function StatCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-xl p-4 bg-gradient-to-br from-secondary-dark/20 to-secondary-dark/5 border border-primary/10 shadow-lg">
      {/* Icon + label */}
      <div className="flex items-center justify-between">
        <Skeleton className="size-6" rounded="md" />
        <Skeleton className="h-3 w-16" rounded="sm" />
      </div>

      {/* Number + sparkline */}
      <div className="flex items-end justify-between gap-2">
        <Skeleton className="h-8 w-16" rounded="sm" />
        <Skeleton className="h-6 w-20" rounded="sm" />
      </div>

      {/* Subtitle */}
      <Skeleton className="h-2 w-24" rounded="sm" />
    </div>
  );
}

/**
 * Grid of stat cards
 */
export function StatCardsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}
