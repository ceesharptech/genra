-- supabase/tests/account.sql
-- Verifies delete_my_account() and export_my_data() RPCs

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
  ('11111111-1111-1111-1111-111111111111', 'victim@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'bystander@example.com', 'authenticated', 'authenticated');

UPDATE profiles SET username = 'victimuser', display_name = 'Victim User' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE profiles SET username = 'bystanderuser', display_name = 'Bystander User' WHERE id = '22222222-2222-2222-2222-222222222222';

-- Add creation, prompt, resource, collection for victim
INSERT INTO creations (id, creator_id, slug, title, category_id, status, published_at)
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'victim-creation', 'Victim Creation', 1, 'published', now());

INSERT INTO prompts (id, author_id, title, body, is_public)
VALUES ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Victim Prompt', 'Test prompt body', true);

INSERT INTO resources (id, author_id, title, kind, url, is_public)
VALUES ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Victim Resource', 'template', 'https://example.com/res', true);

INSERT INTO collections (id, owner_id, title, is_public)
VALUES ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Victim Collection', true);

-- Bystander likes and saves victim's creation
INSERT INTO likes (user_id, target_type, target_id)
VALUES ('22222222-2222-2222-2222-222222222222', 'creation', '33333333-3333-3333-3333-333333333333');

INSERT INTO saves (user_id, target_type, target_id)
VALUES ('22222222-2222-2222-2222-222222222222', 'creation', '33333333-3333-3333-3333-333333333333');

-- Bystander collection contains victim's creation
INSERT INTO collections (id, owner_id, title, is_public)
VALUES ('77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 'Bystander Collection', true);

INSERT INTO collection_items (collection_id, target_type, target_id, position)
VALUES ('77777777-7777-7777-7777-777777777777', 'creation', '33333333-3333-3333-3333-333333333333', 1);

-- Victim files a report on something
INSERT INTO reports (reporter_id, target_type, target_id, reason, details)
VALUES ('11111111-1111-1111-1111-111111111111', 'creation', '33333333-3333-3333-3333-333333333333', 'spam', 'Report by victim');

-- 2. Test: Anon cannot call export_my_data()
DO $$
DECLARE
  v_err text := '';
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM export_my_data();
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Anon cannot call export_my_data()', v_err <> '', 'Anon could call export_my_data()');
END;
$$;

-- 3. Test: Authenticated user can export their data
DO $$
DECLARE
  v_data jsonb;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  v_data := export_my_data();
  RESET ROLE;

  PERFORM _assert(
    'export_my_data returns complete user export',
    (v_data->>'user_id' = '11111111-1111-1111-1111-111111111111') AND
    (v_data->'profile'->>'username' = 'victimuser') AND
    (jsonb_array_length(v_data->'creations') = 1) AND
    (jsonb_array_length(v_data->'prompts') = 1) AND
    (jsonb_array_length(v_data->'resources') = 1) AND
    (jsonb_array_length(v_data->'collections') = 1),
    'Export structure mismatch'
  );
END;
$$;

-- 4. Test: Anon cannot call delete_my_account()
DO $$
DECLARE
  v_err text := '';
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM delete_my_account();
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Anon cannot call delete_my_account()', v_err <> '', 'Anon could call delete_my_account()');
END;
$$;

-- 5. Test: delete_my_account() cleanly cascades and cleans up polymorphic references
DO $$
DECLARE
  v_user_count integer;
  v_profile_count integer;
  v_creation_count integer;
  v_like_count integer;
  v_save_count integer;
  v_col_item_count integer;
  v_report_count integer;
  v_report_reporter_id uuid;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  PERFORM delete_my_account();
  RESET ROLE;

  SELECT count(*) INTO v_user_count FROM auth.users WHERE id = '11111111-1111-1111-1111-111111111111';
  SELECT count(*) INTO v_profile_count FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111';
  SELECT count(*) INTO v_creation_count FROM creations WHERE creator_id = '11111111-1111-1111-1111-111111111111';
  SELECT count(*) INTO v_like_count FROM likes WHERE target_id = '33333333-3333-3333-3333-333333333333';
  SELECT count(*) INTO v_save_count FROM saves WHERE target_id = '33333333-3333-3333-3333-333333333333';
  SELECT count(*) INTO v_col_item_count FROM collection_items WHERE target_id = '33333333-3333-3333-3333-333333333333';
  SELECT count(*) INTO v_report_count FROM reports WHERE details = 'Report by victim';
  SELECT reporter_id INTO v_report_reporter_id FROM reports WHERE details = 'Report by victim';

  PERFORM _assert('auth.user is deleted', v_user_count = 0, 'User was not deleted');
  PERFORM _assert('profile is cascaded', v_profile_count = 0, 'Profile was not deleted');
  PERFORM _assert('creations are cascaded', v_creation_count = 0, 'Creations were not deleted');
  PERFORM _assert('polymorphic likes are purged', v_like_count = 0, 'Orphaned likes remained');
  PERFORM _assert('polymorphic saves are purged', v_save_count = 0, 'Orphaned saves remained');
  PERFORM _assert('polymorphic collection_items are purged', v_col_item_count = 0, 'Orphaned collection items remained');
  PERFORM _assert('filed reports survive with NULL reporter_id', v_report_count = 1 AND v_report_reporter_id IS NULL, 'Report did not survive with null reporter');
END;
$$;

SELECT * FROM _test_results;

ROLLBACK;
