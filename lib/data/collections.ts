import { cache } from 'react';
import { createPublicClient } from '@/lib/supabase/public';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';
import type { CreationCardItem } from '@/lib/data/creations';
import type { PromptCardItem, ResourceCardItem } from '@/lib/data/library';

export type CollectionItemTargetType = Database['public']['Enums']['engagement_target'];

export interface CollectionItemEntry {
  target_type: CollectionItemTargetType;
  target_id: string;
  position: number;
  note: string | null;
  added_at: string;
  card: CreationCardItem | PromptCardItem | ResourceCardItem;
}

export interface CollectionPageData {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  owner: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  item_count: number;
  items: CollectionItemEntry[];
}

export type MyCollectionItemRow = Database['public']['Functions']['my_collections_for_item']['Returns'][number];

// -----------------------------------------------------------------------------
// Collection Page (RPC collection_page)
// -----------------------------------------------------------------------------

export const getCollectionPage = cache(
  async (
    id: string,
    viewerId?: string | null
  ): Promise<{ data: CollectionPageData | null; error: string | null }> => {
    // If signed in, use user client so owner can view private collection; otherwise cookie-less public client
    const supabase = viewerId ? await createClient() : createPublicClient();

    const { data, error } = await supabase.rpc('collection_page', {
      p_collection_id: id,
    });

    if (error) {
      console.error('getCollectionPage error:', error);
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: null };
    }

    return { data: data as unknown as CollectionPageData, error: null };
  }
);

// -----------------------------------------------------------------------------
// My Collections For Target Item (RPC my_collections_for_item)
// -----------------------------------------------------------------------------

export const myCollectionsForItem = async (
  targetType: CollectionItemTargetType,
  targetId: string
): Promise<{ data: MyCollectionItemRow[]; error: string | null }> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('my_collections_for_item', {
    p_target_type: targetType,
    p_target_id: targetId,
  });

  if (error) {
    console.error('myCollectionsForItem error:', error);
    return { data: [], error: error.message };
  }

  return { data: data || [], error: null };
};

// -----------------------------------------------------------------------------
// User Collections List (for Profile Tab)
// -----------------------------------------------------------------------------

export interface UserCollectionCard {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  item_count: number;
  updated_at: string;
  owner_username: string;
  owner_display_name: string | null;
  owner_avatar_url: string | null;
  preview_covers: string[];
}

export const listUserCollections = cache(
  async (
    ownerId: string,
    isOwner = false
  ): Promise<{ data: UserCollectionCard[]; error: string | null }> => {
    // Verified constraint hint: profiles!collections_owner_id_fkey
    const supabase = isOwner ? await createClient() : createPublicClient();

    let query = supabase
      .from('collections')
      .select(`
        id,
        title,
        description,
        is_public,
        updated_at,
        owner:profiles!collections_owner_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        ),
        collection_items (
          target_type,
          target_id
        )
      `)
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false });

    if (!isOwner) {
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('listUserCollections error:', error);
      return { data: [], error: error.message };
    }

    if (!data) {
      return { data: [], error: null };
    }

    const cards: UserCollectionCard[] = data.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      is_public: c.is_public,
      item_count: c.collection_items ? c.collection_items.length : 0,
      updated_at: c.updated_at,
      owner_username: c.owner.username,
      owner_display_name: c.owner.display_name,
      owner_avatar_url: c.owner.avatar_url,
      preview_covers: [],
    }));

    return { data: cards, error: null };
  }
);
