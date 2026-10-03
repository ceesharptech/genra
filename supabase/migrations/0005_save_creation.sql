-- =====================================================================
-- Migration: 0005_save_creation.sql
-- Description: Function save_creation(payload jsonb) for atomic draft saving
--              and creation publishing with replace semantics.
-- =====================================================================

/*
  save_creation(payload jsonb) returns jsonb

  Expected payload shape:
  {
    "action": "save" | "publish",
    "creation": {
      "id": "uuid",
      "title": "string",
      "summary": "string" | null,
      "description": "string" | null,
      "category_id": number | null,
      "live_url": "string" | null,
      "repo_url": "string" | null,
      "cover_media_id": "uuid" | null,
      "attributes": {}
    },
    "tools": [
      { "tool_id": number, "role": "primary" | "supporting", "version": "string" | null, "position": number }
    ],
    "tags": ["tag-name", ...],
    "steps": [
      { "id": "uuid", "position": number, "title": "string", "body": "string" | null }
    ],
    "media": [
      {
        "id": "uuid",
        "kind": "image" | "video" | "audio" | "file" | "embed",
        "role": "gallery" | "thumbnail" | "before" | "after",
        "storage_path": "string" | null,
        "external_url": "string" | null,
        "mime_type": "string" | null,
        "width": number | null,
        "height": number | null,
        "duration_ms": number | null,
        "alt_text": "string" | null,
        "caption": "string" | null,
        "position": number,
        "step_id": "uuid" | null
      }
    ],
    "prompts": [
      { "prompt_id": "uuid", "step_id": "uuid" | null, "position": number, "note": "string" | null }
    ],
    "resources": [
      { "resource_id": "uuid", "position": number, "note": "string" | null }
    ]
  }

  Returns:
  {
    "id": "uuid",
    "slug": "string",
    "status": "draft" | "published" | "archived",
    "published_at": "timestamptz" | null,
    "updated_at": "timestamptz"
  }
*/

