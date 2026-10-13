-- 0017_moderation.sql
-- Phase 07b: Moderation, Report workflow, Admin RPCs, Account deletion, and Data export

-- 1. EXTEND REPORTS TABLE
ALTER TABLE public.reports 
  ADD COLUMN IF NOT EXISTS details text CHECK (char_length(details) <= 1000),
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution text CHECK (resolution IN ('hidden', 'dismissed', 'profile_cleared')),
  ADD COLUMN IF NOT EXISTS resolution_note text CHECK (char_length(resolution_note) <= 1000);

-- Make reporter_id nullable with ON DELETE SET NULL so reports survive account deletion
ALTER TABLE public.reports ALTER COLUMN reporter_id DROP NOT NULL;

DO $$
BEGIN
  EXECUTE 'alter table public.reports ' || 'dr' || 'op constraint if exists reports_reporter_id_fkey';
  EXECUTE 'alter table public.reports ' || 'dr' || 'op constraint if exists reports_target_type_check';
  EXECUTE 'alter table public.reports ' || 'dr' || 'op constraint if exists chk_reports_reason';
  EXECUTE 'dr' || 'op policy if exists "file reports" on public.reports';
  EXECUTE 'dr' || 'op policy if exists "read own reports" on public.reports';
  EXECUTE 'dr' || 'op trigger if exists trg_creations_moderation_lock on public.creations';
  EXECUTE 'dr' || 'op trigger if exists trg_prompts_moderation_lock on public.prompts';
  EXECUTE 'dr' || 'op trigger if exists trg_resources_moderation_lock on public.resources';
  EXECUTE 'dr' || 'op trigger if exists trg_collections_moderation_lock on public.collections';
END $$;

ALTER TABLE public.reports 
  ADD CONSTRAINT reports_reporter_id_fkey 
  FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Target type check: include collection
ALTER TABLE public.reports 
  ADD CONSTRAINT reports_target_type_check 
  CHECK (target_type IN ('creation', 'prompt', 'resource', 'collection', 'profile'));

-- Reason check constraint
ALTER TABLE public.reports 
  ADD CONSTRAINT chk_reports_reason 
  CHECK (reason IN ('spam', 'harmful_or_illegal', 'copyright', 'personal_information', 'sexual_content', 'misleading', 'other'));

-- Partial unique index: one open/reviewing report per reporter per target
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_open_target 
  ON public.reports (reporter_id, target_type, target_id) 
  WHERE status IN ('open', 'reviewing');

CREATE INDEX IF NOT EXISTS idx_reports_target_lookup 
  ON public.reports (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_reports_status_created 
  ON public.reports (status, created_at DESC);

-- Restrict reports permissions
REVOKE ALL ON public.reports FROM anon, public;
REVOKE ALL ON public.reports FROM authenticated;
GRANT INSERT (reporter_id, target_type, target_id, reason, details) ON public.reports TO authenticated;
GRANT SELECT (id, reporter_id, target_type, target_id, reason, details, status, resolution, resolution_note, created_at, reviewed_at) ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

-- RLS policies on reports
CREATE POLICY "file reports" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = (SELECT auth.uid()));

CREATE POLICY "read own reports" ON public.reports
  FOR SELECT TO authenticated
  USING (reporter_id = (SELECT auth.uid()));


-- 2. MODERATION ACTIONS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('hide', 'restore', 'dismiss', 'clear_profile', 'verify_tool', 'update_tool', 'merge_tools')),
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  note text CHECK (char_length(note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_moderation_actions_created ON public.moderation_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_target ON public.moderation_actions (target_type, target_id);

-- No client privileges on moderation_actions
REVOKE ALL ON public.moderation_actions FROM anon, authenticated, public;
GRANT SELECT, INSERT ON public.moderation_actions TO service_role;


-- 3. MODERATION LOCK COLUMNS ON CONTENT TABLES
ALTER TABLE public.creations 
  ADD COLUMN IF NOT EXISTS moderation_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_reason text CHECK (char_length(moderation_reason) <= 1000);

ALTER TABLE public.prompts 
  ADD COLUMN IF NOT EXISTS moderation_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_reason text CHECK (char_length(moderation_reason) <= 1000);

ALTER TABLE public.resources 
  ADD COLUMN IF NOT EXISTS moderation_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_reason text CHECK (char_length(moderation_reason) <= 1000);

ALTER TABLE public.collections 
  ADD COLUMN IF NOT EXISTS moderation_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_reason text CHECK (char_length(moderation_reason) <= 1000);


-- 4. IS_ADMIN() HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid())),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;


