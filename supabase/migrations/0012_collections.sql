-- 0012_collections.sql
-- Phase 06: Collections management, membership, limits, and collection_page RPC.
-- All functions are SECURITY INVOKER, with search_path = public, pg_catalog.

-- 1. Enforce max 50 collections per user
create or replace function public.check_collection_limit()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  v_count bigint;
begin
  select count(*) into v_count
  from public.collections
  where owner_id = new.owner_id;

  if v_count >= 50 then
    raise exception 'You cannot create more than 50 collections'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create or replace trigger trg_collection_limit
  before insert on public.collections
  for each row execute function public.check_collection_limit();

-- 2. my_collections_for_item: Return caller's collections with contains_item flag
create or replace function public.my_collections_for_item(
  p_target_type engagement_target,
  p_target_id   uuid
) returns table (
  id            uuid,
  title         text,
  description   text,
  is_public     boolean,
  item_count    bigint,
  contains_item boolean,
  updated_at    timestamptz
)
language plpgsql stable security invoker set search_path = public, pg_catalog as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Authentication required'
      using errcode = 'insufficient_privilege';
  end if;

  return query
  select
    c.id,
    c.title,
    c.description,
    c.is_public,
    coalesce(count(ci.target_id), 0)::bigint as item_count,
    bool_or(ci.target_type = p_target_type and ci.target_id = p_target_id) is true as contains_item,
    c.updated_at
  from public.collections c
  left join public.collection_items ci on ci.collection_id = c.id
  where c.owner_id = v_uid
  group by c.id, c.title, c.description, c.is_public, c.updated_at
  order by c.updated_at desc;
end;
$$;

revoke execute on function public.my_collections_for_item(engagement_target, uuid) from public, anon;
grant execute on function public.my_collections_for_item(engagement_target, uuid) to authenticated;

-- 3. add_collection_item: Add visible item to collection with max 200 items limit
create or replace function public.add_collection_item(
  p_collection_id uuid,
  p_target_type   engagement_target,
  p_target_id     uuid,
  p_note          text default null
) returns void
language plpgsql security invoker set search_path = public, pg_catalog as $$
declare
  v_uid      uuid := auth.uid();
  v_owner_id uuid;
  v_count    bigint;
  v_next_pos int;
begin
  if v_uid is null then
    raise exception 'Authentication required'
      using errcode = 'insufficient_privilege';
  end if;

  -- Caller must own the collection
  select owner_id into v_owner_id
  from public.collections
  where id = p_collection_id;

  if not found or v_owner_id <> v_uid then
    raise exception 'Collection not found or access denied'
      using errcode = 'insufficient_privilege';
  end if;

  -- Validate that target is visible (published/public and not deleted)
  if p_target_type = 'creation' then
    if not exists (
      select 1 from public.creations
      where id = p_target_id
        and status = 'published'
        and deleted_at is null
    ) then
      raise exception 'Creation is not published or does not exist'
        using errcode = 'invalid_parameter_value';
    end if;
  elsif p_target_type = 'prompt' then
    if not exists (
      select 1 from public.prompts
      where id = p_target_id
        and is_public = true
        and deleted_at is null
    ) then
      raise exception 'Prompt is not public or does not exist'
        using errcode = 'invalid_parameter_value';
    end if;
  elsif p_target_type = 'resource' then
    if not exists (
      select 1 from public.resources
      where id = p_target_id
        and is_public = true
        and deleted_at is null
    ) then
      raise exception 'Resource is not public or does not exist'
        using errcode = 'invalid_parameter_value';
    end if;
  else
    raise exception 'Invalid target type'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Enforce max 200 items per collection
  select count(*) into v_count
  from public.collection_items
  where collection_id = p_collection_id;

  if v_count >= 200 then
    raise exception 'A collection cannot contain more than 200 items'
      using errcode = 'check_violation';
  end if;

  -- Compute next position
  select coalesce(max(position), 0) + 1 into v_next_pos
  from public.collection_items
  where collection_id = p_collection_id;

  -- Insert ignoring duplicates
  insert into public.collection_items (
    collection_id,
    target_type,
    target_id,
    position,
    note
  ) values (
    p_collection_id,
    p_target_type,
    p_target_id,
    v_next_pos,
    p_note
  )
  on conflict on constraint collection_items_pkey do nothing;

  -- Touch collection updated_at
  update public.collections
  set updated_at = now()
  where id = p_collection_id;
end;
$$;

revoke execute on function public.add_collection_item(uuid, engagement_target, uuid, text) from public, anon;
grant execute on function public.add_collection_item(uuid, engagement_target, uuid, text) to authenticated;

-- 4. collection_page: Compact RPC for collection detail page with mixed card payloads
create or replace function public.collection_page(
  p_collection_id uuid
) returns jsonb
language plpgsql stable security invoker set search_path = public, pg_catalog as $$
declare
  v_col    record;
  v_owner  record;
  v_items  jsonb;