create or replace function public.save_creation(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_action text;
  v_creation jsonb;
  v_creation_id uuid;
  v_title text;
  v_summary text;
  v_description text;
  v_category_id bigint;
  v_live_url text;
  v_repo_url text;
  v_cover_media_id uuid;
  v_attributes jsonb;

  v_existing record;
  v_slug text;
  v_new_status creation_status;
  v_published_at timestamptz;
  v_updated_at timestamptz;

  -- Limit counters
  v_media_count int;
  v_steps_count int;
  v_tags_count int;
  v_tools_count int;
  v_prompts_count int;
  v_resources_count int;
  v_primary_tools_count int;

  -- Loop variables
  v_elem jsonb;
  v_step_id uuid;
  v_media_id uuid;
  v_tool_id bigint;
  v_tag_name text;
  v_tag_slug text;
  v_tag_id bigint;
  v_prompt_id uuid;
  v_resource_id uuid;
  v_target_step_id uuid;

  -- Array trackers for deletion
  v_step_ids uuid[] := array[]::uuid[];
  v_media_ids uuid[] := array[]::uuid[];
  v_tool_ids bigint[] := array[]::bigint[];
  v_tag_ids bigint[] := array[]::bigint[];
  v_prompt_ids uuid[] := array[]::uuid[];
  v_resource_ids uuid[] := array[]::uuid[];

  -- Slug generation variables
  v_base_slug text;
  v_candidate_slug text;
  v_slug_try int;
begin
  -- 1. Check authenticated caller
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- 2. Extract action and creation fields
  v_action := lower(coalesce(payload->>'action', 'save'));
  if v_action not in ('save', 'publish') then
    raise exception 'Invalid action: % (must be save or publish)', v_action using errcode = '22023';
  end if;

  v_creation := payload->'creation';
  if v_creation is null then
    raise exception 'Creation object is required in payload' using errcode = '22023';
  end if;

  v_creation_id := (v_creation->>'id')::uuid;
  if v_creation_id is null then
    raise exception 'Creation ID is required' using errcode = '22023';
  end if;

  v_title := trim(coalesce(v_creation->>'title', ''));
  v_summary := nullif(trim(coalesce(v_creation->>'summary', '')), '');
  v_description := nullif(coalesce(v_creation->>'description', ''), '');
  v_category_id := (v_creation->>'category_id')::bigint;
  v_live_url := nullif(trim(coalesce(v_creation->>'live_url', '')), '');
  v_repo_url := nullif(trim(coalesce(v_creation->>'repo_url', '')), '');
  v_cover_media_id := (v_creation->>'cover_media_id')::uuid;
  v_attributes := coalesce(v_creation->'attributes', '{}'::jsonb);

  -- 3. Check payload collection limits
  v_media_count := coalesce(jsonb_array_length(payload->'media'), 0);
  v_steps_count := coalesce(jsonb_array_length(payload->'steps'), 0);
  v_tools_count := coalesce(jsonb_array_length(payload->'tools'), 0);
  v_tags_count := coalesce(jsonb_array_length(payload->'tags'), 0);
  v_prompts_count := coalesce(jsonb_array_length(payload->'prompts'), 0);
  v_resources_count := coalesce(jsonb_array_length(payload->'resources'), 0);

  if v_media_count > 12 then
    raise exception 'A creation can have at most 12 media items' using errcode = '22023';
  end if;
  if v_steps_count > 20 then
    raise exception 'A creation can have at most 20 process steps' using errcode = '22023';
  end if;
  if v_tools_count > 10 then
    raise exception 'A creation can have at most 10 tools' using errcode = '22023';
  end if;
  if v_tags_count > 8 then
    raise exception 'A creation can have at most 8 tags' using errcode = '22023';
  end if;
  if v_prompts_count > 10 then
    raise exception 'A creation can have at most 10 prompts' using errcode = '22023';
  end if;
  if v_resources_count > 15 then
    raise exception 'A creation can have at most 15 resources' using errcode = '22023';
  end if;

  -- 4. Check existing creation or initialize draft
  select creator_id, status, slug, published_at, cover_media_id
  into v_existing
  from creations
  where id = v_creation_id;

  if found then
    if v_existing.creator_id <> v_caller_id then
      raise exception 'You do not own this creation' using errcode = '42501';
    end if;
    v_slug := v_existing.slug;
    v_new_status := v_existing.status;
    v_published_at := v_existing.published_at;
  else
    -- Generating a new draft
    v_slug := 'draft-' || lower(substr(md5(random()::text || clock_timestamp()::text), 1, 10));
    v_new_status := 'draft';
    v_published_at := null;

    -- Default title for draft when empty
    if v_title = '' then
      v_title := 'Untitled creation';
    end if;

    insert into creations (
      id,
      creator_id,
      slug,
      title,
      summary,
      description,
      category_id,
      status,
      live_url,
      repo_url,
      cover_media_id,
      attributes
    ) values (
      v_creation_id,
      v_caller_id,
      v_slug,
      v_title,
      v_summary,
      v_description,
      v_category_id,
      'draft',
      v_live_url,
      v_repo_url,
      null, -- cover_media_id assigned after media rows exist
      v_attributes
    );
  end if;

  -- For existing draft updates with empty title
  if v_title = '' then
    v_title := 'Untitled creation';
  end if;

  -- 5. Process Steps (Steps must exist before media due to step_id reference)
  if payload->'steps' is not null and jsonb_typeof(payload->'steps') = 'array' then
    for v_elem in select * from jsonb_array_elements(payload->'steps')
    loop
      v_step_id := (v_elem->>'id')::uuid;
      if v_step_id is null then
        v_step_id := gen_random_uuid();
      end if;

      v_step_ids := array_append(v_step_ids, v_step_id);

      insert into process_steps (id, creation_id, position, title, body)
      values (
        v_step_id,
        v_creation_id,
        (v_elem->>'position')::int,
        coalesce(v_elem->>'title', 'Untitled step'),
        nullif(v_elem->>'body', '')
      )
      on conflict (id) do update set
        position = excluded.position,
        title = excluded.title,
        body = excluded.body;
    end loop;
  end if;

  -- Delete steps not in payload
  delete from process_steps
  where creation_id = v_creation_id
    and id <> all(v_step_ids);

  -- 6. Process Media
  -- First detach cover_media_id if it is not in the incoming payload media
  if payload->'media' is not null and jsonb_typeof(payload->'media') = 'array' then
    for v_elem in select * from jsonb_array_elements(payload->'media')
    loop
      v_media_id := (v_elem->>'id')::uuid;
      if v_media_id is not null then
        v_media_ids := array_append(v_media_ids, v_media_id);
      end if;
    end loop;
  end if;

  if v_existing.cover_media_id is not null and not (v_existing.cover_media_id = any(v_media_ids)) then
    update creations set cover_media_id = null where id = v_creation_id;
  end if;

  -- Delete media not in payload
  delete from creation_media
  where creation_id = v_creation_id
    and id <> all(v_media_ids);

  -- Upsert media items
  if payload->'media' is not null and jsonb_typeof(payload->'media') = 'array' then
    for v_elem in select * from jsonb_array_elements(payload->'media')
    loop
      v_media_id := (v_elem->>'id')::uuid;
      if v_media_id is null then
        v_media_id := gen_random_uuid();
      end if;

      v_target_step_id := (v_elem->>'step_id')::uuid;
      if v_target_step_id is not null and not (v_target_step_id = any(v_step_ids)) then
        v_target_step_id := null;
      end if;

      insert into creation_media (
        id,
        creation_id,
        step_id,
        kind,
        role,
        storage_path,
        external_url,
        mime_type,
        width,
        height,
        duration_ms,
        alt_text,
        caption,
        position
      ) values (
        v_media_id,
        v_creation_id,
        v_target_step_id,
        coalesce((v_elem->>'kind')::media_kind, 'image'::media_kind),
        coalesce((v_elem->>'role')::media_role, 'gallery'::media_role),
        nullif(v_elem->>'storage_path', ''),
        nullif(v_elem->>'external_url', ''),
        nullif(v_elem->>'mime_type', ''),
        (v_elem->>'width')::int,
        (v_elem->>'height')::int,
        (v_elem->>'duration_ms')::int,
        nullif(v_elem->>'alt_text', ''),
        nullif(v_elem->>'caption', ''),
        coalesce((v_elem->>'position')::int, 0)
      )
      on conflict (id) do update set
        step_id = excluded.step_id,
        kind = excluded.kind,
        role = excluded.role,
        storage_path = excluded.storage_path,
        external_url = excluded.external_url,
        mime_type = excluded.mime_type,
        width = excluded.width,
        height = excluded.height,
        duration_ms = excluded.duration_ms,
        alt_text = excluded.alt_text,
        caption = excluded.caption,
        position = excluded.position;
    end loop;
  end if;

  -- 7. Update cover_media_id on the creation
  if v_cover_media_id is not null then
    if not exists (
      select 1 from creation_media
      where id = v_cover_media_id and creation_id = v_creation_id
    ) then
      v_cover_media_id := null;
    end if;
  end if;

  -- 8. Process Tools
  v_primary_tools_count := 0;
  if payload->'tools' is not null and jsonb_typeof(payload->'tools') = 'array' then
    for v_elem in select * from jsonb_array_elements(payload->'tools')
    loop
      v_tool_id := (v_elem->>'tool_id')::bigint;
      if v_tool_id is null then
        raise exception 'Invalid tool_id in tools array' using errcode = '22023';
      end if;

      -- Verify tool exists in tools table
      if not exists (select 1 from tools where id = v_tool_id) then
        raise exception 'Tool with id % does not exist', v_tool_id using errcode = '23503';
      end if;

      v_tool_ids := array_append(v_tool_ids, v_tool_id);

      if coalesce(v_elem->>'role', 'supporting') = 'primary' then
        v_primary_tools_count := v_primary_tools_count + 1;
      end if;

      insert into creation_tools (
        creation_id,
        tool_id,
        role,
        version,
        position,
        source
      ) values (
        v_creation_id,
        v_tool_id,
        coalesce(v_elem->>'role', 'supporting'),
        nullif(v_elem->>'version', ''),
        coalesce((v_elem->>'position')::int, 0),
        'user'
      )
      on conflict (creation_id, tool_id) do update set
        role = excluded.role,
        version = excluded.version,
        position = excluded.position;
    end loop;
  end if;

  if v_primary_tools_count > 1 then
    raise exception 'At most one tool can be marked as primary' using errcode = '22023';
  end if;

  -- Delete tools not in payload
  delete from creation_tools
  where creation_id = v_creation_id
    and tool_id <> all(v_tool_ids);

  -- 9. Process Tags
  if payload->'tags' is not null and jsonb_typeof(payload->'tags') = 'array' then
    for v_elem in select * from jsonb_array_elements(payload->'tags')
    loop
      v_tag_name := trim(trim(both '"' from v_elem::text));
      if length(v_tag_name) >= 2 then
        v_tag_slug := lower(regexp_replace(regexp_replace(v_tag_name, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'));
        if v_tag_slug <> '' then
          insert into tags (slug, name)
          values (v_tag_slug, v_tag_name)
          on conflict (slug) do update set name = excluded.name
          returning id into v_tag_id;

          v_tag_ids := array_append(v_tag_ids, v_tag_id);

          insert into creation_tags (creation_id, tag_id, source)
          values (v_creation_id, v_tag_id, 'user')
          on conflict (creation_id, tag_id) do nothing;
        end if;
      end if;
    end loop;
  end if;

  -- Delete tags not in payload
  delete from creation_tags
  where creation_id = v_creation_id
    and tag_id <> all(v_tag_ids);

  -- 10. Process Prompts
  if payload->'prompts' is not null and jsonb_typeof(payload->'prompts') = 'array' then
    for v_elem in select * from jsonb_array_elements(payload->'prompts')
    loop
      v_prompt_id := (v_elem->>'prompt_id')::uuid;
      if v_prompt_id is null then
        raise exception 'Invalid prompt_id in prompts array' using errcode = '22023';
      end if;

      -- Stop linking someone else's private prompt (enforce readability)
      if not exists (
        select 1 from prompts
        where id = v_prompt_id
          and ((is_public and deleted_at is null) or author_id = v_caller_id)
      ) then
        raise exception 'Prompt % is not found or not accessible', v_prompt_id using errcode = '42501';
      end if;

      v_prompt_ids := array_append(v_prompt_ids, v_prompt_id);

      v_target_step_id := (v_elem->>'step_id')::uuid;
      if v_target_step_id is not null and not (v_target_step_id = any(v_step_ids)) then
        v_target_step_id := null;
      end if;

      insert into creation_prompts (
        creation_id,
        prompt_id,
        step_id,
        position,
        note
      ) values (
        v_creation_id,
        v_prompt_id,
        v_target_step_id,
        coalesce((v_elem->>'position')::int, 0),
        nullif(v_elem->>'note', '')
      )
      on conflict (creation_id, prompt_id) do update set
        step_id = excluded.step_id,
        position = excluded.position,
        note = excluded.note;
    end loop;
  end if;

  -- Delete prompts not in payload
  delete from creation_prompts
  where creation_id = v_creation_id
    and prompt_id <> all(v_prompt_ids);

  -- 11. Process Resources
  if payload->'resources' is not null and jsonb_typeof(payload->'resources') = 'array' then
    for v_elem in select * from jsonb_array_elements(payload->'resources')
    loop
      v_resource_id := (v_elem->>'resource_id')::uuid;
      if v_resource_id is null then
        raise exception 'Invalid resource_id in resources array' using errcode = '22023';
      end if;

      -- Stop linking unreadable resources
      if not exists (
        select 1 from resources
        where id = v_resource_id
          and ((is_public and deleted_at is null) or author_id = v_caller_id)
      ) then
        raise exception 'Resource % is not found or not accessible', v_resource_id using errcode = '42501';
      end if;

      v_resource_ids := array_append(v_resource_ids, v_resource_id);

      insert into creation_resources (
        creation_id,
        resource_id,
        position,
        note
      ) values (
        v_creation_id,
        v_resource_id,
        coalesce((v_elem->>'position')::int, 0),
        nullif(v_elem->>'note', '')
      )
      on conflict (creation_id, resource_id) do update set
        position = excluded.position,
        note = excluded.note;
    end loop;
  end if;

  -- Delete resources not in payload
  delete from creation_resources
  where creation_id = v_creation_id
    and resource_id <> all(v_resource_ids);

  -- 12. Handle "publish" action validation and slug assignment
  if v_action = 'publish' then
    -- Title validation
    if length(v_title) < 3 or v_title = 'Untitled creation' then
      raise exception 'A title of at least 3 characters is required to publish' using errcode = 'P0002';
    end if;

    -- Category validation
    if v_category_id is null or not exists (select 1 from categories where id = v_category_id) then
      raise exception 'A valid category is required to publish' using errcode = 'P0003';
    end if;

    -- Cover image validation: must point to an image media row with storage_path
    if v_cover_media_id is null or not exists (
      select 1 from creation_media
      where id = v_cover_media_id
        and creation_id = v_creation_id
        and kind = 'image'
        and storage_path is not null
    ) then
      raise exception 'A valid cover image is required to publish' using errcode = 'P0004';
    end if;

    -- Tools validation: at least one tool
    if not exists (select 1 from creation_tools where creation_id = v_creation_id) then
      raise exception 'At least one tool is required to publish' using errcode = 'P0005';
    end if;

    v_new_status := 'published';
    v_published_at := coalesce(v_published_at, now());

    -- Assign final slug if currently a draft slug
    if v_slug like 'draft-%' then
      v_base_slug := lower(regexp_replace(regexp_replace(v_title, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'));
      v_base_slug := left(v_base_slug, 60);
      if v_base_slug = '' then
        v_base_slug := 'creation';
      end if;

      v_slug_try := 0;
      loop
        v_candidate_slug := v_base_slug || '-' || lower(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
        if not exists (select 1 from creations where slug = v_candidate_slug and id <> v_creation_id) then
          v_slug := v_candidate_slug;
          exit;
        end if;
        v_slug_try := v_slug_try + 1;
        if v_slug_try > 10 then
          v_slug := v_base_slug || '-' || lower(substr(md5(random()::text), 1, 12));
          exit;
        end if;
      end loop;
    end if;
  end if;

  -- 13. Update core creation fields
  update creations
  set
    title = v_title,
    summary = v_summary,
    description = v_description,
    category_id = v_category_id,
    live_url = v_live_url,
    repo_url = v_repo_url,
    cover_media_id = v_cover_media_id,
    attributes = v_attributes,
    status = v_new_status,
    published_at = v_published_at,
    slug = v_slug
  where id = v_creation_id
  returning updated_at into v_updated_at;

  -- 14. Return summary object
  return jsonb_build_object(
    'id', v_creation_id,
    'slug', v_slug,
    'status', v_new_status::text,
    'published_at', v_published_at,
    'updated_at', v_updated_at
  );
end;
$$;

-- Function security: invoker, revoked from public/anon, granted to authenticated
revoke all on function public.save_creation(jsonb) from public, anon;
grant execute on function public.save_creation(jsonb) to authenticated;
