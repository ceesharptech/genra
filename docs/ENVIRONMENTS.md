# Environment Variables Classification & Security Policy

This document details all environment variables used by Genra, their sensitivity level, scoping, and security guarantees.

---

## 1. Security Rules

1. **Strict Key Prefixing**: Only keys intended to be exposed to the user's browser may be prefixed with `NEXT_PUBLIC_`.
2. **Zero Service-Role Key**: The Supabase service-role key is **strictly prohibited** across the entire application code, build scripts, CI pipelines, and deployment environments.
3. **Fail-Safe Server Imports**: Any module consuming server secrets must include `import 'server-only'`.
4. **Build-Time vs. Runtime Scoping**:
   - Next.js statically inlines all `NEXT_PUBLIC_*` values into the client JavaScript bundle **at build time**. Changing them on Vercel requires triggering a **redeploy** for changes to take effect in user browsers.
   - Sentry release configuration (`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`) is evaluated **at build time** during `next build` to upload and delete source maps.
5. **Automated Verification**: Build and CI checks (`scripts/check-env.mjs` and `scripts/scan-client-bundle.mjs`) automatically fail if secrets are misconfigured or detected in client-side bundles.

---

## 2. Variable Classification Matrix

| Variable | Scope | When Needed | Prefix | Purpose / Example |
| :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client | **Build & Runtime** | `NEXT_PUBLIC_` | Supabase project API URL (e.g. `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client | **Build & Runtime** | `NEXT_PUBLIC_` | Supabase anonymous public key (JWT with role `anon`) |
| `NEXT_PUBLIC_SITE_URL` | Public / Client | **Build & Runtime** | `NEXT_PUBLIC_` | App URL for canonical redirects & sitemaps (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_EMAIL_AUTH_MODE` | Public / Client | **Build & Runtime** | `NEXT_PUBLIC_` | Email auth flow: `magic_link` (default) or `otp` |
| `NEXT_PUBLIC_POSTHOG_KEY` | Public / Client | **Build & Runtime** | `NEXT_PUBLIC_` | PostHog public project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | Public / Client | **Build & Runtime** | `NEXT_PUBLIC_` | PostHog endpoint (e.g. `https://eu.i.posthog.com`) |
| `NEXT_PUBLIC_POSTHOG_DEBUG` | Public / Client | **Build & Runtime** | `NEXT_PUBLIC_` | Enables PostHog in development with `posthog.debug()` (default `false`) |
| `NEXT_PUBLIC_SENTRY_DSN` | Public / Client | **Build & Runtime** | `NEXT_PUBLIC_` | Sentry public DSN for error reporting |
| `NEXT_PUBLIC_SENTRY_DEBUG` | Public / Client | **Build & Runtime** | `NEXT_PUBLIC_` | Enables Sentry client debug logging (default `false`) |
| `UPSTASH_REDIS_REST_URL` | Server Only | Runtime | **None** | Upstash Redis REST endpoint for distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Server Only | Runtime | **None** | Upstash Redis secret authentication token |
| `AI_ENRICHMENT_ENABLED` | Server Only | Runtime | **None** | Feature flag (`false` in V1) |
| `SENTRY_AUTH_TOKEN` | Server Only | **Build Time** | **None** | Sentry organization auth token for sourcemap upload |
| `SENTRY_ORG` | Server Only | **Build Time** | **None** | Sentry organization slug |
| `SENTRY_PROJECT` | Server Only | **Build Time** | **None** | Sentry project slug |
| `SENTRY_DEBUG` | Server Only | Runtime | **None** | Enables verbose Sentry server-side SDK logging (`true`/`false`) |
| `SENTRY_TEST_TOKEN` | Server Only | Runtime | **None** | Secret token gating `/sentry-test` & `/api/sentry-test` (returns 404 when unset) |

---

## 3. Allowlisted `NEXT_PUBLIC_` Variables

Only the following exact variable names are permitted to carry the `NEXT_PUBLIC_` prefix:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_EMAIL_AUTH_MODE`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_POSTHOG_DEBUG`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DEBUG`
- `NEXT_PUBLIC_VERCEL_ENV`
- `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`

Any other variable starting with `NEXT_PUBLIC_` will trigger a build and CI error via `scripts/check-env.mjs`.

---

## 4. Environment Topology & Production Packaging

Genra maintains strict separation between the Development environment and the Production environment:

| Attribute | Development Environment | Production Environment |
| :--- | :--- | :--- |
| **Hosting** | Local (`localhost:3000`) & Vercel Preview | Vercel Production (`*.vercel.app`) |
| **Supabase Project** | Hosted Dev (`ngofkoeclkrxgpefkbuv`) | Hosted Production (Separate project) |
| **Agent Access** | Connected via Supabase MCP | **Agent NEVER connects to Production** |
| **Migrations** | Applied incrementally (`0001` - `0019`) via MCP | Applied manually via `supabase/prod/consolidated.sql` |
| **Schema Verification** | `supabase/tests/*.sql` | `supabase/prod/verify.sql` |
| **Service Role Key** | Strictly prohibited | Strictly prohibited |

### Production Deployment Script:
To regenerate the consolidated production script after any database change:
```bash
npm run build:prod-sql
```
This generates:
- `supabase/prod/consolidated.sql`: The full database definition.
- `supabase/prod/verify.sql`: Automated verification suite asserting all 22 public tables, RLS policies, 26 functions, storage buckets, and seeds.
See [`supabase/prod/README.md`](../supabase/prod/README.md) for full instructions.
