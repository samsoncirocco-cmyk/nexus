/**
 * EmailItemSkeleton - Skeleton loader for inbox email items
 */

import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonBadge } from './Skeleton';

export function EmailItemSkeleton() {
  return (
    <div className="bg-secondary-dark/40 border border-primary/5 rounded-xl p-4">
      <div className="flex items-start gap-3">
        {/* Unread dot */}
        <Skeleton className="size-2 mt-2 shrink-0" rounded="full" />

        {/* Avatar */}
        <SkeletonAvatar size="md" />

        {/* Email content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Header: badge + from + time */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SkeletonBadge />
              <Skeleton className="h-3 w-32" rounded="sm" />
            </div>
            <Skeleton className="h-3 w-16" rounded="sm" />
          </div>

          {/* Subject */}
          <Skeleton className="h-4 w-3/4" rounded="sm" />

          {/* Preview */}
          <SkeletonText lines={2} />
        </div>
      </div>
    </div>
  );
}

/**
 * Email list skeleton
 */
export function EmailListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <EmailItemSkeleton key={i} />
      ))}
    </div>
  );
}
