-- =====================================================================
-- Migration: 0016_fix_touch_collection_updated_at.sql
-- Description: Ensures explicit updated_at modifications (such as
--              touch_collection_updated_at trigger) are preserved by
--              the set_updated_at() trigger, and uses clock_timestamp().
-- =====================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
declare
  ignored text[] := array['like_count','save_count','comment_count','view_count',
                          'copy_count','share_count','trending_score'];
begin
  if NEW.updated_at IS DISTINCT FROM OLD.updated_at then
    -- Explicit update to updated_at (e.g. from touch trigger or internal process) is preserved
    null;
  elsif (to_jsonb(new) - ignored - 'updated_at') is distinct from (to_jsonb(old) - ignored - 'updated_at') then
    new.updated_at := clock_timestamp();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.touch_collection_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.collections
  SET updated_at = clock_timestamp()
  WHERE id = COALESCE(NEW.collection_id, OLD.collection_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;
