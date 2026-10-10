'use server';

import { revalidatePath } from 'next/cache';
import { requireOnboardedUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { libraryRateLimiter } from '@/lib/rate-limit';
import {
  createPromptSchema,
  updatePromptSchema,
  forkPromptSchema,
  createResourceSchema,
  updateResourceSchema,
  type CreatePromptInput,
  type UpdatePromptInput,
  type ForkPromptInput,
  type CreateResourceInput,
  type UpdateResourceInput,
} from '@/lib/validation/library';
import { uuidSchema } from '@/lib/validation/common';
import {
  discoverPrompts,
  discoverResources,
  creationsUsingItem,
  savedPrompts,
  savedResources,
  type PromptCardItem,
  type ResourceCardItem,
} from '@/lib/data/library';
import { discoverCards, type CreationCardItem } from '@/lib/data/creations';

export interface ActionResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

// -----------------------------------------------------------------------------
// Prompt Mutations
// -----------------------------------------------------------------------------

export async function createPromptAction(
  rawInput: CreatePromptInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, profile } = await requireOnboardedUser();

    const parsed = createPromptSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid prompt data' };
    }

    const rateCheck = libraryRateLimiter.check(`${user.id}:prompt_create`, 20);
    if (!rateCheck.allowed) {
      return { ok: false, error: 'Too many requests. Please wait a moment.' };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('prompts')
      .insert({
        author_id: user.id,
        title: parsed.data.title,
        body: parsed.data.body,
        kind: parsed.data.kind,
        model_tool_id: parsed.data.model_tool_id ?? null,
        is_public: parsed.data.is_public,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('createPromptAction insert error:', error);
      return { ok: false, error: 'Failed to create prompt' };
    }

    revalidatePath('/prompts');
    if (profile.username) {
      revalidatePath(`/u/${profile.username}`);
    }

    return { ok: true, data: { id: data.id } };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AuthRequiredError') {
      return { ok: false, error: 'You must be signed in to create a prompt.' };
    }
    console.error('createPromptAction error:', err);
    return { ok: false, error: 'An unexpected error occurred' };
  }
}

export async function updatePromptAction(
  rawInput: UpdatePromptInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, profile } = await requireOnboardedUser();

    const parsed = updatePromptSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid prompt data' };
    }

    const supabase = await createClient();

    // Verify ownership explicitly
    const { data: existing, error: fetchError } = await supabase
      .from('prompts')
      .select('author_id')
      .eq('id', parsed.data.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (fetchError || !existing) {
      return { ok: false, error: 'Prompt not found' };
    }

    if (existing.author_id !== user.id) {
      return { ok: false, error: 'You do not have permission to edit this prompt' };
    }

    const { error: updateError } = await supabase
      .from('prompts')
      .update({
        title: parsed.data.title,
        body: parsed.data.body,
        kind: parsed.data.kind,
        model_tool_id: parsed.data.model_tool_id ?? null,
        is_public: parsed.data.is_public,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.id);

    if (updateError) {
      console.error('updatePromptAction error:', updateError);
      return { ok: false, error: 'Failed to update prompt' };
    }

    revalidatePath('/prompts');
    revalidatePath(`/prompts/${parsed.data.id}`);
    if (profile.username) {
      revalidatePath(`/u/${profile.username}`);
    }

    return { ok: true, data: { id: parsed.data.id } };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AuthRequiredError') {
      return { ok: false, error: 'You must be signed in to edit a prompt.' };
    }
    console.error('updatePromptAction error:', err);
    return { ok: false, error: 'An unexpected error occurred' };
  }
}

export async function deletePromptAction(
  rawId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, profile } = await requireOnboardedUser();

    const parsed = uuidSchema.safeParse(rawId);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid prompt ID' };
    }

    const supabase = await createClient();

    // Verify ownership explicitly
    const { data: existing, error: fetchError } = await supabase
      .from('prompts')
      .select('author_id')
      .eq('id', parsed.data)
      .is('deleted_at', null)
      .maybeSingle();

    if (fetchError || !existing) {
      return { ok: false, error: 'Prompt not found' };
    }

    if (existing.author_id !== user.id) {
      return { ok: false, error: 'You do not have permission to delete this prompt' };
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('prompts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', parsed.data);

    if (deleteError) {
      console.error('deletePromptAction error:', deleteError);
      return { ok: false, error: 'Failed to delete prompt' };
    }

    revalidatePath('/prompts');
    revalidatePath(`/prompts/${parsed.data}`);
    if (profile.username) {
      revalidatePath(`/u/${profile.username}`);
    }

    return { ok: true, data: { id: parsed.data } };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AuthRequiredError') {
      return { ok: false, error: 'You must be signed in to delete a prompt.' };
    }
    console.error('deletePromptAction error:', err);
    return { ok: false, error: 'An unexpected error occurred' };
  }
}

