export type StorageBucket = 'avatars' | 'creation-media';

export interface UploadOptions {
  contentType?: string;
  upsert?: boolean;
  cacheControl?: string;
}

export interface StorageResult<T> {
  data: T | null;
  error: Error | null;
}

export interface StorageProvider {
  /**
   * Uploads an object into the specified bucket.
   */
  upload(
    bucket: StorageBucket,
    path: string,
    file: Blob | File | ArrayBuffer | Uint8Array,
    options?: UploadOptions
  ): Promise<StorageResult<{ path: string }>>;

  /**
   * Removes one or more objects from the specified bucket.
   */
  remove(
    bucket: StorageBucket,
    paths: string[]
  ): Promise<StorageResult<{ paths: string[] }>>;

  /**
   * Generates a fully qualified public URL for an object.
   */
  getPublicUrl(bucket: StorageBucket, path: string): string;
}
