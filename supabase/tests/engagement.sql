-- supabase/tests/engagement.sql
-- Verifies engagement (likes & saves) RLS, constraints, and counter triggers

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

INSERT INTO auth.users (id, email, role, aud)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'user1@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'user2@example.com', 'authenticated', 'authenticated');

UPDATE profiles SET username = 'user1', display_name = 'User One' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE profiles SET username = 'user2', display_name = 'User Two' WHERE id = '22222222-2222-2222-2222-222222222222';

INSERT INTO creations (id, creator_id, slug, title, category_id, status, published_at)
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'creation-one', 'Creation One', 1, 'published', now());

-- Test 2: Anon cannot insert like
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  SET LOCAL ROLE anon;
  BEGIN
    EXECUTE 'INSERT INTO likes (user_id, target_type, target_id) VALUES (''11111111-1111-1111-1111-111111111111'', ''creation'', ''33333333-3333-3333-3333-333333333333'')';
  EXCEPTION WHEN insufficient_privilege THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Anon cannot insert like', v_caught, COALESCE(v_err, 'Did not raise insufficient_privilege'));
END;
$$;

-- Test 3: Like increments creations.like_count
DO $$
DECLARE
  v_count integer;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO likes (user_id, target_type, target_id) 
    VALUES ('11111111-1111-1111-1111-111111111111', 'creation', '33333333-3333-3333-3333-333333333333');
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  SELECT like_count INTO v_count FROM creations WHERE id = '33333333-3333-3333-3333-333333333333';
  PERFORM _assert('Like increments creations.like_count', v_count = 1, COALESCE(v_err, 'Count not 1'));
END;
$$;

-- Test 4: Unlike decrements creations.like_count
DO $$
DECLARE
  v_count integer;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    DELETE FROM likes 
    WHERE user_id = '11111111-1111-1111-1111-111111111111' 
      AND target_type = 'creation' 
      AND target_id = '33333333-3333-3333-3333-333333333333';
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  SELECT like_count INTO v_count FROM creations WHERE id = '33333333-3333-3333-3333-333333333333';
  PERFORM _assert('Unlike decrements creations.like_count', v_count = 0, COALESCE(v_err, 'Count not 0'));
END;
$$;

-- Test 5: Cannot like on behalf of another user
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO likes (user_id, target_type, target_id) 
    VALUES ('22222222-2222-2222-2222-222222222222', 'creation', '33333333-3333-3333-3333-333333333333');
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Cannot like on behalf of another user', v_caught, COALESCE(v_err, 'Did not reject impersonated like'));
END;
$$;

-- Test 6: Duplicate like rejected by primary key
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO likes (user_id, target_type, target_id) 
    VALUES ('11111111-1111-1111-1111-111111111111', 'creation', '33333333-3333-3333-3333-333333333333');
    INSERT INTO likes (user_id, target_type, target_id) 
    VALUES ('11111111-1111-1111-1111-111111111111', 'creation', '33333333-3333-3333-3333-333333333333');
  EXCEPTION WHEN unique_violation THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Duplicate like rejected by primary key', v_caught, COALESCE(v_err, 'Did not raise unique_violation'));
END;
$$;

SELECT name, passed, error_message FROM _test_results;

ROLLBACK;
