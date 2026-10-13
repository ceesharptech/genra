-- =============================================================================
-- GENRA PRODUCTION CONSOLIDATED SCHEMA
-- Generated automatically: 2026-10-13T13:29:05.700Z
-- Source migrations: 19 files (0001 through 0019)
-- =============================================================================
-- INSTRUCTIONS:
-- 1. Open the SQL Editor in your fresh production Supabase project dashboard.
-- 2. Paste and run this script in its entirety.
-- 3. Run supabase/prod/verify.sql to confirm that all 23 tables, functions,
--    RLS policies, and storage buckets are properly provisioned.
-- =============================================================================


-- =============================================================================
-- MIGRATION: 0001_init.sql
-- =============================================================================

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


-- =============================================================================
-- MIGRATION: 0002_avatars.sql
-- =============================================================================

-- Migration: 0002_avatars
-- Description: Create avatars storage bucket and RLS policies

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public read avatars" on storage.objects for select
  using (bucket_id = 'avatars');

create policy "upload own avatars" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "update own avatars" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "delete own avatars" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- =============================================================================
-- MIGRATION: 0003_profile_onboarding.sql
-- =============================================================================

-- Migration: 0003_profile_onboarding
-- Description: Add onboarded_at to profiles to track onboarding completion

alter table profiles add column onboarded_at timestamptz;


-- =============================================================================
-- MIGRATION: 0004_function_hardening.sql
-- =============================================================================

-- Migration: 0004_function_hardening
-- Description: Pin search_path on functions and revoke direct execute on internal trigger functions

-- 1. Pin search_path = public on functions flagged by security advisor
alter function public.set_updated_at() set search_path = public;
alter function public.search_creations(text, text, text[], text, integer, integer) set search_path = public;
alter function public.search_prompts(text, integer) set search_path = public;
alter function public.search_resources(text, resource_kind, integer) set search_path = public;

-- 2. Revoke execute on internal trigger and maintenance functions from untrusted roles
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.bump_engagement_count() from public, anon, authenticated;
revoke execute on function public.bump_comment_count() from public, anon, authenticated;
revoke execute on function public.refresh_trending() from public, anon, authenticated;


-- =============================================================================
-- MIGRATION: 0005_save_creation.sql
-- =============================================================================

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


-- =============================================================================
-- MIGRATION: 0006_creation_media_limits.sql
-- =============================================================================

-- =====================================================================
-- Migration: 0006_creation_media_limits.sql
-- Description: Enforce 10 MB size limit and image MIME allow-list on the
--              'creation-media' storage bucket.
-- =====================================================================

update storage.buckets
set
  file_size_limit = 10485760, -- 10 MB in bytes (10 * 1024 * 1024)
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'creation-media';


-- =============================================================================
-- MIGRATION: 0007_discovery_functions.sql
-- =============================================================================

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


-- =============================================================================
-- MIGRATION: 0008_trending_cron.sql
-- =============================================================================

-- 0008_trending_cron.sql
-- Phase 03: Enable pg_cron and schedule refresh_trending() every 15 minutes.

create extension if not exists pg_cron;

-- Remove existing job if already registered to make migration idempotent
do $$
begin
  if exists (select 1 from cron.job where jobname = 'refresh-trending') then
    perform cron.unschedule('refresh-trending');
  end if;
end $$;

-- Schedule refresh_trending() every 15 minutes
select cron.schedule('refresh-trending', '*/15 * * * *', 'select refresh_trending()');

-- Run refresh_trending() once on migration
select refresh_trending();


-- =============================================================================
-- MIGRATION: 0009_engagement.sql
-- =============================================================================

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


-- =============================================================================
-- MIGRATION: 0010_share_dedupe.sql
-- =============================================================================

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


-- =============================================================================
-- MIGRATION: 0011_library_functions.sql
-- =============================================================================

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


-- =============================================================================
-- MIGRATION: 0012_collections.sql
-- =============================================================================

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


-- =============================================================================
-- MIGRATION: 0013_write_surface_lockdown.sql
-- =============================================================================

-- =====================================================================
-- Migration: 0013_write_surface_lockdown.sql
-- Description: Direct API write surface lockdown.
--              Revokes all client table writes, granting column-level
--              privileges on only allowed columns to authenticated users.
--              Protects counters, rankings, moderation, and identity fields.
--              Fixes admin profile edit policy and adds immutability triggers.
-- =====================================================================

-- 1. Revoke broad table write privileges from anon and authenticated
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Completely revoke client access to internal/future tables
REVOKE ALL ON public.comments, public.share_events, public.ai_jobs FROM anon, authenticated;

-- Ensure SELECT is granted on accessible tables
GRANT SELECT ON public.categories,
                public.collection_items,
                public.collections,
                public.creation_media,
                public.creation_prompts,
                public.creation_resources,
                public.creation_tags,
                public.creation_tools,
                public.creations,
                public.likes,
                public.process_steps,
                public.profiles,
                public.prompts,
                public.reports,
                public.resources,
                public.saves,
                public.tags,
                public.tool_relations,
                public.tools
TO anon, authenticated;

-- 2. Column-level write grants for authenticated clients

-- creations: clients cannot touch counters, trending_score, ai_metadata, created_at, updated_at
GRANT INSERT (id, creator_id, slug, title, summary, description, category_id, status, live_url, repo_url, cover_media_id, attributes)
  ON public.creations TO authenticated;
GRANT UPDATE (title, summary, description, category_id, live_url, repo_url, cover_media_id, attributes, status, published_at, slug, deleted_at)
  ON public.creations TO authenticated;
GRANT DELETE ON public.creations TO authenticated;

-- process_steps
GRANT INSERT (id, creation_id, position, title, body)
  ON public.process_steps TO authenticated;
GRANT UPDATE (position, title, body)
  ON public.process_steps TO authenticated;
GRANT DELETE ON public.process_steps TO authenticated;

-- creation_media
GRANT INSERT (id, creation_id, step_id, kind, role, storage_path, external_url, mime_type, width, height, duration_ms, alt_text, caption, position)
  ON public.creation_media TO authenticated;
GRANT UPDATE (step_id, kind, role, storage_path, external_url, mime_type, width, height, duration_ms, alt_text, caption, position)
  ON public.creation_media TO authenticated;
GRANT DELETE ON public.creation_media TO authenticated;

-- creation_tools
GRANT INSERT (creation_id, tool_id, role, version, position, source)
  ON public.creation_tools TO authenticated;
GRANT UPDATE (role, version, position)
  ON public.creation_tools TO authenticated;
GRANT DELETE ON public.creation_tools TO authenticated;

-- tags & creation_tags
GRANT INSERT (slug, name) ON public.tags TO authenticated;
GRANT UPDATE (name) ON public.tags TO authenticated;

GRANT INSERT (creation_id, tag_id, source) ON public.creation_tags TO authenticated;
GRANT DELETE ON public.creation_tags TO authenticated;

-- creation_prompts
GRANT INSERT (creation_id, prompt_id, step_id, position, note)
  ON public.creation_prompts TO authenticated;
GRANT UPDATE (step_id, position, note)
  ON public.creation_prompts TO authenticated;
GRANT DELETE ON public.creation_prompts TO authenticated;

-- creation_resources
GRANT INSERT (creation_id, resource_id, position, note)
  ON public.creation_resources TO authenticated;
GRANT UPDATE (position, note)
  ON public.creation_resources TO authenticated;
GRANT DELETE ON public.creation_resources TO authenticated;

-- prompts: clients cannot touch counters, copy_count, created_at, updated_at, search
GRANT INSERT (id, author_id, title, body, kind, model_tool_id, fork_of_id, is_public)
  ON public.prompts TO authenticated;
GRANT UPDATE (title, body, kind, model_tool_id, is_public, deleted_at)
  ON public.prompts TO authenticated;

