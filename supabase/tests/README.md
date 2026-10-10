# Genra Database RLS & Security Test Suite

This directory contains the SQL test suite verifying Row Level Security (RLS), column-level grant lockdown, integrity constraints, and security definer functions for Genra.

All test suites are **self-contained transactions** (`BEGIN; ... ROLLBACK;`). They create temporary fixtures in `auth.users` and application tables, simulate different user roles (`anon`, resource owner, foreign user, administrator), assert expected permissions and errors, and cleanly roll back all mutations without leaving behind any test data.

## Test Suites

1. [`write_surface.sql`](./write_surface.sql): Verifies column-level privilege revocation and write surface lockdown. Asserts that clients (anon and authenticated) cannot update protected fields (counters, rankings, moderation, identity columns, created_at) and cannot access restricted internal tables (`comments`, `share_events`, `ai_jobs`). Confirms admin self-profile edits.
2. [`profiles.sql`](./profiles.sql): Verifies `profiles` RLS policies (public read, own update, stranger update blocked) and database constraints (URL check, social links jsonb schema validation).
3. [`creations.sql`](./creations.sql): Verifies `creations` RLS policies (anon reads published only, draft access restricted to creator), character limits (title length 3–140 chars), URL validations (live_url scheme), and creation media storage prefix enforcement (`{creator_id}/...`).
4. [`prompts_resources.sql`](./prompts_resources.sql): Verifies `prompts` and `resources` RLS (public vs. private visibility, owner mutation rights, foreign user write blocked) and length/URL constraints.
5. [`engagement.sql`](./engagement.sql): Verifies `likes` and `saves` RLS policies (anon blocked, authenticated owns rows, cannot like on behalf of another user), uniqueness enforcement, and automatic count increment/decrement triggers.
6. [`collections.sql`](./collections.sql): Verifies `collections` and `collection_items` RLS (public vs. private collections, owner-only item additions), foreign write rejections, and the `touch_collection_updated_at` trigger updating `collections.updated_at`.
7. [`sharing_and_views.sql`](./sharing_and_views.sql): Verifies `increment_view()` and `record_share()` RPC functions, view count self-view exclusions, 10-minute share deduplication, direct `share_events` write blocks, and `refresh_trending()` score calculation.
8. [`storage.sql`](./storage.sql): Verifies `storage.objects` policies on `avatars` and `creation-media` buckets, asserting that users can only upload, update, and delete objects under their own `{user_id}/` prefix, while public read is permitted.

## Running Tests

### Via Supabase MCP

Execute any test file via the Supabase MCP `execute_sql` tool with `project_id: "ngofkoeclkrxgpefkbuv"`:

```json
{
  "project_id": "ngofkoeclkrxgpefkbuv",
  "query": "<contents of test file>"
}
```

The script returns a table of test assertions:

```json
[
  {"name": "Anon cannot INSERT into creations", "passed": true, "error_message": "OK"},
  {"name": "Authenticated cannot UPDATE creations.view_count", "passed": true, "error_message": "OK"},
  ...
]
```

### Via `psql`

```bash
psql "$DATABASE_URL" -f supabase/tests/write_surface.sql
psql "$DATABASE_URL" -f supabase/tests/profiles.sql
psql "$DATABASE_URL" -f supabase/tests/creations.sql
psql "$DATABASE_URL" -f supabase/tests/prompts_resources.sql
psql "$DATABASE_URL" -f supabase/tests/engagement.sql
psql "$DATABASE_URL" -f supabase/tests/collections.sql
psql "$DATABASE_URL" -f supabase/tests/sharing_and_views.sql
psql "$DATABASE_URL" -f supabase/tests/storage.sql
```
