import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseStorageProvider } from './supabase';
import type { StorageProvider } from './types';

export * from './types';
export { SupabaseStorageProvider } from './supabase';

/**
 * Returns a StorageProvider instance.
 * Accepts an optional Supabase client instance (server or browser).
 */
export function getStorage(client?: SupabaseClient | null): StorageProvider {
  return new SupabaseStorageProvider(client);
}