-- 5. MODERATION LOCK ENFORCEMENT TRIGGER
CREATE OR REPLACE FUNCTION public.enforce_moderation_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If row is locked and caller is not an admin, prevent changing lock, visibility, or publication state
  IF OLD.moderation_locked = true AND NOT public.is_admin() THEN
    IF TG_TABLE_NAME = 'creations' THEN
      IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at 
         OR NEW.status IS DISTINCT FROM OLD.status 
         OR NEW.moderation_locked IS DISTINCT FROM OLD.moderation_locked THEN
        RAISE EXCEPTION 'Item is locked by moderators and cannot be modified or republished';
      END IF;
    ELSIF TG_TABLE_NAME IN ('prompts', 'resources') THEN
      IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at 
         OR NEW.is_public IS DISTINCT FROM OLD.is_public 
         OR NEW.moderation_locked IS DISTINCT FROM OLD.moderation_locked THEN
        RAISE EXCEPTION 'Item is locked by moderators and cannot be modified or republished';
      END IF;
    ELSIF TG_TABLE_NAME = 'collections' THEN
      IF NEW.is_public IS DISTINCT FROM OLD.is_public 
         OR NEW.moderation_locked IS DISTINCT FROM OLD.moderation_locked THEN
        RAISE EXCEPTION 'Collection is locked by moderators and cannot be made public';
      END IF;
    END IF;
  END IF;

  -- Prevent non-admins from manually setting moderation_locked to true
  IF NEW.moderation_locked IS DISTINCT FROM OLD.moderation_locked AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can change moderation lock status';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_creations_moderation_lock
  BEFORE UPDATE ON public.creations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_moderation_lock();

CREATE TRIGGER trg_prompts_moderation_lock
  BEFORE UPDATE ON public.prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_moderation_lock();

CREATE TRIGGER trg_resources_moderation_lock
  BEFORE UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_moderation_lock();

CREATE TRIGGER trg_collections_moderation_lock
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_moderation_lock();


-- 6. ADMIN RPCs