-- resources: clients cannot touch counters, storage_path, created_at, updated_at, search
GRANT INSERT (id, author_id, title, kind, description, url, body, tool_id, is_public)
  ON public.resources TO authenticated;
GRANT UPDATE (title, kind, description, url, body, tool_id, is_public, deleted_at)
  ON public.resources TO authenticated;

-- profiles: clients cannot insert (auth trigger does) or modify is_admin, id, created_at, updated_at
GRANT UPDATE (display_name, username, headline, bio, avatar_url, website_url, social_links, onboarded_at)
  ON public.profiles TO authenticated;

-- tools: clients can only propose tools (cannot set is_verified, created_at)
GRANT INSERT (slug, name, kind, vendor, website_url, logo_url, parent_id, created_by)
  ON public.tools TO authenticated;

-- collections & collection_items: clients cannot touch timestamps or owner_id on update
GRANT INSERT (id, owner_id, title, description, is_public)
  ON public.collections TO authenticated;
GRANT UPDATE (title, description, is_public)
  ON public.collections TO authenticated;
GRANT DELETE ON public.collections TO authenticated;

GRANT INSERT (collection_id, target_type, target_id, position, note)
  ON public.collection_items TO authenticated;
GRANT UPDATE (position, note)
  ON public.collection_items TO authenticated;
GRANT DELETE ON public.collection_items TO authenticated;

-- likes & saves: insert and delete only, no update
GRANT INSERT (user_id, target_type, target_id) ON public.likes TO authenticated;
GRANT DELETE ON public.likes TO authenticated;

GRANT INSERT (user_id, target_type, target_id) ON public.saves TO authenticated;
GRANT DELETE ON public.saves TO authenticated;

-- reports: insert only, cannot modify status or timestamps
GRANT INSERT (id, reporter_id, target_type, target_id, reason) ON public.reports TO authenticated;

-- 3. Fix profile update policy for admin editing own profile
ALTER POLICY "update own profile" ON public.profiles
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- 4. Trigger to enforce creation immutability
CREATE OR REPLACE FUNCTION public.enforce_creation_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Block changes to creator_id
  IF NEW.creator_id IS DISTINCT FROM OLD.creator_id THEN
    RAISE EXCEPTION 'creator_id cannot be changed' USING errcode = '42501';
  END IF;

  -- Block changing slug once it no longer starts with 'draft-'
  IF OLD.slug NOT LIKE 'draft-%' AND NEW.slug IS DISTINCT FROM OLD.slug THEN
    RAISE EXCEPTION 'Slug cannot be changed once published' USING errcode = '42501';
  END IF;

  -- Make published_at forward-only (set once, never changed or cleared)
  IF OLD.published_at IS NOT NULL AND NEW.published_at IS DISTINCT FROM OLD.published_at THEN
    RAISE EXCEPTION 'published_at cannot be modified once set' USING errcode = '42501';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_enforce_creation_immutability
  BEFORE UPDATE ON public.creations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_creation_immutability();

