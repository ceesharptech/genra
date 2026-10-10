# Security Architecture & Direct API Write Surface Inventory

This document defines the security architecture, direct API write surface inventory, function hardening, rate limiting, and advisor findings for Genra.

---

## 1. Direct API Write Surface Inventory

In Supabase, any authenticated user possessing the public anon key can interact directly with the PostgREST HTTP endpoint (`/rest/v1/*`), bypassing application-layer Zod schemas and Next.js Server Actions.

To prevent privilege escalation, counter manipulation, unauthorized ownership transfer, and spam injection, table-level and column-level grants (`GRANT ... ON ... TO authenticated`) strictly limit the direct write surface.

| Table | Writable Columns on INSERT | Writable Columns on UPDATE | Client Delete | Security Rationale |
|---|---|---|---|---|
| `categories` | None | None | No | Read-only taxonomy. Managed by migrations. |
| `profiles` | None | `display_name`, `username`, `headline`, `bio`, `avatar_url`, `website_url`, `social_links`, `onboarded_at` | No | Auth trigger provisions profile row. `is_admin`, `id`, `created_at`, `updated_at` cannot be updated by client. |
| `creations` | `id`, `creator_id`, `slug`, `title`, `summary`, `description`, `category_id`, `status`, `live_url`, `repo_url`, `cover_media_id`, `attributes` | `title`, `summary`, `description`, `category_id`, `status`, `live_url`, `repo_url`, `cover_media_id`, `attributes`, `deleted_at` | No | Counters (`like_count`, `save_count`, `comment_count`, `view_count`, `share_count`) and ranking fields (`trending_score`) are stripped from client grants. `enforce_creation_immutability()` prevents modifying `creator_id`, published `slug`, or `published_at`. |
| `creation_media` | `id`, `creation_id`, `step_id`, `kind`, `role`, `position`, `storage_path`, `external_url`, `alt_text`, `caption`, `width`, `height`, `duration_ms`, `mime_type` | `step_id`, `kind`, `role`, `position`, `storage_path`, `external_url`, `alt_text`, `caption`, `width`, `height`, `duration_ms`, `mime_type` | Yes | RLS restricts inserts/updates to creation owner. `validate_creation_media` enforces MIME type and file size limits. |
| `creation_tools` | `creation_id`, `tool_id`, `version`, `role`, `position`, `source` | `version`, `role`, `position` | Yes | RLS restricts modifications to creation owner. |
| `creation_tags` | `creation_id`, `tag_id`, `source` | None | Yes | RLS restricts modifications to creation owner. |
| `creation_prompts`| `creation_id`, `prompt_id`, `step_id`, `position`, `note` | `step_id`, `position`, `note` | Yes | RLS restricts modifications to creation owner. |
| `creation_resources`| `creation_id`, `resource_id`, `position`, `note` | `position`, `note` | Yes | RLS restricts modifications to creation owner. |
| `process_steps` | `id`, `creation_id`, `title`, `body`, `position` | `title`, `body`, `position` | Yes | RLS restricts modifications to creation owner. |
| `prompts` | `id`, `author_id`, `title`, `body`, `kind`, `model_tool_id`, `fork_of_id`, `is_public` | `title`, `body`, `kind`, `model_tool_id`, `is_public`, `deleted_at` | No | Counters (`copy_count`, `like_count`, `save_count`) stripped from client write grants. Soft deletion only. |
| `resources` | `id`, `author_id`, `title`, `kind`, `description`, `url`, `body`, `tool_id`, `is_public` | `title`, `kind`, `description`, `url`, `body`, `tool_id`, `is_public`, `deleted_at` | No | Counters (`like_count`, `save_count`) and `storage_path` stripped from client write grants. Soft deletion only. |
| `tools` | `slug`, `name`, `kind`, `vendor`, `website_url`, `logo_url`, `parent_id`, `created_by` | None | No | Unverified tools can be proposed; `is_verified` is non-writable by clients. |
| `tags` | `name`, `slug` | `name` | No | Client can quick-create tags; deletion disallowed. |
| `collections` | `id`, `owner_id`, `title`, `description`, `is_public` | `title`, `description`, `is_public` | Yes | `owner_id`, `created_at`, `updated_at` cannot be updated directly by clients. |
| `collection_items`| `collection_id`, `target_type`, `target_id`, `position`, `note` | `position`, `note` | Yes | `added_at` cannot be updated directly by clients. |
| `likes` | `user_id`, `target_type`, `target_id` | None | Yes | Insert and delete only. Counters updated atomically via database triggers. |
| `saves` | `user_id`, `target_type`, `target_id` | None | Yes | Insert and delete only. Counters updated atomically via database triggers. |
| `reports` | `id`, `reporter_id`, `target_type`, `target_id`, `reason` | None | No | Moderation reporting is insert-only. Status and reviewed timestamps are non-writable. |
| `share_events` | None | None | No | No direct client access. Recorded only through `record_share` RPC. |
| `comments` | None | None | No | Deferred for post-V1. Client access completely revoked. |
| `ai_jobs` | None | None | No | Internal background job table. Client access completely revoked. |

---

## 2. Security Definer Functions Inventory

All `SECURITY DEFINER` functions in the `public` schema have pinned `search_path` and explicit role execution grants:

| Function Name | Owner | Pinned `search_path` | Granted Roles | What It Writes |
|---|---|---|---|---|
| `bump_comment_count` | `postgres` | `public` | `service_role` only | Increments/decrements `creations.comment_count` (internal trigger). |
| `bump_engagement_count` | `postgres` | `public` | `service_role` only | Increments/decrements `like_count` and `save_count` on creations, prompts, and resources (internal trigger). |
| `handle_new_user` | `postgres` | `public` | `service_role` only | Inserts initial profile row on `auth.users` insert (internal auth trigger). |
| `increment_prompt_copy` | `postgres` | `public` | `authenticated`, `service_role` | Atomically increments `prompts.copy_count`. |
| `increment_view` | `postgres` | `public` | `anon`, `authenticated`, `service_role` | Atomically increments `creations.view_count` (ignores creator views). |
| `record_share` | `postgres` | `public, pg_catalog` | `anon`, `authenticated`, `service_role` | Inserts deduplicated record into `public.share_events` and increments `creations.share_count`. |
| `refresh_trending` | `postgres` | `public` | `service_role` only | Recalculates `creations.trending_score` via cron. |
| `touch_collection_updated_at` | `postgres` | `public, pg_temp` | `service_role` only | Updates `collections.updated_at` when collection items change (internal trigger). |
| `validate_creation_media` | `postgres` | `public, pg_temp` | `service_role` only | Validates MIME type and file size constraints on `creation_media` (internal trigger). |

---

## 3. Rate Limit Table

Rate limiting is enforced at the application boundary using Upstash Redis sliding window limiters (falling back to an in-memory sliding window when unconfigured):

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
- **`auth_leaked_password_protection` (1 finding)**: Leaked password protection is disabled.
  - *Status*: Accepted finding. Genra uses email magic links for authentication; passwords are not used.

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
