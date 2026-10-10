-- 0011_library_functions.sql
-- Phase 06: Library Discovery Functions (prompts, resources, creations_using_item, tool_page, saved_prompts, saved_resources)
-- All functions are SECURITY INVOKER, STABLE, with search_path = public, pg_catalog.

-- 1. discover_prompts: Public, non-deleted prompts
create or replace function public.discover_prompts(
  q                  text    default null,
  p_tool_slug        text    default null,
  p_sort             text    default 'popular',
  p_author_username  citext  default null,
  p_limit            int     default 24,
  p_offset           int     default 0
) returns table (
  id                   uuid,
  title                text,
  body_preview         text,
  kind                 prompt_kind,
  model_tool_name      text,
  model_tool_slug      text,
  author_username      citext,
  author_display_name  text,
  author_avatar_url    text,
  like_count           int,
  save_count           int,
  copy_count           int,
  created_at           timestamptz,
  used_in_count        bigint,
  fork_of_id           uuid
)
language sql stable security invoker set search_path = public, pg_catalog as $$
  with base_prompts as (
    select
      p.id,
      p.title,
      substr(p.body, 1, 220) as body_preview,
      p.kind,
      t.name as model_tool_name,
      t.slug as model_tool_slug,
      pr.username as author_username,
      pr.display_name as author_display_name,
      pr.avatar_url as author_avatar_url,
      p.like_count,
      p.save_count,
      p.copy_count,
      p.created_at,
      p.fork_of_id,
      coalesce(uc.cnt, 0) as used_in_count,
      case
        when q is not null and trim(q) <> '' and p.title ilike ('%' || trim(q) || '%') then 0
        when q is not null and trim(q) <> '' and p.search @@ websearch_to_tsquery('english', q) then 1
        else 2
      end as match_type,
      case
        when q is not null and trim(q) <> '' and p.search @@ websearch_to_tsquery('english', q)
          then ts_rank(p.search, websearch_to_tsquery('english', q))
        else 0
      end as rank_score
    from public.prompts p
    join public.profiles pr on pr.id = p.author_id
    left join public.tools t on t.id = p.model_tool_id
    left join lateral (
      select count(distinct cp.creation_id) as cnt
      from public.creation_prompts cp
      join public.creations c on c.id = cp.creation_id
      where cp.prompt_id = p.id
        and c.status = 'published'
        and c.deleted_at is null
    ) uc on true
    where p.is_public = true
      and p.deleted_at is null
      and (p_tool_slug is null or t.slug = p_tool_slug)
      and (p_author_username is null or pr.username = p_author_username)
      and (
        q is null or trim(q) = ''
        or p.title ilike ('%' || trim(q) || '%')
        or p.search @@ websearch_to_tsquery('english', q)
      )
  )
  select
    b.id,
    b.title,
    b.body_preview,
    b.kind,
    b.model_tool_name,
    b.model_tool_slug,
    b.author_username,
    b.author_display_name,
    b.author_avatar_url,
    b.like_count,
    b.save_count,
    b.copy_count,
    b.created_at,
    b.used_in_count,
    b.fork_of_id
  from base_prompts b
  order by
    case when q is not null and trim(q) <> '' then b.match_type end asc,
    case when q is not null and trim(q) <> '' and p_sort = 'popular' then b.rank_score end desc,
    case when p_sort = 'popular' then b.like_count end desc,
    case when p_sort = 'popular' then b.save_count end desc,
    case when p_sort = 'popular' then b.copy_count end desc,
    b.created_at desc,
    b.id desc
  limit least(coalesce(p_limit, 24), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.discover_prompts(text, text, text, citext, int, int) to anon, authenticated;

-- 2. discover_resources: Public, non-deleted resources
create or replace function public.discover_resources(
  q                  text           default null,
  p_kind             resource_kind  default null,
  p_tool_slug        text           default null,
  p_sort             text           default 'popular',
  p_author_username  citext         default null,
  p_limit            int            default 24,
  p_offset           int            default 0
) returns table (
  id                    uuid,
  kind                  resource_kind,
  title                 text,
  description_preview   text,
  url_host              text,
  tool_name             text,
  tool_slug             text,
  author_username       citext,
  author_display_name   text,
  author_avatar_url     text,
  like_count            int,
  save_count            int,
  created_at            timestamptz,
  used_in_count         bigint
)
language sql stable security invoker set search_path = public, pg_catalog as $$
  with base_resources as (
    select
      r.id,
      r.kind,
      r.title,
      substr(coalesce(r.description, r.body, ''), 1, 220) as description_preview,
      substring(r.url from '^https?://([^/:]+)') as url_host,
      t.name as tool_name,
      t.slug as tool_slug,
      pr.username as author_username,
      pr.display_name as author_display_name,
      pr.avatar_url as author_avatar_url,
      r.like_count,
      r.save_count,
      r.created_at,
      coalesce(uc.cnt, 0) as used_in_count,
      case
        when q is not null and trim(q) <> '' and r.title ilike ('%' || trim(q) || '%') then 0
        when q is not null and trim(q) <> '' and r.search @@ websearch_to_tsquery('english', q) then 1
        else 2
      end as match_type,
      case
        when q is not null and trim(q) <> '' and r.search @@ websearch_to_tsquery('english', q)
          then ts_rank(r.search, websearch_to_tsquery('english', q))
        else 0
      end as rank_score
    from public.resources r
    join public.profiles pr on pr.id = r.author_id
    left join public.tools t on t.id = r.tool_id
    left join lateral (
      select count(distinct cr.creation_id) as cnt
      from public.creation_resources cr
      join public.creations c on c.id = cr.creation_id
      where cr.resource_id = r.id
        and c.status = 'published'
        and c.deleted_at is null
    ) uc on true
    where r.is_public = true
      and r.deleted_at is null
      and (p_kind is null or r.kind = p_kind)
      and (p_tool_slug is null or t.slug = p_tool_slug)
      and (p_author_username is null or pr.username = p_author_username)
      and (
        q is null or trim(q) = ''
        or r.title ilike ('%' || trim(q) || '%')
        or r.search @@ websearch_to_tsquery('english', q)
      )
  )
  select
    b.id,
    b.kind,
    b.title,
    b.description_preview,
    b.url_host,
    b.tool_name,
    b.tool_slug,
    b.author_username,
    b.author_display_name,
    b.author_avatar_url,
    b.like_count,
    b.save_count,
    b.created_at,
    b.used_in_count
  from base_resources b
  order by
    case when q is not null and trim(q) <> '' then b.match_type end asc,
    case when q is not null and trim(q) <> '' and p_sort = 'popular' then b.rank_score end desc,
    case when p_sort = 'popular' then b.like_count end desc,
    case when p_sort = 'popular' then b.save_count end desc,
    b.created_at desc,
    b.id desc
  limit least(coalesce(p_limit, 24), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.discover_resources(text, resource_kind, text, text, citext, int, int) to anon, authenticated;

-- 3. creations_using_item: Published creations that link a prompt or resource (in discover_cards shape)
create or replace function public.creations_using_item(
  p_target_type engagement_target,
  p_target_id   uuid,
  p_limit       int default 24,
  p_offset      int default 0
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
language plpgsql stable security invoker set search_path = public, pg_catalog as $$
begin
  if p_target_type = 'creation' or p_target_type not in ('prompt', 'resource') then
    raise exception 'creations_using_item requires target_type of prompt or resource'
      using errcode = 'invalid_parameter_value';
  end if;

  return query
  with matching_creations as (
    select c.id
    from public.creations c
    where c.status = 'published'
      and c.deleted_at is null
      and (
        (p_target_type = 'prompt' and exists (
          select 1 from public.creation_prompts cp
          where cp.creation_id = c.id and cp.prompt_id = p_target_id
        ))
        or
        (p_target_type = 'resource' and exists (
          select 1 from public.creation_resources cr
          where cr.creation_id = c.id and cr.resource_id = p_target_id
        ))
      )
    order by c.published_at desc, c.id desc
    limit least(coalesce(p_limit, 24), 60)
    offset greatest(coalesce(p_offset, 0), 0)
  ),
  creation_tool_aggregates as (
    select
      ct.creation_id,
      jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'slug', t.slug,
          'role', ct.role
        ) order by ct.position, t.name
      ) as tools,
      count(*)::int as tool_count
    from public.creation_tools ct
    join public.tools t on t.id = ct.tool_id
    where ct.creation_id in (select mc.id from matching_creations mc)
      and ct.source <> 'ai_suggested'
    group by ct.creation_id
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
    cm.alt_text as cover_alt,
    p.username as creator_username,
    p.display_name as creator_display_name,
    p.avatar_url as creator_avatar_url,
    coalesce(cta.tools, '[]'::jsonb) as tools,
    coalesce(cta.tool_count, 0) as tool_count
  from matching_creations mc
  join public.creations c on c.id = mc.id
  join public.profiles p on p.id = c.creator_id
  left join public.categories cat on cat.id = c.category_id
  left join public.creation_media cm on cm.id = c.cover_media_id
  left join creation_tool_aggregates cta on cta.creation_id = c.id
  order by c.published_at desc, c.id desc;
end;
$$;

grant execute on function public.creations_using_item(engagement_target, uuid, int, int) to anon, authenticated;

-- 4. tool_page: Returns tool info, parent, children, bidirectional relations, and published counts
create or replace function public.tool_page(
  p_slug text
) returns jsonb
language plpgsql stable security invoker set search_path = public, pg_catalog as $$
declare
  v_tool record;
  v_parent jsonb;
  v_children jsonb;
  v_related jsonb;
  v_creation_count bigint;
  v_prompt_count bigint;
  v_resource_count bigint;
begin
  select * into v_tool
  from public.tools
  where slug = p_slug;

  if not found then
    return null;
  end if;

  -- Count published creations using this tool
  select count(distinct c.id) into v_creation_count
  from public.creation_tools ct
  join public.creations c on c.id = ct.creation_id
  where ct.tool_id = v_tool.id
    and c.status = 'published'
    and c.deleted_at is null
    and ct.source <> 'ai_suggested';

  -- If not verified and has 0 published creations, return null (404 rule)
  if not v_tool.is_verified and v_creation_count = 0 then
    return null;
  end if;

  -- Count public prompts targeting this tool
  select count(*) into v_prompt_count
  from public.prompts
  where model_tool_id = v_tool.id
    and is_public = true
    and deleted_at is null;

  -- Count public resources targeting this tool
  select count(*) into v_resource_count
  from public.resources
  where tool_id = v_tool.id
    and is_public = true
    and deleted_at is null;

  -- Parent tool
  if v_tool.parent_id is not null then
    select jsonb_build_object(
      'id', pt.id,
      'name', pt.name,
      'slug', pt.slug,
      'kind', pt.kind,
      'vendor', pt.vendor,
      'logo_url', pt.logo_url,
      'is_verified', pt.is_verified
    ) into v_parent
    from public.tools pt
    where pt.id = v_tool.parent_id;
  end if;

  -- Children tools
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ct.id,
        'name', ct.name,
        'slug', ct.slug,
        'kind', ct.kind,
        'vendor', ct.vendor,
        'logo_url', ct.logo_url,
        'is_verified', ct.is_verified
      ) order by ct.name
    ), '[]'::jsonb
  ) into v_children
  from public.tools ct
  where ct.parent_id = v_tool.id;

  -- Related tools in BOTH directions
  select coalesce(
    jsonb_agg(
      distinct jsonb_build_object(
        'id', rt.id,
        'name', rt.name,
        'slug', rt.slug,
        'kind', rt.kind,
        'vendor', rt.vendor,
        'logo_url', rt.logo_url,
        'is_verified', rt.is_verified,
        'relation', r.relation
      )
    ), '[]'::jsonb
  ) into v_related
  from (
    select related_tool_id as target_tool_id, relation
    from public.tool_relations
    where tool_id = v_tool.id
    union
    select tool_id as target_tool_id, relation
    from public.tool_relations
    where related_tool_id = v_tool.id
  ) r
  join public.tools rt on rt.id = r.target_tool_id;

  return jsonb_build_object(
    'id', v_tool.id,
    'slug', v_tool.slug,
    'name', v_tool.name,
    'kind', v_tool.kind,
    'vendor', v_tool.vendor,
    'website_url', v_tool.website_url,
    'logo_url', v_tool.logo_url,
    'is_verified', v_tool.is_verified,
    'created_at', v_tool.created_at,
    'parent', v_parent,
    'children', v_children,
    'related_tools', v_related,
    'published_creations_count', v_creation_count,
    'public_prompts_count', v_prompt_count,
    'public_resources_count', v_resource_count
  );
