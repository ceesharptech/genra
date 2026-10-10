-- supabase/tests/storage.sql
-- Verifies storage.objects RLS policies for avatars and creation-media buckets

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

-- 2. Test: Anon cannot upload to creation-media
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  SET LOCAL ROLE anon;
  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('creation-media', 'anon/file.png', '11111111-1111-1111-1111-111111111111');
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Anon cannot upload to creation-media', v_caught, COALESCE(v_err, 'Did not reject anon upload'));
END;
$$;

-- 3. Test: User can upload to own prefix in creation-media
DO $$
DECLARE
  v_success boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO storage.objects (id, bucket_id, name, owner)
    VALUES ('33333333-3333-3333-3333-333333333333', 'creation-media', '11111111-1111-1111-1111-111111111111/cover.jpg', '11111111-1111-1111-1111-111111111111');
    v_success := true;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('User can upload to own prefix in creation-media', v_success, COALESCE(v_err, 'Failed to upload'));
END;
$$;

-- 4. Test: User CANNOT upload to another user prefix in creation-media
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO storage.objects (id, bucket_id, name, owner)
    VALUES ('44444444-4444-4444-4444-444444444444', 'creation-media', '22222222-2222-2222-2222-222222222222/imposter.jpg', '11111111-1111-1111-1111-111111111111');
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('User cannot upload to another user prefix in creation-media', v_caught, COALESCE(v_err, 'Did not reject foreign prefix'));
END;
$$;

-- 5. Test: User can upload to own prefix in avatars
DO $$
DECLARE
  v_success boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO storage.objects (id, bucket_id, name, owner)
    VALUES ('55555555-5555-5555-5555-555555555555', 'avatars', '11111111-1111-1111-1111-111111111111/avatar.png', '11111111-1111-1111-1111-111111111111');
    v_success := true;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('User can upload to own prefix in avatars', v_success, COALESCE(v_err, 'Failed to upload avatar'));
END;
$$;

-- 6. Test: User cannot upload to another user prefix in avatars
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    INSERT INTO storage.objects (id, bucket_id, name, owner)
    VALUES ('66666666-6666-6666-6666-666666666666', 'avatars', '22222222-2222-2222-2222-222222222222/avatar.png', '11111111-1111-1111-1111-111111111111');
  EXCEPTION WHEN OTHERS THEN
    v_caught := true;
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('User cannot upload to another prefix in avatars', v_caught, COALESCE(v_err, 'Did not reject foreign avatar'));
END;
$$;

-- 7. Test: Public can read media objects
DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  SET LOCAL ROLE anon;
  SELECT count(*) INTO v_count FROM storage.objects WHERE bucket_id IN ('creation-media', 'avatars');
  RESET ROLE;
  PERFORM _assert('Public can read storage objects', v_count >= 2, 'Could not read objects as anon');
END;
$$;

-- Return results
SELECT name, passed, error_message FROM _test_results;

ROLLBACK;
