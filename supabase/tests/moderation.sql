-- supabase/tests/moderation.sql
-- Verifies reports RLS, moderation_locked triggers, and admin RPCs

BEGIN;

CREATE TEMP TABLE _test_results (
  name text,
  passed boolean,
  error_message text
);
GRANT ALL ON _test_results TO public, anon, authenticated;

CREATE OR REPLACE FUNCTION _assert(p_name text, p_condition boolean, p_err text DEFAULT '') RETURNS void AS $$
BEGIN
  INSERT INTO _test_results (name, passed, error_message)
  VALUES (p_name, p_condition, CASE WHEN p_condition THEN 'OK' ELSE p_err END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION _assert(text, boolean, text) TO public, anon, authenticated;

-- 1. Setup test users and data
INSERT INTO auth.users (id, email, role, aud)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'user1@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'user2@example.com', 'authenticated', 'authenticated'),
  ('99999999-9999-9999-9999-999999999999', 'admin@example.com', 'authenticated', 'authenticated');

UPDATE profiles SET username = 'testuser1', display_name = 'User One' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE profiles SET username = 'testuser2', display_name = 'User Two' WHERE id = '22222222-2222-2222-2222-222222222222';
UPDATE profiles SET username = 'adminuser', display_name = 'Admin User', is_admin = true WHERE id = '99999999-9999-9999-9999-999999999999';

INSERT INTO creations (id, creator_id, slug, title, category_id, status, published_at)
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'target-creation', 'Target Creation', 1, 'published', now());

-- 2. Test: Anon cannot file a report
DO $$
DECLARE
  v_err text := '';
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  SET LOCAL ROLE anon;
  BEGIN
    INSERT INTO reports (reporter_id, target_type, target_id, reason, details)
    VALUES ('11111111-1111-1111-1111-111111111111', 'creation', '33333333-3333-3333-3333-333333333333', 'spam', 'Spam report');
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Anon cannot file a report', v_err <> '', 'Anon could insert into reports');
END;
$$;

-- 3. Test: Authenticated user can file a report for self as reporter
DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  INSERT INTO reports (reporter_id, target_type, target_id, reason, details)
  VALUES ('22222222-2222-2222-2222-222222222222', 'creation', '33333333-3333-3333-3333-333333333333', 'spam', 'Legit spam report');
  SELECT count(*) INTO v_count FROM reports WHERE reporter_id = '22222222-2222-2222-2222-222222222222';
  RESET ROLE;
  PERFORM _assert('Authenticated user can file a report', v_count = 1, 'Report was not filed');
END;
$$;

-- 4. Test: Duplicate open report is rejected by index
DO $$
DECLARE
  v_err text := '';
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO reports (reporter_id, target_type, target_id, reason, details)
    VALUES ('22222222-2222-2222-2222-222222222222', 'creation', '33333333-3333-3333-3333-333333333333', 'copyright', 'Another report');
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Duplicate open report is rejected', v_err <> '', 'Duplicate report was allowed');
END;
$$;

-- 5. Test: User cannot report with someone else as reporter_id
DO $$
DECLARE
  v_err text := '';
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO reports (reporter_id, target_type, target_id, reason, details)
    VALUES ('11111111-1111-1111-1111-111111111111', 'creation', '33333333-3333-3333-3333-333333333333', 'spam', 'Spoofed reporter');
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Spoofed reporter_id is rejected by RLS', v_err <> '', 'Spoofed report was allowed');
END;
$$;

-- 6. Test: User cannot read other users reports
DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_count FROM reports WHERE reporter_id = '22222222-2222-2222-2222-222222222222';
  RESET ROLE;
  PERFORM _assert('User cannot read other users reports', v_count = 0, 'User saw other reports');
END;
$$;

-- 7. Test: Non-admin cannot call admin RPCs
DO $$
DECLARE
  v_err text := '';
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    PERFORM * FROM admin_report_queue();
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Non-admin cannot call admin_report_queue', v_err LIKE '%Administrator privileges required%', 'Non-admin could call admin RPC');
END;
$$;

-- 8. Test: Non-admin cannot set moderation_locked = true
DO $$
DECLARE
  v_err text := '';
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    UPDATE creations SET moderation_locked = true WHERE id = '33333333-3333-3333-3333-333333333333';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Non-admin cannot manually lock item', v_err LIKE '%permission denied%' OR v_err LIKE '%Only administrators%', 'Non-admin locked item: ' || v_err);
END;
$$;

-- 9. Test: Admin can query admin_report_queue and resolve report (hide)
DO $$
DECLARE
  v_report_id uuid;
  v_queue_count integer;
  v_locked boolean;
  v_deleted timestamptz;
