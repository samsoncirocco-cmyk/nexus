/**
 * Deals page loading skeleton
 */

import { Skeleton } from '@/components/skeletons/Skeleton';

export default function DealsLoading() {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10" rounded="lg" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-24" rounded="sm" />
              <Skeleton className="h-6 w-32" rounded="sm" />
            </div>
          </div>
          <Skeleton className="size-12" rounded="full" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card-dark border border-primary/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-5" rounded="sm" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-16" rounded="sm" />
                <Skeleton className="h-3 w-24" rounded="sm" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((col) => (
          <div key={col} className="min-w-[300px] flex-1">
            <div className="bg-secondary-dark/40 rounded-t-xl border border-primary/10 border-b-0 px-4 py-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" rounded="sm" />
                <Skeleton className="h-5 w-12" rounded="full" />
              </div>
            </div>
            <div className="bg-card-dark rounded-b-xl border border-t-0 border-white/5 p-3 space-y-3 min-h-[400px]">
              {[1, 2, 3].map((card) => (
                <div key={card} className="bg-bg-dark border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <Skeleton className="h-5 w-3/4" rounded="sm" />
                    <Skeleton className="h-5 w-16" rounded="full" />
                  </div>
                  <Skeleton className="h-3 w-1/2" rounded="sm" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-12" rounded="full" />
                    <Skeleton className="h-4 w-16" rounded="full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
