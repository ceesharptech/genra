-- =====================================================================
-- Migration: 0014_integrity_constraints.sql
-- Description: Integrity constraints for URLs, text lengths, JSON structures,
--              creation_media storage path validation trigger, and
--              trending score hardening with capped influenceable counters.
-- =====================================================================

-- 1. Helper function for validating social links JSON
CREATE OR REPLACE FUNCTION public.validate_social_links(links jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  k text;
  v text;
BEGIN
  IF links IS NULL THEN
    RETURN true;
  END IF;
  IF jsonb_typeof(links) <> 'object' THEN
    RETURN false;
  END IF;
  FOR k, v IN SELECT * FROM jsonb_each_text(links)
  LOOP
    IF k NOT IN ('github', 'x', 'linkedin', 'youtube', 'instagram', 'dribbble') THEN
      RETURN false;
    END IF;
    IF v IS NOT NULL AND v <> '' THEN
      IF NOT (v ~* '^https://[^[:space:]]+$' AND char_length(v) <= 300) THEN
        RETURN false;
      END IF;
    END IF;
  END LOOP;
  RETURN true;
END;
$$;

-- 2. URL Check Constraints (Added as NOT VALID, then VALIDATE)
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_website_url
  CHECK (website_url IS NULL OR (website_url ~* '^https?://[^[:space:]]+$' AND char_length(website_url) <= 2048))
  NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT chk_profiles_website_url;

ALTER TABLE public.creations
  ADD CONSTRAINT chk_creations_live_url
  CHECK (live_url IS NULL OR (live_url ~* '^https?://[^[:space:]]+$' AND char_length(live_url) <= 2048))
  NOT VALID;
ALTER TABLE public.creations VALIDATE CONSTRAINT chk_creations_live_url;

ALTER TABLE public.creations
  ADD CONSTRAINT chk_creations_repo_url
  CHECK (repo_url IS NULL OR (repo_url ~* '^https?://[^[:space:]]+$' AND char_length(repo_url) <= 2048))
  NOT VALID;
ALTER TABLE public.creations VALIDATE CONSTRAINT chk_creations_repo_url;

ALTER TABLE public.resources
  ADD CONSTRAINT chk_resources_url
  CHECK (url IS NULL OR (url ~* '^https?://[^[:space:]]+$' AND char_length(url) <= 2048))
  NOT VALID;
ALTER TABLE public.resources VALIDATE CONSTRAINT chk_resources_url;

ALTER TABLE public.creation_media
  ADD CONSTRAINT chk_creation_media_external_url
  CHECK (external_url IS NULL OR (external_url ~* '^https?://[^[:space:]]+$' AND char_length(external_url) <= 2048))
  NOT VALID;
ALTER TABLE public.creation_media VALIDATE CONSTRAINT chk_creation_media_external_url;

ALTER TABLE public.tools
  ADD CONSTRAINT chk_tools_website_url
  CHECK (website_url IS NULL OR (website_url ~* '^https?://[^[:space:]]+$' AND char_length(website_url) <= 2048))
  NOT VALID;
ALTER TABLE public.tools VALIDATE CONSTRAINT chk_tools_website_url;

ALTER TABLE public.tools
  ADD CONSTRAINT chk_tools_logo_url
  CHECK (logo_url IS NULL OR (logo_url ~* '^https?://[^[:space:]]+$' AND char_length(logo_url) <= 2048))
  NOT VALID;
ALTER TABLE public.tools VALIDATE CONSTRAINT chk_tools_logo_url;

-- 3. Free-text length and JSON constraints
ALTER TABLE public.creations
  ADD CONSTRAINT chk_creations_description
  CHECK (description IS NULL OR char_length(description) <= 20000)
  NOT VALID;
ALTER TABLE public.creations VALIDATE CONSTRAINT chk_creations_description;

ALTER TABLE public.creations
  ADD CONSTRAINT chk_creations_attributes
  CHECK (attributes IS NULL OR (jsonb_typeof(attributes) = 'object' AND pg_column_size(attributes) <= 8192))
  NOT VALID;
ALTER TABLE public.creations VALIDATE CONSTRAINT chk_creations_attributes;

ALTER TABLE public.process_steps
  ADD CONSTRAINT chk_process_steps_title
  CHECK (char_length(title) <= 200)
  NOT VALID;
ALTER TABLE public.process_steps VALIDATE CONSTRAINT chk_process_steps_title;

ALTER TABLE public.process_steps
  ADD CONSTRAINT chk_process_steps_body
  CHECK (body IS NULL OR char_length(body) <= 20000)
  NOT VALID;
ALTER TABLE public.process_steps VALIDATE CONSTRAINT chk_process_steps_body;

ALTER TABLE public.creation_media
  ADD CONSTRAINT chk_creation_media_alt_text
  CHECK (alt_text IS NULL OR char_length(alt_text) <= 500)
  NOT VALID;
ALTER TABLE public.creation_media VALIDATE CONSTRAINT chk_creation_media_alt_text;

ALTER TABLE public.creation_media
  ADD CONSTRAINT chk_creation_media_caption
  CHECK (caption IS NULL OR char_length(caption) <= 1000)
  NOT VALID;
ALTER TABLE public.creation_media VALIDATE CONSTRAINT chk_creation_media_caption;

ALTER TABLE public.prompts
  ADD CONSTRAINT chk_prompts_body
  CHECK (char_length(body) BETWEEN 1 AND 30000)
  NOT VALID;
ALTER TABLE public.prompts VALIDATE CONSTRAINT chk_prompts_body;

ALTER TABLE public.resources
  ADD CONSTRAINT chk_resources_description
  CHECK (description IS NULL OR char_length(description) <= 1000)
  NOT VALID;
ALTER TABLE public.resources VALIDATE CONSTRAINT chk_resources_description;

ALTER TABLE public.resources
  ADD CONSTRAINT chk_resources_body
  CHECK (body IS NULL OR char_length(body) <= 30000)
  NOT VALID;
ALTER TABLE public.resources VALIDATE CONSTRAINT chk_resources_body;

ALTER TABLE public.collections
  ADD CONSTRAINT chk_collections_title
  CHECK (char_length(title) BETWEEN 1 AND 100)
  NOT VALID;
ALTER TABLE public.collections VALIDATE CONSTRAINT chk_collections_title;

ALTER TABLE public.collections
  ADD CONSTRAINT chk_collections_description
  CHECK (description IS NULL OR char_length(description) <= 500)
  NOT VALID;
ALTER TABLE public.collections VALIDATE CONSTRAINT chk_collections_description;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_display_name
  CHECK (display_name IS NULL OR char_length(display_name) <= 100)
  NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT chk_profiles_display_name;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_social_links
  CHECK (public.validate_social_links(social_links))
  NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT chk_profiles_social_links;

ALTER TABLE public.tags
  ADD CONSTRAINT chk_tags_name
  CHECK (char_length(name) BETWEEN 1 AND 50)
  NOT VALID;
ALTER TABLE public.tags VALIDATE CONSTRAINT chk_tags_name;

ALTER TABLE public.tools
  ADD CONSTRAINT chk_tools_name
  CHECK (char_length(name) BETWEEN 1 AND 100)
  NOT VALID;
ALTER TABLE public.tools VALIDATE CONSTRAINT chk_tools_name;

ALTER TABLE public.reports
  ADD CONSTRAINT chk_reports_reason
  CHECK (char_length(reason) BETWEEN 5 AND 2000)
  NOT VALID;
ALTER TABLE public.reports VALIDATE CONSTRAINT chk_reports_reason;

-- 4. Creation Media validation trigger (storage_path prefix and embed host whitelist)
CREATE OR REPLACE FUNCTION public.validate_creation_media()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_creator_id uuid;
  v_host text;
BEGIN
  -- Lookup creator_id of parent creation
  SELECT creator_id INTO v_creator_id
  FROM public.creations
  WHERE id = NEW.creation_id;

  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Parent creation not found' USING errcode = '23503';
  END IF;

  -- Verify storage_path starts with creator_id/
  IF NEW.storage_path IS NOT NULL AND NEW.storage_path <> '' THEN
    IF NOT (NEW.storage_path LIKE v_creator_id::text || '/%') THEN
      RAISE EXCEPTION 'storage_path must start with creation creator_id/' USING errcode = '42501';
    END IF;
  END IF;

  -- Verify external_url host for embeds
  IF NEW.kind = 'embed' THEN
    IF NEW.external_url IS NULL OR NEW.external_url = '' THEN
      RAISE EXCEPTION 'external_url is required for embed media' USING errcode = '22023';
    END IF;

    v_host := lower(substring(NEW.external_url from '^https?://([^/:]+)'));
    IF v_host IS NULL OR v_host NOT IN (
      'youtube.com', 'www.youtube.com', 'youtu.be',
      'vimeo.com', 'player.vimeo.com',
      'loom.com', 'www.loom.com'
    ) THEN
      RAISE EXCEPTION 'external_url host "%" is not in allow-list for embeds', v_host USING errcode = '22023';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_validate_creation_media
  BEFORE INSERT OR UPDATE ON public.creation_media
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_creation_media();

-- 5. Trending hardening: cap view_count and share_count influence
CREATE OR REPLACE FUNCTION public.refresh_trending()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.creations c SET trending_score =
    (c.like_count * 3 + c.save_count * 4 + c.comment_count * 2 + LEAST(c.share_count, 20) * 2 + LEAST(c.view_count, 1000) * 0.1)
    / power(extract(epoch from (now() - c.published_at)) / 3600.0 + 2, 1.5)
  WHERE c.status = 'published' AND c.deleted_at IS NULL;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_trending() FROM public, anon, authenticated;

-- Run once to compute fresh scores
SELECT public.refresh_trending();
