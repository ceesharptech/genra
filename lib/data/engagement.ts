import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { perfLog } from '@/lib/perf';
import type { CreationCardItem } from '@/lib/data/creations';
import type { EngagementTargetType } from '@/lib/validation/engagement';

export interface EngagementStateResult {
  likedIds: string[];
  savedIds: string[];
}

/**
 * Returns the liked and saved target IDs for the current user and specified target type.
 * When signed out (no userId provided or null), returns empty arrays immediately with zero database round-trips.
 */
export const getEngagementState = cache(
  async (
    targetType: EngagementTargetType,
    targetIds: string[],
    userId?: string | null
  ): Promise<EngagementStateResult> => {
    if (!userId || targetIds.length === 0) {
      return { likedIds: [], savedIds: [] };
    }

    const start = performance.now();
    const supabase = await createClient();

    // Query likes and saves in parallel (single round-trip batch)
    const [likesRes, savesRes] = await Promise.all([
      supabase
        .from('likes')
        .select('target_id')
        .eq('user_id', userId)
        .eq('target_type', targetType)
        .in('target_id', targetIds),
      supabase
        .from('saves')
        .select('target_id')
        .eq('user_id', userId)
        .eq('target_type', targetType)
        .in('target_id', targetIds),
    ]);

    perfLog('getEngagementState', performance.now() - start);

    if (likesRes.error) {
      console.error('Error fetching likes state:', likesRes.error);
    }
    if (savesRes.error) {
      console.error('Error fetching saves state:', savesRes.error);
    }

    const likedIds = (likesRes.data || []).map((row) => row.target_id);
    const savedIds = (savesRes.data || []).map((row) => row.target_id);

    return { likedIds, savedIds };
  }
);

export interface SavedCardsParams {
  limit?: number;
  offset?: number;
}

export interface SavedCardsResult {
  data: CreationCardItem[];
  hasMore: boolean;
  error: string | null;
}

/**
 * Loads the authenticated user's saved creations via the saved_cards RPC.
 * Ordered by saved_at desc, only returning published and non-deleted items.
 */
export const savedCards = cache(
  async (params: SavedCardsParams = {}): Promise<SavedCardsResult> => {
    const supabase = await createClient();
    const limit = Math.min(Math.max(params.limit ?? 24, 1), 60);
    const offset = Math.max(params.offset ?? 0, 0);

    const start = performance.now();
    const { data, error } = await supabase.rpc('saved_cards', {
      p_limit: limit + 1,
      p_offset: offset,
    });
    perfLog('savedCards', performance.now() - start);

    if (error) {
      console.error('Error fetching saved cards:', error);
      return {
        data: [],
        hasMore: false,
        error: error.message || 'Failed to fetch saved creations',
      };
    }

    const rows = (data || []) as unknown as CreationCardItem[];
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const formatted = items.map((item) => ({
      ...item,
      tools: Array.isArray(item.tools) ? item.tools : [],
    }));

    return {
      data: formatted,
      hasMore,
      error: null,
    };
  }
);
