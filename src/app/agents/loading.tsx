/**
 * Agents page loading skeleton
 */

import { Skeleton } from '@/components/skeletons/Skeleton';

export default function AgentsLoading() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10" rounded="lg" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" rounded="sm" />
            <Skeleton className="h-6 w-32" rounded="sm" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card-dark border border-primary/10 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-5" rounded="sm" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-12" rounded="sm" />
                <Skeleton className="h-3 w-20" rounded="sm" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Running Agents */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-6 w-32" rounded="sm" />
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-gradient-to-br from-emerald-900/20 to-bg-dark rounded-xl p-5 border border-emerald-500/20">
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" rounded="sm" />
                  <Skeleton className="h-4 w-64" rounded="sm" />
                </div>
                <Skeleton className="size-3" rounded="full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" rounded="full" />
                <Skeleton className="h-6 w-24" rounded="full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Agents */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-6 w-24" rounded="sm" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-card-dark border border-primary/5 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10" rounded="lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" rounded="sm" />
                  <Skeleton className="h-3 w-48" rounded="sm" />
                </div>
                <Skeleton className="h-6 w-16" rounded="full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
