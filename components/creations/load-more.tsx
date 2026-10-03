'use client'

import React, { useState, useTransition } from 'react'
import type { CreationCardItem, DiscoverCardsParams } from '@/lib/data/creations'
import { loadMoreCreationsAction } from '@/lib/creations/discovery-actions'
import { CreationCard } from './creation-card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface LoadMoreProps {
  initialHasMore: boolean
  initialOffset: number
  params?: DiscoverCardsParams
  limit?: number
}

export function LoadMore({
  initialHasMore,
  initialOffset,
  params = {},
  limit = 24,
}: LoadMoreProps) {
  const [items, setItems] = useState<CreationCardItem[]>([])
  const [offset, setOffset] = useState(initialOffset)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [isPending, startTransition] = useTransition()

  // Reset appended items if search params change
  const currentParamsKey = JSON.stringify(params)
  const [lastParamsKey, setLastParamsKey] = useState(currentParamsKey)

  if (currentParamsKey !== lastParamsKey) {
    setLastParamsKey(currentParamsKey)
    setItems([])
    setOffset(initialOffset)
    setHasMore(initialHasMore)
  }

  const handleLoadMore = () => {
    if (isPending || !hasMore) return

    startTransition(async () => {
      try {
        const result = await loadMoreCreationsAction(
          { ...params, limit },
          offset
        )

        if (result.error) {
          toast.error(result.error)
          return
        }

        setItems((prev) => [...prev, ...result.data])
        setOffset((prev) => prev + result.data.length)
        setHasMore(result.hasMore)
      } catch (err) {
        console.error('Failed to load more creations:', err)
        toast.error('Failed to load more creations. Please try again.')
      }
    })
  }

  return (
    <>
      {items.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((creation) => (
            <CreationCard key={creation.id} creation={creation} />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="mt-10 flex justify-center">
          <Button
            variant="secondary"
            size="md"
            loading={isPending}
            onClick={handleLoadMore}
            className="min-w-36 rounded-full font-medium"
          >
            Load more
          </Button>
        </div>
      )}
    </>
  )
}