export async function forkPromptAction(
  rawInput: ForkPromptInput
): Promise<ActionResult<{ forkId: string }>> {
  try {
    const { user, profile } = await requireOnboardedUser();

    const parsed = forkPromptSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid prompt ID' };
    }

    const rateCheck = libraryRateLimiter.check(`${user.id}:prompt_fork`, 15);
    if (!rateCheck.allowed) {
      return { ok: false, error: 'Too many fork requests. Please wait a moment.' };
    }

    const supabase = await createClient();

    // Fetch parent prompt: must exist, non-deleted, and either public or owned by caller
    const { data: parent, error: fetchError } = await supabase
      .from('prompts')
      .select('id, title, body, kind, model_tool_id, is_public, author_id, deleted_at')
      .eq('id', parsed.data.promptId)
      .is('deleted_at', null)
      .maybeSingle();

    if (fetchError || !parent) {
      return { ok: false, error: 'Original prompt not found or unavailable' };
    }

    if (!parent.is_public && parent.author_id !== user.id) {
      return { ok: false, error: 'Cannot fork a private prompt' };
    }

    // Insert new prompt with title suffix " (fork)", fork_of_id set, is_public = true by default
    const forkTitle = `${parent.title} (fork)`.slice(0, 140);
    const { data: fork, error: insertError } = await supabase
      .from('prompts')
      .insert({
        author_id: user.id,
        title: forkTitle,
        body: parent.body,
        kind: parent.kind,
        model_tool_id: parent.model_tool_id,
        fork_of_id: parent.id,
        is_public: true,
      })
      .select('id')
      .single();

    if (insertError || !fork) {
      console.error('forkPromptAction insert error:', insertError);
      return { ok: false, error: 'Failed to fork prompt' };
    }

    revalidatePath('/prompts');
    revalidatePath(`/prompts/${parent.id}`);
    if (profile.username) {
      revalidatePath(`/u/${profile.username}`);
    }

    return { ok: true, data: { forkId: fork.id } };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AuthRequiredError') {
      return { ok: false, error: 'You must be signed in to fork a prompt.' };
    }
    console.error('forkPromptAction error:', err);
    return { ok: false, error: 'An unexpected error occurred' };
  }
}

// -----------------------------------------------------------------------------
// Resource Mutations
// -----------------------------------------------------------------------------

export async function createResourceAction(
  rawInput: CreateResourceInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, profile } = await requireOnboardedUser();

    const parsed = createResourceSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid resource data' };
    }

    const rateCheck = libraryRateLimiter.check(`${user.id}:resource_create`, 20);
    if (!rateCheck.allowed) {
      return { ok: false, error: 'Too many requests. Please wait a moment.' };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('resources')
      .insert({
        author_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description || null,
        kind: parsed.data.kind,
        url: parsed.data.url && parsed.data.url.trim().length > 0 ? parsed.data.url.trim() : null,
        body: parsed.data.body && parsed.data.body.trim().length > 0 ? parsed.data.body.trim() : null,
        tool_id: parsed.data.tool_id ?? null,
        is_public: parsed.data.is_public,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('createResourceAction insert error:', error);
      return { ok: false, error: 'Failed to create resource' };
    }

    revalidatePath('/resources');
    if (profile.username) {
      revalidatePath(`/u/${profile.username}`);
    }

    return { ok: true, data: { id: data.id } };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AuthRequiredError') {
      return { ok: false, error: 'You must be signed in to create a resource.' };
    }
    console.error('createResourceAction error:', err);
    return { ok: false, error: 'An unexpected error occurred' };
  }
}

