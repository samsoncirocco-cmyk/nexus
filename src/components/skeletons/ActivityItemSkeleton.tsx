/**
 * ActivityItemSkeleton - Skeleton loader for activity feed items
 */

import { Skeleton, SkeletonText, SkeletonBadge } from './Skeleton';

export function ActivityItemSkeleton() {
  return (
    <div className="relative pl-10 animate-slide-up">
      {/* Timeline Node */}
      <div className="absolute left-0 top-1.5 w-[24px] h-[24px] rounded-full bg-bg-dark border-2 border-primary/20 flex items-center justify-center z-10">
        <Skeleton className="w-2 h-2" rounded="full" />
      </div>

      {/* Card */}
      <div className="flex flex-col gap-2 bg-card-dark/30 -mx-1 px-1 py-1 rounded-xl">
        {/* Header: badges + time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SkeletonBadge className="w-20" />
            <Skeleton className="h-3 w-12" rounded="sm" />
          </div>
        </div>

        {/* Action verb */}
        <Skeleton className="h-3 w-24" rounded="sm" />

        {/* Summary */}
        <SkeletonText lines={1} />

        {/* Tags */}
        <div className="flex gap-1.5 mt-1">
          <SkeletonBadge className="w-12" />
          <SkeletonBadge className="w-16" />
        </div>
      </div>
    </div>
  );
}

/**
 * Activity feed skeleton with grouped items
 */
export function ActivityFeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="relative">
      {/* Vertical Timeline Line */}
      <div
        className="absolute left-[11px] top-4 bottom-0 w-[2px] rounded-full bg-gradient-to-b from-primary/20 to-transparent"
      />

      {/* Date Group Header */}
      <div className="relative flex items-center gap-2 mb-4">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 size-6 rounded-full bg-bg-dark border-2 border-primary/20 flex items-center justify-center z-10">
          <Skeleton className="size-3" rounded="sm" />
        </div>
        <div className="pl-10 flex items-center gap-2">
          <Skeleton className="h-3 w-16" rounded="sm" />
          <div className="h-px w-16 bg-primary/10" />
          <Skeleton className="h-2 w-20" rounded="sm" />
        </div>
      </div>

      {/* Activity Items */}
      <div className="space-y-8">
        {Array.from({ length: count }).map((_, i) => (
          <ActivityItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
