/**
 * TaskCardSkeleton - Skeleton loader for task cards
 */

import { Skeleton, SkeletonText, SkeletonBadge } from './Skeleton';

export function TaskCardSkeleton() {
  return (
    <div className="relative rounded-xl border border-l-4 border-white/10 bg-bg-dark p-4 animate-slide-up">
      {/* Header: badges */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <SkeletonBadge />
        <SkeletonBadge className="w-20" />
      </div>

      {/* Title */}
      <Skeleton className="h-5 w-3/4 mb-2" rounded="sm" />

      {/* Description */}
      <SkeletonText lines={2} className="mb-3" />

      {/* Tags */}
      <div className="flex gap-1.5 mb-3">
        <SkeletonBadge className="w-12" />
        <SkeletonBadge className="w-16" />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        <Skeleton className="flex-1 h-8" rounded="lg" />
        <Skeleton className="flex-1 h-8" rounded="lg" />
        <Skeleton className="flex-1 h-8" rounded="lg" />
      </div>
    </div>
  );
}

/**
 * Column skeleton with multiple cards
 */
export function TaskColumnSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col min-w-[280px] md:min-w-[300px] lg:min-w-[320px] flex-1">
      {/* Column Header */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-t-xl bg-gradient-to-b from-secondary-dark/10 to-transparent border border-primary/10 border-b-0">
        <Skeleton className="size-5" rounded="sm" />
        <Skeleton className="h-4 w-24" rounded="sm" />
        <div className="ml-auto">
          <SkeletonBadge />
        </div>
      </div>

      {/* Column Body */}
      <div className="flex-1 bg-card-dark rounded-b-xl p-3 border border-t-0 border-white/5 space-y-3 min-h-[400px]">
        {Array.from({ length: count }).map((_, i) => (
          <TaskCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
