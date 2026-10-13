import { Skeleton } from '@/components/ui/skeleton'
import { ResourceGridSkeleton } from '@/components/library/resource-grid'

export default function ResourcesLoading() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded" />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full shrink-0" />
          ))}
        </div>
        <ResourceGridSkeleton count={6} />
      </div>
    </div>
  )
}
