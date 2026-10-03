-- 0007_discovery_functions.sql
-- Phase 03: Discovery functions (discover_cards, related_creations, popular_tools, category_counts)
-- All functions are SECURITY INVOKER, STABLE, with search_path = public, callable by anon and authenticated.

-- 1. discover_cards: Single compact RPC feeding every card grid
create or replace function public.discover_cards(
  q                  text    default null,
  p_category         text    default null,
  p_tool_slugs       text[]  default null,
  p_sort             text    default 'trending',
  p_creator_username citext  default null,
  p_limit            int     default 24,
  p_offset           int     default 0
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
  with scored_creations as (
    select
      c.id,
      c.slug,
      c.title,
      c.summary,
      c.published_at,
      c.like_count,
      c.comment_count,
      c.view_count,
      c.category_id,
      c.cover_media_id,
      c.creator_id,
      c.trending_score,
      case
        when q is not null and trim(q) <> '' and c.search @@ websearch_to_tsquery('english', q) then 1
        when q is not null and trim(q) <> '' and c.title ilike ('%' || trim(q) || '%') then 0
        else -1
      end as match_type,
      case
        when q is not null and trim(q) <> '' and c.search @@ websearch_to_tsquery('english', q)
          then ts_rank(c.search, websearch_to_tsquery('english', q))
        else 0
      end as rank_score,
      case
        when q is not null and trim(q) <> '' and c.title ilike ('%' || trim(q) || '%')
          then similarity(c.title, trim(q))
        else 0
      end as sim_score
    from creations c
    join profiles pr on pr.id = c.creator_id
    where c.status = 'published'
      and c.deleted_at is null
      and (
        q is null
        or trim(q) = ''
        or c.search @@ websearch_to_tsquery('english', q)
        or c.title ilike ('%' || trim(q) || '%')
      )
      and (
        p_category is null
        or trim(p_category) = ''
        or c.category_id in (
          select cat.id
          from categories cat
          where cat.slug = trim(p_category)
             or cat.parent_id = (select parent.id from categories parent where parent.slug = trim(p_category))
        )
      )
      and (
        p_tool_slugs is null
        or cardinality(p_tool_slugs) = 0
        or (
          select count(distinct t.slug)
          from creation_tools ct
          join tools t on t.id = ct.tool_id
          where ct.creation_id = c.id
            and ct.source <> 'ai_suggested'
            and t.slug = any(p_tool_slugs)
        ) = cardinality(p_tool_slugs)
      )
      and (
        p_creator_username is null
        or pr.username = p_creator_username
      )
  ),
  filtered_creations as (
    select *
    from scored_creations sc
    order by
      (case when q is not null and trim(q) <> '' then sc.match_type end) desc nulls last,
      (case when q is not null and trim(q) <> '' then sc.rank_score end) desc nulls last,
      (case when q is not null and trim(q) <> '' then sc.sim_score end) desc nulls last,
      (case when p_sort = 'popular' then sc.like_count end) desc nulls last,
      (case when p_sort = 'new' then sc.published_at end) desc nulls last,
      sc.trending_score desc,
      sc.published_at desc
    limit least(greatest(coalesce(p_limit, 24), 1), 60)
    offset greatest(coalesce(p_offset, 0), 0)
  )
  select
    fc.id,
    fc.slug,
    fc.title,
    fc.summary,
    fc.published_at,
    fc.like_count,
    fc.comment_count,
    fc.view_count,
    cat.slug as category_slug,
    cat.name as category_name,
    cm.storage_path as cover_storage_path,
    cm.width as cover_width,
    cm.height as cover_height,
    coalesce(cm.alt_text, fc.title) as cover_alt,
    pr.username as creator_username,
    pr.display_name as creator_display_name,
    pr.avatar_url as creator_avatar_url,
    coalesce(tool_info.tools, '[]'::jsonb) as tools,
    coalesce(tool_info.tool_count, 0)::int as tool_count
  from filtered_creations fc
  join profiles pr on pr.id = fc.creator_id
  left join categories cat on cat.id = fc.category_id
  left join creation_media cm on cm.id = fc.cover_media_id
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
      where ct_sub.creation_id = fc.id
        and ct_sub.source <> 'ai_suggested'
    ) tool_ranks
  ) tool_info on true
  order by
    (case when q is not null and trim(q) <> '' then fc.match_type end) desc nulls last,
    (case when q is not null and trim(q) <> '' then fc.rank_score end) desc nulls last,
    (case when q is not null and trim(q) <> '' then fc.sim_score end) desc nulls last,
    (case when p_sort = 'popular' then fc.like_count end) desc nulls last,
    (case when p_sort = 'new' then fc.published_at end) desc nulls last,
    fc.trending_score desc,
    fc.published_at desc;