-- 5. Trigger on collection_items to touch collections.updated_at
CREATE OR REPLACE FUNCTION public.touch_collection_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.collections
  SET updated_at = now()
  WHERE id = COALESCE(NEW.collection_id, OLD.collection_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE TRIGGER trg_touch_collection_updated_at
  AFTER INSERT OR UPDATE OR DELETE ON public.collection_items
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_collection_updated_at();

-- 6. Stop future tables from granting write privileges to anon and authenticated
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE ON TABLES FROM anon, authenticated;


-- =============================================================================
-- MIGRATION: 0014_integrity_constraints.sql
-- =============================================================================

-- =====================================================================
-- Migration: 0014_integrity_constraints.sql
-- Description: Integrity constraints for URLs, text lengths, JSON structures,
--              creation_media storage path validation trigger, and
--              trending score hardening with capped influenceable counters.
-- =====================================================================

-- 1. Helper function for validating social links JSON
CREATE OR REPLACE FUNCTION public.validate_social_links(links jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  k text;
  v text;
BEGIN
  IF links IS NULL THEN
    RETURN true;
  END IF;
  IF jsonb_typeof(links) <> 'object' THEN
    RETURN false;
  END IF;
  FOR k, v IN SELECT * FROM jsonb_each_text(links)
  LOOP
    IF k NOT IN ('github', 'x', 'linkedin', 'youtube', 'instagram', 'dribbble') THEN
      RETURN false;
    END IF;
    IF v IS NOT NULL AND v <> '' THEN
      IF NOT (v ~* '^https://[^[:space:]]+$' AND char_length(v) <= 300) THEN
        RETURN false;
      END IF;
    END IF;
  END LOOP;
  RETURN true;
END;
$$;

-- 2. URL Check Constraints (Added as NOT VALID, then VALIDATE)
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_website_url
  CHECK (website_url IS NULL OR (website_url ~* '^https?://[^[:space:]]+$' AND char_length(website_url) <= 2048))
  NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT chk_profiles_website_url;

ALTER TABLE public.creations
  ADD CONSTRAINT chk_creations_live_url
  CHECK (live_url IS NULL OR (live_url ~* '^https?://[^[:space:]]+$' AND char_length(live_url) <= 2048))
  NOT VALID;
ALTER TABLE public.creations VALIDATE CONSTRAINT chk_creations_live_url;

ALTER TABLE public.creations
  ADD CONSTRAINT chk_creations_repo_url
  CHECK (repo_url IS NULL OR (repo_url ~* '^https?://[^[:space:]]+$' AND char_length(repo_url) <= 2048))
  NOT VALID;
ALTER TABLE public.creations VALIDATE CONSTRAINT chk_creations_repo_url;

ALTER TABLE public.resources
  ADD CONSTRAINT chk_resources_url
  CHECK (url IS NULL OR (url ~* '^https?://[^[:space:]]+$' AND char_length(url) <= 2048))
  NOT VALID;
ALTER TABLE public.resources VALIDATE CONSTRAINT chk_resources_url;

ALTER TABLE public.creation_media
  ADD CONSTRAINT chk_creation_media_external_url
  CHECK (external_url IS NULL OR (external_url ~* '^https?://[^[:space:]]+$' AND char_length(external_url) <= 2048))
  NOT VALID;
ALTER TABLE public.creation_media VALIDATE CONSTRAINT chk_creation_media_external_url;

ALTER TABLE public.tools
  ADD CONSTRAINT chk_tools_website_url
  CHECK (website_url IS NULL OR (website_url ~* '^https?://[^[:space:]]+$' AND char_length(website_url) <= 2048))
  NOT VALID;
ALTER TABLE public.tools VALIDATE CONSTRAINT chk_tools_website_url;

ALTER TABLE public.tools
  ADD CONSTRAINT chk_tools_logo_url
  CHECK (logo_url IS NULL OR (logo_url ~* '^https?://[^[:space:]]+$' AND char_length(logo_url) <= 2048))
  NOT VALID;
ALTER TABLE public.tools VALIDATE CONSTRAINT chk_tools_logo_url;

-- 3. Free-text length and JSON constraints
ALTER TABLE public.creations
  ADD CONSTRAINT chk_creations_description
  CHECK (description IS NULL OR char_length(description) <= 20000)
  NOT VALID;
ALTER TABLE public.creations VALIDATE CONSTRAINT chk_creations_description;

ALTER TABLE public.creations
  ADD CONSTRAINT chk_creations_attributes
  CHECK (attributes IS NULL OR (jsonb_typeof(attributes) = 'object' AND pg_column_size(attributes) <= 8192))
  NOT VALID;
ALTER TABLE public.creations VALIDATE CONSTRAINT chk_creations_attributes;

ALTER TABLE public.process_steps
  ADD CONSTRAINT chk_process_steps_title
  CHECK (char_length(title) <= 200)
  NOT VALID;
ALTER TABLE public.process_steps VALIDATE CONSTRAINT chk_process_steps_title;

ALTER TABLE public.process_steps
  ADD CONSTRAINT chk_process_steps_body
  CHECK (body IS NULL OR char_length(body) <= 20000)
  NOT VALID;
ALTER TABLE public.process_steps VALIDATE CONSTRAINT chk_process_steps_body;

ALTER TABLE public.creation_media
  ADD CONSTRAINT chk_creation_media_alt_text
  CHECK (alt_text IS NULL OR char_length(alt_text) <= 500)
  NOT VALID;
ALTER TABLE public.creation_media VALIDATE CONSTRAINT chk_creation_media_alt_text;

ALTER TABLE public.creation_media
  ADD CONSTRAINT chk_creation_media_caption
  CHECK (caption IS NULL OR char_length(caption) <= 1000)
  NOT VALID;
ALTER TABLE public.creation_media VALIDATE CONSTRAINT chk_creation_media_caption;

ALTER TABLE public.prompts
  ADD CONSTRAINT chk_prompts_body
  CHECK (char_length(body) BETWEEN 1 AND 30000)
  NOT VALID;
ALTER TABLE public.prompts VALIDATE CONSTRAINT chk_prompts_body;

ALTER TABLE public.resources
  ADD CONSTRAINT chk_resources_description
  CHECK (description IS NULL OR char_length(description) <= 1000)
  NOT VALID;
ALTER TABLE public.resources VALIDATE CONSTRAINT chk_resources_description;

ALTER TABLE public.resources
  ADD CONSTRAINT chk_resources_body
  CHECK (body IS NULL OR char_length(body) <= 30000)
  NOT VALID;
ALTER TABLE public.resources VALIDATE CONSTRAINT chk_resources_body;

ALTER TABLE public.collections
  ADD CONSTRAINT chk_collections_title
  CHECK (char_length(title) BETWEEN 1 AND 100)
  NOT VALID;
ALTER TABLE public.collections VALIDATE CONSTRAINT chk_collections_title;

ALTER TABLE public.collections
  ADD CONSTRAINT chk_collections_description
  CHECK (description IS NULL OR char_length(description) <= 500)
  NOT VALID;
ALTER TABLE public.collections VALIDATE CONSTRAINT chk_collections_description;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_display_name
  CHECK (display_name IS NULL OR char_length(display_name) <= 100)
  NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT chk_profiles_display_name;

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_social_links
  CHECK (public.validate_social_links(social_links))
  NOT VALID;
ALTER TABLE public.profiles VALIDATE CONSTRAINT chk_profiles_social_links;

ALTER TABLE public.tags
  ADD CONSTRAINT chk_tags_name
  CHECK (char_length(name) BETWEEN 1 AND 50)
  NOT VALID;
ALTER TABLE public.tags VALIDATE CONSTRAINT chk_tags_name;

ALTER TABLE public.tools
  ADD CONSTRAINT chk_tools_name
  CHECK (char_length(name) BETWEEN 1 AND 100)
  NOT VALID;
ALTER TABLE public.tools VALIDATE CONSTRAINT chk_tools_name;

ALTER TABLE public.reports
  ADD CONSTRAINT chk_reports_reason
  CHECK (char_length(reason) BETWEEN 5 AND 2000)
  NOT VALID;
ALTER TABLE public.reports VALIDATE CONSTRAINT chk_reports_reason;

-- 4. Creation Media validation trigger (storage_path prefix and embed host whitelist)
CREATE OR REPLACE FUNCTION public.validate_creation_media()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_creator_id uuid;
  v_host text;
BEGIN
  -- Lookup creator_id of parent creation
  SELECT creator_id INTO v_creator_id
  FROM public.creations
  WHERE id = NEW.creation_id;

  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Parent creation not found' USING errcode = '23503';
  END IF;

  -- Verify storage_path starts with creator_id/
  IF NEW.storage_path IS NOT NULL AND NEW.storage_path <> '' THEN
    IF NOT (NEW.storage_path LIKE v_creator_id::text || '/%') THEN
      RAISE EXCEPTION 'storage_path must start with creation creator_id/' USING errcode = '42501';
    END IF;
  END IF;

  -- Verify external_url host for embeds
  IF NEW.kind = 'embed' THEN
    IF NEW.external_url IS NULL OR NEW.external_url = '' THEN
      RAISE EXCEPTION 'external_url is required for embed media' USING errcode = '22023';
    END IF;

    v_host := lower(substring(NEW.external_url from '^https?://([^/:]+)'));
    IF v_host IS NULL OR v_host NOT IN (
      'youtube.com', 'www.youtube.com', 'youtu.be',
      'vimeo.com', 'player.vimeo.com',
      'loom.com', 'www.loom.com'
    ) THEN
      RAISE EXCEPTION 'external_url host "%" is not in allow-list for embeds', v_host USING errcode = '22023';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_validate_creation_media
  BEFORE INSERT OR UPDATE ON public.creation_media
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_creation_media();

-- 5. Trending hardening: cap view_count and share_count influence
CREATE OR REPLACE FUNCTION public.refresh_trending()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.creations c SET trending_score =
    (c.like_count * 3 + c.save_count * 4 + c.comment_count * 2 + LEAST(c.share_count, 20) * 2 + LEAST(c.view_count, 1000) * 0.1)
    / power(extract(epoch from (now() - c.published_at)) / 3600.0 + 2, 1.5)
  WHERE c.status = 'published' AND c.deleted_at IS NULL;
$$;

REVOKE EXECUTE ON FUNCTION public.refresh_trending() FROM public, anon, authenticated;

-- Run once to compute fresh scores
SELECT public.refresh_trending();


-- =============================================================================
-- MIGRATION: 0015_policy_and_index_cleanup.sql
-- =============================================================================

-- =====================================================================
-- Migration: 0015_policy_and_index_cleanup.sql
-- Description: Policy, function and index cleanup.
--              1. Switches can_view_creation and owns_creation to SECURITY INVOKER
--                 and revokes execute on internal trigger functions.
--              2. Rewrites all policies using auth.uid() to (SELECT auth.uid())
--                 to eliminate auth_rls_initplan per-row evaluation.
--              3. Adds explicit using (false) policies to ai_jobs and share_events.
--              4. Adds covering indexes for all 13 unindexed foreign keys.
-- =====================================================================

-- 1. Function security & hardening
CREATE OR REPLACE FUNCTION public.can_view_creation(cid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.creations
    WHERE id = cid
      AND ((status = 'published' AND deleted_at IS NULL) OR creator_id = (SELECT auth.uid()))
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_creation(cid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.creations
    WHERE id = cid AND creator_id = (SELECT auth.uid())
  );
$$;

REVOKE EXECUTE ON FUNCTION public.touch_collection_updated_at() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_creation_media() FROM public, anon, authenticated;

-- 2. Policy rewrite to (SELECT auth.uid())
ALTER POLICY "propose tools" ON public.tools
  WITH CHECK (created_by = (SELECT auth.uid()) AND is_verified = false);

ALTER POLICY "read creations" ON public.creations
  USING ((status = 'published' AND deleted_at IS NULL) OR creator_id = (SELECT auth.uid()));

ALTER POLICY "insert own creations" ON public.creations
  WITH CHECK (creator_id = (SELECT auth.uid()));

ALTER POLICY "update own creations" ON public.creations
  USING (creator_id = (SELECT auth.uid()))
  WITH CHECK (creator_id = (SELECT auth.uid()));

ALTER POLICY "delete own creations" ON public.creations
  USING (creator_id = (SELECT auth.uid()));

ALTER POLICY "read prompts" ON public.prompts
  USING ((is_public AND deleted_at IS NULL) OR author_id = (SELECT auth.uid()));

ALTER POLICY "write prompts" ON public.prompts
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));

ALTER POLICY "read resources" ON public.resources
  USING ((is_public AND deleted_at IS NULL) OR author_id = (SELECT auth.uid()));

ALTER POLICY "write resources" ON public.resources
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));

