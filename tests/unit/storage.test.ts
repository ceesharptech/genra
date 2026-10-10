import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseStorageProvider, getStorage } from '@/lib/storage';
import { getMediaUrl } from '@/lib/data/media';

describe('Storage Abstraction', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  });

  it('constructs public URL from environment when no client is passed', () => {
    const storage = getStorage();
    const url = storage.getPublicUrl('creation-media', 'user-1/creation-2/photo.webp');
    expect(url).toBe(
      'https://example.supabase.co/storage/v1/object/public/creation-media/user-1/creation-2/photo.webp'
    );
  });

  it('constructs public URL for avatars bucket correctly', () => {
    const storage = getStorage();
    const url = storage.getPublicUrl('avatars', 'user-1/avatar.webp');
    expect(url).toBe(
      'https://example.supabase.co/storage/v1/object/public/avatars/user-1/avatar.webp'
    );
  });

  it('delegates to client when Supabase client is provided', async () => {
    const mockClient = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: { path: 'file.webp' }, error: null }),
          remove: vi.fn().mockResolvedValue({ data: [{ name: 'file.webp' }], error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.genra.app/file.webp' } }),
        }),
      },
    };

    const storage = new SupabaseStorageProvider(mockClient as unknown as SupabaseClient);
    const pubUrl = storage.getPublicUrl('creation-media', 'file.webp');
    expect(pubUrl).toBe('https://cdn.genra.app/file.webp');

    const uploadRes = await storage.upload('creation-media', 'file.webp', new Blob());
    expect(uploadRes.data?.path).toBe('file.webp');
    expect(uploadRes.error).toBeNull();

    const removeRes = await storage.remove('creation-media', ['file.webp']);
    expect(removeRes.data?.paths).toEqual(['file.webp']);
    expect(removeRes.error).toBeNull();
  });

  it('handles client upload errors safely without throwing', async () => {
    const mockClient = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: null, error: { message: 'Bucket not found' } }),
        }),
      },
    };

    const storage = new SupabaseStorageProvider(mockClient as unknown as SupabaseClient);
    const result = await storage.upload('creation-media', 'file.webp', new Blob());
    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('Bucket not found');
  });

  it('getMediaUrl formats relative paths and preserves external URLs', () => {
    expect(getMediaUrl(null)).toBeNull();
    expect(getMediaUrl('')).toBeNull();
    expect(getMediaUrl('https://youtube.com/watch?v=123')).toBe('https://youtube.com/watch?v=123');
    expect(getMediaUrl('path/to/image.jpg')).toBe(
      'https://example.supabase.co/storage/v1/object/public/creation-media/path/to/image.jpg'
    );
  });
});
