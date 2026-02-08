/**
 * Tasks page loading skeleton
 */

import { TaskColumnSkeleton } from '@/components/skeletons';
import { Skeleton } from '@/components/skeletons/Skeleton';

export default function TasksLoading() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg-dark/80 backdrop-blur-md px-4 md:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Skeleton className="size-10" rounded="lg" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-24" rounded="sm" />
              <Skeleton className="h-5 w-32" rounded="sm" />
            </div>
          </div>
          <Skeleton className="size-12" rounded="full" />
        </div>
      </header>

      {/* Content */}
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 bg-card-dark border border-white/5 rounded-xl px-4 py-3">
              <Skeleton className="size-5" rounded="sm" />
              <div className="space-y-1">
                <Skeleton className="h-5 w-12" rounded="sm" />
                <Skeleton className="h-2 w-16" rounded="sm" />
              </div>
            </div>
          ))}
        </div>

        {/* Filter Bar */}
        <div className="space-y-3 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="flex-1 min-w-[200px] h-10" rounded="lg" />
            <Skeleton className="h-10 w-32" rounded="lg" />
            <Skeleton className="h-10 w-32" rounded="lg" />
            <Skeleton className="h-10 w-36" rounded="lg" />
            <Skeleton className="h-10 w-24" rounded="lg" />
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
          <TaskColumnSkeleton count={3} />
          <TaskColumnSkeleton count={4} />
          <TaskColumnSkeleton count={2} />
          <TaskColumnSkeleton count={3} />
        </div>

        {/* Keyboard hints */}
        <div className="hidden md:flex items-center gap-4 text-[10px] text-foreground-muted/50 uppercase tracking-wider mt-4 justify-center">
          <Skeleton className="h-4 w-20" rounded="sm" />
          <Skeleton className="h-4 w-16" rounded="sm" />
          <Skeleton className="h-4 w-24" rounded="sm" />
          <Skeleton className="h-4 w-20" rounded="sm" />
        </div>
      </div>
    </div>
  );
}
