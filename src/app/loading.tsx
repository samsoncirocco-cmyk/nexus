/**
 * Dashboard loading skeleton
 */

import { StatCardsGridSkeleton, QuickLinksGridSkeleton, ActivityFeedSkeleton } from '@/components/skeletons';
import { Skeleton } from '@/components/skeletons/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Top App Bar */}
      <div className="flex items-center p-6 pb-2 justify-between animate-slide-up">
        <div className="flex size-10 shrink-0 items-center overflow-hidden rounded-full border border-primary/30 bg-secondary-dark">
          <Skeleton className="size-6 mx-auto" rounded="full" />
        </div>
        <div className="flex-1 px-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-24" rounded="sm" />
            <div className="flex-1 h-px bg-gradient-to-r from-primary/30 to-transparent" />
          </div>
          <Skeleton className="h-6 w-32 mt-1" rounded="sm" />
        </div>
        <div className="flex gap-3 items-center">
          <Skeleton className="h-8 w-16" rounded="lg" />
          <div className="w-px h-6 bg-primary/10" />
          <Skeleton className="size-10" rounded="full" />
          <Skeleton className="size-10" rounded="full" />
        </div>
      </div>

      {/* Command Bar */}
      <div className="px-6 mt-4 mb-1 animate-slide-up delay-2">
        <Skeleton className="h-12 w-full" rounded="xl" />
        <div className="flex items-center gap-2 mt-2 justify-center">
          <Skeleton className="h-4 w-16" rounded="sm" />
          <Skeleton className="h-4 w-20" rounded="sm" />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="px-6 py-3">
        <StatCardsGridSkeleton count={4} />
      </div>

      {/* Brain Status Card */}
      <div className="px-6 mb-6 animate-slide-up delay-4">
        <div className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-5 border border-primary/20 relative overflow-hidden">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="size-2" rounded="full" />
                <Skeleton className="h-3 w-16" rounded="sm" />
              </div>
              <Skeleton className="h-6 w-48" rounded="sm" />
              <Skeleton className="h-4 w-64" rounded="sm" />
            </div>
            <Skeleton className="size-14" rounded="xl" />
          </div>
        </div>
      </div>

      {/* What's New */}
      <div className="px-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-32" rounded="sm" />
            <div className="h-px w-12 bg-gradient-to-r from-primary/40 to-transparent" />
          </div>
          <Skeleton className="h-4 w-20" rounded="sm" />
        </div>

        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 border px-4 py-4 rounded-xl bg-gradient-to-r from-primary/5 to-transparent border-primary/5"
            >
              <Skeleton className="size-11" rounded="xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" rounded="sm" />
                <Skeleton className="h-3 w-1/2" rounded="sm" />
              </div>
              <Skeleton className="h-3 w-16" rounded="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links Grid */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-6 w-28" rounded="sm" />
          <div className="h-px w-12 bg-gradient-to-r from-primary/40 to-transparent" />
        </div>
        <QuickLinksGridSkeleton count={12} />
      </div>

      {/* Vault Categories */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-6 w-32" rounded="sm" />
          <div className="h-px w-12 bg-gradient-to-r from-primary/40 to-transparent" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 bg-secondary-dark/30 border border-primary/5 rounded-xl px-4 py-3.5">
              <Skeleton className="size-9" rounded="lg" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-20" rounded="sm" />
                <Skeleton className="h-2 w-12" rounded="sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
