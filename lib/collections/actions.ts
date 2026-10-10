'use server';

import { revalidatePath } from 'next/cache';
import { requireUser, getCurrentProfile } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  createCollectionSchema,
  updateCollectionSchema,
  addCollectionItemSchema,
  removeCollectionItemSchema,
  quickCreateCollectionAndAddSchema,
  type CreateCollectionInput,
  type UpdateCollectionInput,
  type AddCollectionItemInput,
  type RemoveCollectionItemInput,
  type QuickCreateCollectionAndAddInput,
  type CollectionItemTargetType,
} from '@/lib/validation/library';
import { uuidSchema } from '@/lib/validation/common';

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

// -----------------------------------------------------------------------------
// Collection CRUD Actions
// -----------------------------------------------------------------------------

export async function createCollectionAction(
  rawInput: CreateCollectionInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();

    const parsed = createCollectionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid collection input' };
    }

    const rateCheck = await checkRateLimit('create_collection', user.id);
    if (!rateCheck.success) {
      return { ok: false, error: 'Too many requests. Please wait a moment.' };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('collections')
      .insert({
        owner_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description || null,
        is_public: parsed.data.is_public,
      })
      .select('id')
      .single();

    if (error) {
      console.error('createCollectionAction error:', error);
      if (error.message.includes('50 collections') || error.code === '23514') {
        return { ok: false, error: 'You cannot create more than 50 collections.' };
      }
      return { ok: false, error: 'Failed to create collection' };
    }

    const profile = await getCurrentProfile();
    if (profile?.username) {
      revalidatePath(`/u/${profile.username}`);
    }

    return { ok: true, data: { id: data.id } };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AuthRequiredError') {
      return { ok: false, error: 'You must be signed in to create a collection.' };
    }
    console.error('createCollectionAction error:', err);
    return { ok: false, error: 'An unexpected error occurred' };
  }
}

export async function updateCollectionAction(
  rawInput: UpdateCollectionInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();

    const parsed = updateCollectionSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid collection input' };
    }

    const rateCheck = await checkRateLimit('collection_crud', user.id);
    if (!rateCheck.success) {
      return { ok: false, error: 'Too many requests. Please wait a moment.' };
    }

    const supabase = await createClient();

    // Verify ownership explicitly
    const { data: existing, error: fetchError } = await supabase
      .from('collections')
      .select('owner_id')
      .eq('id', parsed.data.id)
      .maybeSingle();

    if (fetchError || !existing) {
      return { ok: false, error: 'Collection not found' };
    }

    if (existing.owner_id !== user.id) {
      return { ok: false, error: 'You do not have permission to edit this collection' };
    }

    const { error: updateError } = await supabase
      .from('collections')
      .update({
        title: parsed.data.title,
        description: parsed.data.description || null,
        is_public: parsed.data.is_public,
      })
      .eq('id', parsed.data.id);

    if (updateError) {
      console.error('updateCollectionAction error:', updateError);
      return { ok: false, error: 'Failed to update collection' };
    }

    revalidatePath(`/collections/${parsed.data.id}`);
    const profile = await getCurrentProfile();
    if (profile?.username) {
      revalidatePath(`/u/${profile.username}`);
    }

    return { ok: true, data: { id: parsed.data.id } };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AuthRequiredError') {
      return { ok: false, error: 'You must be signed in to edit a collection.' };
    }
    console.error('updateCollectionAction error:', err);
    return { ok: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteCollectionAction(
  rawId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireUser();

    const parsed = uuidSchema.safeParse(rawId);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid collection ID' };
    }

    const rateCheck = await checkRateLimit('collection_crud', user.id);
    if (!rateCheck.success) {
      return { ok: false, error: 'Too many requests. Please wait a moment.' };
    }

    const supabase = await createClient();

    // Verify ownership explicitly
    const { data: existing, error: fetchError } = await supabase
      .from('collections')
      .select('owner_id')
      .eq('id', parsed.data)
      .maybeSingle();

    if (fetchError || !existing) {
      return { ok: false, error: 'Collection not found' };
    }

    if (existing.owner_id !== user.id) {
      return { ok: false, error: 'You do not have permission to delete this collection' };
    }

    const { error: deleteError } = await supabase
      .from('collections')
      .delete()
      .eq('id', parsed.data);

    if (deleteError) {
      console.error('deleteCollectionAction error:', deleteError);
      return { ok: false, error: 'Failed to delete collection' };
    }

    const profile = await getCurrentProfile();
    if (profile?.username) {
      revalidatePath(`/u/${profile.username}`);
    }

    return { ok: true, data: { id: parsed.data } };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AuthRequiredError') {
      return { ok: false, error: 'You must be signed in to delete a collection.' };
    }
    console.error('deleteCollectionAction error:', err);
    return { ok: false, error: 'An unexpected error occurred' };
  }
}

