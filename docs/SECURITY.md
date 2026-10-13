# Security Architecture & Direct API Write Surface Inventory

This document defines the security architecture, direct API write surface inventory, function hardening, rate limiting, and advisor findings for Genra, audited directly from the live database catalog.

---

## 1. Direct API Write Surface Inventory

In Supabase, any authenticated user possessing the public anon key can interact directly with the PostgREST HTTP endpoint (`/rest/v1/*`), bypassing application-layer Zod schemas and Next.js Server Actions.

To prevent privilege escalation, counter manipulation, unauthorized ownership transfer, and spam injection, table-level and column-level grants (`GRANT ... ON ... TO authenticated`) strictly limit the direct write surface across all **22 public tables** in the schema:

| Table | Writable Columns on INSERT | Writable Columns on UPDATE | Client Delete | Security Rationale |
|---|---|---|---|---|
| `ai_jobs` | None | None | No | Internal background job queue. Client access completely revoked. |
| `categories` | None | None | No | Read-only taxonomy. Managed by migrations. |
| `collection_items`| `collection_id`, `target_type`, `target_id`, `position`, `note` | `position`, `note` | Yes | `added_at` cannot be updated directly by clients. RLS restricts access to collection owner. |
| `collections` | `id`, `owner_id`, `title`, `description`, `is_public` | `title`, `description`, `is_public` | Yes | `owner_id`, `created_at`, `updated_at` cannot be updated directly by clients. |
| `comments` | None | None | No | Deferred for post-V1. Client access completely revoked. |
| `creation_media` | `id`, `creation_id`, `step_id`, `kind`, `role`, `position`, `storage_path`, `external_url`, `alt_text`, `caption`, `width`, `height`, `duration_ms`, `mime_type` | `step_id`, `kind`, `role`, `position`, `storage_path`, `external_url`, `alt_text`, `caption`, `width`, `height`, `duration_ms`, `mime_type` | Yes | RLS restricts inserts/updates to creation owner. `validate_creation_media` trigger enforces MIME type and file size limits. |
| `creation_prompts`| `creation_id`, `prompt_id`, `step_id`, `position`, `note` | `step_id`, `position`, `note` | Yes | RLS restricts modifications to creation owner. |
| `creation_resources`| `creation_id`, `resource_id`, `position`, `note` | `position`, `note` | Yes | RLS restricts modifications to creation owner. |
| `creation_tags` | `creation_id`, `tag_id`, `source` | None | Yes | RLS restricts modifications to creation owner. |
| `creation_tools` | `creation_id`, `tool_id`, `version`, `role`, `position`, `source` | `version`, `role`, `position` | Yes | RLS restricts modifications to creation owner. |
| `creations` | `id`, `creator_id`, `slug`, `title`, `summary`, `description`, `category_id`, `status`, `live_url`, `repo_url`, `cover_media_id`, `attributes` | `title`, `summary`, `description`, `category_id`, `status`, `live_url`, `repo_url`, `cover_media_id`, `attributes`, `deleted_at` | No | Counters (`like_count`, `save_count`, `comment_count`, `view_count`, `share_count`) and ranking fields (`trending_score`) are stripped from client grants. `enforce_creation_immutability()` prevents modifying `creator_id`, published `slug`, or `published_at`. |
| `likes` | `user_id`, `target_type`, `target_id` | None | Yes | Insert and delete only. Counters updated atomically via database triggers. |
| `process_steps` | `id`, `creation_id`, `title`, `body`, `position` | `title`, `body`, `position` | Yes | RLS restricts modifications to creation owner. |
| `profiles` | None | `display_name`, `username`, `headline`, `bio`, `avatar_url`, `website_url`, `social_links`, `onboarded_at` | No | Auth trigger provisions profile row. `is_admin`, `id`, `created_at`, `updated_at` cannot be updated by client. |
| `prompts` | `id`, `author_id`, `title`, `body`, `kind`, `model_tool_id`, `fork_of_id`, `is_public` | `title`, `body`, `kind`, `model_tool_id`, `is_public`, `deleted_at` | No | Counters (`copy_count`, `like_count`, `save_count`) stripped from client write grants. Soft deletion only. |
| `reports` | `id`, `reporter_id`, `target_type`, `target_id`, `reason` | None | No | Moderation reporting is insert-only. Status and reviewed timestamps are non-writable. |
| `resources` | `id`, `author_id`, `title`, `kind`, `description`, `url`, `body`, `tool_id`, `is_public` | `title`, `kind`, `description`, `url`, `body`, `tool_id`, `is_public`, `deleted_at` | No | Counters (`like_count`, `save_count`) and `storage_path` stripped from client write grants. Soft deletion only. |
| `saves` | `user_id`, `target_type`, `target_id` | None | Yes | Insert and delete only. Counters updated atomically via database triggers. |
| `share_events` | None | None | No | No direct client access. Recorded only through `record_share` RPC. |
| `tags` | `name`, `slug` | `name` | No | Client can quick-create tags; deletion disallowed. |
| `tool_relations` | None | None | No | Read-only graph relationships. Client writes revoked. |
| `tools` | `slug`, `name`, `kind`, `vendor`, `website_url`, `logo_url`, `parent_id`, `created_by` | None | No | Unverified tools can be proposed; `is_verified` is non-writable by clients. |

