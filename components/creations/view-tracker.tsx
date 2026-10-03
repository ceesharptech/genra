'use client'

import { useEffect, useRef } from 'react'
import { recordViewAction } from '@/lib/creations/discovery-actions'

interface ViewTrackerProps {
  creationId: string
}

/**
 * Fires view recording on mount with 30-minute cookie deduplication.
 * Does not block initial page render or SSR.
 */
export function ViewTracker({ creationId }: ViewTrackerProps) {
  const hasRecordedRef = useRef(false)

  useEffect(() => {
    if (hasRecordedRef.current || !creationId) return
    hasRecordedRef.current = true

    // Small delay so user truly viewed the page and it doesn't compete with initial paint
    const timer = setTimeout(() => {
      recordViewAction(creationId).catch((err) => {
        console.warn('View tracking notice:', err)
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [creationId])

  return null
}
