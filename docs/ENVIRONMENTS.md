# Environment Variables Classification & Security Policy

This document details all environment variables used by Genra, their sensitivity level, scoping, and security guarantees.

## Security Rules

1. **Strict Key Prefixing**: Only keys intended to be exposed to the user's browser may be prefixed with `NEXT_PUBLIC_`.
2. **Zero Service-Role Key**: The Supabase service-role key is **strictly prohibited** across the entire application code, build scripts, CI pipelines, and deployment environments.
3. **Fail-Safe Server Imports**: Any module consuming server secrets must include `import 'server-only'`.
4. **Automated Verification**: Build and CI checks (`scripts/check-env.mjs` and `scripts/scan-client-bundle.mjs`) automatically fail if secrets are misconfigured or detected in client-side bundles.

---

## Variable Classification Matrix

| Variable | Scope | Prefix | Purpose / Example |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client | `NEXT_PUBLIC_` | Supabase project API URL (e.g. `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client | `NEXT_PUBLIC_` | Supabase anonymous public key (JWT with role `anon`) |
| `NEXT_PUBLIC_SITE_URL` | Public / Client | `NEXT_PUBLIC_` | App URL for redirect callbacks (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_EMAIL_AUTH_MODE` | Public / Client | `NEXT_PUBLIC_` | Email auth flow: `magic_link` (default) or `otp` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Public / Client | `NEXT_PUBLIC_` | Cloudflare Turnstile public site key |
| `NEXT_PUBLIC_POSTHOG_KEY` | Public / Client | `NEXT_PUBLIC_` | PostHog public project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | Public / Client | `NEXT_PUBLIC_` | PostHog endpoint (e.g. `https://eu.i.posthog.com`) |
| `NEXT_PUBLIC_SENTRY_DSN` | Public / Client | `NEXT_PUBLIC_` | Sentry public DSN for error reporting |
| `UPSTASH_REDIS_REST_URL` | Server Only | **None** | Upstash Redis REST endpoint for distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Server Only | **None** | Upstash Redis secret authentication token |
| `AI_ENRICHMENT_ENABLED` | Server Only | **None** | Feature flag (`false` in V1) |
| `SENTRY_AUTH_TOKEN` | Build / CI | **None** | Sentry authentication token for sourcemap uploads |
| `SENTRY_ORG` | Build / CI | **None** | Sentry organization slug |
| `SENTRY_PROJECT` | Build / CI | **None** | Sentry project slug |

---

## Allowlisted `NEXT_PUBLIC_` Variables

Only the following exact variable names are permitted to carry the `NEXT_PUBLIC_` prefix:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_EMAIL_AUTH_MODE`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `NEXT_PUBLIC_SENTRY_DSN`

Any other variable starting with `NEXT_PUBLIC_` will trigger a build and CI error.