export async function updateResourceAction(
  rawInput: UpdateResourceInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, profile } = await requireOnboardedUser();

    const parsed = updateResourceSchema.safeParse(rawInput);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid resource data' };
    }

    const supabase = await createClient();

    // Verify ownership explicitly
    const { data: existing, error: fetchError } = await supabase
      .from('resources')
      .select('author_id')
      .eq('id', parsed.data.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (fetchError || !existing) {
      return { ok: false, error: 'Resource not found' };
    }

    if (existing.author_id !== user.id) {
      return { ok: false, error: 'You do not have permission to edit this resource' };
    }

    const { error: updateError } = await supabase
      .from('resources')
      .update({
        title: parsed.data.title,
        description: parsed.data.description || null,
        kind: parsed.data.kind,
        url: parsed.data.url && parsed.data.url.trim().length > 0 ? parsed.data.url.trim() : null,
        body: parsed.data.body && parsed.data.body.trim().length > 0 ? parsed.data.body.trim() : null,
        tool_id: parsed.data.tool_id ?? null,
        is_public: parsed.data.is_public,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.id);

    if (updateError) {
      console.error('updateResourceAction error:', updateError);
      return { ok: false, error: 'Failed to update resource' };
    }

    revalidatePath('/resources');
    revalidatePath(`/resources/${parsed.data.id}`);
    if (profile.username) {
      revalidatePath(`/u/${profile.username}`);
    }

    return { ok: true, data: { id: parsed.data.id } };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AuthRequiredError') {
      return { ok: false, error: 'You must be signed in to edit a resource.' };
    }
    console.error('updateResourceAction error:', err);
    return { ok: false, error: 'An unexpected error occurred' };
  }
}

export async function deleteResourceAction(
  rawId: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { user, profile } = await requireOnboardedUser();

    const parsed = uuidSchema.safeParse(rawId);
    if (!parsed.success) {
      return { ok: false, error: 'Invalid resource ID' };
    }

    const supabase = await createClient();

    // Verify ownership explicitly
    const { data: existing, error: fetchError } = await supabase
      .from('resources')
      .select('author_id')
      .eq('id', parsed.data)
      .is('deleted_at', null)
      .maybeSingle();

    if (fetchError || !existing) {
      return { ok: false, error: 'Resource not found' };
    }

    if (existing.author_id !== user.id) {
      return { ok: false, error: 'You do not have permission to delete this resource' };
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('resources')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', parsed.data);

    if (deleteError) {
      console.error('deleteResourceAction error:', deleteError);
      return { ok: false, error: 'Failed to delete resource' };
    }

    revalidatePath('/resources');
    revalidatePath(`/resources/${parsed.data}`);
    if (profile.username) {
      revalidatePath(`/u/${profile.username}`);
    }

    return { ok: true, data: { id: parsed.data } };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AuthRequiredError') {
      return { ok: false, error: 'You must be signed in to delete a resource.' };
    }
    console.error('deleteResourceAction error:', err);
    return { ok: false, error: 'An unexpected error occurred' };
  }
}

// -----------------------------------------------------------------------------
// Pagination Load-More Actions
// -----------------------------------------------------------------------------

export async function loadMorePromptsAction(params: {
  q?: string;
  toolSlug?: string;
  sort?: 'popular' | 'new';
  authorUsername?: string;
  offset: number;
  limit?: number;
}): Promise<PromptCardItem[]> {
  const res = await discoverPrompts(params);
  return res.data;
}

export async function loadMoreResourcesAction(params: {
  q?: string;
  kind?: CreateResourceInput['kind'];
  toolSlug?: string;
  sort?: 'popular' | 'new';
  authorUsername?: string;
  offset: number;
  limit?: number;
}): Promise<ResourceCardItem[]> {
  const res = await discoverResources(params);
  return res.data;
}

export async function loadMoreItemCreationsAction(
  targetType: 'prompt' | 'resource',
  targetId: string,
  offset: number,
  limit = 24
): Promise<CreationCardItem[]> {
  const res = await creationsUsingItem(targetType, targetId, limit, offset);
  return res.data;
}

export async function loadMoreToolCreationsAction(
  toolSlug: string,
  offset: number,
  limit = 24
): Promise<CreationCardItem[]> {
  const res = await discoverCards({
    tool_slugs: [toolSlug],
    limit,
    offset,
  });
  return res.data;
}

export async function loadMoreSavedPromptsAction(
  offset: number,
  limit = 24
): Promise<PromptCardItem[]> {
  const res = await savedPrompts(limit, offset);
  return res.data;
}

export async function loadMoreSavedResourcesAction(
  offset: number,
  limit = 24
): Promise<ResourceCardItem[]> {
  const res = await savedResources(limit, offset);
  return res.data;
}

