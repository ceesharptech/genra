import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-6">
        <Skeleton className="size-20 shrink-0 rounded-full sm:size-24" />

        <div className="flex flex-1 flex-col space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-2 h-4 w-72" />
          <Skeleton className="h-12 w-full max-w-xl" />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>

      <div className="my-8 h-px bg-border" />

      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}
