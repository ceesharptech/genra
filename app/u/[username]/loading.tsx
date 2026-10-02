import { Skeleton } from '@/components/ui/skeleton'

export default function ProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-5 sm:gap-6">
        <Skeleton className="size-24 shrink-0 rounded-full sm:size-28 md:size-32" />

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="mt-1 h-4 w-64" />
          <Skeleton className="h-10 w-full max-w-xl" />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>

      <div className="bg-border my-8 h-px" />

      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  )
}
