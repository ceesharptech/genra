-- supabase/tests/profiles.sql
-- Verifies profiles RLS policies and integrity constraints

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

-- 1. Setup test users
INSERT INTO auth.users (id, email, role, aud)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'user1@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'user2@example.com', 'authenticated', 'authenticated');

UPDATE profiles 
SET username = 'userone', display_name = 'User One', bio = 'Original bio'
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE profiles 
SET username = 'usertwo', display_name = 'User Two', bio = 'User 2 bio'
WHERE id = '22222222-2222-2222-2222-222222222222';

-- 2. Test: Anon can read public profiles
DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO v_count FROM profiles WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
  RESET ROLE;
  PERFORM _assert('Anon can read public profiles', v_count = 2, 'Could not read profiles as anon');
END;
$$;

-- 3. Test: User can update own profile
DO $$
DECLARE
  v_updated boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    UPDATE profiles 
    SET display_name = 'Updated User One', bio = 'New bio description' 
    WHERE id = '11111111-1111-1111-1111-111111111111';
    v_updated := true;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('User can update own profile', v_updated, COALESCE(v_err, 'Failed to update own profile'));
END;
$$;

-- 4. Test: User CANNOT update another user''s profile (0 rows affected or error)
DO $$
DECLARE
  v_rows integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  UPDATE profiles 
  SET bio = 'Hacked by User One' 
  WHERE id = '22222222-2222-2222-2222-222222222222';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RESET ROLE;
  PERFORM _assert('User cannot update another profile', v_rows = 0, 'Updated row that was not owned');
END;
$$;

-- 5. Test: Invalid website URL rejected by constraint
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  BEGIN
    UPDATE profiles 
    SET website_url = 'javascript:alert(1)' 
    WHERE id = '11111111-1111-1111-1111-111111111111';
  EXCEPTION WHEN check_violation THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  PERFORM _assert('Invalid website_url rejected by constraint', v_caught, COALESCE(v_err, 'Did not raise check_violation'));
END;
$$;

-- 6. Test: Invalid social links structure rejected by constraint
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  BEGIN
    UPDATE profiles 
    SET social_links = '{"twitter": "javascript:void(0)"}'::jsonb 
    WHERE id = '11111111-1111-1111-1111-111111111111';
  EXCEPTION WHEN check_violation THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  PERFORM _assert('Invalid social_links rejected by constraint', v_caught, COALESCE(v_err, 'Did not raise check_violation'));
END;
$$;

-- Return results
SELECT name, passed, error_message FROM _test_results;

ROLLBACK;