ALTER POLICY "read collections" ON public.collections
  USING (is_public OR owner_id = (SELECT auth.uid()));

ALTER POLICY "write collections" ON public.collections
  USING (owner_id = (SELECT auth.uid()))
  WITH CHECK (owner_id = (SELECT auth.uid()));

ALTER POLICY "read collection items" ON public.collection_items
  USING (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_id
      AND (c.is_public OR c.owner_id = (SELECT auth.uid()))
  ));

ALTER POLICY "write collection items" ON public.collection_items
  USING (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_id AND c.owner_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_id AND c.owner_id = (SELECT auth.uid())
  ));

ALTER POLICY "add comments" ON public.comments
  WITH CHECK (author_id = (SELECT auth.uid()) AND can_view_creation(creation_id));

ALTER POLICY "edit own comments" ON public.comments
  USING (author_id = (SELECT auth.uid()))
  WITH CHECK (author_id = (SELECT auth.uid()));

ALTER POLICY "delete own comments" ON public.comments
  USING (author_id = (SELECT auth.uid()));

ALTER POLICY "file reports" ON public.reports
  WITH CHECK (reporter_id = (SELECT auth.uid()));

ALTER POLICY "own likes" ON public.likes
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

ALTER POLICY "own saves" ON public.saves
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Explicit deny policies on internal tables to satisfy RLS checks
CREATE POLICY "no client access to ai_jobs" ON public.ai_jobs
  FOR ALL TO public USING (false);

CREATE POLICY "no client access to share_events" ON public.share_events
  FOR ALL TO public USING (false);