BEGIN
  SELECT id INTO v_report_id FROM reports WHERE target_id = '33333333-3333-3333-3333-333333333333';
  
  PERFORM set_config('request.jwt.claims', '{"sub": "99999999-9999-9999-9999-999999999999", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  
  SELECT count(*) INTO v_queue_count FROM admin_report_queue('open');
  PERFORM _assert('Admin can view open reports in queue', v_queue_count >= 1, 'Admin saw 0 reports in queue');

  -- Resolve report: hide
  PERFORM admin_resolve_report(v_report_id, 'hide', 'Violates policy');
  RESET ROLE;
  
  SELECT moderation_locked, deleted_at INTO v_locked, v_deleted FROM creations WHERE id = '33333333-3333-3333-3333-333333333333';
  PERFORM _assert('Admin hide locks and deletes creation', v_locked = true AND v_deleted IS NOT NULL, 'Creation was not locked or deleted');
END;
$$;

-- 10. Test: Creator cannot unarchive or unhide moderation_locked creation
DO $$
DECLARE
  v_err text := '';
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    UPDATE creations SET deleted_at = NULL, status = 'published' WHERE id = '33333333-3333-3333-3333-333333333333';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Creator cannot republish moderation_locked item', v_err LIKE '%permission denied%' OR v_err LIKE '%Item is locked by moderators%', 'Creator republished locked item: ' || v_err);
END;
$$;

-- 11. Test: Admin can restore item
DO $$
DECLARE
  v_locked boolean;
  v_deleted timestamptz;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "99999999-9999-9999-9999-999999999999", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  
  PERFORM admin_restore_item('creation', '33333333-3333-3333-3333-333333333333', 'Restored after appeal');
  RESET ROLE;
  
  SELECT moderation_locked, deleted_at INTO v_locked, v_deleted FROM creations WHERE id = '33333333-3333-3333-3333-333333333333';
  PERFORM _assert('Admin can restore item', v_locked = false AND v_deleted IS NULL, 'Creation was not unlocked');
END;
$$;

-- 12. Test: Tool management (unverified, verify, update, merge)
DO $$
DECLARE
  v_from_id bigint;
  v_into_id bigint;
  v_unverified_count integer;
  v_verified boolean;
  v_new_name text;
  v_ct_tool_id bigint;
  v_log_count integer;
BEGIN
  -- Insert 2 test tools
  INSERT INTO tools (slug, name, kind, is_verified) VALUES ('test-tool-a', 'Test Tool A', 'ai_model', false) RETURNING id INTO v_from_id;
  INSERT INTO tools (slug, name, kind, is_verified) VALUES ('test-tool-b', 'Test Tool B', 'ai_model', false) RETURNING id INTO v_into_id;

  INSERT INTO creation_tools (creation_id, tool_id, role)
  VALUES ('33333333-3333-3333-3333-333333333333', v_from_id, 'primary');

  PERFORM set_config('request.jwt.claims', '{"sub": "99999999-9999-9999-9999-999999999999", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_unverified_count FROM admin_unverified_tools();
  PERFORM _assert('Admin sees unverified tools', v_unverified_count >= 2, 'Unverified tools count mismatch');

  -- Verify tool
  PERFORM admin_verify_tool(v_into_id);
  SELECT is_verified INTO v_verified FROM tools WHERE id = v_into_id;
  PERFORM _assert('Admin can verify tool', v_verified = true, 'Tool was not verified');

  -- Update tool
  PERFORM admin_update_tool(v_from_id, 'Updated Tool A', 'ai_app', 'Vendor X', 'https://example.com/tool-a');
  SELECT name INTO v_new_name FROM tools WHERE id = v_from_id;
  PERFORM _assert('Admin can update tool metadata', v_new_name = 'Updated Tool A', 'Tool name was not updated');

  -- Merge tool
  PERFORM admin_merge_tools(v_from_id, v_into_id);
  
  -- Query creation_tools
  RESET ROLE;
  SELECT tool_id INTO v_ct_tool_id FROM creation_tools WHERE creation_id = '33333333-3333-3333-3333-333333333333';
  PERFORM _assert('Admin merge repoints creation_tools', v_ct_tool_id = v_into_id, 'Creation tool was not repointed');

  -- Check activity log
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_log_count FROM admin_activity_log();
  PERFORM _assert('Admin activity log records actions', v_log_count >= 3, 'Activity log count mismatch: ' || v_log_count);

  RESET ROLE;
END;
$$;

SELECT * FROM _test_results;

ROLLBACK;
