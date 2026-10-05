import React from 'react'
import type { CreationCardItem } from '@/lib/data/creations'
import { CreationCard } from './creation-card'
import { Skeleton } from '@/components/ui/skeleton'
import { HugeiconsIcon } from '@hugeicons/react'
import { AiSearch01Icon } from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'

interface CreationGridProps {
  creations: CreationCardItem[]
  priorityCount?: number
  emptyTitle?: string
  emptyMessage?: string
  emptyAction?: React.ReactNode
  className?: string
}

export function CreationGrid({
  creations,
  priorityCount = 4,
  emptyTitle = 'No creations found',
  emptyMessage = 'Try adjusting your filters, search term, or explore other categories.',
  emptyAction,
  className,
}: CreationGridProps) {
  if (creations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 px-4 text-center">
        <div className="rounded-full bg-surface-2 p-3 text-muted-foreground">
          <HugeiconsIcon icon={AiSearch01Icon} className="size-6 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-base font-medium text-foreground">{emptyTitle}</h3>
        <p className="mt-1.5 max-w-sm text-sm text-text-subtle">{emptyMessage}</p>
        {emptyAction && <div className="mt-5">{emptyAction}</div>}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {creations.map((creation, index) => (
        <CreationCard
          key={creation.id}
          creation={creation}
          priority={index < priorityCount}
        />
      ))}
    </div>
  )
}

export function CreationGridSkeleton({
  count = 6,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col">
          {/* 4:3 Cover Skeleton */}
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />

          {/* Details Skeleton */}
          <div className="mt-2.5 flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <Skeleton className="size-5.5 rounded-full" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-4 w-12 rounded" />
            </div>
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
