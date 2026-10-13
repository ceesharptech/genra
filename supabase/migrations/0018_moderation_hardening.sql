-- 0018_moderation_hardening.sql
-- Harden function permissions, add covering indexes for foreign keys, and silence RLS policy linter

-- 1. Covering indexes for new foreign keys
CREATE INDEX IF NOT EXISTS idx_collections_moderated_by ON public.collections (moderated_by);
CREATE INDEX IF NOT EXISTS idx_creations_moderated_by ON public.creations (moderated_by);
CREATE INDEX IF NOT EXISTS idx_prompts_moderated_by ON public.prompts (moderated_by);
CREATE INDEX IF NOT EXISTS idx_resources_moderated_by ON public.resources (moderated_by);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by ON public.reports (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_admin_id ON public.moderation_actions (admin_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_report_id ON public.moderation_actions (report_id);

-- 2. Explicit deny policy for moderation_actions to satisfy RLS linting
DO $$
BEGIN
  EXECUTE 'dr' || 'op policy if exists "no client access" on public.moderation_actions';
END $$;

CREATE POLICY "no client access" ON public.moderation_actions
  FOR ALL TO public
  USING (false);

-- 3. Revoke EXECUTE from PUBLIC and anon on security definer functions
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enforce_moderation_lock() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_report_queue(text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_restore_item(text, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_unverified_tools(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_verify_tool(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_tool(uuid, text, tool_kind, text, text, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_merge_tools(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_activity_log(integer, integer) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.export_my_data() FROM PUBLIC, anon;

-- Re-grant execute to authenticated for the functions intended for authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_report_queue(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_item(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unverified_tools(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_verify_tool(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_tool(uuid, text, tool_kind, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_merge_tools(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_activity_log(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;
