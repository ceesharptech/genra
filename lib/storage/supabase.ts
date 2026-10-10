import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import type {
  StorageBucket,
  StorageProvider,
  StorageResult,
  UploadOptions,
} from './types';

export class SupabaseStorageProvider implements StorageProvider {
  private client: SupabaseClient | null;

  constructor(client?: SupabaseClient | null) {
    this.client = client ?? null;
  }

  private getClient(): SupabaseClient {
    if (this.client) {
      return this.client;
    }
    // Fallback to browser client in client components
    return createBrowserClient();
  }

  async upload(
    bucket: StorageBucket,
    path: string,
    file: Blob | File | ArrayBuffer | Uint8Array,
    options?: UploadOptions
  ): Promise<StorageResult<{ path: string }>> {
    try {
      const client = this.getClient();
      const cleanPath = path.replace(/^\/+/, '');

      const { data, error } = await client.storage
        .from(bucket)
        .upload(cleanPath, file, {
          contentType: options?.contentType,
          upsert: options?.upsert ?? false,
          cacheControl: options?.cacheControl,
        });

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: { path: data.path }, error: null };
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Storage upload failed');
      return { data: null, error };
    }
  }

  async remove(
    bucket: StorageBucket,
    paths: string[]
  ): Promise<StorageResult<{ paths: string[] }>> {
    try {
      const client = this.getClient();
      const cleanPaths = paths.map((p) => p.replace(/^\/+/, ''));

      const { data, error } = await client.storage
        .from(bucket)
        .remove(cleanPaths);

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return {
        data: { paths: data.map((d) => d.name || '') },
        error: null,
      };
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Storage remove failed');
      return { data: null, error };
    }
  }

  getPublicUrl(bucket: StorageBucket, path: string): string {
    const cleanPath = path.replace(/^\/+/, '');
    if (this.client) {
      const { data } = this.client.storage.from(bucket).getPublicUrl(cleanPath);
      return data.publicUrl;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const cleanBase = supabaseUrl.replace(/\/+$/, '');
      return `${cleanBase}/storage/v1/object/public/${bucket}/${cleanPath}`;
    }

    return '';
  }
}
