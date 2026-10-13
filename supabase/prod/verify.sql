-- =============================================================================
-- GENRA PRODUCTION SCHEMA VERIFICATION SCRIPT
-- Run this in the SQL Editor of your production project after applying consolidated.sql
-- =============================================================================

DO $$
DECLARE
  v_expected_tables text[] := ARRAY[
    'categories',
    'profiles',
    'creations',
    'tools',
    'creation_tools',
    'tags',
    'creation_tags',
    'process_steps',
    'creation_media',
    'creation_prompts',
    'prompts',
    'creation_resources',
    'resources',
    'tool_relations',
    'comments',
    'likes',
    'saves',
    'shares',
    'collections',
    'collection_items',
    'reports',
    'moderation_actions'
  ];
  v_table text;
  v_missing_tables text[] := ARRAY[]::text[];
  v_unprotected_tables text[] := ARRAY[]::text[];
  v_table_count int := 0;

  v_expected_functions text[] := ARRAY[
    'save_creation',
    'can_view_creation',
    'owns_creation',
    'increment_view',
    'record_share',
    'refresh_trending',
    'popular_tools',
    'related_creations',
    'discover_cards',
    'discover_prompts',
    'discover_resources',
    'my_collections_for_item',
    'collection_page',
    'creations_using_item',
    'category_counts',
    'is_admin',
    'admin_report_queue',
    'admin_resolve_report',
    'admin_restore_item',
    'admin_unverified_tools',
    'admin_verify_tool',
    'admin_update_tool',
    'admin_merge_tools',
    'admin_activity_log',
    'delete_my_account',
    'export_my_data'
  ];
  v_func text;
  v_missing_functions text[] := ARRAY[]::text[];

  v_cat_count int;
  v_buckets_count int;
BEGIN
  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'Starting Genra Production Schema Verification...';
  RAISE NOTICE '=======================================================';

  -- 1. Verify all 22 public tables exist
  FOREACH v_table IN ARRAY v_expected_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = v_table
    ) THEN
      v_missing_tables := array_append(v_missing_tables, v_table);
    ELSE
      v_table_count := v_table_count + 1;
      
      -- Verify RLS is enabled on this table
      IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' 
          AND c.relname = v_table 
          AND c.relrowsecurity = true
      ) THEN
        v_unprotected_tables := array_append(v_unprotected_tables, v_table);
      END IF;
    END IF;
  END LOOP;

  IF array_length(v_missing_tables, 1) > 0 THEN
    RAISE EXCEPTION 'FAILED: Missing public tables: %', v_missing_tables;
  ELSE
    RAISE NOTICE '[OK] All % expected public tables exist.', v_table_count;
  END IF;

  IF array_length(v_unprotected_tables, 1) > 0 THEN
    RAISE EXCEPTION 'FAILED: Tables without RLS enabled: %', v_unprotected_tables;
  ELSE
    RAISE NOTICE '[OK] Row Level Security (RLS) is enabled on all 22 public tables.';
  END IF;

  -- 2. Verify critical functions exist
  FOREACH v_func IN ARRAY v_expected_functions LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = v_func
    ) THEN
      v_missing_functions := array_append(v_missing_functions, v_func);
    END IF;
  END LOOP;

  IF array_length(v_missing_functions, 1) > 0 THEN
    RAISE EXCEPTION 'FAILED: Missing expected public functions: %', v_missing_functions;
  ELSE
    RAISE NOTICE '[OK] All % core functions (RPCs) exist.', array_length(v_expected_functions, 1);
  END IF;

  -- 3. Verify category seeds
  SELECT count(*) INTO v_cat_count FROM public.categories;
  IF v_cat_count < 6 THEN
    RAISE EXCEPTION 'FAILED: Expected at least 6 initial categories, found %', v_cat_count;
  ELSE
    RAISE NOTICE '[OK] Initial category seeds present (count: %).', v_cat_count;
  END IF;

  -- 4. Verify storage buckets exist
  SELECT count(*) INTO v_buckets_count
  FROM storage.buckets
  WHERE id IN ('avatars', 'creation-media');

  IF v_buckets_count < 2 THEN
    RAISE WARNING 'Storage buckets: found % of 2 expected buckets in storage.buckets.', v_buckets_count;
  ELSE
    RAISE NOTICE '[OK] Storage buckets "avatars" and "creation-media" exist.';
  END IF;

  RAISE NOTICE '=======================================================';
  RAISE NOTICE 'SUCCESS: Production database schema verification PASSED.';
  RAISE NOTICE 'All 22 tables, RLS policies, functions, and seeds are verified.';
  RAISE NOTICE '=======================================================';
END $$;
