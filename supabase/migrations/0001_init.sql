-- =====================================================================
-- GENRA — V1 database schema (PostgreSQL 15+ / Supabase)
-- Run as a single migration. Order matters: types -> tables -> indexes
-- -> functions/triggers -> RLS -> storage -> seed.
-- =====================================================================

create extension if not exists pg_trgm;
create extension if not exists citext;
-- create extension if not exists vector;   -- enable when semantic search ships (see "AI hooks")

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------
create type creation_status   as enum ('draft', 'published', 'archived');
create type media_kind        as enum ('image', 'video', 'audio', 'file', 'embed');
create type media_role        as enum ('gallery', 'thumbnail', 'before', 'after');
create type tool_kind         as enum ('ai_model', 'ai_app', 'framework', 'library', 'platform', 'design', 'other');
create type resource_kind     as enum ('skill', 'template', 'ui_kit', 'workflow', 'agent', 'mcp_server',
                                       'reference', 'tutorial', 'dataset', 'asset', 'other');
create type prompt_kind       as enum ('text', 'system', 'image', 'video', 'audio', 'agent', 'other');
create type engagement_target as enum ('creation', 'prompt', 'resource');
create type content_source    as enum ('user', 'ai_suggested', 'ai_confirmed');
create type ai_job_kind       as enum ('metadata_extraction', 'tagging', 'embedding', 'similar_creations');
create type ai_job_status     as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');
create type report_status     as enum ('open', 'reviewing', 'actioned', 'dismissed');

-- ---------------------------------------------------------------------
-- 2. SHARED HELPERS
-- ---------------------------------------------------------------------
-- Bumps updated_at, but ignores changes that only touch denormalised counters,
-- so a "like" does not look like an edit.
create or replace function set_updated_at() returns trigger
language plpgsql as $$
declare
  ignored text[] := array['like_count','save_count','comment_count','view_count',
                          'copy_count','share_count','trending_score','updated_at'];
begin
  if (to_jsonb(new) - ignored) is distinct from (to_jsonb(old) - ignored) then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 3. USERS
-- ---------------------------------------------------------------------
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      citext not null unique
                check (username::text ~ '^[a-zA-Z0-9_]{3,30}$'),
  display_name  text,
  headline      text check (char_length(headline) <= 120),
  bio           text check (char_length(bio) <= 500),
  avatar_url    text,
  website_url   text,
  social_links  jsonb not null default '{}'::jsonb,
  is_admin      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile for every new auth user.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  base text;
