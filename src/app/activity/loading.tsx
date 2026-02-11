/**
 * Activity feed loading skeleton
 */

import { ActivityFeedSkeleton } from '@/components/skeletons';
import { Skeleton } from '@/components/skeletons/Skeleton';

export default function ActivityLoading() {
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col min-h-screen">
      {/* Top App Bar */}
      <header className="sticky top-0 z-20 bg-bg-dark/80 backdrop-blur-md pt-6 md:pt-8 pb-4 px-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col space-y-1">
            <Skeleton className="h-3 w-32" rounded="sm" />
            <Skeleton className="h-6 w-40" rounded="sm" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="size-9" rounded="full" />
            <Skeleton className="size-9" rounded="full" />
            <Skeleton className="h-7 w-24" rounded="full" />
          </div>
        </div>

        {/* Command Bar */}
        <div className="mb-4">
          <Skeleton className="h-10 w-full" rounded="xl" />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-3">
          <div className="relative flex gap-2 overflow-x-auto hide-scrollbar pb-1 flex-1">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-9 w-20" rounded="full" />
            ))}
          </div>
          <Skeleton className="h-8 w-16" rounded="full" />
        </div>
      </header>

      {/* Timeline Feed */}
      <main className="flex-1 px-6 pb-32">
        <ActivityFeedSkeleton count={8} />
      </main>
    </div>
  );
}
