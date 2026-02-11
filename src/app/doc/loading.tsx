/**
 * Documents page loading skeleton
 */

import { Skeleton } from '@/components/skeletons/Skeleton';

export default function DocsLoading() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
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

      {/* Search & Filters */}
      <div className="mb-6 flex gap-3">
        <Skeleton className="flex-1 h-10" rounded="lg" />
        <Skeleton className="h-10 w-32" rounded="lg" />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-card-dark border border-primary/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10" rounded="lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" rounded="sm" />
                <Skeleton className="h-3 w-16" rounded="sm" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Documents */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-6 w-40" rounded="sm" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card-dark border border-primary/5 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" rounded="sm" />
                  <Skeleton className="h-3 w-1/2" rounded="sm" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-16" rounded="full" />
                    <Skeleton className="h-4 w-12" rounded="full" />
                  </div>
                </div>
                <Skeleton className="size-8" rounded="lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