begin
  base := lower(regexp_replace(split_part(coalesce(new.email, 'user'), '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
  if char_length(base) < 3 then base := base || 'user'; end if;
  insert into profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    left(base, 22) || '_' || substr(md5(random()::text), 1, 5),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end $$;

create trigger trg_on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- 4. TAXONOMY (reference data)
-- ---------------------------------------------------------------------
create table categories (
  id         bigint generated always as identity primary key,
  slug       text not null unique,
  name       text not null,
  parent_id  bigint references categories(id) on delete set null,
  sort_order int not null default 0
);

create table tools (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  name        text not null,
  kind        tool_kind not null default 'other',
  vendor      text,
  website_url text,
  logo_url    text,
  parent_id   bigint references tools(id) on delete set null,  -- e.g. "Claude Sonnet" -> "Claude"
  is_verified boolean not null default false,                  -- false = user-proposed, awaiting review
  created_by  uuid references profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index tools_name_trgm on tools using gin (name gin_trgm_ops);

-- Knowledge-graph edges between tools ("Claude Code" integrates_with "Supabase").
create table tool_relations (
  tool_id         bigint not null references tools(id) on delete cascade,
  related_tool_id bigint not null references tools(id) on delete cascade,
  relation        text   not null default 'integrates_with',
  primary key (tool_id, related_tool_id, relation),
  check (tool_id <> related_tool_id)
);

create table tags (
  id   bigint generated always as identity primary key,
  slug text not null unique,
  name text not null
);

-- ---------------------------------------------------------------------
-- 5. CREATIONS (the core object)
-- ---------------------------------------------------------------------
create table creations (
  id             uuid primary key default gen_random_uuid(),
  creator_id     uuid not null references profiles(id) on delete cascade,
  slug           text not null unique,                    -- app generates: slugified title + short suffix
  title          text not null check (char_length(title) between 3 and 140),
  summary        text check (char_length(summary) <= 280),
  description    text,                                    -- markdown
  category_id    bigint references categories(id),
  status         creation_status not null default 'draft',
  live_url       text,
  repo_url       text,
  cover_media_id uuid,                                    -- FK added after creation_media exists
  attributes     jsonb not null default '{}'::jsonb,      -- category-specific fields, avoids column sprawl
  ai_metadata    jsonb not null default '{}'::jsonb,      -- AI hook: raw extraction output (unused in V1)
  like_count     int not null default 0,
  save_count     int not null default 0,
  comment_count  int not null default 0,
  view_count     int not null default 0,
  share_count    int not null default 0,
  trending_score double precision not null default 0,
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  search         tsvector generated always as (
                   setweight(to_tsvector('english', coalesce(title, '')),       'A') ||
                   setweight(to_tsvector('english', coalesce(summary, '')),     'B') ||
                   setweight(to_tsvector('english', coalesce(description, '')), 'C')
                 ) stored,
  check (status <> 'published' or published_at is not null)
);
create index creations_search_idx    on creations using gin (search);
create index creations_title_trgm    on creations using gin (title gin_trgm_ops);
create index creations_feed_idx      on creations (published_at desc) where status = 'published' and deleted_at is null;
create index creations_trending_idx  on creations (trending_score desc) where status = 'published' and deleted_at is null;
create index creations_category_idx  on creations (category_id) where status = 'published' and deleted_at is null;
create index creations_creator_idx   on creations (creator_id, status);
create trigger trg_creations_updated before update on creations
  for each row execute function set_updated_at();

-- Ordered process steps (the "how it was made" timeline).
create table process_steps (
  id          uuid primary key default gen_random_uuid(),
  creation_id uuid not null references creations(id) on delete cascade,
  position    int  not null,
  title       text not null,
  body        text,                                       -- markdown
  created_at  timestamptz not null default now(),
  unique (creation_id, position) deferrable initially deferred   -- allows reordering inside a transaction
);

create table creation_media (
  id           uuid primary key default gen_random_uuid(),
  creation_id  uuid not null references creations(id) on delete cascade,
  step_id      uuid references process_steps(id) on delete set null,   -- attach media to a step / before-after
  kind         media_kind not null default 'image',
  role         media_role not null default 'gallery',
  storage_path text,                                      -- path inside the 'creation-media' bucket
  external_url text,                                      -- for embeds (YouTube, etc.)
  mime_type    text,
  width        int,
  height       int,
  duration_ms  int,
  alt_text     text,
  caption      text,
  position     int not null default 0,
  created_at   timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);
create index creation_media_creation_idx on creation_media (creation_id, position);

alter table creations
  add constraint creations_cover_fk foreign key (cover_media_id)
  references creation_media(id) on delete set null;

-- ---------------------------------------------------------------------
-- 6. CREATION <-> TOOLS / TAGS   (source columns are the AI hook)
-- ---------------------------------------------------------------------
create table creation_tools (
  creation_id uuid   not null references creations(id) on delete cascade,
  tool_id     bigint not null references tools(id) on delete restrict,
  role        text   not null default 'supporting' check (role in ('primary', 'supporting')),
  version     text,
  position    int    not null default 0,
  source      content_source not null default 'user',     -- 'ai_suggested' rows stay hidden until confirmed
  primary key (creation_id, tool_id)
);
create index creation_tools_tool_idx on creation_tools (tool_id);

create table creation_tags (
  creation_id uuid   not null references creations(id) on delete cascade,
  tag_id      bigint not null references tags(id) on delete cascade,
  source      content_source not null default 'user',
  primary key (creation_id, tag_id)
);
create index creation_tags_tag_idx on creation_tags (tag_id);

-- ---------------------------------------------------------------------
-- 7. PROMPTS (first-class)
-- ---------------------------------------------------------------------
create table prompts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null references profiles(id) on delete cascade,
  title         text not null check (char_length(title) between 2 and 140),
  body          text not null,
  kind          prompt_kind not null default 'text',
  model_tool_id bigint references tools(id) on delete set null,
  fork_of_id    uuid references prompts(id) on delete set null,
  is_public     boolean not null default true,
  like_count    int not null default 0,
  save_count    int not null default 0,
  copy_count    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  search        tsvector generated always as (
                  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                  setweight(to_tsvector('english', coalesce(body, '')),  'C')
                ) stored
);
create index prompts_search_idx on prompts using gin (search);
create index prompts_author_idx on prompts (author_id);
create trigger trg_prompts_updated before update on prompts
  for each row execute function set_updated_at();

-- Many-to-many: one prompt can appear in many creations, optionally pinned to a step.
create table creation_prompts (
  creation_id uuid not null references creations(id) on delete cascade,
  prompt_id   uuid not null references prompts(id) on delete cascade,
  step_id     uuid references process_steps(id) on delete set null,
  position    int  not null default 0,
  note        text,
  primary key (creation_id, prompt_id)
);
create index creation_prompts_prompt_idx on creation_prompts (prompt_id);

-- ---------------------------------------------------------------------
-- 8. RESOURCES (templates, workflows, MCP servers, references, ...)
-- ---------------------------------------------------------------------
create table resources (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references profiles(id) on delete cascade,
  kind         resource_kind not null default 'other',
  title        text not null check (char_length(title) between 2 and 140),
  description  text,
  url          text,
  body         text,                                      -- markdown, for workflows/guides hosted on Genra
  storage_path text,                                      -- optional attached file
  tool_id      bigint references tools(id) on delete set null,
  is_public    boolean not null default true,
  like_count   int not null default 0,
  save_count   int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,
  search       tsvector generated always as (
                 setweight(to_tsvector('english', coalesce(title, '')),       'A') ||
                 setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
                 setweight(to_tsvector('english', coalesce(body, '')),        'C')
               ) stored,
  check (url is not null or body is not null or storage_path is not null)
);
create index resources_search_idx on resources using gin (search);
create index resources_kind_idx   on resources (kind) where deleted_at is null;
create trigger trg_resources_updated before update on resources
  for each row execute function set_updated_at();

create table creation_resources (
  creation_id uuid not null references creations(id) on delete cascade,
  resource_id uuid not null references resources(id) on delete cascade,
  position    int  not null default 0,
  note        text,
  primary key (creation_id, resource_id)
);
create index creation_resources_resource_idx on creation_resources (resource_id);

-- ---------------------------------------------------------------------
-- 9. ENGAGEMENT
-- ---------------------------------------------------------------------
-- Polymorphic by design: one table, one code path for liking/saving anything.
-- Integrity is enforced by the counter trigger below (raises if the target is missing).
create table likes (
  user_id     uuid not null references profiles(id) on delete cascade,
  target_type engagement_target not null,
  target_id   uuid not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
create index likes_target_idx on likes (target_type, target_id);

create table saves (
  user_id     uuid not null references profiles(id) on delete cascade,
  target_type engagement_target not null,
  target_id   uuid not null,
  created_at  timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);
create index saves_target_idx on saves (target_type, target_id);

create table comments (
  id          uuid primary key default gen_random_uuid(),
  creation_id uuid not null references creations(id) on delete cascade,
  author_id   uuid not null references profiles(id) on delete cascade,
  parent_id   uuid references comments(id) on delete cascade,   -- one level of threading in the UI
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
create index comments_creation_idx on comments (creation_id, created_at);
create trigger trg_comments_updated before update on comments
  for each row execute function set_updated_at();

-- User-curated groups (optional in UI for V1, schema ready).
create table collections (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references profiles(id) on delete cascade,
  title       text not null,
  description text,
  is_public   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger trg_collections_updated before update on collections
  for each row execute function set_updated_at();

create table collection_items (
  collection_id uuid not null references collections(id) on delete cascade,
  target_type   engagement_target not null,
  target_id     uuid not null,
  position      int not null default 0,
  note          text,
  added_at      timestamptz not null default now(),
  primary key (collection_id, target_type, target_id)
);

-- Moderation.
create table reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  target_type text not null check (target_type in ('creation', 'prompt', 'resource', 'comment', 'profile')),
  target_id   uuid not null,
  reason      text not null,
  status      report_status not null default 'open',
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 9b. SHARING + PICKER SEARCH
-- ---------------------------------------------------------------------
-- Every share action (copy link, native share sheet, social buttons) is logged here.
-- Written only through record_share(); logged-out visitors can share too.
create table share_events (
  id          uuid primary key default gen_random_uuid(),
  creation_id uuid not null references creations(id) on delete cascade,
  user_id     uuid references profiles(id) on delete set null,   -- null = logged-out sharer
  channel     text not null check (channel in
                ('copy_link', 'native', 'x', 'linkedin', 'whatsapp', 'facebook', 'reddit', 'email', 'other')),
  created_at  timestamptz not null default now()
);
create index share_events_creation_idx on share_events (creation_id, created_at);
alter table share_events enable row level security;   -- no policies: RPC / service role only

create or replace function record_share(p_creation_id uuid, p_channel text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into share_events (creation_id, user_id, channel)
  select id, auth.uid(), p_channel
  from creations
  where id = p_creation_id and status = 'published' and deleted_at is null;

  if found then
    update creations set share_count = share_count + 1 where id = p_creation_id;
  end if;
end $$;

-- Typeahead for the optional "Add resource" / "Add prompt" pickers in the creation editor.
create index resources_title_trgm on resources using gin (title gin_trgm_ops);
create index prompts_title_trgm   on prompts   using gin (title gin_trgm_ops);

create or replace function search_resources(
  q      text default null,
  p_kind resource_kind default null,
  p_limit int default 20
) returns setof resources
language sql stable as $$
  select r.*
  from resources r
  where r.deleted_at is null
    and (r.is_public or r.author_id = auth.uid())
    and (p_kind is null or r.kind = p_kind)
    and (q is null or q = ''
         or r.search @@ websearch_to_tsquery('english', q)
         or r.title ilike '%' || q || '%')
  order by (r.like_count + r.save_count * 2) desc, r.created_at desc
  limit least(p_limit, 50);
$$;

create or replace function search_prompts(
  q       text default null,
  p_limit int default 20
) returns setof prompts
language sql stable as $$
  select p.*
  from prompts p
  where p.deleted_at is null
    and (p.is_public or p.author_id = auth.uid())
    and (q is null or q = ''
         or p.search @@ websearch_to_tsquery('english', q)
         or p.title ilike '%' || q || '%')
  order by (p.like_count + p.save_count * 2 + p.copy_count) desc, p.created_at desc
  limit least(p_limit, 50);
$$;

-- ---------------------------------------------------------------------
-- 10. AI HOOKS (unused in V1, present so integration is additive)
-- ---------------------------------------------------------------------
-- A job queue the future worker reads from. In V1 nothing writes to it.
create table ai_jobs (
  id           uuid primary key default gen_random_uuid(),
  kind         ai_job_kind not null,
  status       ai_job_status not null default 'queued',
  creation_id  uuid references creations(id) on delete cascade,
  requested_by uuid references profiles(id) on delete set null,
  provider     text,                                      -- 'anthropic' | 'openai' | ...
  model        text,
  input        jsonb not null default '{}'::jsonb,
  output       jsonb,
  error        text,
  attempts     int not null default 0,
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  completed_at timestamptz
);
create index ai_jobs_queue_idx on ai_jobs (status, created_at) where status in ('queued', 'running');

-- Semantic search later (uncomment together with the vector extension):
-- create table embeddings (
--   entity_type engagement_target not null,
--   entity_id   uuid not null,
--   model       text not null,
--   embedding   vector(1536) not null,
--   created_at  timestamptz not null default now(),
--   primary key (entity_type, entity_id, model)
-- );
-- create index embeddings_hnsw on embeddings using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------
-- 11. COUNTER TRIGGERS
-- ---------------------------------------------------------------------
create or replace function bump_engagement_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  delta int; tid uuid; ttype engagement_target; col text; tbl text; affected int;
begin
  if tg_op = 'INSERT' then
    delta := 1;  tid := new.target_id; ttype := new.target_type;
  else
    delta := -1; tid := old.target_id; ttype := old.target_type;
  end if;

  col := case tg_table_name when 'likes' then 'like_count' else 'save_count' end;
  tbl := case ttype when 'creation' then 'creations' when 'prompt' then 'prompts' else 'resources' end;

  execute format('update %I set %I = greatest(%I + $1, 0) where id = $2', tbl, col, col)
    using delta, tid;
  get diagnostics affected = row_count;

  if affected = 0 and tg_op = 'INSERT' then
    raise exception '% target % not found', ttype, tid;
  end if;
  return null;
end $$;

create trigger trg_likes_count after insert or delete on likes
  for each row execute function bump_engagement_count();
create trigger trg_saves_count after insert or delete on saves
  for each row execute function bump_engagement_count();

create or replace function bump_comment_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update creations set comment_count = comment_count + 1 where id = new.creation_id;
  elsif tg_op = 'DELETE' then
    update creations set comment_count = greatest(comment_count - 1, 0) where id = old.creation_id;
  end if;
  return null;
end $$;
create trigger trg_comments_count after insert or delete on comments
  for each row execute function bump_comment_count();

-- ---------------------------------------------------------------------
-- 12. RPC FUNCTIONS
-- ---------------------------------------------------------------------
create or replace function increment_view(p_creation_id uuid) returns void
language sql security definer set search_path = public as $$
  update creations set view_count = view_count + 1
  where id = p_creation_id and status = 'published' and deleted_at is null
    and creator_id is distinct from auth.uid();
$$;

create or replace function increment_prompt_copy(p_prompt_id uuid) returns void
language sql security definer set search_path = public as $$
  update prompts set copy_count = copy_count + 1
  where id = p_prompt_id and is_public and deleted_at is null;
$$;

-- Run on a schedule (pg_cron / Supabase cron) every ~15 minutes.
create or replace function refresh_trending() returns void
language sql security definer set search_path = public as $$
  update creations c set trending_score =
    (c.like_count * 3 + c.save_count * 4 + c.comment_count * 2 + c.share_count * 5 + c.view_count * 0.1)
    / power(extract(epoch from (now() - c.published_at)) / 3600.0 + 2, 1.5)
  where c.status = 'published' and c.deleted_at is null;
$$;
-- select cron.schedule('refresh-trending', '*/15 * * * *', 'select refresh_trending()');

-- Single entry point for the discover page (security invoker => RLS applies).
create or replace function search_creations(
  q            text    default null,
  p_category   text    default null,     -- category slug
  p_tool_slugs text[]  default null,     -- creation must use ALL of these tools
  p_sort       text    default 'trending', -- 'trending' | 'new' | 'popular'
  p_limit      int     default 24,
  p_offset     int     default 0
) returns setof creations
language sql stable as $$
  select c.*
  from creations c
  where c.status = 'published' and c.deleted_at is null
    and (q is null or q = '' or c.search @@ websearch_to_tsquery('english', q))
    and (p_category is null or c.category_id in (
          select id from categories
          where slug = p_category or parent_id = (select id from categories where slug = p_category)))
    and (p_tool_slugs is null or (
          select count(distinct t.slug)
          from creation_tools ct join tools t on t.id = ct.tool_id
          where ct.creation_id = c.id
            and ct.source <> 'ai_suggested'
            and t.slug = any (p_tool_slugs)) = cardinality(p_tool_slugs))
  order by
    (case when q is not null and q <> '' then ts_rank(c.search, websearch_to_tsquery('english', q)) end) desc nulls last,
    (case p_sort when 'popular' then c.like_count::double precision
                 when 'trending' then c.trending_score end) desc nulls last,
    c.published_at desc
  limit least(p_limit, 60) offset p_offset;
$$;

-- ---------------------------------------------------------------------
-- 13. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
create or replace function can_view_creation(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from creations
    where id = cid
      and ((status = 'published' and deleted_at is null) or creator_id = auth.uid())
  );
$$;

create or replace function owns_creation(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from creations where id = cid and creator_id = auth.uid());
$$;

alter table profiles           enable row level security;
alter table categories         enable row level security;
alter table tools              enable row level security;
alter table tool_relations     enable row level security;
alter table tags               enable row level security;
alter table creations          enable row level security;
alter table process_steps      enable row level security;
alter table creation_media     enable row level security;
alter table creation_tools     enable row level security;
alter table creation_tags      enable row level security;
alter table prompts            enable row level security;
alter table creation_prompts   enable row level security;
alter table resources          enable row level security;
alter table creation_resources enable row level security;
alter table likes              enable row level security;
alter table saves              enable row level security;
alter table comments           enable row level security;
alter table collections        enable row level security;
alter table collection_items   enable row level security;
alter table reports            enable row level security;
alter table ai_jobs            enable row level security;   -- no policies: service role only

-- Public reference data
create policy "read categories" on categories for select using (true);
create policy "read tools"      on tools      for select using (true);
create policy "read tool rels"  on tool_relations for select using (true);
create policy "read tags"       on tags       for select using (true);
create policy "propose tools"   on tools for insert to authenticated
  with check (created_by = auth.uid() and is_verified = false);
create policy "create tags"     on tags for insert to authenticated with check (true);

-- Profiles
create policy "read profiles"   on profiles for select using (true);
create policy "update own profile" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and is_admin = false);

-- Creations
create policy "read creations" on creations for select
  using ((status = 'published' and deleted_at is null) or creator_id = auth.uid());
create policy "insert own creations" on creations for insert to authenticated
  with check (creator_id = auth.uid());
create policy "update own creations" on creations for update to authenticated
  using (creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy "delete own creations" on creations for delete to authenticated
  using (creator_id = auth.uid());

-- Child tables of a creation: visible when the creation is, writable by its owner
create policy "read steps"     on process_steps      for select using (can_view_creation(creation_id));
create policy "write steps"    on process_steps      for all to authenticated
  using (owns_creation(creation_id)) with check (owns_creation(creation_id));
create policy "read media"     on creation_media     for select using (can_view_creation(creation_id));
create policy "write media"    on creation_media     for all to authenticated
  using (owns_creation(creation_id)) with check (owns_creation(creation_id));
create policy "read c-tools"   on creation_tools     for select using (can_view_creation(creation_id));
create policy "write c-tools"  on creation_tools     for all to authenticated
  using (owns_creation(creation_id)) with check (owns_creation(creation_id));
create policy "read c-tags"    on creation_tags      for select using (can_view_creation(creation_id));
create policy "write c-tags"   on creation_tags      for all to authenticated
  using (owns_creation(creation_id)) with check (owns_creation(creation_id));
create policy "read c-prompts" on creation_prompts  for select using (can_view_creation(creation_id));
create policy "write c-prompts" on creation_prompts for all to authenticated
  using (owns_creation(creation_id)) with check (owns_creation(creation_id));
create policy "read c-res"     on creation_resources for select using (can_view_creation(creation_id));
create policy "write c-res"    on creation_resources for all to authenticated
  using (owns_creation(creation_id)) with check (owns_creation(creation_id));

-- Prompts & resources
create policy "read prompts" on prompts for select
  using ((is_public and deleted_at is null) or author_id = auth.uid());
create policy "write prompts" on prompts for all to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "read resources" on resources for select
  using ((is_public and deleted_at is null) or author_id = auth.uid());
create policy "write resources" on resources for all to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

-- Engagement
create policy "read likes"  on likes for select using (true);
create policy "own likes"   on likes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own saves"   on saves for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Comments
create policy "read comments" on comments for select
  using (deleted_at is null and can_view_creation(creation_id));
create policy "add comments" on comments for insert to authenticated
  with check (author_id = auth.uid() and can_view_creation(creation_id));
create policy "edit own comments" on comments for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "delete own comments" on comments for delete to authenticated
  using (author_id = auth.uid());

-- Collections
create policy "read collections" on collections for select
  using (is_public or owner_id = auth.uid());
create policy "write collections" on collections for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "read collection items" on collection_items for select
  using (exists (select 1 from collections c where c.id = collection_id
                 and (c.is_public or c.owner_id = auth.uid())));
create policy "write collection items" on collection_items for all to authenticated
  using (exists (select 1 from collections c where c.id = collection_id and c.owner_id = auth.uid()))
  with check (exists (select 1 from collections c where c.id = collection_id and c.owner_id = auth.uid()));

-- Reports
create policy "file reports" on reports for insert to authenticated
  with check (reporter_id = auth.uid());

-- ---------------------------------------------------------------------
-- 14. STORAGE (Supabase)
-- Path convention: {user_id}/{creation_id}/{uuid}.{ext}
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('creation-media', 'creation-media', true)
on conflict (id) do nothing;

create policy "public read creation media" on storage.objects for select
  using (bucket_id = 'creation-media');
create policy "upload own creation media" on storage.objects for insert to authenticated
  with check (bucket_id = 'creation-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "update own creation media" on storage.objects for update to authenticated
  using (bucket_id = 'creation-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own creation media" on storage.objects for delete to authenticated
  using (bucket_id = 'creation-media' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- 15. SEED DATA
-- ---------------------------------------------------------------------
insert into categories (slug, name, sort_order) values
  ('websites', 'Websites', 1), ('apps', 'Apps', 2), ('images', 'Images', 3),
  ('video', 'Video', 4), ('music', 'Music & Audio', 5), ('design', 'Design', 6),
  ('code', 'Code', 7), ('agents', 'Agents', 8), ('automations', 'Automations', 9),
  ('workflows', 'Workflows', 10), ('presentations', 'Presentations', 11),
  ('3d', '3D', 12), ('research', 'Research', 13), ('other', 'Other', 99);

insert into tools (slug, name, kind, vendor, is_verified) values
  ('claude',       'Claude',       'ai_app',    'Anthropic',  true),
  ('claude-code',  'Claude Code',  'ai_app',    'Anthropic',  true),
  ('chatgpt',      'ChatGPT',      'ai_app',    'OpenAI',     true),
  ('gemini',       'Gemini',       'ai_app',    'Google',     true),
  ('cursor',       'Cursor',       'ai_app',    'Anysphere',  true),
  ('midjourney',   'Midjourney',   'ai_app',    'Midjourney', true),
  ('lovable',      'Lovable',      'ai_app',    'Lovable',    true),
  ('v0',           'v0',           'ai_app',    'Vercel',     true),
  ('replit',       'Replit',       'ai_app',    'Replit',     true),
  ('nextjs',       'Next.js',      'framework', 'Vercel',     true),
  ('tailwindcss',  'Tailwind CSS', 'library',   'Tailwind Labs', true),
  ('shadcn-ui',    'shadcn/ui',    'library',   null,         true),
  ('supabase',     'Supabase',     'platform',  'Supabase',   true),
  ('vercel',       'Vercel',       'platform',  'Vercel',     true),
  ('figma',        'Figma',        'design',    'Figma',      true);
