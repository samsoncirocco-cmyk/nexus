export default function DevicesLoading() {
  return (
    <div className="min-h-screen bg-bg-dark pb-28 md:pb-6">
      {/* Header Skeleton */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="size-8 rounded-lg bg-secondary-dark/50 animate-pulse" />
          <div className="h-8 w-32 bg-secondary-dark/50 rounded animate-pulse" />
        </div>
        <div className="h-4 w-64 bg-secondary-dark/50 rounded animate-pulse" />
      </div>

      {/* Device Grid Skeleton */}
      <div className="px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-secondary-dark to-bg-dark rounded-xl p-5 border border-primary/10 animate-pulse"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="size-12 rounded-lg bg-bg-dark/50" />
                <div className="flex-1">
                  <div className="h-6 w-32 bg-bg-dark/50 rounded mb-2" />
                  <div className="h-3 w-24 bg-bg-dark/50 rounded" />
                </div>
              </div>
              <div className="h-2 w-full bg-bg-dark rounded-full mb-4" />
              <div className="flex gap-4 mb-4">
                <div className="h-4 w-20 bg-bg-dark/50 rounded" />
                <div className="h-4 w-20 bg-bg-dark/50 rounded" />
              </div>
              <div className="flex justify-between pt-3 border-t border-white/5">
                <div className="h-3 w-16 bg-bg-dark/50 rounded" />
                <div className="h-3 w-20 bg-bg-dark/50 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