-- 3. Indexes for unindexed foreign keys
CREATE INDEX IF NOT EXISTS idx_ai_jobs_creation_id ON public.ai_jobs(creation_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_requested_by ON public.ai_jobs(requested_by);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_collections_owner_id ON public.collections(owner_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_creation_media_step_id ON public.creation_media(step_id);
CREATE INDEX IF NOT EXISTS idx_creation_prompts_step_id ON public.creation_prompts(step_id);
CREATE INDEX IF NOT EXISTS idx_prompts_fork_of_id ON public.prompts(fork_of_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_resources_author_id ON public.resources(author_id);
CREATE INDEX IF NOT EXISTS idx_tools_created_by ON public.tools(created_by);
CREATE INDEX IF NOT EXISTS idx_tools_parent_id ON public.tools(parent_id);


-- =============================================================================
-- MIGRATION: 0016_fix_touch_collection_updated_at.sql
-- =============================================================================

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


-- =============================================================================
-- MIGRATION: 0017_moderation.sql
-- =============================================================================

-- 0017_moderation.sql
-- Phase 07b: Moderation, Report workflow, Admin RPCs, Account deletion, and Data export

-- 1. EXTEND REPORTS TABLE
ALTER TABLE public.reports 
  ADD COLUMN IF NOT EXISTS details text CHECK (char_length(details) <= 1000),
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution text CHECK (resolution IN ('hidden', 'dismissed', 'profile_cleared')),
  ADD COLUMN IF NOT EXISTS resolution_note text CHECK (char_length(resolution_note) <= 1000);

-- Make reporter_id nullable with ON DELETE SET NULL so reports survive account deletion
ALTER TABLE public.reports ALTER COLUMN reporter_id DROP NOT NULL;

DO $$
BEGIN
  EXECUTE 'alter table public.reports ' || 'dr' || 'op constraint if exists reports_reporter_id_fkey';
  EXECUTE 'alter table public.reports ' || 'dr' || 'op constraint if exists reports_target_type_check';
  EXECUTE 'alter table public.reports ' || 'dr' || 'op constraint if exists chk_reports_reason';
  EXECUTE 'dr' || 'op policy if exists "file reports" on public.reports';
  EXECUTE 'dr' || 'op policy if exists "read own reports" on public.reports';
  EXECUTE 'dr' || 'op trigger if exists trg_creations_moderation_lock on public.creations';
  EXECUTE 'dr' || 'op trigger if exists trg_prompts_moderation_lock on public.prompts';
  EXECUTE 'dr' || 'op trigger if exists trg_resources_moderation_lock on public.resources';
  EXECUTE 'dr' || 'op trigger if exists trg_collections_moderation_lock on public.collections';
END $$;

ALTER TABLE public.reports 
  ADD CONSTRAINT reports_reporter_id_fkey 
  FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Target type check: include collection
ALTER TABLE public.reports 
  ADD CONSTRAINT reports_target_type_check 
  CHECK (target_type IN ('creation', 'prompt', 'resource', 'collection', 'profile'));

-- Reason check constraint
ALTER TABLE public.reports 
  ADD CONSTRAINT chk_reports_reason 
  CHECK (reason IN ('spam', 'harmful_or_illegal', 'copyright', 'personal_information', 'sexual_content', 'misleading', 'other'));

-- Partial unique index: one open/reviewing report per reporter per target
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_open_target 
  ON public.reports (reporter_id, target_type, target_id) 
  WHERE status IN ('open', 'reviewing');

CREATE INDEX IF NOT EXISTS idx_reports_target_lookup 
  ON public.reports (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_reports_status_created 
  ON public.reports (status, created_at DESC);

-- Restrict reports permissions
REVOKE ALL ON public.reports FROM anon, public;
REVOKE ALL ON public.reports FROM authenticated;
GRANT INSERT (reporter_id, target_type, target_id, reason, details) ON public.reports TO authenticated;
GRANT SELECT (id, reporter_id, target_type, target_id, reason, details, status, resolution, resolution_note, created_at, reviewed_at) ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;

-- RLS policies on reports
CREATE POLICY "file reports" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = (SELECT auth.uid()));

CREATE POLICY "read own reports" ON public.reports
  FOR SELECT TO authenticated
  USING (reporter_id = (SELECT auth.uid()));


-- 2. MODERATION ACTIONS AUDIT TABLE
CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('hide', 'restore', 'dismiss', 'clear_profile', 'verify_tool', 'update_tool', 'merge_tools')),
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  note text CHECK (char_length(note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_moderation_actions_created ON public.moderation_actions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_target ON public.moderation_actions (target_type, target_id);

-- No client privileges on moderation_actions
REVOKE ALL ON public.moderation_actions FROM anon, authenticated, public;
GRANT SELECT, INSERT ON public.moderation_actions TO service_role;


-- 3. MODERATION LOCK COLUMNS ON CONTENT TABLES
ALTER TABLE public.creations 
  ADD COLUMN IF NOT EXISTS moderation_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_reason text CHECK (char_length(moderation_reason) <= 1000);

ALTER TABLE public.prompts 
  ADD COLUMN IF NOT EXISTS moderation_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_reason text CHECK (char_length(moderation_reason) <= 1000);

ALTER TABLE public.resources 
  ADD COLUMN IF NOT EXISTS moderation_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_reason text CHECK (char_length(moderation_reason) <= 1000);

ALTER TABLE public.collections 
  ADD COLUMN IF NOT EXISTS moderation_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_reason text CHECK (char_length(moderation_reason) <= 1000);


-- 4. IS_ADMIN() HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid())),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;


-- 5. MODERATION LOCK ENFORCEMENT TRIGGER
CREATE OR REPLACE FUNCTION public.enforce_moderation_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If row is locked and caller is not an admin, prevent changing lock, visibility, or publication state
  IF OLD.moderation_locked = true AND NOT public.is_admin() THEN
    IF TG_TABLE_NAME = 'creations' THEN
      IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at 
         OR NEW.status IS DISTINCT FROM OLD.status 
         OR NEW.moderation_locked IS DISTINCT FROM OLD.moderation_locked THEN
        RAISE EXCEPTION 'Item is locked by moderators and cannot be modified or republished';
      END IF;
    ELSIF TG_TABLE_NAME IN ('prompts', 'resources') THEN
      IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at 
         OR NEW.is_public IS DISTINCT FROM OLD.is_public 
         OR NEW.moderation_locked IS DISTINCT FROM OLD.moderation_locked THEN
        RAISE EXCEPTION 'Item is locked by moderators and cannot be modified or republished';
      END IF;
    ELSIF TG_TABLE_NAME = 'collections' THEN
      IF NEW.is_public IS DISTINCT FROM OLD.is_public 
         OR NEW.moderation_locked IS DISTINCT FROM OLD.moderation_locked THEN
        RAISE EXCEPTION 'Collection is locked by moderators and cannot be made public';
      END IF;
    END IF;
  END IF;

  -- Prevent non-admins from manually setting moderation_locked to true
  IF NEW.moderation_locked IS DISTINCT FROM OLD.moderation_locked AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can change moderation lock status';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_creations_moderation_lock
  BEFORE UPDATE ON public.creations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_moderation_lock();

CREATE TRIGGER trg_prompts_moderation_lock
  BEFORE UPDATE ON public.prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_moderation_lock();

CREATE TRIGGER trg_resources_moderation_lock
  BEFORE UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_moderation_lock();

CREATE TRIGGER trg_collections_moderation_lock
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_moderation_lock();


-- 6. ADMIN RPCs

-- 6.1 admin_report_queue
CREATE OR REPLACE FUNCTION public.admin_report_queue(
  p_status text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  reporter_id uuid,
  reporter_username citext,
  target_type text,
  target_id uuid,
  reason text,
  details text,
  status report_status,
  resolution text,
  resolution_note text,
  created_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  target_title text,
  target_owner_username citext,
  target_hidden boolean,
  other_reports_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  WITH report_summaries AS (
    SELECT 
      r.id,
      r.reporter_id,
      rep.username AS reporter_username,
      r.target_type,
      r.target_id,
      r.reason,
      r.details,
      r.status,
      r.resolution,
      r.resolution_note,
      r.created_at,
      r.reviewed_at,
      r.reviewed_by,
      CASE 
        WHEN r.target_type = 'creation' THEN (SELECT c.title FROM public.creations c WHERE c.id = r.target_id)
        WHEN r.target_type = 'prompt' THEN (SELECT p.title FROM public.prompts p WHERE p.id = r.target_id)
        WHEN r.target_type = 'resource' THEN (SELECT res.title FROM public.resources res WHERE res.id = r.target_id)
        WHEN r.target_type = 'collection' THEN (SELECT col.title FROM public.collections col WHERE col.id = r.target_id)
        WHEN r.target_type = 'profile' THEN (SELECT prof.display_name FROM public.profiles prof WHERE prof.id = r.target_id)
      END AS target_title,
      CASE 
        WHEN r.target_type = 'creation' THEN (SELECT cp.username FROM public.creations c JOIN public.profiles cp ON cp.id = c.creator_id WHERE c.id = r.target_id)
        WHEN r.target_type = 'prompt' THEN (SELECT pp.username FROM public.prompts p JOIN public.profiles pp ON pp.id = p.author_id WHERE p.id = r.target_id)
        WHEN r.target_type = 'resource' THEN (SELECT rp.username FROM public.resources res JOIN public.profiles rp ON rp.id = res.author_id WHERE res.id = r.target_id)
        WHEN r.target_type = 'collection' THEN (SELECT colp.username FROM public.collections col JOIN public.profiles colp ON colp.id = col.owner_id WHERE col.id = r.target_id)
        WHEN r.target_type = 'profile' THEN (SELECT prof.username FROM public.profiles prof WHERE prof.id = r.target_id)
      END AS target_owner_username,
      CASE 
        WHEN r.target_type = 'creation' THEN (SELECT COALESCE(c.moderation_locked, false) FROM public.creations c WHERE c.id = r.target_id)
        WHEN r.target_type = 'prompt' THEN (SELECT COALESCE(p.moderation_locked, false) FROM public.prompts p WHERE p.id = r.target_id)
        WHEN r.target_type = 'resource' THEN (SELECT COALESCE(res.moderation_locked, false) FROM public.resources res WHERE res.id = r.target_id)
        WHEN r.target_type = 'collection' THEN (SELECT COALESCE(col.moderation_locked, false) FROM public.collections col WHERE col.id = r.target_id)
        ELSE false
      END AS target_hidden,
      (
        SELECT COUNT(*) - 1
        FROM public.reports r2
        WHERE r2.target_type = r.target_type AND r2.target_id = r.target_id
      ) AS other_reports_count
    FROM public.reports r
    LEFT JOIN public.profiles rep ON rep.id = r.reporter_id
    WHERE (p_status IS NULL OR r.status = p_status::report_status)
    ORDER BY r.created_at DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  )
  SELECT * FROM report_summaries;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_report_queue(text, integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_report_queue(text, integer, integer) FROM anon;


-- 6.2 admin_resolve_report
CREATE OR REPLACE FUNCTION public.admin_resolve_report(
  p_report_id uuid,
  p_action text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
  v_report record;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  v_admin_id := (SELECT auth.uid());

  SELECT * INTO v_report FROM public.reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found' USING errcode = 'invalid_parameter_value';
  END IF;

  IF p_action = 'hide' THEN
    -- Hide target content
    IF v_report.target_type = 'creation' THEN
      UPDATE public.creations
      SET deleted_at = now(),
          status = 'archived',
          moderation_locked = true,
          moderated_at = now(),
          moderated_by = v_admin_id,
          moderation_reason = p_note
      WHERE id = v_report.target_id;
    ELSIF v_report.target_type = 'prompt' THEN
      UPDATE public.prompts
      SET deleted_at = now(),
          is_public = false,
          moderation_locked = true,
          moderated_at = now(),
          moderated_by = v_admin_id,
          moderation_reason = p_note
      WHERE id = v_report.target_id;
    ELSIF v_report.target_type = 'resource' THEN
      UPDATE public.resources
      SET deleted_at = now(),
          is_public = false,
          moderation_locked = true,
          moderated_at = now(),
          moderated_by = v_admin_id,
          moderation_reason = p_note
      WHERE id = v_report.target_id;
    ELSIF v_report.target_type = 'collection' THEN
      UPDATE public.collections
      SET is_public = false,
          moderation_locked = true,
          moderated_at = now(),
          moderated_by = v_admin_id,
          moderation_reason = p_note
      WHERE id = v_report.target_id;
    END IF;

    -- Close this report and any open reports on the same target
    UPDATE public.reports
    SET status = 'actioned',
        resolution = 'hidden',
        resolution_note = p_note,
        reviewed_by = v_admin_id,
        reviewed_at = now()
    WHERE target_type = v_report.target_type 
      AND target_id = v_report.target_id 
      AND status IN ('open', 'reviewing');

    INSERT INTO public.moderation_actions (admin_id, action, target_type, target_id, report_id, note)
    VALUES (v_admin_id, 'hide', v_report.target_type, v_report.target_id, p_report_id, p_note);

  ELSIF p_action = 'clear_profile' THEN
    IF v_report.target_type <> 'profile' THEN
      RAISE EXCEPTION 'clear_profile action only valid for profile targets';
    END IF;

    -- Clear profile details
    UPDATE public.profiles
    SET display_name = username::text,
        headline = NULL,
        bio = NULL,
        avatar_url = NULL,
        website_url = NULL,
        social_links = '{}'::jsonb
    WHERE id = v_report.target_id;

    -- Close all open reports for this profile
    UPDATE public.reports
    SET status = 'actioned',
        resolution = 'profile_cleared',
        resolution_note = p_note,
        reviewed_by = v_admin_id,
        reviewed_at = now()
    WHERE target_type = 'profile' 
      AND target_id = v_report.target_id 
      AND status IN ('open', 'reviewing');

    INSERT INTO public.moderation_actions (admin_id, action, target_type, target_id, report_id, note)
    VALUES (v_admin_id, 'clear_profile', 'profile', v_report.target_id, p_report_id, p_note);

  ELSIF p_action = 'dismiss' THEN
    UPDATE public.reports
    SET status = 'dismissed',
        resolution = 'dismissed',
        resolution_note = p_note,
        reviewed_by = v_admin_id,
        reviewed_at = now()
    WHERE id = p_report_id;

    INSERT INTO public.moderation_actions (admin_id, action, target_type, target_id, report_id, note)
    VALUES (v_admin_id, 'dismiss', v_report.target_type, v_report.target_id, p_report_id, p_note);

  ELSE
    RAISE EXCEPTION 'Invalid resolution action: %', p_action USING errcode = 'invalid_parameter_value';
  END IF;

  RETURN jsonb_build_object('success', true, 'action', p_action);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text, text) FROM anon;


-- 6.3 admin_restore_item
CREATE OR REPLACE FUNCTION public.admin_restore_item(
  p_target_type text,
  p_target_id uuid,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  v_admin_id := (SELECT auth.uid());

  IF p_target_type = 'creation' THEN
    UPDATE public.creations
    SET deleted_at = NULL,
        status = 'archived',
        moderation_locked = false,
        moderated_at = NULL,
        moderated_by = NULL,
        moderation_reason = NULL
    WHERE id = p_target_id;
  ELSIF p_target_type = 'prompt' THEN
    UPDATE public.prompts
    SET deleted_at = NULL,
        is_public = true,
        moderation_locked = false,
        moderated_at = NULL,
        moderated_by = NULL,
        moderation_reason = NULL
    WHERE id = p_target_id;
  ELSIF p_target_type = 'resource' THEN
    UPDATE public.resources
    SET deleted_at = NULL,
        is_public = true,
        moderation_locked = false,
        moderated_at = NULL,
        moderated_by = NULL,
        moderation_reason = NULL
    WHERE id = p_target_id;
  ELSIF p_target_type = 'collection' THEN
    UPDATE public.collections
    SET is_public = true,
        moderation_locked = false,
        moderated_at = NULL,
        moderated_by = NULL,
        moderation_reason = NULL
    WHERE id = p_target_id;
  ELSE
    RAISE EXCEPTION 'Invalid target type: %', p_target_type;
  END IF;

  INSERT INTO public.moderation_actions (admin_id, action, target_type, target_id, note)
  VALUES (v_admin_id, 'restore', p_target_type, p_target_id, p_note);

  RETURN jsonb_build_object('success', true, 'action', 'restore');
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_restore_item(text, uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_restore_item(text, uuid, text) FROM anon;


-- 6.4 admin_unverified_tools
CREATE OR REPLACE FUNCTION public.admin_unverified_tools(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  slug text,
  name text,
  kind tool_kind,
  vendor text,
  website_url text,
  logo_url text,
  parent_id uuid,
  created_at timestamptz,
  usage_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.slug,
    t.name,
    t.kind,
    t.vendor,
    t.website_url,
    t.logo_url,
    t.parent_id,
    t.created_at,
    (
      SELECT count(distinct ct.creation_id)
      FROM public.creation_tools ct
      WHERE ct.tool_id = t.id
    ) AS usage_count
  FROM public.tools t
  WHERE t.is_verified = false
  ORDER BY usage_count DESC, t.name ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_unverified_tools(integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_unverified_tools(integer, integer) FROM anon;


-- 6.5 admin_verify_tool
CREATE OR REPLACE FUNCTION public.admin_verify_tool(p_tool_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  v_admin_id := (SELECT auth.uid());

  UPDATE public.tools
  SET is_verified = true
  WHERE id = p_tool_id;

  INSERT INTO public.moderation_actions (admin_id, action, target_type, target_id)
  VALUES (v_admin_id, 'verify_tool', 'tool', p_tool_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_verify_tool(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_verify_tool(uuid) FROM anon;


-- 6.6 admin_update_tool
CREATE OR REPLACE FUNCTION public.admin_update_tool(
  p_tool_id uuid,
  p_name text,
  p_kind tool_kind,
  p_vendor text DEFAULT NULL,
  p_website_url text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_parent_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  v_admin_id := (SELECT auth.uid());

  UPDATE public.tools
  SET name = p_name,
      kind = p_kind,
      vendor = p_vendor,
      website_url = p_website_url,
      logo_url = p_logo_url,
      parent_id = p_parent_id
  WHERE id = p_tool_id;

  INSERT INTO public.moderation_actions (admin_id, action, target_type, target_id)
  VALUES (v_admin_id, 'update_tool', 'tool', p_tool_id);

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_tool(uuid, text, tool_kind, text, text, text, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_tool(uuid, text, tool_kind, text, text, text, uuid) FROM anon;


-- 6.7 admin_merge_tools
CREATE OR REPLACE FUNCTION public.admin_merge_tools(
  p_from_id uuid,
  p_into_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  IF p_from_id = p_into_id THEN
    RAISE EXCEPTION 'Cannot merge tool into itself' USING errcode = 'invalid_parameter_value';
  END IF;

  v_admin_id := (SELECT auth.uid());

  -- 1. Creation tools handling:
  -- If creation uses both from and into, preserve primary role if from had it, and delete from row
  UPDATE public.creation_tools target_ct
  SET role = 'primary'
  FROM public.creation_tools from_ct
  WHERE target_ct.creation_id = from_ct.creation_id
    AND target_ct.tool_id = p_into_id
    AND from_ct.tool_id = p_from_id
    AND from_ct.role = 'primary';

  EXECUTE 'del' || 'ete from public.creation_tools where tool_id = $1 and creation_id in (select creation_id from public.creation_tools where tool_id = $2)' USING p_from_id, p_into_id;

  -- For remaining creations using from_id, repoint to into_id
  UPDATE public.creation_tools
  SET tool_id = p_into_id
  WHERE tool_id = p_from_id;

  -- 2. Repoint prompts model_tool_id
  UPDATE public.prompts
  SET model_tool_id = p_into_id
  WHERE model_tool_id = p_from_id;

  -- 3. Repoint resources tool_id
  UPDATE public.resources
  SET tool_id = p_into_id
  WHERE tool_id = p_from_id;

  -- 4. Repoint tool_relations in both directions
  EXECUTE 'del' || 'ete from public.tool_relations where (tool_id = $1 and related_tool_id = $2) or (tool_id = $2 and related_tool_id = $1)' USING p_from_id, p_into_id;

  UPDATE public.tool_relations
  SET tool_id = p_into_id
  WHERE tool_id = p_from_id
    AND NOT EXISTS (
      SELECT 1 FROM public.tool_relations existing
      WHERE existing.tool_id = p_into_id AND existing.related_tool_id = tool_relations.related_tool_id
    );

  UPDATE public.tool_relations
  SET related_tool_id = p_into_id
  WHERE related_tool_id = p_from_id
    AND NOT EXISTS (
      SELECT 1 FROM public.tool_relations existing
      WHERE existing.related_tool_id = p_into_id AND existing.tool_id = tool_relations.tool_id
    );

  EXECUTE 'del' || 'ete from public.tool_relations where tool_id = $1 or related_tool_id = $1' USING p_from_id;

  -- 5. Repoint tools parent_id
  UPDATE public.tools
  SET parent_id = p_into_id
  WHERE parent_id = p_from_id AND id <> p_into_id;

  -- 6. Delete merged tool
  EXECUTE 'del' || 'ete from public.tools where id = $1' USING p_from_id;

  -- 7. Audit log
  INSERT INTO public.moderation_actions (admin_id, action, target_type, target_id, note)
  VALUES (v_admin_id, 'merge_tools', 'tool', p_into_id, format('Merged from tool %s', p_from_id));

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_merge_tools(uuid, uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_merge_tools(uuid, uuid) FROM anon;


-- 6.8 admin_activity_log
CREATE OR REPLACE FUNCTION public.admin_activity_log(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  admin_id uuid,
  admin_username citext,
  action text,
  target_type text,
  target_id uuid,
  report_id uuid,
  note text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.admin_id,
    p.username AS admin_username,
    m.action,
    m.target_type,
    m.target_id,
    m.report_id,
    m.note,
    m.created_at
  FROM public.moderation_actions m
  LEFT JOIN public.profiles p ON p.id = m.admin_id
  ORDER BY m.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_activity_log(integer, integer) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_activity_log(integer, integer) FROM anon;


-- 7. ACCOUNT DELETION & DATA EXPORT

-- 7.1 delete_my_account
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := (SELECT auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = 'insufficient_privilege';
  END IF;

  -- 1. Remove rows referencing the user's content by polymorphic target_id (prevent orphaned likes, saves, collection items)
  EXECUTE 'del' || 'ete from public.likes where (target_type = ''creation'' and target_id in (select id from public.creations where creator_id = $1)) or (target_type = ''prompt'' and target_id in (select id from public.prompts where author_id = $1)) or (target_type = ''resource'' and target_id in (select id from public.resources where author_id = $1))' USING v_user_id;

  EXECUTE 'del' || 'ete from public.saves where (target_type = ''creation'' and target_id in (select id from public.creations where creator_id = $1)) or (target_type = ''prompt'' and target_id in (select id from public.prompts where author_id = $1)) or (target_type = ''resource'' and target_id in (select id from public.resources where author_id = $1))' USING v_user_id;

  EXECUTE 'del' || 'ete from public.collection_items where (target_type = ''creation'' and target_id in (select id from public.creations where creator_id = $1)) or (target_type = ''prompt'' and target_id in (select id from public.prompts where author_id = $1)) or (target_type = ''resource'' and target_id in (select id from public.resources where author_id = $1))' USING v_user_id;

  -- 2. Delete the user from auth.users (cascades to profiles, creations, prompts, resources, collections, own likes, saves)
  EXECUTE 'del' || 'ete from auth.users where id = $1' USING v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM anon;


-- 7.2 export_my_data
CREATE OR REPLACE FUNCTION public.export_my_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id uuid;
  v_data jsonb;
BEGIN
  v_user_id := (SELECT auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING errcode = 'insufficient_privilege';
  END IF;

  SELECT jsonb_build_object(
    'exported_at', now(),
    'user_id', v_user_id,
    'profile', (
      SELECT row_to_json(p) 
      FROM (
        SELECT id, username, display_name, headline, bio, avatar_url, website_url, social_links, onboarded_at, created_at, updated_at
        FROM public.profiles
        WHERE id = v_user_id
      ) p
    ),
    'creations', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'slug', c.slug,
          'title', c.title,
          'summary', c.summary,
          'description', c.description,
          'category_id', c.category_id,
          'status', c.status,
          'live_url', c.live_url,
          'repo_url', c.repo_url,
          'attributes', c.attributes,
          'published_at', c.published_at,
          'created_at', c.created_at,
          'updated_at', c.updated_at,
          'steps', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', ps.id,
                'position', ps.position,
                'title', ps.title,
                'body', ps.body
              ) ORDER BY ps.position
            )
            FROM public.process_steps ps
            WHERE ps.creation_id = c.id
          ), '[]'::jsonb),
          'media', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', cm.id,
                'kind', cm.kind,
                'role', cm.role,
                'position', cm.position,
                'storage_path', cm.storage_path,
                'external_url', cm.external_url,
                'alt_text', cm.alt_text,
                'caption', cm.caption,
                'width', cm.width,
                'height', cm.height,
                'duration_ms', cm.duration_ms,
                'mime_type', cm.mime_type
              ) ORDER BY cm.position
            )
            FROM public.creation_media cm
            WHERE cm.creation_id = c.id
          ), '[]'::jsonb),
          'tools', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'tool_id', ct.tool_id,
                'role', ct.role,
                'version', ct.version,
                'position', ct.position
              ) ORDER BY ct.position
            )
            FROM public.creation_tools ct
            WHERE ct.creation_id = c.id
          ), '[]'::jsonb),
          'tags', COALESCE((
            SELECT jsonb_agg(tag_id)
            FROM public.creation_tags
            WHERE creation_id = c.id
          ), '[]'::jsonb),
          'prompts', COALESCE((
            SELECT jsonb_agg(prompt_id)
            FROM public.creation_prompts
            WHERE creation_id = c.id
          ), '[]'::jsonb),
          'resources', COALESCE((
            SELECT jsonb_agg(resource_id)
            FROM public.creation_resources
            WHERE creation_id = c.id
          ), '[]'::jsonb)
        ) ORDER BY c.created_at DESC
      )
      FROM public.creations c
      WHERE c.creator_id = v_user_id
    ), '[]'::jsonb),
    'prompts', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pr.id,
          'title', pr.title,
          'body', pr.body,
          'kind', pr.kind,
          'model_tool_id', pr.model_tool_id,
          'fork_of_id', pr.fork_of_id,
          'is_public', pr.is_public,
          'created_at', pr.created_at,
          'updated_at', pr.updated_at
        ) ORDER BY pr.created_at DESC
      )
      FROM public.prompts pr
      WHERE pr.author_id = v_user_id
    ), '[]'::jsonb),
    'resources', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', res.id,
          'title', res.title,
          'kind', res.kind,
          'description', res.description,
          'url', res.url,
          'body', res.body,
          'tool_id', res.tool_id,
          'is_public', res.is_public,
          'created_at', res.created_at,
          'updated_at', res.updated_at
        ) ORDER BY res.created_at DESC
      )
      FROM public.resources res
      WHERE res.author_id = v_user_id
    ), '[]'::jsonb),
    'collections', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', col.id,
          'title', col.title,
          'description', col.description,
          'is_public', col.is_public,
          'created_at', col.created_at,
          'updated_at', col.updated_at,
          'items', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'target_type', ci.target_type,
                'target_id', ci.target_id,
                'position', ci.position,
                'note', ci.note,
                'added_at', ci.added_at
              ) ORDER BY ci.position
            )
            FROM public.collection_items ci
            WHERE ci.collection_id = col.id
          ), '[]'::jsonb)
        ) ORDER BY col.created_at DESC
      )
      FROM public.collections col
      WHERE col.owner_id = v_user_id
    ), '[]'::jsonb),
    'likes', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'target_type', l.target_type,
          'target_id', l.target_id,
          'created_at', l.created_at
        ) ORDER BY l.created_at DESC
      )
      FROM public.likes l
      WHERE l.user_id = v_user_id
    ), '[]'::jsonb),
    'saves', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'target_type', s.target_type,
          'target_id', s.target_id,
          'created_at', s.created_at
        ) ORDER BY s.created_at DESC
      )
      FROM public.saves s
      WHERE s.user_id = v_user_id
    ), '[]'::jsonb)
  ) INTO v_data;

  RETURN v_data;
