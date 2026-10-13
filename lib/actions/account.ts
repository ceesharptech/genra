'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUser, getCurrentProfile } from '@/lib/auth/server';
import { SupabaseStorageProvider } from '@/lib/storage/supabase';

export interface ExportDataResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface DeleteAccountResult {
  success: boolean;
  error?: string;
}

export async function exportMyDataAction(): Promise<ExportDataResult> {
  try {
    await requireUser();
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('export_my_data');
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to export data';
    return { success: false, error: message };
  }
}

export async function deleteAccountAction(input: {
  usernameConfirmation: string;
}): Promise<DeleteAccountResult> {
  try {
    const user = await requireUser();
    const profile = await getCurrentProfile();

    if (!profile) {
      return { success: false, error: 'User profile not found' };
    }

    const trimmedInput = input.usernameConfirmation?.trim().toLowerCase();
    const actualUsername = profile.username?.trim().toLowerCase();

    if (trimmedInput !== actualUsername) {
      return {
        success: false,
        error: `Confirmation username "${input.usernameConfirmation}" does not match your username "@${profile.username}".`,
      };
    }

    const supabase = await createClient();

    // 1. Clean up user media in storage buckets (best-effort before account deletion)
    try {
      const storage = new SupabaseStorageProvider(supabase);

      // Clean up avatars bucket
      const { data: avatarFiles } = await supabase.storage
        .from('avatars')
        .list(user.id);

      if (avatarFiles && avatarFiles.length > 0) {
        const paths = avatarFiles.map((f) => `${user.id}/${f.name}`);
        await storage.remove('avatars', paths);
      }

      // Clean up creation-media bucket
      const { data: creationFiles } = await supabase.storage
        .from('creation-media')
        .list(user.id);

      if (creationFiles && creationFiles.length > 0) {
        const paths = creationFiles.map((f) => `${user.id}/${f.name}`);
        await storage.remove('creation-media', paths);
      }
    } catch (storageErr) {
      console.warn('Storage cleanup non-blocking warning during account deletion:', storageErr);
    }

    // 2. Execute delete_my_account RPC
    const { error: rpcError } = await supabase.rpc('delete_my_account');
    if (rpcError) {
      return { success: false, error: rpcError.message };
    }

    // 3. Terminate auth session
    await supabase.auth.signOut();

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete account';
    return { success: false, error: message };
  }
}
