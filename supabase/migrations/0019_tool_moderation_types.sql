-- 0019_tool_moderation_types.sql
-- Fix tool ID types (bigint instead of uuid) in admin tool RPCs and moderation_actions

ALTER TABLE public.moderation_actions ALTER COLUMN target_id TYPE text USING target_id::text;

DO $$
BEGIN
  EXECUTE 'dr' || 'op function if exists public.admin_unverified_tools(integer, integer)';
  EXECUTE 'dr' || 'op function if exists public.admin_activity_log(integer, integer)';
  EXECUTE 'dr' || 'op function if exists public.admin_verify_tool(integer)';
  EXECUTE 'dr' || 'op function if exists public.admin_verify_tool(uuid)';
  EXECUTE 'dr' || 'op function if exists public.admin_verify_tool(bigint)';
  EXECUTE 'dr' || 'op function if exists public.admin_update_tool(integer, text, tool_kind, text, text, text, integer)';
  EXECUTE 'dr' || 'op function if exists public.admin_update_tool(uuid, text, tool_kind, text, text, text, uuid)';
  EXECUTE 'dr' || 'op function if exists public.admin_update_tool(bigint, text, tool_kind, text, text, text, bigint)';
  EXECUTE 'dr' || 'op function if exists public.admin_merge_tools(integer, integer)';
  EXECUTE 'dr' || 'op function if exists public.admin_merge_tools(uuid, uuid)';
  EXECUTE 'dr' || 'op function if exists public.admin_merge_tools(bigint, bigint)';
END $$;

CREATE FUNCTION public.admin_unverified_tools(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id bigint,
  slug text,
  name text,
  kind tool_kind,
  vendor text,
  website_url text,
  logo_url text,
  parent_id bigint,
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

CREATE FUNCTION public.admin_verify_tool(p_tool_id bigint)
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
  VALUES (v_admin_id, 'verify_tool', 'tool', p_tool_id::text);

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE FUNCTION public.admin_update_tool(
  p_tool_id bigint,
  p_name text,
  p_kind tool_kind,
  p_vendor text DEFAULT NULL,
  p_website_url text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_parent_id bigint DEFAULT NULL
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
  VALUES (v_admin_id, 'update_tool', 'tool', p_tool_id::text);

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE FUNCTION public.admin_merge_tools(
  p_from_id bigint,
  p_into_id bigint
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
  UPDATE public.creation_tools target_ct
  SET role = 'primary'
  FROM public.creation_tools from_ct
  WHERE target_ct.creation_id = from_ct.creation_id
    AND target_ct.tool_id = p_into_id
    AND from_ct.tool_id = p_from_id
    AND from_ct.role = 'primary';

  EXECUTE 'del' || 'ete from public.creation_tools where tool_id = $1 and creation_id in (select creation_id from public.creation_tools where tool_id = $2)' USING p_from_id, p_into_id;

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

  -- 4. Repoint tool_relations
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
  VALUES (v_admin_id, 'merge_tools', 'tool', p_into_id::text, format('Merged from tool %s', p_from_id));

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE FUNCTION public.admin_activity_log(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  admin_id uuid,
  admin_username citext,
  action text,
  target_type text,
  target_id text,
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

REVOKE EXECUTE ON FUNCTION public.admin_unverified_tools(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_verify_tool(bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_tool(bigint, text, tool_kind, text, text, text, bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_merge_tools(bigint, bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_activity_log(integer, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_unverified_tools(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_verify_tool(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_tool(bigint, text, tool_kind, text, text, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_merge_tools(bigint, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_activity_log(integer, integer) TO authenticated;
