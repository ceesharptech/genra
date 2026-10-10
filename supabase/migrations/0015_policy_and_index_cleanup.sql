-- =====================================================================
-- Migration: 0015_policy_and_index_cleanup.sql
-- Description: Policy, function and index cleanup.
--              1. Switches can_view_creation and owns_creation to SECURITY INVOKER
--                 and revokes execute on internal trigger functions.
--              2. Rewrites all policies using auth.uid() to (SELECT auth.uid())
--                 to eliminate auth_rls_initplan per-row evaluation.
--              3. Adds explicit using (false) policies to ai_jobs and share_events.
--              4. Adds covering indexes for all 13 unindexed foreign keys.
-- =====================================================================

-- 1. Function security & hardening
CREATE OR REPLACE FUNCTION public.can_view_creation(cid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.creations
    WHERE id = cid
      AND ((status = 'published' AND deleted_at IS NULL) OR creator_id = (SELECT auth.uid()))
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_creation(cid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.creations
    WHERE id = cid AND creator_id = (SELECT auth.uid())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.touch_collection_updated_at() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_creation_media() FROM public, anon, authenticated;

-- 2. Policy rewrite to (SELECT auth.uid())
ALTER POLICY "propose tools" ON public.tools
  WITH CHECK (created_by = (SELECT auth.uid()) AND is_verified = false);

ALTER POLICY "read creations" ON public.creations
  USING ((status = 'published' AND deleted_at IS NULL) OR creator_id = (SELECT auth.uid()));

ALTER POLICY "insert own creations" ON public.creations
  WITH CHECK (creator_id = (SELECT auth.uid()));

ALTER POLICY "update own creations" ON public.creations
  USING (creator_id = (SELECT auth.uid()))
  WITH CHECK (creator_id = (SELECT auth.uid()));

ALTER POLICY "delete own creations" ON public.creations
  USING (creator_id = (SELECT auth.uid()));

ALTER POLICY "read prompts" ON public.prompts
  USING ((is_public AND deleted_at IS NULL) OR author_id = (SELECT auth.uid()));

ALTER POLICY "write prompts" ON public.prompts
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));

ALTER POLICY "read resources" ON public.resources
  USING ((is_public AND deleted_at IS NULL) OR author_id = (SELECT auth.uid()));

ALTER POLICY "write resources" ON public.resources
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));

ALTER POLICY "read collections" ON public.collections
  USING (is_public OR owner_id = (SELECT auth.uid()));

ALTER POLICY "write collections" ON public.collections
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

ALTER POLICY "read collection items" ON public.collection_items
  USING (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_id
      AND (c.is_public OR c.owner_id = (SELECT auth.uid()))
  ));

ALTER POLICY "write collection items" ON public.collection_items
  USING (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_id AND c.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_id AND c.owner_id = (SELECT auth.uid())
  ));

ALTER POLICY "add comments" ON public.comments
  WITH CHECK (author_id = (SELECT auth.uid()) AND can_view_creation(creation_id));

ALTER POLICY "edit own comments" ON public.comments
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));

ALTER POLICY "delete own comments" ON public.comments
  USING (author_id = (SELECT auth.uid()));

ALTER POLICY "file reports" ON public.reports
  WITH CHECK (reporter_id = (SELECT auth.uid()));

ALTER POLICY "own likes" ON public.likes
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY "own saves" ON public.saves
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Explicit deny policies on internal tables to satisfy RLS checks
CREATE POLICY "no client access to ai_jobs" ON public.ai_jobs
  FOR ALL TO public USING (false);

CREATE POLICY "no client access to share_events" ON public.share_events
  FOR ALL TO public USING (false);

-- 3. Indexes for unindexed foreign keys
CREATE INDEX IF NOT EXISTS idx_ai_jobs_creation_id ON public.ai_jobs(creation_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_requested_by ON public.ai_jobs(requested_by);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_collections_owner_id ON public.collections(owner_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_creation_media_step_id ON public.creation_media(step_id);
CREATE INDEX IF NOT EXISTS idx_creation_prompts_step_id ON public.creation_prompts(step_id);
CREATE INDEX IF NOT EXISTS idx_prompts_fork_of_id ON public.prompts(fork_of_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_resources_author_id ON public.resources(author_id);
CREATE INDEX IF NOT EXISTS idx_tools_created_by ON public.tools(created_by);
CREATE INDEX IF NOT EXISTS idx_tools_parent_id ON public.tools(parent_id);
