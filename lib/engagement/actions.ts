'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  setLikeSchema,
  setSaveSchema,
  copyPromptSchema,
  savedCardsQuerySchema,
  recordShareSchema,
  type EngagementTargetType,
  type ShareChannel,
} from '@/lib/validation/engagement';
import { savedCards, type SavedCardsResult } from '@/lib/data/engagement';
import { perfLog } from '@/lib/perf';

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Idempotently sets the like state for a target (creation, prompt, or resource).
 * Gated by requireUser() (throws AuthRequiredError if signed out).
 * Maximum 2 sequential round trips: 1 for auth check, 1 for write + count.
 */
export async function setLikeAction(
  targetType: EngagementTargetType,
  targetId: string,
  liked: boolean
): Promise<ActionResult<{ liked: boolean; count: number }>> {
  const start = performance.now();
  try {
    const user = await requireUser();

    // Validate inputs
    const parsed = setLikeSchema.safeParse({ targetType, targetId, liked });
    if (!parsed.success) {
      return { ok: false, error: 'Invalid engagement input' };
    }

    // Rate limiting: 60 actions per minute per user
    const rateCheck = await checkRateLimit('like', user.id);
    if (!rateCheck.success) {
      return {
        ok: false,
        error: 'Too many requests. Please wait a moment before trying again.',
      };
    }

    const supabase = await createClient();

    if (liked) {
      // Idempotent insert: ignore duplicate like
      const { error: insertError } = await supabase
        .from('likes')
        .upsert(
          {
            user_id: user.id,
            target_type: targetType,
            target_id: targetId,
          },
          { onConflict: 'user_id,target_type,target_id', ignoreDuplicates: true }
        );

      if (insertError) {
        console.error('Failed to insert like:', insertError);
        // Check for trigger visibility exception
        if (
          insertError.message.includes('not found') ||
          insertError.message.includes('not visible')
        ) {
          return {
            ok: false,
            error: 'This item is not available for engagement.',
          };
        }
        return { ok: false, error: 'Failed to record like' };
      }
    } else {
      // Idempotent delete
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', user.id)
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      if (deleteError) {
        console.error('Failed to delete like:', deleteError);
        return { ok: false, error: 'Failed to remove like' };
      }
    }

    // Fetch updated count
    let count = 0;
    if (targetType === 'creation') {
      const { data } = await supabase
        .from('creations')
        .select('like_count, slug')
        .eq('id', targetId)
        .single();
      count = data?.like_count ?? 0;
      if (data?.slug) {
        revalidatePath(`/c/${data.slug}`);
      }
    } else if (targetType === 'prompt') {
      const { data } = await supabase
        .from('prompts')
        .select('like_count')
        .eq('id', targetId)
        .single();
      count = data?.like_count ?? 0;
      revalidatePath('/prompts');
      revalidatePath(`/prompts/${targetId}`);
    } else if (targetType === 'resource') {
      const { data } = await supabase
        .from('resources')
        .select('like_count')
        .eq('id', targetId)
        .single();
      count = data?.like_count ?? 0;
      revalidatePath('/resources');
      revalidatePath(`/resources/${targetId}`);
    }

    revalidatePath('/');
    revalidatePath('/discover');

    return { ok: true, data: { liked, count } };
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'name' in err &&
      err.name === 'AuthRequiredError'
    ) {
      return { ok: false, error: 'You must be signed in to like.' };
    }
    console.error('Unexpected error in setLikeAction:', err);
    return { ok: false, error: 'An unexpected error occurred.' };
  } finally {
    perfLog('setLikeAction', performance.now() - start);
  }
}

/**
 * Idempotently sets the save state for a target (creation, prompt, or resource).
 * Gated by requireUser().
 */
export async function setSaveAction(
  targetType: EngagementTargetType,
  targetId: string,
  saved: boolean
): Promise<ActionResult<{ saved: boolean; count: number }>> {
  const start = performance.now();
  try {
    const user = await requireUser();

    // Validate inputs
    const parsed = setSaveSchema.safeParse({ targetType, targetId, saved });
    if (!parsed.success) {
      return { ok: false, error: 'Invalid save input' };
    }

    // Rate limiting: 60 actions per minute per user
    const rateCheck = await checkRateLimit('save', user.id);
    if (!rateCheck.success) {
      return {
        ok: false,
        error: 'Too many requests. Please wait a moment before trying again.',
      };
    }

    const supabase = await createClient();

    if (saved) {
      // Idempotent insert: ignore duplicate save
      const { error: insertError } = await supabase
        .from('saves')
        .upsert(
          {
            user_id: user.id,
            target_type: targetType,
            target_id: targetId,
          },
          { onConflict: 'user_id,target_type,target_id', ignoreDuplicates: true }
        );

      if (insertError) {
        console.error('Failed to insert save:', insertError);
        if (
          insertError.message.includes('not found') ||
          insertError.message.includes('not visible')
        ) {
          return {
            ok: false,
            error: 'This item is not available to save.',
          };
        }
        return { ok: false, error: 'Failed to record save' };
      }
    } else {
      // Idempotent delete
      const { error: deleteError } = await supabase
        .from('saves')
        .delete()
        .eq('user_id', user.id)
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      if (deleteError) {
        console.error('Failed to delete save:', deleteError);
        return { ok: false, error: 'Failed to remove save' };
      }
    }

    // Fetch updated count
    let count = 0;
    if (targetType === 'creation') {
      const { data } = await supabase
        .from('creations')
        .select('save_count, slug')
        .eq('id', targetId)
        .single();
      count = data?.save_count ?? 0;
      if (data?.slug) {
        revalidatePath(`/c/${data.slug}`);
      }
    } else if (targetType === 'prompt') {
      const { data } = await supabase
        .from('prompts')
        .select('save_count')
        .eq('id', targetId)
        .single();
      count = data?.save_count ?? 0;
      revalidatePath('/prompts');
      revalidatePath(`/prompts/${targetId}`);
    } else if (targetType === 'resource') {
      const { data } = await supabase
        .from('resources')
        .select('save_count')
        .eq('id', targetId)
        .single();
      count = data?.save_count ?? 0;
      revalidatePath('/resources');
      revalidatePath(`/resources/${targetId}`);
    }

    revalidatePath('/saved');

    return { ok: true, data: { saved, count } };
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'name' in err &&
      err.name === 'AuthRequiredError'
    ) {
      return { ok: false, error: 'You must be signed in to save.' };
    }
    console.error('Unexpected error in setSaveAction:', err);
    return { ok: false, error: 'An unexpected error occurred.' };
  } finally {
    perfLog('setSaveAction', performance.now() - start);
  }
}

