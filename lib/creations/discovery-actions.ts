'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  discoverCards,
  type CreationCardItem,
  type DiscoverCardsParams,
} from '@/lib/data/creations'

export interface LoadMoreResult {
  data: CreationCardItem[]
  hasMore: boolean
  error: string | null
}

/**
 * Server action to fetch subsequent pages of discover cards.
 */
export async function loadMoreCreationsAction(
  params: DiscoverCardsParams,
  offset: number
): Promise<LoadMoreResult> {
  try {
    return await discoverCards({
      ...params,
      offset,
    })
  } catch (err: unknown) {
    const error = err as Error
    return {
      data: [],
      hasMore: false,
      error: error.message || 'Failed to load more creations',
    }
  }
}

/**
 * Records a creation view with 30-minute cookie-based deduplication.
 * The database RPC internally skips counting if the viewer is the creator.
 */
export async function recordViewAction(
  creationId: string
): Promise<{ success: boolean }> {
  try {
    if (!creationId || typeof creationId !== 'string') {
      return { success: false }
    }

    const cookieStore = await cookies()
    const cookieName = `viewed_${creationId}`

    if (cookieStore.has(cookieName)) {
      // Already viewed within the last 30 minutes
      return { success: true }
    }

    const supabase = await createClient()
    const { error } = await supabase.rpc('increment_view', {
      p_creation_id: creationId,
    })

    if (error) {
      console.warn('Failed to increment view count:', error)
      return { success: false }
    }

    // Set deduplication cookie for 30 minutes
    cookieStore.set(cookieName, '1', {
      maxAge: 30 * 60,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })

    return { success: true }
  } catch (err) {
    console.warn('Error recording view:', err)
    return { success: false }
  }
}
