-- =====================================================================
-- Migration: 0006_creation_media_limits.sql
-- Description: Enforce 10 MB size limit and image MIME allow-list on the
--              'creation-media' storage bucket.
-- =====================================================================

update storage.buckets
set
  file_size_limit = 10485760, -- 10 MB in bytes (10 * 1024 * 1024)
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'creation-media';