/**
 * Tracks copying a prompt. Requires authentication.
 * Fire-and-forget from the client; failure does not block clipboard copy.
 */
export async function copyPromptAction(
  promptId: string
): Promise<ActionResult<{ copied: boolean }>> {
  const start = performance.now();
  try {
    const user = await requireUser();

    const parsed = copyPromptSchema.safeParse({ promptId });
    if (!parsed.success) {
      return { ok: false, error: 'Invalid prompt ID' };
    }

    // Rate limiting: 30 copies per minute per user
    const rateCheck = await checkRateLimit('copy_prompt', user.id);
    if (!rateCheck.success) {
      return { ok: false, error: 'Rate limit exceeded.' };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc('increment_prompt_copy', {
      p_prompt_id: promptId,
    });

    if (error) {
      console.error('Failed to increment prompt copy:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true, data: { copied: true } };
  } catch (err: unknown) {
    if (
      err &&
      typeof err === 'object' &&
      'name' in err &&
      err.name === 'AuthRequiredError'
    ) {
      return { ok: false, error: 'Authentication required' };
    }
    return { ok: false, error: 'Failed to record copy' };
  } finally {
    perfLog('copyPromptAction', performance.now() - start);
  }
}

/**
 * Loads additional saved creations for pagination on /saved.
 */
export async function loadMoreSavedAction(
  offset: number
): Promise<SavedCardsResult> {
  const user = await requireUser();
  if (!user) {
    return { data: [], hasMore: false, error: 'Authentication required' };
  }

  const parsed = savedCardsQuerySchema.safeParse({ offset });
  const validOffset = parsed.success ? parsed.data.offset : offset;

  return await savedCards({
    offset: validOffset,
    limit: 24,
  });
}

/**
 * Records a share event for a creation.
 * Works for both authenticated and anonymous users.
 * Validates channel via allowlist, applies an in-memory sliding-window rate limit,
 * checks and sets a 10-minute client dedupe cookie, and calls the record_share RPC.
 */
export async function recordShareAction(
  creationId: string,
  channel: ShareChannel
): Promise<ActionResult<{ recorded: boolean; deduplicated?: boolean }>> {
  const start = performance.now();
  try {
    const parsed = recordShareSchema.safeParse({ creationId, channel });
    if (!parsed.success) {
      return { ok: false, error: 'Invalid share channel or creation ID' };
    }

    const cookieStore = await cookies();
    const dedupeCookieName = `genra_shared_${creationId}_${channel}`;

    // 1. Check client dedupe cookie (10 minute window)
    if (cookieStore.get(dedupeCookieName)) {
      return { ok: true, data: { recorded: false, deduplicated: true } };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 2. Rate limiting check (per-instance sliding window)
    const rateLimitKey = user
      ? `share:${user.id}`
      : `share:anon:${creationId}:${channel}`;
    const rateCheck = await checkRateLimit('share', rateLimitKey);
    if (!rateCheck.success) {
      return {
        ok: false,
        error: 'Too many share requests. Please wait a moment.',
      };
    }

    // 3. Call database function (which also checks 10-minute dedupe for auth users)
    const { error: rpcError } = await supabase.rpc('record_share', {
      p_creation_id: creationId,
      p_channel: channel,
    });

    if (rpcError) {
      console.error('Failed to record share event:', rpcError);
      return { ok: false, error: rpcError.message };
    }

    // 4. Set dedupe cookie for 10 minutes (600 seconds)
    cookieStore.set(dedupeCookieName, '1', {
      maxAge: 600,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });

    return { ok: true, data: { recorded: true } };
  } catch (err: unknown) {
    console.error('Unexpected error in recordShareAction:', err);
    return { ok: false, error: 'Failed to record share event' };
  } finally {
    perfLog('recordShareAction', performance.now() - start);
  }
}
