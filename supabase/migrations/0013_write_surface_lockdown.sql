-- =====================================================================
-- Migration: 0013_write_surface_lockdown.sql
-- Description: Direct API write surface lockdown.
--              Revokes all client table writes, granting column-level
--              privileges on only allowed columns to authenticated users.
--              Protects counters, rankings, moderation, and identity fields.
--              Fixes admin profile edit policy and adds immutability triggers.
-- =====================================================================

-- 1. Revoke broad table write privileges from anon and authenticated
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Completely revoke client access to internal/future tables
REVOKE ALL ON public.comments, public.share_events, public.ai_jobs FROM anon, authenticated;

-- Ensure SELECT is granted on accessible tables
GRANT SELECT ON public.categories,
                public.collection_items,
                public.collections,
                public.creation_media,
                public.creation_prompts,
                public.creation_resources,
                public.creation_tags,
                public.creation_tools,
                public.creations,
                public.likes,
                public.process_steps,
                public.profiles,
                public.prompts,
                public.reports,
                public.resources,
                public.saves,
                public.tags,
                public.tool_relations,
                public.tools
TO anon, authenticated;

-- 2. Column-level write grants for authenticated clients

-- creations: clients cannot touch counters, trending_score, ai_metadata, created_at, updated_at
GRANT INSERT (id, creator_id, slug, title, summary, description, category_id, status, live_url, repo_url, cover_media_id, attributes)
  ON public.creations TO authenticated;
GRANT UPDATE (title, summary, description, category_id, live_url, repo_url, cover_media_id, attributes, status, published_at, slug, deleted_at)
  ON public.creations TO authenticated;
GRANT DELETE ON public.creations TO authenticated;

-- process_steps
GRANT INSERT (id, creation_id, position, title, body)
  ON public.process_steps TO authenticated;
GRANT UPDATE (position, title, body)
  ON public.process_steps TO authenticated;
GRANT DELETE ON public.process_steps TO authenticated;

-- creation_media
GRANT INSERT (id, creation_id, step_id, kind, role, storage_path, external_url, mime_type, width, height, duration_ms, alt_text, caption, position)
  ON public.creation_media TO authenticated;
GRANT UPDATE (step_id, kind, role, storage_path, external_url, mime_type, width, height, duration_ms, alt_text, caption, position)
  ON public.creation_media TO authenticated;
GRANT DELETE ON public.creation_media TO authenticated;

-- creation_tools
GRANT INSERT (creation_id, tool_id, role, version, position, source)
  ON public.creation_tools TO authenticated;
GRANT UPDATE (role, version, position)
  ON public.creation_tools TO authenticated;
GRANT DELETE ON public.creation_tools TO authenticated;

-- tags & creation_tags
GRANT INSERT (slug, name) ON public.tags TO authenticated;
GRANT UPDATE (name) ON public.tags TO authenticated;

GRANT INSERT (creation_id, tag_id, source) ON public.creation_tags TO authenticated;
GRANT DELETE ON public.creation_tags TO authenticated;

-- creation_prompts
GRANT INSERT (creation_id, prompt_id, step_id, position, note)
  ON public.creation_prompts TO authenticated;
GRANT UPDATE (step_id, position, note)
  ON public.creation_prompts TO authenticated;
GRANT DELETE ON public.creation_prompts TO authenticated;

-- creation_resources
GRANT INSERT (creation_id, resource_id, position, note)
  ON public.creation_resources TO authenticated;
GRANT UPDATE (position, note)
  ON public.creation_resources TO authenticated;
GRANT DELETE ON public.creation_resources TO authenticated;

-- prompts: clients cannot touch counters, copy_count, created_at, updated_at, search
GRANT INSERT (id, author_id, title, body, kind, model_tool_id, fork_of_id, is_public)
  ON public.prompts TO authenticated;
GRANT UPDATE (title, body, kind, model_tool_id, is_public, deleted_at)
  ON public.prompts TO authenticated;

-- resources: clients cannot touch counters, storage_path, created_at, updated_at, search
GRANT INSERT (id, author_id, title, kind, description, url, body, tool_id, is_public)
  ON public.resources TO authenticated;
GRANT UPDATE (title, kind, description, url, body, tool_id, is_public, deleted_at)
  ON public.resources TO authenticated;

-- profiles: clients cannot insert (auth trigger does) or modify is_admin, id, created_at, updated_at
GRANT UPDATE (display_name, username, headline, bio, avatar_url, website_url, social_links, onboarded_at)
  ON public.profiles TO authenticated;

-- tools: clients can only propose tools (cannot set is_verified, created_at)
GRANT INSERT (slug, name, kind, vendor, website_url, logo_url, parent_id, created_by)
  ON public.tools TO authenticated;

-- collections & collection_items: clients cannot touch timestamps or owner_id on update
GRANT INSERT (id, owner_id, title, description, is_public)
  ON public.collections TO authenticated;
GRANT UPDATE (title, description, is_public)
  ON public.collections TO authenticated;
GRANT DELETE ON public.collections TO authenticated;

GRANT INSERT (collection_id, target_type, target_id, position, note)
  ON public.collection_items TO authenticated;
GRANT UPDATE (position, note)
  ON public.collection_items TO authenticated;
GRANT DELETE ON public.collection_items TO authenticated;

-- likes & saves: insert and delete only, no update
GRANT INSERT (user_id, target_type, target_id) ON public.likes TO authenticated;
GRANT DELETE ON public.likes TO authenticated;

GRANT INSERT (user_id, target_type, target_id) ON public.saves TO authenticated;
GRANT DELETE ON public.saves TO authenticated;

-- reports: insert only, cannot modify status or timestamps
GRANT INSERT (id, reporter_id, target_type, target_id, reason) ON public.reports TO authenticated;

-- 3. Fix profile update policy for admin editing own profile
ALTER POLICY "update own profile" ON public.profiles
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- 4. Trigger to enforce creation immutability
CREATE OR REPLACE FUNCTION public.enforce_creation_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Block changes to creator_id
  IF NEW.creator_id IS DISTINCT FROM OLD.creator_id THEN
    RAISE EXCEPTION 'creator_id cannot be changed' USING errcode = '42501';
  END IF;

  -- Block changing slug once it no longer starts with 'draft-'
  IF OLD.slug NOT LIKE 'draft-%' AND NEW.slug IS DISTINCT FROM OLD.slug THEN
    RAISE EXCEPTION 'Slug cannot be changed once published' USING errcode = '42501';
  END IF;

  -- Make published_at forward-only (set once, never changed or cleared)
  IF OLD.published_at IS NOT NULL AND NEW.published_at IS DISTINCT FROM OLD.published_at THEN
    RAISE EXCEPTION 'published_at cannot be modified once set' USING errcode = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_enforce_creation_immutability
  BEFORE UPDATE ON public.creations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_creation_immutability();

-- 5. Trigger on collection_items to touch collections.updated_at
CREATE OR REPLACE FUNCTION public.touch_collection_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.collections
  SET updated_at = now()
  WHERE id = COALESCE(NEW.collection_id, OLD.collection_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE TRIGGER trg_touch_collection_updated_at
  AFTER INSERT OR UPDATE OR DELETE ON public.collection_items
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_collection_updated_at();

-- 6. Stop future tables from granting write privileges to anon and authenticated
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated;
