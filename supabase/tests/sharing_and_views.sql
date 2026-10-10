-- supabase/tests/sharing_and_views.sql
-- Verifies view count increment, share recording, rate limit & deduplication, and trending score refresh

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
  ('22222222-2222-2222-2222-222222222222', 'viewer@example.com', 'authenticated', 'authenticated');

UPDATE profiles SET username = 'creator1', display_name = 'Creator One' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE profiles SET username = 'viewer1', display_name = 'Viewer One' WHERE id = '22222222-2222-2222-2222-222222222222';

INSERT INTO creations (id, creator_id, slug, title, category_id, status, published_at, view_count, share_count)
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'creation-one', 'Creation One', 1, 'published', now() - interval '1 hour', 0, 0);

-- 2. Test: Anon calling increment_view increments view_count
DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role": "anon"}', true);
  SET LOCAL ROLE anon;
  PERFORM increment_view('33333333-3333-3333-3333-333333333333');
  RESET ROLE;
  SELECT view_count INTO v_count FROM creations WHERE id = '33333333-3333-3333-3333-333333333333';
  PERFORM _assert('Anon increment_view increments view_count', v_count = 1, 'view_count did not increment to 1');
END;
$$;

-- 3. Test: Creator calling increment_view on own creation does NOT increment
DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  PERFORM increment_view('33333333-3333-3333-3333-333333333333');
  RESET ROLE;
  SELECT view_count INTO v_count FROM creations WHERE id = '33333333-3333-3333-3333-333333333333';
  PERFORM _assert('Creator increment_view on own creation is ignored', v_count = 1, 'view_count incremented for creator');
END;
$$;

-- 4. Test: Viewer calling record_share increments share_count
DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  PERFORM record_share('33333333-3333-3333-3333-333333333333', 'x');
  RESET ROLE;
  SELECT share_count INTO v_count FROM creations WHERE id = '33333333-3333-3333-3333-333333333333';
  PERFORM _assert('Viewer record_share increments share_count', v_count = 1, 'share_count did not increment to 1');
END;
$$;

-- 5. Test: Repeated share within 10 minutes deduplicated
DO $$
DECLARE
  v_count integer;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  PERFORM record_share('33333333-3333-3333-3333-333333333333', 'x');
  RESET ROLE;
  SELECT share_count INTO v_count FROM creations WHERE id = '33333333-3333-3333-3333-333333333333';
  PERFORM _assert('Duplicate share within 10 min deduplicated', v_count = 1, 'share_count was not deduplicated');
END;
$$;

-- 6. Test: Direct write to share_events is rejected
DO $$
DECLARE
  v_caught boolean := false;
  v_err text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}', true);
  SET LOCAL ROLE authenticated;
  BEGIN
    EXECUTE 'INSERT INTO share_events (creation_id, channel) VALUES (''33333333-3333-3333-3333-333333333333'', ''direct_hack'')';
  EXCEPTION WHEN insufficient_privilege THEN
    v_caught := true;
  WHEN OTHERS THEN
    v_err := SQLERRM;
  END;
  RESET ROLE;
  PERFORM _assert('Direct insert into share_events rejected', v_caught, COALESCE(v_err, 'Did not raise insufficient_privilege'));
END;
$$;

-- 7. Test: refresh_trending calculates score
DO $$
DECLARE
  v_score double precision;
BEGIN
  PERFORM refresh_trending();
  SELECT trending_score INTO v_score FROM creations WHERE id = '33333333-3333-3333-3333-333333333333';
  PERFORM _assert('refresh_trending updates trending_score', v_score > 0, 'trending_score was not positive');
END;
$$;

-- Return results
SELECT name, passed, error_message FROM _test_results;

ROLLBACK;
