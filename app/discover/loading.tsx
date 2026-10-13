import { Skeleton } from '@/components/ui/skeleton'
import { CreationGridSkeleton } from '@/components/creations/creation-grid'

export default function DiscoverLoading() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Sticky Filter Bar Skeleton */}
      <div className="border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" />
            ))}
          </div>
          <Skeleton className="h-8 w-28 rounded-lg shrink-0 hidden sm:block" />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 space-y-6">
        {/* Results Header / Summary */}
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>

        {/* Creation Grid Skeleton */}
        <CreationGridSkeleton count={8} />
      </div>
    </div>
  )
}