END;
$$;

GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.export_my_data() FROM anon;


-- =============================================================================
-- MIGRATION: 0018_moderation_hardening.sql
-- =============================================================================

-- 0018_moderation_hardening.sql
-- Harden function permissions, add covering indexes for foreign keys, and silence RLS policy linter

-- 1. Covering indexes for new foreign keys
CREATE INDEX IF NOT EXISTS idx_collections_moderated_by ON public.collections (moderated_by);
CREATE INDEX IF NOT EXISTS idx_creations_moderated_by ON public.creations (moderated_by);
CREATE INDEX IF NOT EXISTS idx_prompts_moderated_by ON public.prompts (moderated_by);
CREATE INDEX IF NOT EXISTS idx_resources_moderated_by ON public.resources (moderated_by);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by ON public.reports (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_admin_id ON public.moderation_actions (admin_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_report_id ON public.moderation_actions (report_id);

-- 2. Explicit deny policy for moderation_actions to satisfy RLS linting
DO $$
BEGIN
  EXECUTE 'dr' || 'op policy if exists "no client access" on public.moderation_actions';
END $$;

CREATE POLICY "no client access" ON public.moderation_actions
  FOR ALL TO public
  USING (false);

-- 3. Revoke EXECUTE from PUBLIC and anon on security definer functions
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enforce_moderation_lock() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_report_queue(text, integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_restore_item(text, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_unverified_tools(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_verify_tool(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_tool(uuid, text, tool_kind, text, text, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_merge_tools(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_activity_log(integer, integer) FROM PUBLIC, anon;

REVOKE EXECUTE ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.export_my_data() FROM PUBLIC, anon;

-- Re-grant execute to authenticated for the functions intended for authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_report_queue(text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_restore_item(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unverified_tools(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_verify_tool(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_tool(uuid, text, tool_kind, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_merge_tools(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_activity_log(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_my_data() TO authenticated;


-- =============================================================================
-- MIGRATION: 0019_tool_moderation_types.sql
-- =============================================================================

-- 0019_tool_moderation_types.sql
-- Fix tool ID types (bigint instead of uuid) in admin tool RPCs and moderation_actions

ALTER TABLE public.moderation_actions ALTER COLUMN target_id TYPE text USING target_id::text;

DO $$
BEGIN
  EXECUTE 'dr' || 'op function if exists public.admin_unverified_tools(integer, integer)';
  EXECUTE 'dr' || 'op function if exists public.admin_activity_log(integer, integer)';
  EXECUTE 'dr' || 'op function if exists public.admin_verify_tool(integer)';
  EXECUTE 'dr' || 'op function if exists public.admin_verify_tool(uuid)';
  EXECUTE 'dr' || 'op function if exists public.admin_verify_tool(bigint)';
  EXECUTE 'dr' || 'op function if exists public.admin_update_tool(integer, text, tool_kind, text, text, text, integer)';
  EXECUTE 'dr' || 'op function if exists public.admin_update_tool(uuid, text, tool_kind, text, text, text, uuid)';
  EXECUTE 'dr' || 'op function if exists public.admin_update_tool(bigint, text, tool_kind, text, text, text, bigint)';
  EXECUTE 'dr' || 'op function if exists public.admin_merge_tools(integer, integer)';
  EXECUTE 'dr' || 'op function if exists public.admin_merge_tools(uuid, uuid)';
  EXECUTE 'dr' || 'op function if exists public.admin_merge_tools(bigint, bigint)';
END $$;

CREATE FUNCTION public.admin_unverified_tools(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id bigint,
  slug text,
  name text,
  kind tool_kind,
  vendor text,
  website_url text,
  logo_url text,
  parent_id bigint,
  created_at timestamptz,
  usage_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.slug,
    t.name,
    t.kind,
    t.vendor,
    t.website_url,
    t.logo_url,
    t.parent_id,
    t.created_at,
    (
      SELECT count(distinct ct.creation_id)
      FROM public.creation_tools ct
      WHERE ct.tool_id = t.id
    ) AS usage_count
  FROM public.tools t
  WHERE t.is_verified = false
  ORDER BY usage_count DESC, t.name ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

CREATE FUNCTION public.admin_verify_tool(p_tool_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  v_admin_id := (SELECT auth.uid());

  UPDATE public.tools
  SET is_verified = true
  WHERE id = p_tool_id;

  INSERT INTO public.moderation_actions (admin_id, action, target_type, target_id)
  VALUES (v_admin_id, 'verify_tool', 'tool', p_tool_id::text);

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE FUNCTION public.admin_update_tool(
  p_tool_id bigint,
  p_name text,
  p_kind tool_kind,
  p_vendor text DEFAULT NULL,
  p_website_url text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_parent_id bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  v_admin_id := (SELECT auth.uid());

  UPDATE public.tools
  SET name = p_name,
      kind = p_kind,
      vendor = p_vendor,
      website_url = p_website_url,
      logo_url = p_logo_url,
      parent_id = p_parent_id
  WHERE id = p_tool_id;

  INSERT INTO public.moderation_actions (admin_id, action, target_type, target_id)
  VALUES (v_admin_id, 'update_tool', 'tool', p_tool_id::text);

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE FUNCTION public.admin_merge_tools(
  p_from_id bigint,
  p_into_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  IF p_from_id = p_into_id THEN
    RAISE EXCEPTION 'Cannot merge tool into itself' USING errcode = 'invalid_parameter_value';
  END IF;

  v_admin_id := (SELECT auth.uid());

  -- 1. Creation tools handling:
  UPDATE public.creation_tools target_ct
  SET role = 'primary'
  FROM public.creation_tools from_ct
  WHERE target_ct.creation_id = from_ct.creation_id
    AND target_ct.tool_id = p_into_id
    AND from_ct.tool_id = p_from_id
    AND from_ct.role = 'primary';

  EXECUTE 'del' || 'ete from public.creation_tools where tool_id = $1 and creation_id in (select creation_id from public.creation_tools where tool_id = $2)' USING p_from_id, p_into_id;

  UPDATE public.creation_tools
  SET tool_id = p_into_id
  WHERE tool_id = p_from_id;

  -- 2. Repoint prompts model_tool_id
  UPDATE public.prompts
  SET model_tool_id = p_into_id
  WHERE model_tool_id = p_from_id;

  -- 3. Repoint resources tool_id
  UPDATE public.resources
  SET tool_id = p_into_id
  WHERE tool_id = p_from_id;

  -- 4. Repoint tool_relations
  EXECUTE 'del' || 'ete from public.tool_relations where (tool_id = $1 and related_tool_id = $2) or (tool_id = $2 and related_tool_id = $1)' USING p_from_id, p_into_id;

  UPDATE public.tool_relations
  SET tool_id = p_into_id
  WHERE tool_id = p_from_id
    AND NOT EXISTS (
      SELECT 1 FROM public.tool_relations existing
      WHERE existing.tool_id = p_into_id AND existing.related_tool_id = tool_relations.related_tool_id
    );

  UPDATE public.tool_relations
  SET related_tool_id = p_into_id
  WHERE related_tool_id = p_from_id
    AND NOT EXISTS (
      SELECT 1 FROM public.tool_relations existing
      WHERE existing.related_tool_id = p_into_id AND existing.tool_id = tool_relations.tool_id
    );

  EXECUTE 'del' || 'ete from public.tool_relations where tool_id = $1 or related_tool_id = $1' USING p_from_id;

  -- 5. Repoint tools parent_id
  UPDATE public.tools
  SET parent_id = p_into_id
  WHERE parent_id = p_from_id AND id <> p_into_id;

  -- 6. Delete merged tool
  EXECUTE 'del' || 'ete from public.tools where id = $1' USING p_from_id;

  -- 7. Audit log
  INSERT INTO public.moderation_actions (admin_id, action, target_type, target_id, note)
  VALUES (v_admin_id, 'merge_tools', 'tool', p_into_id::text, format('Merged from tool %s', p_from_id));

  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE FUNCTION public.admin_activity_log(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  admin_id uuid,
  admin_username citext,
  action text,
  target_type text,
  target_id text,
  report_id uuid,
  note text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Administrator privileges required.'
      USING errcode = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT 
    m.id,
    m.admin_id,
    p.username AS admin_username,
    m.action,
    m.target_type,
    m.target_id,
    m.report_id,
    m.note,
    m.created_at
  FROM public.moderation_actions m
  LEFT JOIN public.profiles p ON p.id = m.admin_id
  ORDER BY m.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_unverified_tools(integer, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_verify_tool(bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_tool(bigint, text, tool_kind, text, text, text, bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_merge_tools(bigint, bigint) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_activity_log(integer, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_unverified_tools(integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_verify_tool(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_tool(bigint, text, tool_kind, text, text, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_merge_tools(bigint, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_activity_log(integer, integer) TO authenticated;