begin
  select * into v_col
  from public.collections
  where id = p_collection_id;

  if not found then
    return null;
  end if;

  -- Private collections are visible only to their owner
  if not v_col.is_public and (auth.uid() is null or v_col.owner_id <> auth.uid()) then
    return null;
  end if;

  -- Owner details
  select username, display_name, avatar_url into v_owner
  from public.profiles
  where id = v_col.owner_id;

  -- Fetch visible items ordered by position asc
  with raw_items as (
    select
      ci.target_type,
      ci.target_id,
      ci.position,
      ci.note,
      ci.added_at,
      case
        when ci.target_type = 'creation' then (
          select jsonb_build_object(
            'id', c.id,
            'slug', c.slug,
            'title', c.title,
            'summary', c.summary,
            'published_at', c.published_at,
            'like_count', c.like_count,
            'comment_count', c.comment_count,
            'view_count', c.view_count,
            'category_slug', cat.slug,
            'category_name', cat.name,
            'cover_storage_path', cm.storage_path,
            'cover_width', cm.width,
            'cover_height', cm.height,
            'cover_alt', cm.alt_text,
            'creator_username', cp.username,
            'creator_display_name', cp.display_name,
            'creator_avatar_url', cp.avatar_url,
            'tools', coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'id', t.id,
                    'name', t.name,
                    'slug', t.slug,
                    'role', ct.role
                  ) order by ct.position, t.name
                )
                from public.creation_tools ct
                join public.tools t on t.id = ct.tool_id
                where ct.creation_id = c.id
                  and ct.source <> 'ai_suggested'
              ), '[]'::jsonb
            ),
            'tool_count', (
              select count(*)::int
              from public.creation_tools ct
              where ct.creation_id = c.id
                and ct.source <> 'ai_suggested'
            )
          )
          from public.creations c
          join public.profiles cp on cp.id = c.creator_id
          left join public.categories cat on cat.id = c.category_id
          left join public.creation_media cm on cm.id = c.cover_media_id
          where c.id = ci.target_id
            and c.status = 'published'
            and c.deleted_at is null
        )
        when ci.target_type = 'prompt' then (
          select jsonb_build_object(
            'id', p.id,
            'title', p.title,
            'body_preview', substr(p.body, 1, 220),
            'kind', p.kind,
            'model_tool_name', t.name,
            'model_tool_slug', t.slug,
            'author_username', pr.username,
            'author_display_name', pr.display_name,
            'author_avatar_url', pr.avatar_url,
            'like_count', p.like_count,
            'save_count', p.save_count,
            'copy_count', p.copy_count,
            'created_at', p.created_at,
            'used_in_count', (
              select count(distinct cp2.creation_id)
              from public.creation_prompts cp2
              join public.creations c2 on c2.id = cp2.creation_id
              where cp2.prompt_id = p.id
                and c2.status = 'published'
                and c2.deleted_at is null
            ),
            'fork_of_id', p.fork_of_id
          )
          from public.prompts p
          join public.profiles pr on pr.id = p.author_id
          left join public.tools t on t.id = p.model_tool_id
          where p.id = ci.target_id
            and p.is_public = true
            and p.deleted_at is null
        )
        when ci.target_type = 'resource' then (
          select jsonb_build_object(
            'id', r.id,
            'kind', r.kind,
            'title', r.title,
            'description_preview', substr(coalesce(r.description, r.body, ''), 1, 220),
            'url_host', substring(r.url from '^https?://([^/:]+)'),
            'tool_name', t.name,
            'tool_slug', t.slug,
            'author_username', pr.username,
            'author_display_name', pr.display_name,
            'author_avatar_url', pr.avatar_url,
            'like_count', r.like_count,
            'save_count', r.save_count,
            'created_at', r.created_at,
            'used_in_count', (
              select count(distinct cr2.creation_id)
              from public.creation_resources cr2
              join public.creations c2 on c2.id = cr2.creation_id
              where cr2.resource_id = r.id
                and c2.status = 'published'
                and c2.deleted_at is null
            )
          )
          from public.resources r
          join public.profiles pr on pr.id = r.author_id
          left join public.tools t on t.id = r.tool_id
          where r.id = ci.target_id
            and r.is_public = true
            and r.deleted_at is null
        )
      end as card
    from public.collection_items ci
    where ci.collection_id = v_col.id
    order by ci.position asc
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'target_type', ri.target_type,
        'target_id', ri.target_id,
        'position', ri.position,
        'note', ri.note,
        'added_at', ri.added_at,
        'card', ri.card
      )
    ), '[]'::jsonb
  ) into v_items
  from raw_items ri
  where ri.card is not null;

  return jsonb_build_object(
    'id', v_col.id,
    'title', v_col.title,
    'description', v_col.description,
    'is_public', v_col.is_public,
    'created_at', v_col.created_at,
    'updated_at', v_col.updated_at,
    'owner', jsonb_build_object(
      'id', v_col.owner_id,
      'username', v_owner.username,
      'display_name', v_owner.display_name,
      'avatar_url', v_owner.avatar_url
    ),
    'item_count', jsonb_array_length(v_items),
    'items', v_items
  );
end;
$$;

grant execute on function public.collection_page(uuid) to anon, authenticated;
