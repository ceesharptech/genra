-- 0010_share_dedupe.sql
-- Deduplicate shares by authenticated users within a 10-minute window.
-- Anonymous shares remain permitted for signed-out sharing.

create or replace function public.record_share(
  p_creation_id uuid,
  p_channel text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- 10-minute deduplication for authenticated users
  if v_uid is not null then
    if exists (
      select 1
      from public.share_events
      where creation_id = p_creation_id
        and user_id = v_uid
        and channel = p_channel
        and created_at > now() - interval '10 minutes'
    ) then
      return;
    end if;
  end if;

  -- Only record share for published, non-deleted creations
  insert into public.share_events (creation_id, user_id, channel)
  select id, v_uid, p_channel
  from public.creations
  where id = p_creation_id
    and status = 'published'
    and deleted_at is null;

  if found then
    update public.creations
    set share_count = share_count + 1
    where id = p_creation_id;
  end if;
end;
$$;

grant execute on function public.record_share(uuid, text) to anon, authenticated;
