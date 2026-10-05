-- 0009_engagement.sql
-- Phase 04: Engagement schema migration
-- 1. Privacy for likes: drop public "read likes" policy; keep "own likes" and "own saves"
-- 2. Visibility-aware counters in bump_engagement_count (inserts only on visible targets; deletes always decrement)
-- 3. saved_cards RPC: security invoker, returns card shape for caller's saved creations, authenticated only
-- 4. Permissions hardening on increment_prompt_copy (authenticated only, revoke from anon)

-- 1. PRIVACY: Drop public read likes policy; optimize own likes and own saves
drop policy if exists "read likes" on public.likes;

alter policy "own likes" on public.likes
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter policy "own saves" on public.saves
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 2. VISIBILITY-AWARE ENGAGEMENT COUNTER TRIGGER
create or replace function public.bump_engagement_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  tid uuid;
  ttype engagement_target;
  col text;
  tbl text;
  affected int;
begin
  col := case tg_table_name when 'likes' then 'like_count' else 'save_count' end;

  if tg_op = 'INSERT' then
    tid := new.target_id;
    ttype := new.target_type;
    tbl := case ttype
      when 'creation' then 'creations'
      when 'prompt' then 'prompts'
      else 'resources'
    end;

    -- On insert, only count against visible targets:
    -- creations: status = 'published' and deleted_at is null
    -- prompts / resources: is_public = true and deleted_at is null
    if ttype = 'creation' then
      execute format('update %I set %I = %I + 1 where id = $1 and status = ''published'' and deleted_at is null', tbl, col, col)
        using tid;
    else
      execute format('update %I set %I = %I + 1 where id = $1 and is_public = true and deleted_at is null', tbl, col, col)
        using tid;
    end if;

    get diagnostics affected = row_count;

    if affected = 0 then
      raise exception '% target % not found or not visible for engagement', ttype, tid;
    end if;

  elsif tg_op = 'DELETE' then
    tid := old.target_id;
    ttype := old.target_type;
    tbl := case ttype
      when 'creation' then 'creations'
      when 'prompt' then 'prompts'
      else 'resources'
    end;

    -- On delete, always decrement (never below zero), regardless of visibility
    execute format('update %I set %I = greatest(%I - 1, 0) where id = $1', tbl, col, col)
      using tid;
  end if;

  return null;
end $$;

-- Preserve trigger function permissions
revoke all on function public.bump_engagement_count() from public;
revoke all on function public.bump_engagement_count() from anon;
revoke all on function public.bump_engagement_count() from authenticated;

-- 3. SAVED CARDS RPC: Caller's saved published creations in saved order
create or replace function public.saved_cards(
  p_limit  int default 24,
  p_offset int default 0
) returns table (
  id                   uuid,
  slug                 text,
  title                text,
  summary              text,
  published_at         timestamptz,
  like_count           int,
  comment_count        int,
  view_count           int,
  category_slug        text,
  category_name        text,
  cover_storage_path   text,
  cover_width          int,
  cover_height         int,
  cover_alt            text,
  creator_username     citext,
  creator_display_name text,
  creator_avatar_url   text,
  tools                jsonb,
  tool_count           int
)
language sql stable security invoker set search_path = public as $$
  with valid_saved as (
    select s.target_id as creation_id, s.created_at as saved_at
    from saves s
    join creations c on c.id = s.target_id
      and c.status = 'published'
      and c.deleted_at is null
    where s.target_type = 'creation'
      and s.user_id = (select auth.uid())
    order by s.created_at desc
    limit least(greatest(coalesce(p_limit, 24), 1), 60)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select
    c.id,
    c.slug,
    c.title,
    c.summary,
    c.published_at,
    c.like_count,
    c.comment_count,
    c.view_count,
    cat.slug as category_slug,
    cat.name as category_name,
    cm.storage_path as cover_storage_path,
    cm.width as cover_width,
    cm.height as cover_height,
    coalesce(cm.alt_text, c.title) as cover_alt,
    pr.username as creator_username,
    pr.display_name as creator_display_name,
    pr.avatar_url as creator_avatar_url,
    coalesce(tool_info.tools, '[]'::jsonb) as tools,
    coalesce(tool_info.tool_count, 0)::int as tool_count
  from valid_saved vs
  join creations c on c.id = vs.creation_id
  join profiles pr on pr.id = c.creator_id
  left join categories cat on cat.id = c.category_id
  left join creation_media cm on cm.id = c.cover_media_id
  left join lateral (
    select
      coalesce(
        jsonb_agg(
          jsonb_build_object('name', tool_ranks.name, 'slug', tool_ranks.slug)
          order by
            case when tool_ranks.role = 'primary' then 0 else 1 end,
            tool_ranks.position asc,
            tool_ranks.name asc
        ) filter (where tool_ranks.tool_row_num <= 3),
        '[]'::jsonb
      ) as tools,
      count(*)::int as tool_count
    from (
      select
        ct_sub.role,
        ct_sub.position,
        t_sub.name,
        t_sub.slug,
        row_number() over (
          order by
            case when ct_sub.role = 'primary' then 0 else 1 end,
            ct_sub.position asc,
            t_sub.name asc
        ) as tool_row_num
      from creation_tools ct_sub
      join tools t_sub on t_sub.id = ct_sub.tool_id
      where ct_sub.creation_id = c.id
        and ct_sub.source <> 'ai_suggested'
    ) tool_ranks
  ) tool_info on true
  order by vs.saved_at desc;
$$;

-- Grant saved_cards to authenticated only; revoke from anon and public
revoke all on function public.saved_cards(int, int) from public;
revoke all on function public.saved_cards(int, int) from anon;
grant execute on function public.saved_cards(int, int) to authenticated;

-- 4. HARDEN increment_prompt_copy (authenticated only, revoke from anon)
revoke all on function public.increment_prompt_copy(uuid) from anon;
revoke all on function public.increment_prompt_copy(uuid) from public;
grant execute on function public.increment_prompt_copy(uuid) to authenticated;
