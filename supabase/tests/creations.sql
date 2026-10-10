-- supabase/tests/creations.sql
-- Verifies creations RLS, constraints, immutability, and media triggers

BEGIN;

CREATE TEMP TABLE _test_results (
  name text,
  passed boolean,
  error_message text
);

CREATE OR REPLACE FUNCTION _assert(p_name text, p_condition boolean, p_err text DEFAULT '') RETURNS void AS $$
BEGIN
  INSERT INTO _test_results (name, passed, error_message)
  VALUES (p_name, p_condition, CASE WHEN p_condition THEN 'OK' ELSE p_err END);
END;
$$ LANGUAGE plpgsql;

-- 1. Setup test users and data
INSERT INTO auth.users (id, email, role, aud)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'creator@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'stranger@example.com', 'authenticated', 'authenticated');

UPDATE profiles SET username = 'creator1', display_name = 'Creator One' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE profiles SET username = 'stranger1', display_name = 'Stranger One' WHERE id = '22222222-2222-2222-2222-222222222222';

INSERT INTO creations (id, creator_id, slug, title, category_id, status, published_at)
VALUES 
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'pub-one', 'Published One', 1, 'published', now()),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'draft-one', 'Draft One', 1, 'draft', null);

-- 2. Test: Anon can read published but not draft
DO $$
DECLARE
  v_pub_count integer;
  v_draft_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO v_pub_count FROM creations WHERE id = '33333333-3333-3333-3333-333333333333';
  SELECT count(*) INTO v_draft_count FROM creations WHERE id = '44444444-4444-4444-4444-444444444444';
  RESET ROLE;
  PERFORM _assert('Anon can read published creation', v_pub_count = 1, 'Anon could not read published creation');
  PERFORM _assert('Anon cannot read draft creation', v_draft_count = 0, 'Anon could read draft creation');
END;
$$;

-- 3. Test: Creator can read their own draft creation
DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_count FROM creations WHERE id = '44444444-4444-4444-4444-444444444444';
  RESET ROLE;
  PERFORM _assert('Creator can read own draft', v_count = 1, 'Creator could not read draft');
END;
$$;

-- 4. Test: Stranger cannot read creator''s draft
DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_count FROM creations WHERE id = '44444444-4444-4444-4444-444444444444';
  RESET ROLE;
  PERFORM _assert('Stranger cannot read creator draft', v_count = 0, 'Stranger could read draft');
END;
$$;

-- 5. Test: Stranger cannot update creator''s creation
DO $$
DECLARE
  v_rows integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  UPDATE creations SET title = 'Defaced' WHERE id = '33333333-3333-3333-3333-333333333333';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RESET ROLE;
  PERFORM _assert('Stranger cannot update creation', v_rows = 0, 'Stranger updated row');
END;
$$;

-- 6. Test: Oversized title rejected by constraint
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  BEGIN
    INSERT INTO creations (creator_id, slug, title, category_id, status)
    VALUES ('11111111-1111-1111-1111-111111111111', 'draft-toolong', repeat('A', 145), 1, 'draft');
  EXCEPTION WHEN check_violation THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  PERFORM _assert('Oversized title (>140 chars) rejected by constraint', v_caught, COALESCE(v_err, 'Did not raise check_violation'));
END;
$$;

-- 7. Test: Invalid live_url rejected by constraint
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  BEGIN
    UPDATE creations SET live_url = 'ftp://mysite.com' WHERE id = '33333333-3333-3333-3333-333333333333';
  EXCEPTION WHEN check_violation THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  PERFORM _assert('Invalid live_url rejected by constraint', v_caught, COALESCE(v_err, 'Did not raise check_violation'));
END;
$$;

-- 8. Test: Media path not prefixed with creator_id rejected by trigger
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  BEGIN
    INSERT INTO creation_media (creation_id, kind, role, storage_path)
    VALUES ('33333333-3333-3333-3333-333333333333', 'image', 'gallery', 'other_user/bad_image.png');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%must start with%' THEN
      v_caught := true;
    ELSE
      v_err := SQLERRM;
    END IF;
  END;
  PERFORM _assert('Creation media path must begin with creator_id', v_caught, COALESCE(v_err, 'Did not raise prefix check error'));
END;
$$;

-- Return results
SELECT name, passed, error_message FROM _test_results;

ROLLBACK;
