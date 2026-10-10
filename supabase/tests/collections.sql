-- supabase/tests/collections.sql
-- Verifies collections & collection_items RLS, constraints, and touch trigger

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
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'stranger@example.com', 'authenticated', 'authenticated');

UPDATE profiles SET username = 'owner1', display_name = 'Owner One' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE profiles SET username = 'stranger1', display_name = 'Stranger One' WHERE id = '22222222-2222-2222-2222-222222222222';

INSERT INTO creations (id, creator_id, slug, title, category_id, status, published_at)
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'creation-one', 'Creation One', 1, 'published', now());

INSERT INTO collections (id, owner_id, title, is_public, created_at, updated_at)
VALUES 
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Public Collection', true, now() - interval '1 hour', now() - interval '1 hour'),
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Private Collection', false, now() - interval '1 hour', now() - interval '1 hour');

-- 2. Test: Anon can read public collection
DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO v_count FROM collections WHERE id = '44444444-4444-4444-4444-444444444444';
  RESET ROLE;
  PERFORM _assert('Anon can read public collection', v_count = 1, 'Anon could not read public collection');
END;
$$;

-- 3. Test: Anon cannot read private collection
DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO v_count FROM collections WHERE id = '55555555-5555-5555-5555-555555555555';
  RESET ROLE;
  PERFORM _assert('Anon cannot read private collection', v_count = 0, 'Anon could read private collection');
END;
$$;

-- 4. Test: Stranger cannot add item to owner''s collection
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO collection_items (collection_id, target_type, target_id, position)
    VALUES ('44444444-4444-4444-4444-444444444444', 'creation', '33333333-3333-3333-3333-333333333333', 1);
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Stranger cannot add item to collection', v_caught, COALESCE(v_err, 'Did not reject insertion'));
END;
$$;

-- 5. Test: Owner can add item and collections.updated_at is touched
DO $$
DECLARE
  v_old_updated timestamptz;
  v_new_updated timestamptz;
  v_success boolean := false;
  v_err text;
BEGIN
  SELECT updated_at INTO v_old_updated FROM collections WHERE id = '44444444-4444-4444-4444-444444444444';
  
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO collection_items (collection_id, target_type, target_id, position)
    VALUES ('44444444-4444-4444-4444-444444444444', 'creation', '33333333-3333-3333-3333-333333333333', 1);
    v_success := true;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  
  SELECT updated_at INTO v_new_updated FROM collections WHERE id = '44444444-4444-4444-4444-444444444444';
  PERFORM _assert('Owner can add item to collection', v_success, COALESCE(v_err, 'Failed to insert item'));
  PERFORM _assert('Adding item touches collections.updated_at', v_new_updated > v_old_updated, 'updated_at was not touched');
END;
$$;

-- Return results
SELECT name, passed, error_message FROM _test_results;

ROLLBACK;