---

## 2. Functions & Execution Grants Inventory

### Verified `SECURITY DEFINER` Functions (9 Total)
All `SECURITY DEFINER` functions in schema `public` owned by `postgres` have pinned `search_path` and explicit role execution grants:

| Function Name | Pinned `search_path` | Granted Roles | What It Writes |
|---|---|---|---|
| `bump_comment_count()` | `public` | `service_role` only | Increments/decrements `creations.comment_count` (internal trigger). |
| `bump_engagement_count()` | `public` | `service_role` only | Increments/decrements `like_count` and `save_count` on creations, prompts, and resources (internal trigger). |
| `handle_new_user()` | `public` | `service_role` only | Inserts initial profile row on `auth.users` insert (internal auth trigger). |
| `increment_prompt_copy(p_prompt_id uuid)` | `public` | `authenticated`, `service_role` | Atomically increments `prompts.copy_count`. |
| `increment_view(p_creation_id uuid)` | `public` | `anon`, `authenticated`, `service_role` | Atomically increments `creations.view_count` (ignores creator views). |
| `record_share(p_creation_id uuid, p_channel text)` | `public, pg_catalog` | `anon`, `authenticated`, `service_role` | Inserts deduplicated record into `public.share_events` and increments `creations.share_count`. |
| `refresh_trending()` | `public` | `service_role` only | Recalculates `creations.trending_score` via cron. |
| `touch_collection_updated_at()` | `public, pg_temp` | `service_role` only | Updates `collections.updated_at` when collection items change (internal trigger). |
| `validate_creation_media()` | `public, pg_temp` | `service_role` only | Validates MIME type and file size constraints on `creation_media` (internal trigger). |

### Verified `SECURITY INVOKER` Functions
The following functions execute with the privileges and RLS of the invoking caller (`is_security_definer = false`):
- `save_creation(payload jsonb)`: Atomic creation upsert. Runs under the calling user's identity subject to table RLS.
- `can_view_creation(cid uuid)`
- `owns_creation(cid uuid)`
- `enforce_creation_immutability()`
- `discover_cards(...)`
- `discover_prompts(...)`
- `discover_resources(...)`
- `saved_cards(...)`, `saved_prompts(...)`, `saved_resources(...)`
- `popular_tools(...)`, `tool_page(...)`, `collection_page(...)`
- `creations_using_item(...)`
- `add_collection_item(...)`
- `check_collection_limit()`
- `category_counts()`
- `validate_social_links(links jsonb)`
- `set_updated_at()`

*Note:* Functions described in earlier draft documentation such as `delete_account`, `record_view`, `set_liked`, `set_saved`, `sync_creation_metrics`, and `update_updated_at_column` **do not exist** in the live database schema. There is no database-level `rate_limits` table or database cleanup cron trigger.

---

## 3. Rate Limit Table

Rate limiting is enforced at the application boundary using Upstash Redis sliding window limiters (falling back to an in-memory sliding window when unconfigured). No database tables are used for rate limiting.

| Action | Limit | Window | Rate Limit Key |
|---|---|---|---|
| `like` | 60 ops | 60 seconds | `user:{userId}` |
| `save` | 60 ops | 60 seconds | `user:{userId}` |
| `copy_prompt` | 30 ops | 60 seconds | `user:{userId}` |
| `view` | 120 ops | 60 seconds | `ip:{clientIp}` or `user:{userId}` |
| `share` | 30 ops | 60 seconds | `ip:{clientIp}` or `user:{userId}` |
| `save_creation` | 30 ops | 60 seconds | `user:{userId}` |
| `publish_creation` | 10 ops | 60 seconds | `user:{userId}` |
| `prompt_create` | 20 ops | 60 seconds | `user:{userId}` |
| `prompt_fork` | 15 ops | 60 seconds | `user:{userId}` |
| `prompt_crud` | 30 ops | 60 seconds | `user:{userId}` |
| `resource_create` | 20 ops | 60 seconds | `user:{userId}` |
| `resource_crud` | 30 ops | 60 seconds | `user:{userId}` |
| `create_collection` | 20 ops | 60 seconds | `user:{userId}` |
| `collection_crud` | 30 ops | 60 seconds | `user:{userId}` |
| `collection_add_item`| 60 ops | 60 seconds | `user:{userId}` |
| `collection_item` | 60 ops | 60 seconds | `user:{userId}` |
| `propose_tool` | 10 ops | 60 seconds | `user:{userId}` |
| `report` | 10 ops | 60 seconds | `ip:{clientIp}` or `user:{userId}` |
| `csp_report` | 60 ops | 60 seconds | `ip:{clientIp}` |