$$;

-- 2. related_creations: Plain SQL related creations ranked by shared tools, category, and recency
create or replace function public.related_creations(
  p_creation_id uuid,
  p_limit       int default 6
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
  with src as (
    select category_id
    from creations
    where id = p_creation_id and status = 'published' and deleted_at is null
  ),
  src_tools as (
    select tool_id
    from creation_tools
    where creation_id = p_creation_id and source <> 'ai_suggested'
  ),
  candidates as (
    select
      c.id,
      c.slug,
      c.title,
      c.summary,
      c.published_at,
      c.like_count,
      c.comment_count,
      c.view_count,
      c.category_id,
      c.cover_media_id,
      c.creator_id,
      coalesce(shared.cnt, 0) as shared_tool_count,
      case when c.category_id = (select category_id from src) then 1 else 0 end as same_category
    from creations c
    left join lateral (
      select count(distinct ct.tool_id)::int as cnt
      from creation_tools ct
      where ct.creation_id = c.id
        and ct.source <> 'ai_suggested'
        and ct.tool_id in (select tool_id from src_tools)
    ) shared on true
    where c.status = 'published'
      and c.deleted_at is null
      and c.id <> p_creation_id
    order by
      shared_tool_count desc,
      same_category desc,
      c.published_at desc
    limit least(greatest(coalesce(p_limit, 6), 1), 12)
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
  from candidates c
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
  order by
    c.shared_tool_count desc,
    c.same_category desc,
    c.published_at desc;
$$;

-- 3. popular_tools: Tools used by published creations, most used first
create or replace function public.popular_tools(
  p_limit int default 30
) returns table (
  slug           text,
  name           text,
  kind           text,
  creation_count bigint
)
language sql stable security invoker set search_path = public as $$
  select
    t.slug,
    t.name,
    t.kind::text,
    count(distinct c.id) as creation_count
  from tools t
  join creation_tools ct on ct.tool_id = t.id and ct.source <> 'ai_suggested'
  join creations c on c.id = ct.creation_id and c.status = 'published' and c.deleted_at is null
  group by t.id, t.slug, t.name, t.kind, t.is_verified
  order by creation_count desc, t.is_verified desc, t.name asc
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
$$;

-- 4. category_counts: Category counts including child rollup for parent categories
create or replace function public.category_counts()
returns table (
  slug           text,
  name           text,
  parent_slug    text,
  creation_count bigint
)
language sql stable security invoker set search_path = public as $$
  with direct_counts as (
    select
      category_id,
      count(*)::bigint as cnt
    from creations
    where status = 'published' and deleted_at is null and category_id is not null
    group by category_id
  )
  select
    c.slug,
    c.name,
    p.slug as parent_slug,
    coalesce(
      case
        when exists (select 1 from categories child where child.parent_id = c.id) then
          (
            select coalesce(sum(dc.cnt), 0)
            from categories cat_tree
            left join direct_counts dc on dc.category_id = cat_tree.id
            where cat_tree.id = c.id or cat_tree.parent_id = c.id
          )
        else
          dc.cnt
      end,
      0
    )::bigint as creation_count
  from categories c
  left join categories p on p.id = c.parent_id
  left join direct_counts dc on dc.category_id = c.id
  order by c.sort_order asc, c.name asc;
$$;

-- 5. Supporting Indexes
create index if not exists creations_creator_feed_idx
  on public.creations (creator_id, published_at desc)
  where status = 'published' and deleted_at is null;

create index if not exists creations_popular_idx
  on public.creations (like_count desc, published_at desc)
  where status = 'published' and deleted_at is null;

create index if not exists creations_cover_media_idx
  on public.creations (cover_media_id);

-- 6. Permissions
grant execute on function public.discover_cards(text, text, text[], text, citext, int, int) to anon, authenticated;
grant execute on function public.related_creations(uuid, int) to anon, authenticated;
grant execute on function public.popular_tools(int) to anon, authenticated;
grant execute on function public.category_counts() to anon, authenticated;
