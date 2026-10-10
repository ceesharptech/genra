-- supabase/tests/write_surface.sql
-- Verifies column-level privilege revocation and write surface lockdown

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
  ('11111111-1111-1111-1111-111111111111', 'user1@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'admin@example.com', 'authenticated', 'authenticated');

-- Auth trigger automatically provisions profile rows; ensure fields
UPDATE profiles 
SET username = 'testuser1', display_name = 'Test User 1', is_admin = false 
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE profiles 
SET username = 'testadmin', display_name = 'Test Admin', is_admin = true 
WHERE id = '22222222-2222-2222-2222-222222222222';

INSERT INTO creations (id, creator_id, slug, title, category_id, status, published_at)
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'test-creation', 'Test Creation', 2, 'published', now());

-- 2. Test: Anon cannot INSERT into creations
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  SET LOCAL ROLE anon;
  BEGIN
    EXECUTE 'INSERT INTO creations (creator_id, slug, title, category_id) VALUES (''11111111-1111-1111-1111-111111111111'', ''anon-slug'', ''Anon Creation'', 2)';
  EXCEPTION WHEN insufficient_privilege THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Anon cannot INSERT into creations', v_caught, COALESCE(v_err, 'Did not raise insufficient_privilege'));
END;
$$;

-- 3. Test: Anon cannot UPDATE creations
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  SET LOCAL ROLE anon;
  BEGIN
    EXECUTE 'UPDATE creations SET title = ''Hacked'' WHERE id = ''33333333-3333-3333-3333-333333333333''';
  EXCEPTION WHEN insufficient_privilege THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Anon cannot UPDATE creations', v_caught, COALESCE(v_err, 'Did not raise insufficient_privilege'));
END;
$$;

-- 4. Test: Authenticated cannot UPDATE creations.view_count
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    EXECUTE 'UPDATE creations SET view_count = 9999 WHERE id = ''33333333-3333-3333-3333-333333333333''';
  EXCEPTION WHEN insufficient_privilege THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Authenticated cannot UPDATE creations.view_count', v_caught, COALESCE(v_err, 'Did not raise insufficient_privilege'));
END;
$$;

-- 5. Test: Authenticated cannot UPDATE creations.like_count
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    EXECUTE 'UPDATE creations SET like_count = 500 WHERE id = ''33333333-3333-3333-3333-333333333333''';
  EXCEPTION WHEN insufficient_privilege THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Authenticated cannot UPDATE creations.like_count', v_caught, COALESCE(v_err, 'Did not raise insufficient_privilege'));
END;
$$;

-- 6. Test: Authenticated cannot UPDATE creations.trending_score
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    EXECUTE 'UPDATE creations SET trending_score = 1000.0 WHERE id = ''33333333-3333-3333-3333-333333333333''';
  EXCEPTION WHEN insufficient_privilege THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Authenticated cannot UPDATE creations.trending_score', v_caught, COALESCE(v_err, 'Did not raise insufficient_privilege'));
END;
$$;

-- 7. Test: Authenticated cannot UPDATE creations.comment_count
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    EXECUTE 'UPDATE creations SET comment_count = 50 WHERE id = ''33333333-3333-3333-3333-333333333333''';
  EXCEPTION WHEN insufficient_privilege THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Authenticated cannot UPDATE creations.comment_count', v_caught, COALESCE(v_err, 'Did not raise insufficient_privilege'));
END;
$$;

-- 8. Test: Authenticated cannot UPDATE creations.creator_id
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    EXECUTE 'UPDATE creations SET creator_id = ''22222222-2222-2222-2222-222222222222'' WHERE id = ''33333333-3333-3333-3333-333333333333''';
  EXCEPTION WHEN insufficient_privilege THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Authenticated cannot UPDATE creations.creator_id', v_caught, COALESCE(v_err, 'Did not raise insufficient_privilege'));
END;
$$;

-- 9. Test: Authenticated cannot UPDATE profiles.is_admin
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    EXECUTE 'UPDATE profiles SET is_admin = true WHERE id = ''11111111-1111-1111-1111-111111111111''';
  EXCEPTION WHEN insufficient_privilege THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Authenticated cannot UPDATE profiles.is_admin', v_caught, COALESCE(v_err, 'Did not raise insufficient_privilege'));
END;
$$;

-- 10. Test: Authenticated cannot write to comments
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    EXECUTE 'INSERT INTO comments (creation_id, author_id, body) VALUES (''33333333-3333-3333-3333-333333333333'', ''11111111-1111-1111-1111-111111111111'', ''Spam'')';
  EXCEPTION WHEN insufficient_privilege THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Authenticated cannot write to comments', v_caught, COALESCE(v_err, 'Did not raise insufficient_privilege'));
END;
$$;

-- 11. Test: Authenticated cannot write to share_events
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    EXECUTE 'INSERT INTO share_events (creation_id, channel) VALUES (''33333333-3333-3333-3333-333333333333'', ''x'')';
  EXCEPTION WHEN insufficient_privilege THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Authenticated cannot write to share_events', v_caught, COALESCE(v_err, 'Did not raise insufficient_privilege'));
END;
$$;

-- 12. Test: Admin can edit their own profile
DO $$
DECLARE
  v_success boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    UPDATE profiles SET display_name = 'Admin Updated' WHERE id = '22222222-2222-2222-2222-222222222222';
    v_success := true;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Admin can edit their own profile', v_success, COALESCE(v_err, 'Failed to update'));
END;
$$;

-- Return results
SELECT name, passed, error_message FROM _test_results;

ROLLBACK;