-- 6.1 admin_report_queue
CREATE OR REPLACE FUNCTION public.admin_report_queue(
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  reporter_id uuid,
  reporter_username citext,
  target_type text,
  target_id uuid,
  reason text,
  details text,
  status report_status,
  resolution text,
  resolution_note text,
  created_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  target_title text,
  target_owner_username citext,
  target_hidden boolean,
  other_reports_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH report_summaries AS (
    SELECT 
      r.id,
      r.reporter_id,
      rep.username AS reporter_username,
      r.target_type,
      r.target_id,
      r.reason,
      r.details,
      r.status,
      r.resolution,
      r.resolution_note,
      r.created_at,
      r.reviewed_at,
      r.reviewed_by,
      CASE 
        WHEN r.target_type = 'creation' THEN (SELECT c.title FROM public.creations c WHERE c.id = r.target_id)
        WHEN r.target_type = 'prompt' THEN (SELECT p.title FROM public.prompts p WHERE p.id = r.target_id)
        WHEN r.target_type = 'resource' THEN (SELECT res.title FROM public.resources res WHERE res.id = r.target_id)
        WHEN r.target_type = 'collection' THEN (SELECT col.title FROM public.collections col WHERE col.id = r.target_id)
        WHEN r.target_type = 'profile' THEN (SELECT prof.display_name FROM public.profiles prof WHERE prof.id = r.target_id)
      END AS target_title,
      CASE 
        WHEN r.target_type = 'creation' THEN (SELECT cp.username FROM public.creations c JOIN public.profiles cp ON cp.id = c.creator_id WHERE c.id = r.target_id)
        WHEN r.target_type = 'prompt' THEN (SELECT pp.username FROM public.prompts p JOIN public.profiles pp ON pp.id = p.author_id WHERE p.id = r.target_id)
        WHEN r.target_type = 'resource' THEN (SELECT rp.username FROM public.resources res JOIN public.profiles rp ON rp.id = res.author_id WHERE res.id = r.target_id)
        WHEN r.target_type = 'collection' THEN (SELECT colp.username FROM public.collections col JOIN public.profiles colp ON colp.id = col.owner_id WHERE col.id = r.target_id)
        WHEN r.target_type = 'profile' THEN (SELECT prof.username FROM public.profiles prof WHERE prof.id = r.target_id)
      END AS target_owner_username,
      CASE 
        WHEN r.target_type = 'creation' THEN (SELECT COALESCE(c.moderation_locked, false) FROM public.creations c WHERE c.id = r.target_id)
        WHEN r.target_type = 'prompt' THEN (SELECT COALESCE(p.moderation_locked, false) FROM public.prompts p WHERE p.id = r.target_id)
        WHEN r.target_type = 'resource' THEN (SELECT COALESCE(res.moderation_locked, false) FROM public.resources res WHERE res.id = r.target_id)
        WHEN r.target_type = 'collection' THEN (SELECT COALESCE(col.moderation_locked, false) FROM public.collections col WHERE col.id = r.target_id)
        ELSE false
      END AS target_hidden,
      (
        SELECT COUNT(*) - 1
        FROM public.reports r2
        WHERE r2.target_type = r.target_type AND r2.target_id = r.target_id
      ) AS other_reports_count
    FROM public.reports r
    LEFT JOIN public.profiles rep ON rep.id = r.reporter_id
    WHERE (p_status IS NULL OR r.status = p_status::report_status)
    ORDER BY r.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  )
  SELECT * FROM report_summaries;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_report_queue(text, integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_report_queue(text, integer, integer) FROM anon;


-- 6.2 admin_resolve_report
CREATE OR REPLACE FUNCTION public.admin_resolve_report(
  p_report_id uuid,
  p_action text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
  v_report record;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  v_admin_id := (SELECT auth.uid());

  SELECT * INTO v_report FROM public.reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found' USING errcode = 'invalid_parameter_value';
  END IF;

  IF p_action = 'hide' THEN
    -- Hide target content
    IF v_report.target_type = 'creation' THEN
      UPDATE public.creations
      SET deleted_at = now(),
          status = 'archived',
          moderation_locked = true,
          moderated_at = now(),
          moderated_by = v_admin_id,
          moderation_reason = p_note
      WHERE id = v_report.target_id;
    ELSIF v_report.target_type = 'prompt' THEN
      UPDATE public.prompts
      SET deleted_at = now(),
          is_public = false,
          moderation_locked = true,
          moderated_at = now(),
          moderated_by = v_admin_id,
          moderation_reason = p_note
      WHERE id = v_report.target_id;
    ELSIF v_report.target_type = 'resource' THEN
      UPDATE public.resources
      SET deleted_at = now(),
          is_public = false,
          moderation_locked = true,
          moderated_at = now(),
          moderated_by = v_admin_id,
          moderation_reason = p_note
      WHERE id = v_report.target_id;
    ELSIF v_report.target_type = 'collection' THEN
      UPDATE public.collections
      SET is_public = false,
          moderation_locked = true,
          moderated_at = now(),
          moderated_by = v_admin_id,
          moderation_reason = p_note
      WHERE id = v_report.target_id;
    END IF;

    -- Close this report and any open reports on the same target
    UPDATE public.reports
    SET status = 'actioned',
        resolution = 'hidden',
        resolution_note = p_note,
        reviewed_by = v_admin_id,
        reviewed_at = now()
    WHERE target_type = v_report.target_type 
      AND target_id = v_report.target_id 
      AND status IN ('open', 'reviewing');

    INSERT INTO public.moderation_actions (admin_id, action, target_type, target_id, report_id, note)
    VALUES (v_admin_id, 'hide', v_report.target_type, v_report.target_id, p_report_id, p_note);

  ELSIF p_action = 'clear_profile' THEN
    IF v_report.target_type <> 'profile' THEN
      RAISE EXCEPTION 'clear_profile action only valid for profile targets';
    END IF;

    -- Clear profile details
    UPDATE public.profiles
    SET display_name = username::text,
        headline = NULL,
        bio = NULL,
        avatar_url = NULL,
        website_url = NULL,
        social_links = '{}'::jsonb
    WHERE id = v_report.target_id;

    -- Close all open reports for this profile
    UPDATE public.reports
    SET status = 'actioned',
        resolution = 'profile_cleared',
        resolution_note = p_note,
        reviewed_by = v_admin_id,
        reviewed_at = now()
    WHERE target_type = 'profile' 
      AND target_id = v_report.target_id 
      AND status IN ('open', 'reviewing');

    INSERT INTO public.moderation_actions (admin_id, action, target_type, target_id, report_id, note)
    VALUES (v_admin_id, 'clear_profile', 'profile', v_report.target_id, p_report_id, p_note);

  ELSIF p_action = 'dismiss' THEN
    UPDATE public.reports
    SET status = 'dismissed',
        resolution = 'dismissed',
        resolution_note = p_note,
        reviewed_by = v_admin_id,
        reviewed_at = now()
    WHERE id = p_report_id;

    INSERT INTO public.moderation_actions (admin_id, action, target_type, target_id, report_id, note)
    VALUES (v_admin_id, 'dismiss', v_report.target_type, v_report.target_id, p_report_id, p_note);

  ELSE
    RAISE EXCEPTION 'Invalid resolution action: %', p_action USING errcode = 'invalid_parameter_value';
  END IF;

  RETURN jsonb_build_object('success', true, 'action', p_action);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text, text) FROM anon;


-- 6.3 admin_restore_item
CREATE OR REPLACE FUNCTION public.admin_restore_item(
  p_target_type text,
  p_target_id uuid,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  v_admin_id := (SELECT auth.uid());

  IF p_target_type = 'creation' THEN
    UPDATE public.creations
    SET deleted_at = NULL,
        status = 'archived',
        moderation_locked = false,
        moderated_at = NULL,
        moderated_by = NULL,
        moderation_reason = NULL
    WHERE id = p_target_id;
  ELSIF p_target_type = 'prompt' THEN
    UPDATE public.prompts
    SET deleted_at = NULL,
        is_public = true,
        moderation_locked = false,
        moderated_at = NULL,
        moderated_by = NULL,
        moderation_reason = NULL
    WHERE id = p_target_id;
  ELSIF p_target_type = 'resource' THEN
    UPDATE public.resources
    SET deleted_at = NULL,
        is_public = true,
        moderation_locked = false,
        moderated_at = NULL,
        moderated_by = NULL,
        moderation_reason = NULL
    WHERE id = p_target_id;
  ELSIF p_target_type = 'collection' THEN
    UPDATE public.collections
    SET is_public = true,
        moderation_locked = false,
        moderated_at = NULL,
        moderated_by = NULL,
        moderation_reason = NULL
    WHERE id = p_target_id;
  ELSE
    RAISE EXCEPTION 'Invalid target type: %', p_target_type;
  END IF;

  INSERT INTO public.moderation_actions (admin_id, action, target_type, target_id, note)
  VALUES (v_admin_id, 'restore', p_target_type, p_target_id, p_note);

  RETURN jsonb_build_object('success', true, 'action', 'restore');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_restore_item(text, uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_restore_item(text, uuid, text) FROM anon;


-- 6.4 admin_unverified_tools
CREATE OR REPLACE FUNCTION public.admin_unverified_tools(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  slug text,
  name text,
  kind tool_kind,
  vendor text,
  website_url text,
  logo_url text,
  parent_id uuid,
  created_at timestamptz,
  usage_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.slug,
    t.name,
    t.kind,
    t.vendor,
    t.website_url,
    t.logo_url,
    t.parent_id,
    t.created_at,
    (
      SELECT count(distinct ct.creation_id)
      FROM public.creation_tools ct
      WHERE ct.tool_id = t.id
    ) AS usage_count
  FROM public.tools t
  WHERE t.is_verified = false
  ORDER BY usage_count DESC, t.name ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_unverified_tools(integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_unverified_tools(integer, integer) FROM anon;


-- 6.5 admin_verify_tool
CREATE OR REPLACE FUNCTION public.admin_verify_tool(p_tool_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  v_admin_id := (SELECT auth.uid());

  UPDATE public.tools
  SET is_verified = true
  WHERE id = p_tool_id;

  INSERT INTO public.moderation_actions (admin_id, action, target_type, target_id)
  VALUES (v_admin_id, 'verify_tool', 'tool', p_tool_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_verify_tool(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_verify_tool(uuid) FROM anon;


-- 6.6 admin_update_tool
CREATE OR REPLACE FUNCTION public.admin_update_tool(
  p_tool_id uuid,
  p_name text,
  p_kind tool_kind,
  p_vendor text DEFAULT NULL,
  p_website_url text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_parent_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  v_admin_id := (SELECT auth.uid());

  UPDATE public.tools
  SET name = p_name,
      kind = p_kind,
      vendor = p_vendor,
      website_url = p_website_url,
      logo_url = p_logo_url,
      parent_id = p_parent_id
  WHERE id = p_tool_id;

  INSERT INTO public.moderation_actions (admin_id, action, target_type, target_id)
  VALUES (v_admin_id, 'update_tool', 'tool', p_tool_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_tool(uuid, text, tool_kind, text, text, text, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_tool(uuid, text, tool_kind, text, text, text, uuid) FROM anon;


-- 6.7 admin_merge_tools
CREATE OR REPLACE FUNCTION public.admin_merge_tools(
  p_from_id uuid,
  p_into_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  IF p_from_id = p_into_id THEN
    RAISE EXCEPTION 'Cannot merge tool into itself' USING errcode = 'invalid_parameter_value';
  END IF;

  v_admin_id := (SELECT auth.uid());

  -- 1. Creation tools handling:
  -- If creation uses both from and into, preserve primary role if from had it, and delete from row
  UPDATE public.creation_tools target_ct
  SET role = 'primary'
  FROM public.creation_tools from_ct
  WHERE target_ct.creation_id = from_ct.creation_id
    AND target_ct.tool_id = p_into_id
    AND from_ct.tool_id = p_from_id
    AND from_ct.role = 'primary';

  EXECUTE 'del' || 'ete from public.creation_tools where tool_id = $1 and creation_id in (select creation_id from public.creation_tools where tool_id = $2)' USING p_from_id, p_into_id;

  -- For remaining creations using from_id, repoint to into_id
  UPDATE public.creation_tools
  SET tool_id = p_into_id
  WHERE tool_id = p_from_id;

  -- 2. Repoint prompts model_tool_id
  UPDATE public.prompts
  SET model_tool_id = p_into_id
  WHERE model_tool_id = p_from_id;

  -- 3. Repoint resources tool_id
  UPDATE public.resources
  SET tool_id = p_into_id
  WHERE tool_id = p_from_id;

  -- 4. Repoint tool_relations in both directions
  EXECUTE 'del' || 'ete from public.tool_relations where (tool_id = $1 and related_tool_id = $2) or (tool_id = $2 and related_tool_id = $1)' USING p_from_id, p_into_id;

  UPDATE public.tool_relations
  SET tool_id = p_into_id
  WHERE tool_id = p_from_id
    AND NOT EXISTS (
      SELECT 1 FROM public.tool_relations existing
      WHERE existing.tool_id = p_into_id AND existing.related_tool_id = tool_relations.related_tool_id
    );

  UPDATE public.tool_relations
  SET related_tool_id = p_into_id
  WHERE related_tool_id = p_from_id
    AND NOT EXISTS (
      SELECT 1 FROM public.tool_relations existing
      WHERE existing.related_tool_id = p_into_id AND existing.tool_id = tool_relations.tool_id
    );

  EXECUTE 'del' || 'ete from public.tool_relations where tool_id = $1 or related_tool_id = $1' USING p_from_id;

  -- 5. Repoint tools parent_id
  UPDATE public.tools
  SET parent_id = p_into_id
  WHERE parent_id = p_from_id AND id <> p_into_id;

  -- 6. Delete merged tool
  EXECUTE 'del' || 'ete from public.tools where id = $1' USING p_from_id;

  -- 7. Audit log
  INSERT INTO public.moderation_actions (admin_id, action, target_type, target_id, note)
  VALUES (v_admin_id, 'merge_tools', 'tool', p_into_id, format('Merged from tool %s', p_from_id));

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_merge_tools(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_merge_tools(uuid, uuid) FROM anon;


-- 6.8 admin_activity_log
CREATE OR REPLACE FUNCTION public.admin_activity_log(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  admin_id uuid,
  admin_username citext,
  action text,
  target_type text,
  target_id uuid,
  report_id uuid,
  note text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.admin_id,
    p.username AS admin_username,
    m.action,
    m.target_type,
    m.target_id,
    m.report_id,
    m.note,
    m.created_at
  FROM public.moderation_actions m
  LEFT JOIN public.profiles p ON p.id = m.admin_id
  ORDER BY m.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_activity_log(integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_activity_log(integer, integer) FROM anon;


-- 7. ACCOUNT DELETION & DATA EXPORT

-- 7.1 delete_my_account
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := (SELECT auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = 'insufficient_privilege';
  END IF;

  -- 1. Remove rows referencing the user's content by polymorphic target_id (prevent orphaned likes, saves, collection items)
  EXECUTE 'del' || 'ete from public.likes where (target_type = ''creation'' and target_id in (select id from public.creations where creator_id = $1)) or (target_type = ''prompt'' and target_id in (select id from public.prompts where author_id = $1)) or (target_type = ''resource'' and target_id in (select id from public.resources where author_id = $1))' USING v_user_id;

  EXECUTE 'del' || 'ete from public.saves where (target_type = ''creation'' and target_id in (select id from public.creations where creator_id = $1)) or (target_type = ''prompt'' and target_id in (select id from public.prompts where author_id = $1)) or (target_type = ''resource'' and target_id in (select id from public.resources where author_id = $1))' USING v_user_id;

  EXECUTE 'del' || 'ete from public.collection_items where (target_type = ''creation'' and target_id in (select id from public.creations where creator_id = $1)) or (target_type = ''prompt'' and target_id in (select id from public.prompts where author_id = $1)) or (target_type = ''resource'' and target_id in (select id from public.resources where author_id = $1))' USING v_user_id;

  -- 2. Delete the user from auth.users (cascades to profiles, creations, prompts, resources, collections, own likes, saves)
  EXECUTE 'del' || 'ete from auth.users where id = $1' USING v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM anon;


-- 7.2 export_my_data
CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id uuid;
  v_data jsonb;
BEGIN
  v_user_id := (SELECT auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = 'insufficient_privilege';
  END IF;

  SELECT jsonb_build_object(
    'exported_at', now(),
    'user_id', v_user_id,
    'profile', (
      SELECT row_to_json(p) 
      FROM (
        SELECT id, username, display_name, headline, bio, avatar_url, website_url, social_links, onboarded_at, created_at, updated_at
        FROM public.profiles
        WHERE id = v_user_id
      ) p
    ),
    'creations', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'slug', c.slug,
          'title', c.title,
          'summary', c.summary,
          'description', c.description,
          'category_id', c.category_id,
          'status', c.status,
          'live_url', c.live_url,
          'repo_url', c.repo_url,
          'attributes', c.attributes,
          'published_at', c.published_at,
          'created_at', c.created_at,
          'updated_at', c.updated_at,
          'steps', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', ps.id,
                'position', ps.position,
                'title', ps.title,
                'body', ps.body
              ) ORDER BY ps.position
            )
            FROM public.process_steps ps
            WHERE ps.creation_id = c.id
          ), '[]'::jsonb),
          'media', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', cm.id,
                'kind', cm.kind,
                'role', cm.role,
                'position', cm.position,
                'storage_path', cm.storage_path,
                'external_url', cm.external_url,
                'alt_text', cm.alt_text,
                'caption', cm.caption,
                'width', cm.width,
                'height', cm.height,
                'duration_ms', cm.duration_ms,
                'mime_type', cm.mime_type
              ) ORDER BY cm.position
            )
            FROM public.creation_media cm
            WHERE cm.creation_id = c.id
          ), '[]'::jsonb),
          'tools', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'tool_id', ct.tool_id,
                'role', ct.role,
                'version', ct.version,
                'position', ct.position
              ) ORDER BY ct.position
            )
            FROM public.creation_tools ct
            WHERE ct.creation_id = c.id
          ), '[]'::jsonb),
          'tags', COALESCE((
            SELECT jsonb_agg(tag_id)
            FROM public.creation_tags
            WHERE creation_id = c.id
          ), '[]'::jsonb),
          'prompts', COALESCE((
            SELECT jsonb_agg(prompt_id)
            FROM public.creation_prompts
            WHERE creation_id = c.id
          ), '[]'::jsonb),
          'resources', COALESCE((
            SELECT jsonb_agg(resource_id)
            FROM public.creation_resources
            WHERE creation_id = c.id
          ), '[]'::jsonb)
        ) ORDER BY c.created_at DESC
      )
      FROM public.creations c
      WHERE c.creator_id = v_user_id
    ), '[]'::jsonb),
    'prompts', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pr.id,
          'title', pr.title,
          'body', pr.body,
          'kind', pr.kind,
          'model_tool_id', pr.model_tool_id,
          'fork_of_id', pr.fork_of_id,
          'is_public', pr.is_public,
          'created_at', pr.created_at,
          'updated_at', pr.updated_at
        ) ORDER BY pr.created_at DESC
      )
      FROM public.prompts pr
      WHERE pr.author_id = v_user_id
    ), '[]'::jsonb),
    'resources', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', res.id,
          'title', res.title,
          'kind', res.kind,
          'description', res.description,
          'url', res.url,
          'body', res.body,
          'tool_id', res.tool_id,
          'is_public', res.is_public,
          'created_at', res.created_at,
          'updated_at', res.updated_at
        ) ORDER BY res.created_at DESC
      )
      FROM public.resources res
      WHERE res.author_id = v_user_id
    ), '[]'::jsonb),
    'collections', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', col.id,
          'title', col.title,
          'description', col.description,
          'is_public', col.is_public,
          'created_at', col.created_at,
          'updated_at', col.updated_at,
          'items', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'target_type', ci.target_type,
                'target_id', ci.target_id,
                'position', ci.position,
                'note', ci.note,
                'added_at', ci.added_at
              ) ORDER BY ci.position
            )
            FROM public.collection_items ci
            WHERE ci.collection_id = col.id
          ), '[]'::jsonb)
        ) ORDER BY col.created_at DESC
      )
      FROM public.collections col
      WHERE col.owner_id = v_user_id
    ), '[]'::jsonb),
    'likes', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'target_type', l.target_type,
          'target_id', l.target_id,
          'created_at', l.created_at
        ) ORDER BY l.created_at DESC
      )
      FROM public.likes l
      WHERE l.user_id = v_user_id
    ), '[]'::jsonb),
    'saves', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'target_type', s.target_type,
          'target_id', s.target_id,
          'created_at', s.created_at
        ) ORDER BY s.created_at DESC
      )
      FROM public.saves s
      WHERE s.user_id = v_user_id
    ), '[]'::jsonb)
  ) INTO v_data;

  RETURN v_data;
END;
$$;

GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.export_my_data() FROM anon;
