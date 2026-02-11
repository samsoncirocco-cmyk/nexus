/**
 * Inbox page loading skeleton
 */

import { EmailListSkeleton } from '@/components/skeletons';
import { Skeleton } from '@/components/skeletons/Skeleton';

export default function InboxLoading() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="size-10" rounded="lg" />
          <div className="space-y-1">
            <Skeleton className="h-6 w-32" rounded="sm" />
            <Skeleton className="h-4 w-48" rounded="sm" />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mb-4 bg-secondary-dark/40 border border-primary/10 rounded-xl p-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" rounded="sm" />
            <Skeleton className="h-4 w-20" rounded="sm" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-16" rounded="sm" />
            <Skeleton className="h-4 w-16" rounded="sm" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-24" rounded="lg" />
        ))}
      </div>

      {/* Email List */}
      <EmailListSkeleton count={8} />
    </div>
  );
}