---

## 4. Database Advisor Findings & Resolution

### Security Advisor Findings
- **`extension_in_public` (2 findings)**: `pg_trgm` and `citext` installed in schema `public`.
  - *Status*: Accepted finding. Extensions were created in `public` in initial migration `0001`. Moving extension schemas on a live hosted instance alters active GIN/trigram index dependencies without changing access control.
- **`anon_security_definer_function_executable` (2 findings)**: `increment_view` and `record_share` callable by `anon`.
  - *Status*: Accepted finding. Public visitors browse and share creations without authenticating. These operations are required for unauthenticated usage and are rate-limited and deduplicated.
- **`authenticated_security_definer_function_executable` (3 findings)**: `increment_prompt_copy`, `increment_view`, `record_share` callable by `authenticated`.
  - *Status*: Accepted finding. Authenticated users copy prompts, view, and share creations; atomic counter increments require elevated privileges to bypass direct table grants.
- **`auth_leaked_password_protection` (1 finding)**: Leaked password protection is disabled in Supabase Auth.
  - *Status*: Accepted finding. Genra uses passwordless authentication (email magic link / OTP and Google OAuth); passwords are not used or stored.

### Performance Advisor Findings
- **`unused_index` (38 findings)**: Indexes that have not yet accumulated scan statistics on the development database.
  - *Status*: Accepted finding. These indexes support search, foreign keys, and sorting in production workloads.
- **`multiple_permissive_policies` (10 findings)**: Tables with separate read and write permissive policies for authenticated users.
  - *Status*: Accepted finding. Preserved for explicit separation of concern between read and write access rules.

---

## 5. Residual Risks & Accepted Mitigations

1. **Direct PostgREST Calls to `increment_view` and `record_share`**:
   - *Risk*: A malicious client could bypass the Next.js application layer and call `/rest/v1/rpc/increment_view` or `/rest/v1/rpc/record_share` directly using the anon key.
   - *Mitigation*:
     - `increment_view` ignores views by the creation owner.
     - `record_share` enforces a 10-minute database-level deduplication window per creation/channel/user.
     - Application layer rate limits abuse.
2. **`profiles.is_admin` Visibility**:
   - *Risk*: `profiles.is_admin` is readable by all users via `SELECT` on `profiles`.
   - *Mitigation*: Direct client writes to `is_admin` are completely revoked (`GRANT UPDATE (...)` on `profiles` excludes `is_admin`). Admin checks in server code and RLS always verify ownership and authority independently; reading `is_admin` does not confer any write privilege.
3. **Authentication CAPTCHA Deferral & Email Rate Limiting**:
   - *Risk*: Without a frontend CAPTCHA challenge, automated scripts calling the Supabase Auth API directly could attempt to trigger excess magic link or OTP emails to target addresses and exhaust Supabase's project email limits.
   - *Mitigation*:
     - Supabase Auth applies built-in server-side IP-level and per-email rate limits on `signInWithOtp`.
     - The frontend enforces a 60-second cooldown timer between submissions (UI convenience; does not stop direct API calls).
     - *(Important architectural note: Application-layer Upstash limiters do **not** protect `signInWithOtp` because requests go directly from the browser to Supabase Auth).*
     - If Supabase rate limits a user (HTTP 429), the error handling gracefully guides them to Google OAuth.
     - When traffic growth warrants, Cloudflare Turnstile can be restored in under 30 minutes via the `lib/auth/captcha.ts` seam as documented in [`docs/CAPTCHA.md`](./CAPTCHA.md).

---

## Appendix: Catalog Verification Queries

The following queries can be executed via the Supabase MCP (`execute_sql`) to independently verify the tables, privileges, and functions in this document:

```sql
-- 1. All public tables and row security status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Writable columns for authenticated role
SELECT table_name, privilege_type, column_name
FROM information_schema.column_privileges
WHERE table_schema = 'public' 
  AND grantee = 'authenticated' 
  AND privilege_type IN ('INSERT', 'UPDATE')
ORDER BY table_name, privilege_type, column_name;

-- 3. Functions in public schema with security definer status
SELECT 
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as is_security_definer,
  p.proconfig as pinned_search_path,
  r.rolname as owner
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles r ON r.oid = p.proowner
WHERE n.nspname = 'public' AND r.rolname = 'postgres'
ORDER BY p.proname;

-- 4. Function execution privileges for anon and authenticated
SELECT 
  p.proname,
  r.rolname as grantee,
  has_function_privilege(r.oid, p.oid, 'EXECUTE') as can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN (SELECT oid, rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')) r
WHERE n.nspname = 'public' AND p.proowner = (SELECT oid FROM pg_roles WHERE rolname = 'postgres')
ORDER BY p.proname, r.rolname;
```