// -----------------------------------------------------------------------------
// Collection Item Actions
// -----------------------------------------------------------------------------

export async function addCollectionItemAction(
  rawInput: AddCollectionItemInput
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await requireUser();

    const parsed = addCollectionItemSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid item data' };
    }

    const rateCheck = await checkRateLimit('collection_add_item', user.id);
    if (!rateCheck.success) {
      return { ok: false, error: 'Too many requests. Please wait a moment.' };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc('add_collection_item', {
      p_collection_id: parsed.data.collectionId,
      p_target_type: parsed.data.targetType,
      p_target_id: parsed.data.targetId,
      p_note: parsed.data.note || undefined,
    });

    if (error) {
      console.error('addCollectionItemAction error:', error);
      if (error.message.includes('200 items')) {
        return { ok: false, error: 'A collection cannot contain more than 200 items.' };
      }
      if (error.message.includes('not published') || error.message.includes('not public')) {
        return { ok: false, error: 'This item is not public and cannot be added.' };
      }
      return { ok: false, error: error.message || 'Failed to add item to collection' };
    }

    revalidatePath(`/collections/${parsed.data.collectionId}`);
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AuthRequiredError') {
      return { ok: false, error: 'You must be signed in to curate collections.' };
    }
    console.error('addCollectionItemAction error:', err);
    return { ok: false, error: 'An unexpected error occurred' };
  }
}

export async function removeCollectionItemAction(
  rawInput: RemoveCollectionItemInput
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const user = await requireUser();

    const parsed = removeCollectionItemSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid collection item parameters' };
    }

    const rateCheck = await checkRateLimit('collection_item', user.id);
    if (!rateCheck.success) {
      return { ok: false, error: 'Too many requests. Please wait a moment.' };
    }

    const supabase = await createClient();

    // Verify collection ownership
    const { data: collection, error: colError } = await supabase
      .from('collections')
      .select('owner_id')
      .eq('id', parsed.data.collectionId)
      .maybeSingle();

    if (colError || !collection) {
      return { ok: false, error: 'Collection not found' };
    }

    if (collection.owner_id !== user.id) {
      return { ok: false, error: 'You do not have permission to remove items from this collection' };
    }

    const { error: deleteError } = await supabase
      .from('collection_items')
      .delete()
      .eq('collection_id', parsed.data.collectionId)
      .eq('target_type', parsed.data.targetType)
      .eq('target_id', parsed.data.targetId);

    if (deleteError) {
      console.error('removeCollectionItemAction error:', deleteError);
      return { ok: false, error: 'Failed to remove item from collection' };
    }


    revalidatePath(`/collections/${parsed.data.collectionId}`);
    return { ok: true, data: { success: true } };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AuthRequiredError') {
      return { ok: false, error: 'You must be signed in to manage collections.' };
    }
    console.error('removeCollectionItemAction error:', err);
    return { ok: false, error: 'An unexpected error occurred' };
  }
}

export async function quickCreateCollectionAndAddAction(
  rawInput: QuickCreateCollectionAndAddInput
): Promise<ActionResult<{ collectionId: string }>> {
  try {
    await requireUser();

    const parsed = quickCreateCollectionAndAddSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid collection input' };
    }

    // Step 1: Create collection
    const createResult = await createCollectionAction({
      title: parsed.data.title,
      description: parsed.data.description,
      is_public: parsed.data.is_public,
    });

    if (!createResult.ok || !createResult.data) {
      return { ok: false, error: createResult.error || 'Failed to create collection' };
    }

    const collectionId = createResult.data.id;

    // Step 2: Add target item
    const addResult = await addCollectionItemAction({
      collectionId,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
    });

    if (!addResult.ok) {
      return { ok: false, error: addResult.error || 'Failed to add item to new collection' };
    }

    return { ok: true, data: { collectionId } };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AuthRequiredError') {
      return { ok: false, error: 'You must be signed in to create collections.' };
    }
    console.error('quickCreateCollectionAndAddAction error:', err);
    return { ok: false, error: 'An unexpected error occurred' };
  }
}

export async function getMyCollectionsForItemAction(
  targetType: CollectionItemTargetType,
  targetId: string
) {
  try {
    await requireUser();
    const { data, error } = await createClient().then((supabase) =>
      supabase.rpc('my_collections_for_item', {
        p_target_type: targetType,
        p_target_id: targetId,
      })
    );

    if (error) {
      console.error('getMyCollectionsForItemAction error:', error);
      return { ok: false, data: [], error: error.message };
    }

    return { ok: true, data: data || [], error: undefined };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AuthRequiredError') {
      return { ok: false, data: [], error: 'Not authenticated' };
    }
    console.error('getMyCollectionsForItemAction error:', err);
    return { ok: false, data: [], error: 'An unexpected error occurred' };
  }
}