end;
$$;

grant execute on function public.tool_page(text) to anon, authenticated;

-- 5. saved_prompts & saved_resources: Authenticated user's saved items in saved order
create or replace function public.saved_prompts(
  p_limit  int default 24,
  p_offset int default 0
) returns table (
  id                   uuid,
  title                text,
  body_preview         text,
  kind                 prompt_kind,
  model_tool_name      text,
  model_tool_slug      text,
  author_username      citext,
  author_display_name  text,
  author_avatar_url    text,
  like_count           int,
  save_count           int,
  copy_count           int,
  created_at           timestamptz,
  used_in_count        bigint,
  fork_of_id           uuid
)
language sql stable security invoker set search_path = public, pg_catalog as $$
  with my_saved as (
    select
      s.target_id as prompt_id,
      s.created_at as saved_at
    from public.saves s
    where s.user_id = auth.uid()
      and s.target_type = 'prompt'
    order by s.created_at desc
    limit least(coalesce(p_limit, 24), 60)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select
    p.id,
    p.title,
    substr(p.body, 1, 220) as body_preview,
    p.kind,
    t.name as model_tool_name,
    t.slug as model_tool_slug,
    pr.username as author_username,
    pr.display_name as author_display_name,
    pr.avatar_url as author_avatar_url,
    p.like_count,
    p.save_count,
    p.copy_count,
    p.created_at,
    coalesce(uc.cnt, 0) as used_in_count,
    p.fork_of_id
  from my_saved ms
  join public.prompts p on p.id = ms.prompt_id
  join public.profiles pr on pr.id = p.author_id
  left join public.tools t on t.id = p.model_tool_id
  left join lateral (
    select count(distinct cp.creation_id) as cnt
    from public.creation_prompts cp
    join public.creations c on c.id = cp.creation_id
    where cp.prompt_id = p.id
      and c.status = 'published'
      and c.deleted_at is null
  ) uc on true
  where p.is_public = true
    and p.deleted_at is null
  order by ms.saved_at desc;
$$;

revoke execute on function public.saved_prompts(int, int) from public, anon;
grant execute on function public.saved_prompts(int, int) to authenticated;

create or replace function public.saved_resources(
  p_limit  int default 24,
  p_offset int default 0
) returns table (
  id                    uuid,
  kind                  resource_kind,
  title                 text,
  description_preview   text,
  url_host              text,
  tool_name             text,
  tool_slug             text,
  author_username       citext,
  author_display_name   text,
  author_avatar_url     text,
  like_count            int,
  save_count            int,
  created_at            timestamptz,
  used_in_count         bigint
)
language sql stable security invoker set search_path = public, pg_catalog as $$
  with my_saved as (
    select
      s.target_id as resource_id,
      s.created_at as saved_at
    from public.saves s
    where s.user_id = auth.uid()
      and s.target_type = 'resource'
    order by s.created_at desc
    limit least(coalesce(p_limit, 24), 60)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select
    r.id,
    r.kind,
    r.title,
    substr(coalesce(r.description, r.body, ''), 1, 220) as description_preview,
    substring(r.url from '^https?://([^/:]+)') as url_host,
    t.name as tool_name,
    t.slug as tool_slug,
    pr.username as author_username,
    pr.display_name as author_display_name,
    pr.avatar_url as author_avatar_url,
    r.like_count,
    r.save_count,
    r.created_at,
    coalesce(uc.cnt, 0) as used_in_count
  from my_saved ms
  join public.resources r on r.id = ms.resource_id
  join public.profiles pr on pr.id = r.author_id
  left join public.tools t on t.id = r.tool_id
  left join lateral (
    select count(distinct cr.creation_id) as cnt
    from public.creation_resources cr
    join public.creations c on c.id = cr.creation_id
    where cr.resource_id = r.id
      and c.status = 'published'
      and c.deleted_at is null
  ) uc on true
  where r.is_public = true
    and r.deleted_at is null
  order by ms.saved_at desc;
$$;

revoke execute on function public.saved_resources(int, int) from public, anon;
grant execute on function public.saved_resources(int, int) to authenticated;

-- 6. Performance indexes supporting library queries
create index if not exists prompts_feed_idx
  on public.prompts (created_at desc)
  where is_public = true and deleted_at is null;

create index if not exists prompts_popular_idx
  on public.prompts (like_count desc, save_count desc, copy_count desc, created_at desc)
  where is_public = true and deleted_at is null;

create index if not exists prompts_model_tool_idx
  on public.prompts (model_tool_id)
  where is_public = true and deleted_at is null;

create index if not exists resources_feed_idx
  on public.resources (created_at desc)
  where is_public = true and deleted_at is null;

create index if not exists resources_popular_idx
  on public.resources (like_count desc, save_count desc, created_at desc)
  where is_public = true and deleted_at is null;

create index if not exists resources_tool_idx
  on public.resources (tool_id)
  where is_public = true and deleted_at is null;

create index if not exists creation_prompts_prompt_covering_idx
  on public.creation_prompts (prompt_id, creation_id);

create index if not exists creation_resources_res_covering_idx
  on public.creation_resources (resource_id, creation_id);

create index if not exists tool_relations_reverse_idx
  on public.tool_relations (related_tool_id, tool_id);

create index if not exists share_events_user_idx
  on public.share_events (user_id);

-- Defense-in-depth: revoke table access on share_events from anon/auth
revoke all on table public.share_events from anon, authenticated;
