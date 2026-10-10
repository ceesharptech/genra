-- supabase/tests/prompts_resources.sql
-- Verifies prompts and resources RLS policies and constraints

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
  ('11111111-1111-1111-1111-111111111111', 'author@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'stranger@example.com', 'authenticated', 'authenticated');

UPDATE profiles SET username = 'author1', display_name = 'Author One' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE profiles SET username = 'stranger1', display_name = 'Stranger One' WHERE id = '22222222-2222-2222-2222-222222222222';

INSERT INTO prompts (id, author_id, title, body, is_public)
VALUES 
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Public Prompt', 'A great prompt', true),
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Private Prompt', 'Secret prompt', false);

INSERT INTO resources (id, author_id, title, url, kind, is_public)
VALUES 
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Public Resource', 'https://example.com/docs', 'reference', true);

-- 2. Test: Anon can read public prompt
DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO v_count FROM prompts WHERE id = '33333333-3333-3333-3333-333333333333';
  RESET ROLE;
  PERFORM _assert('Anon can read public prompt', v_count = 1, 'Anon could not read public prompt');
END;
$$;

-- 3. Test: Anon cannot read private prompt
DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO v_count FROM prompts WHERE id = '44444444-4444-4444-4444-444444444444';
  RESET ROLE;
  PERFORM _assert('Anon cannot read private prompt', v_count = 0, 'Anon could read private prompt');
END;
$$;

-- 4. Test: Author can read own private prompt
DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_count FROM prompts WHERE id = '44444444-4444-4444-4444-444444444444';
  RESET ROLE;
  PERFORM _assert('Author can read own private prompt', v_count = 1, 'Author could not read private prompt');
END;
$$;

-- 5. Test: Stranger cannot read author''s private prompt
DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO v_count FROM prompts WHERE id = '44444444-4444-4444-4444-444444444444';
  RESET ROLE;
  PERFORM _assert('Stranger cannot read private prompt', v_count = 0, 'Stranger could read private prompt');
END;
$$;

-- 6. Test: Stranger cannot update author''s prompt
DO $$
DECLARE
  v_rows integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  UPDATE prompts SET title = 'Defaced' WHERE id = '33333333-3333-3333-3333-333333333333';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RESET ROLE;
  PERFORM _assert('Stranger cannot update prompt', v_rows = 0, 'Stranger updated prompt');
END;
$$;

-- 7. Test: Oversized prompt body (>30000 chars) rejected by constraint
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  BEGIN
    INSERT INTO prompts (author_id, title, body, is_public)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Huge Prompt', repeat('X', 30005), true);
  EXCEPTION WHEN check_violation THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  PERFORM _assert('Oversized prompt body rejected by constraint', v_caught, COALESCE(v_err, 'Did not raise check_violation'));
END;
$$;

-- 8. Test: Invalid resource URL rejected by constraint
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  BEGIN
    UPDATE resources SET url = 'javascript:alert(1)' WHERE id = '55555555-5555-5555-5555-555555555555';
  EXCEPTION WHEN check_violation THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  PERFORM _assert('Invalid resource URL rejected by constraint', v_caught, COALESCE(v_err, 'Did not raise check_violation'));
END;
$$;

-- Return results
SELECT name, passed, error_message FROM _test_results;

ROLLBACK;
