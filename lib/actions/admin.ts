'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/auth/server';
import {
  adminResolveReportSchema,
  adminRestoreItemSchema,
  adminUpdateToolSchema,
  adminMergeToolsSchema,
  type AdminResolveReportInput,
  type AdminRestoreItemInput,
  type AdminUpdateToolInput,
  type AdminMergeToolsInput,
} from '@/lib/validation/moderation';
import type { Database } from '@/types/database';

export type ReportQueueItem =
  Database['public']['Functions']['admin_report_queue']['Returns'][number];
export type UnverifiedToolItem =
  Database['public']['Functions']['admin_unverified_tools']['Returns'][number];
export type ActivityLogItem =
  Database['public']['Functions']['admin_activity_log']['Returns'][number];

export interface AdminActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getAdminReportsQueueAction(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminActionResult<ReportQueueItem[]>> {
  try {
    await requireAdminUser();
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('admin_report_queue', {
      p_status: params?.status && params.status !== 'all' ? params.status : undefined,
      p_limit: params?.limit ?? 50,
      p_offset: params?.offset ?? 0,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data ?? [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch report queue';
    return { success: false, error: message };
  }
}

export async function resolveReportAction(
  rawInput: AdminResolveReportInput
): Promise<AdminActionResult> {
  try {
    await requireAdminUser();
    const validated = adminResolveReportSchema.safeParse(rawInput);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || 'Invalid resolution payload',
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc('admin_resolve_report', {
      p_report_id: validated.data.reportId,
      p_action: validated.data.action,
      p_note: validated.data.note || undefined,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/discover');
    revalidatePath('/prompts');
    revalidatePath('/resources');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to resolve report';
    return { success: false, error: message };
  }
}

export async function restoreItemAction(
  rawInput: AdminRestoreItemInput
): Promise<AdminActionResult> {
  try {
    await requireAdminUser();
    const validated = adminRestoreItemSchema.safeParse(rawInput);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || 'Invalid restore payload',
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc('admin_restore_item', {
      p_target_type: validated.data.targetType,
      p_target_id: validated.data.targetId,
      p_note: validated.data.note || undefined,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/discover');
    revalidatePath('/prompts');
    revalidatePath('/resources');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to restore item';
    return { success: false, error: message };
  }
}

export async function getAdminUnverifiedToolsAction(params?: {
  limit?: number;
  offset?: number;
}): Promise<AdminActionResult<UnverifiedToolItem[]>> {
  try {
    await requireAdminUser();
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('admin_unverified_tools', {
      p_limit: params?.limit ?? 50,
      p_offset: params?.offset ?? 0,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data ?? [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch unverified tools';
    return { success: false, error: message };
  }
}

export async function verifyToolAction(toolId: number): Promise<AdminActionResult> {
  try {
    await requireAdminUser();
    if (!toolId || toolId <= 0) {
      return { success: false, error: 'Invalid tool ID' };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc('admin_verify_tool', {
      p_tool_id: toolId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/tools');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to verify tool';
    return { success: false, error: message };
  }
}

export async function updateToolAction(
  rawInput: AdminUpdateToolInput
): Promise<AdminActionResult> {
  try {
    await requireAdminUser();
    const validated = adminUpdateToolSchema.safeParse(rawInput);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || 'Invalid tool data',
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc('admin_update_tool', {
      p_tool_id: validated.data.toolId,
      p_name: validated.data.name,
      p_kind: validated.data.kind,
      p_vendor: validated.data.vendor || undefined,
      p_website_url: validated.data.websiteUrl || undefined,
      p_logo_url: validated.data.logoUrl || undefined,
      p_parent_id: validated.data.parentId || undefined,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/tools');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update tool';
    return { success: false, error: message };
  }
}

export async function mergeToolsAction(
  rawInput: AdminMergeToolsInput
): Promise<AdminActionResult> {
  try {
    await requireAdminUser();
    const validated = adminMergeToolsSchema.safeParse(rawInput);
    if (!validated.success) {
      return {
        success: false,
        error: validated.error.issues[0]?.message || 'Invalid merge payload',
      };
    }

    if (validated.data.fromId === validated.data.intoId) {
      return { success: false, error: 'Cannot merge a tool into itself' };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc('admin_merge_tools', {
      p_from_id: validated.data.fromId,
      p_into_id: validated.data.intoId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin');
    revalidatePath('/tools');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to merge tools';
    return { success: false, error: message };
  }
}

export async function getAdminActivityLogAction(params?: {
  limit?: number;
  offset?: number;
}): Promise<AdminActionResult<ActivityLogItem[]>> {
  try {
    await requireAdminUser();
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('admin_activity_log', {
      p_limit: params?.limit ?? 50,
      p_offset: params?.offset ?? 0,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data ?? [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch activity log';
    return { success: false, error: message };
  }
}
