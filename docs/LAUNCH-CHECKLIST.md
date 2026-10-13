# Genra Production Launch Checklist

This checklist outlines the required steps to launch Genra on free tiers (Vercel Hobby, Supabase Free, Upstash Redis, PostHog Free, Sentry Developer) with zero upfront infrastructure cost.

---

## 1. Pre-Launch Quality & Security Gates

Run and verify all local quality gates before initiating production deployment:

- [ ] **Typecheck**: `npm run typecheck` exits with code 0.
- [ ] **Lint**: `npm run lint` passes cleanly with no errors.
- [ ] **Unit Tests**: `npm run test` passes 100%.
- [ ] **Env Scan**: `npm run check:env` verifies zero unknown `NEXT_PUBLIC_` variables and no missing required variables.
- [ ] **Bundle Security Scan**: `npm run check:bundle` verifies zero leaked private keys or service-role tokens in the client build.
- [ ] **Production SQL Package**: `npm run build:prod-sql` generates up-to-date `supabase/prod/consolidated.sql` and `supabase/prod/verify.sql`.

---

## 2. Infrastructure Setup (All Free Tiers)

### 2.1 Supabase Production Project
- [ ] Create a new project on [Supabase.com](https://supabase.com) (Free Tier, Region: `eu-west-1` or closest to audience).
- [ ] In SQL Editor, run `supabase/prod/consolidated.sql`.
- [ ] In SQL Editor, run `supabase/prod/verify.sql` and ensure all 23 tables and 26 RPCs pass.
- [ ] Set **Site URL** to `https://<your-app>.vercel.app` in Authentication > URL Configuration.
- [ ] Add `https://<your-app>.vercel.app/auth/callback` to Redirect URLs.
- [ ] Check Storage buckets: `avatars` and `creation-media` are created and marked public.

### 2.2 Upstash Redis (Rate Limiting)
- [ ] Create a free database on [Upstash Console](https://console.upstash.com).
- [ ] Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
- [ ] Free tier limits: 10,000 commands/day (sufficient for early launch).

### 2.3 PostHog Analytics
- [ ] Create a free project on [PostHog Cloud](https://eu.posthog.com).
- [ ] Copy Project API Key (`NEXT_PUBLIC_POSTHOG_KEY`) and Host (`https://eu.i.posthog.com`).
- [ ] Confirm Reverse Proxy route `/ingest/:path*` is configured in `next.config.ts`.
- [ ] PostHog settings: Autocapture disabled, Session Replay disabled, memory persistence enabled.

### 2.4 Sentry Error Monitoring
- [ ] Create a Next.js project on [Sentry.io](https://sentry.io) (Developer Free plan).
- [ ] Copy `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, and `SENTRY_PROJECT`.
- [ ] Generate a build auth token (`SENTRY_AUTH_TOKEN`) with `project:releases` scope.

---

## 3. Vercel Deployment Configuration

In your Vercel Project Settings > Environment Variables, configure the production variables:

| Variable Name | Environment | Value Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production | `https://<prod-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Supabase production `anon` public key |
| `NEXT_PUBLIC_SITE_URL` | Production | `https://<your-app>.vercel.app` |
| `NEXT_PUBLIC_EMAIL_AUTH_MODE` | Production | `magic_link` |
| `NEXT_PUBLIC_POSTHOG_KEY` | Production | PostHog public project key |
| `NEXT_PUBLIC_POSTHOG_HOST` | Production | `https://eu.i.posthog.com` |
| `NEXT_PUBLIC_SENTRY_DSN` | Production | Sentry public DSN |
| `UPSTASH_REDIS_REST_URL` | Production | Upstash REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Production | Upstash secret REST token |
| `SENTRY_AUTH_TOKEN` | Production | Sentry source map upload token |
| `SENTRY_ORG` | Production | Sentry org slug |
| `SENTRY_PROJECT` | Production | Sentry project slug |
| `AI_ENRICHMENT_ENABLED` | Production | `false` |

> [!CAUTION]
> Do NOT set `NEXT_PUBLIC_POSTHOG_DEBUG` or `NEXT_PUBLIC_SENTRY_DEBUG` in production. Ensure no `SUPABASE_SERVICE_ROLE_KEY` is present.

---

## 4. Launch Day Execution & Smoke Tests

1. **Trigger Vercel Production Build**:
   - Push latest commit to `main` branch or trigger deployment in Vercel dashboard.
   - Verify build logs: TypeScript compiles, lint passes, source maps upload to Sentry.

2. **Initial User Onboarding**:
   - Open production URL `https://<your-app>.vercel.app`.
   - Sign up with your administrator email. Complete username onboarding.

3. **Promote First Admin**:
   - In Supabase SQL Editor:
     ```sql
     UPDATE public.profiles SET is_admin = true WHERE username = 'your_username';
     ```
   - Refresh browser; verify the "Admin panel" link appears in the avatar dropdown and `/admin` is accessible.

4. **Verify Core Functional Flows**:
   - [ ] **Publish Creation**: Create a new creation with title, category, cover image, and primary tool. Verify it appears on `/discover` and Home.
   - [ ] **Engagement**: Like, save, and copy prompt. Verify optimistic counts update.
   - [ ] **Collections**: Create a collection and add items to it.
   - [ ] **Reporting Flow**: Report a test item; verify it appears in `/admin` Reports queue.
   - [ ] **Admin Actions**: Verify test report, hide item, verify moderation lock prevents editing.
   - [ ] **Data Export**: In `/settings`, click "Export data (JSON)" and inspect downloaded payload.
   - [ ] **Legal Pages**: Check `/terms`, `/privacy` (test PostHog opt-out toggle), `/content-policy`, and `/copyright`.
   - [ ] **Security 404s**: Sign out and confirm `/admin` returns HTTP 404.
