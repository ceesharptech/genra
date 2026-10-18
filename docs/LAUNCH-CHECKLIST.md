# Genra — Production Go-Live Runbook & Launch Checklist

This document is the definitive, chronological go-live runbook for launching Genra on the canonical domain **`https://genra.dev`** using zero-cost free tiers (Vercel Hobby, Supabase Free, Upstash Redis, PostHog Free, Sentry Developer).

---

## 1. Pre-Flight Verification & Quality Gates

Run and verify every gate locally before pushing code or deploying to production:

```bash
# 1. Typecheck strict check
npm run typecheck

# 2. ESLint linting pass
npm run lint

# 3. Unit test suite execution
npm run test

# 4. Production environment variables validator (fails if non-HTTPS, vercel.app, or localhost)
npm run check:prod-env

# 5. Client bundle security scan (ensures zero service-role keys or leaks)
npm run check:bundle

# 6. Verify allowlisted NEXT_PUBLIC_ variables
npm run check:env
```

Ensure all commands exit with code `0`.

---

## 2. Production Supabase Project Setup

> [!IMPORTANT]
> The AI agent **never connects to the production Supabase database**. All production database setup is performed manually by the owner via the hosted Supabase Dashboard.

### 2.1 Schema Application
1. In the [Supabase Dashboard](https://supabase.com/dashboard), navigate to your **Production Project** (`eu-west-1` Ireland).
2. Open the **SQL Editor** (`New query`).
3. Copy the entire contents of [`supabase/prod/consolidated.sql`](../supabase/prod/consolidated.sql) and paste it into the editor.
4. Click **Run**. Confirm that all tables, foreign keys, RLS policies, triggers, and functions execute cleanly.

### 2.2 Verification Script
1. In the Supabase SQL Editor, open a new query tab.
2. Copy and paste [`supabase/prod/verify.sql`](../supabase/prod/verify.sql).
3. Click **Run**.
4. Confirm the output finishes with:
   ```text
   SUCCESS: All 23 tables, RLS policies, functions, triggers, and storage buckets verified.
   ```

### 2.3 Storage Buckets & Policies
Verify under **Storage** > **Buckets**:
- `creation-media`: Public bucket, 50 MB file size limit, allowed MIME types `image/*`, `video/*`.
- `avatars`: Public bucket, 2 MB file size limit, allowed MIME types `image/*`.
- RLS policies on `storage.objects` allow authenticated users to upload and manage their own files.

---

## 3. Auth Configuration in Supabase Dashboard

In the production Supabase Dashboard under **Authentication**:

### 3.1 URL Configuration
- **Site URL:** `https://genra.dev`
- **Redirect URLs:**
  - `https://genra.dev/**`
  - `https://genra.dev/auth/callback`

### 3.2 Google OAuth Provider
1. Open **Authentication** > **Providers** > **Google**.
2. Enable the provider.
3. Enter your Google Cloud OAuth **Client ID** and **Client Secret**.
4. In Google Cloud Console (`APIs & Services > Credentials`), ensure the **Authorized redirect URI** is set to:
   ```text
   https://<prod-supabase-ref>.supabase.co/auth/v1/callback
   ```

### 3.3 Email Auth & Expiry Recommendations
1. Open **Authentication** > **Email Auth**:
   - Enable Email Sign-in.
   - Initial Mode: Magic Link (until custom SMTP is configured).
   - **Recommended OTP Expiry:** Set to **900 seconds (15 minutes)**.
   - **Access Token (JWT) Expiry:** 3600 seconds (1 hour).
   - **Refresh Token Expiry:** 30 days (default).
2. Confirm the account deletion RPC function `delete_own_account` is callable by authenticated users.

---

## 4. Storage Configuration

Verify the storage bucket limits in the production database:
1. `creation-media`:
   - Maximum upload size: `52428800` bytes (50 MB).
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `video/mp4`, `video/webm`.
2. `avatars`:
   - Maximum upload size: `2097152` bytes (2 MB).
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`.
3. Confirm public CDN URLs resolve properly at `https://<prod-ref>.supabase.co/storage/v1/object/public/creation-media/...`.

---

## 5. Vercel Project Configuration

### 5.1 Domain Configuration
In [Vercel Dashboard](https://vercel.com) > **Project Settings** > **Domains**:
1. Add **`genra.dev`** (Set as **Primary / Canonical**).
2. Add **`www.genra.dev`** (Configure to automatically redirect to `genra.dev`).

### 5.2 DNS Records (Domain Registrar)
At your domain registrar (e.g., Cloudflare, Namecheap, Google Domains), set:

| Type | Name | Content / Value | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `76.76.21.21` | Auto / 3600 |
| **CNAME** | `www` | `cname.vercel-dns.com.` | Auto / 3600 |

### 5.3 Region Alignment
- Genra's `vercel.json` designates `regions: ["dub1"]` (Dublin, Ireland), co-located with Supabase `eu-west-1` to minimize round-trip latency (~2-5 ms server-to-db).

### 5.4 Environment Variables Table (Production)

Set these under Vercel **Project Settings** > **Environment Variables** for the **Production** environment:

| Variable | Scope | Target Value / Format | Sensitive |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SITE_URL` | Public | `https://genra.dev` | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | `https://<prod-project-ref>.supabase.co` | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Production Supabase `anon` public key | No |
| `NEXT_PUBLIC_EMAIL_AUTH_MODE` | Public | `magic_link` (initially) or `otp` (after SMTP) | No |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Public | `support@genra.dev` | No |
| `NEXT_PUBLIC_LEGAL_NAME` | Public | `Genra Inc.` (or legal operating name) | No |
| `NEXT_PUBLIC_GOVERNING_LAW` | Public | `Delaware, United States` (or relevant jurisdiction) | No |
| `NEXT_PUBLIC_MIN_AGE` | Public | `13` | No |
| `NEXT_PUBLIC_POSTHOG_KEY` | Public | Production PostHog Project API Key | No |
| `NEXT_PUBLIC_POSTHOG_HOST` | Public | `https://eu.i.posthog.com` | No |
| `NEXT_PUBLIC_SENTRY_DSN` | Public | Production Sentry DSN | No |
| `CSP_MODE` | Server | `report-only` (launch) -> `enforce` (later) | No |
| `UPSTASH_REDIS_REST_URL` | Server | Production Upstash REST URL | **Yes** |
| `UPSTASH_REDIS_REST_TOKEN` | Server | Production Upstash REST Secret Token | **Yes** |
| `SENTRY_AUTH_TOKEN` | Server | Sentry Build Auth Token (releases scope) | **Yes** |
| `SENTRY_ORG` | Server | Sentry organization slug | No |
| `SENTRY_PROJECT` | Server | Sentry project slug | No |
| `AI_ENRICHMENT_ENABLED` | Server | `false` | No |

> [!CAUTION]
> Never set `NEXT_PUBLIC_POSTHOG_DEBUG`, `NEXT_PUBLIC_SENTRY_DEBUG`, or any `SUPABASE_SERVICE_ROLE_KEY` in production.

---

## 6. Transactional Email & OTP Cutover

Follow the full step-by-step instructions in [`docs/EMAIL-TEMPLATES.md`](./EMAIL-TEMPLATES.md):

1. **DNS Verification:** Configure SPF, DKIM, and DMARC (`v=DMARC1; p=none;`) records in your DNS manager for `genra.dev`.
2. **Supabase SMTP Setup:** In Supabase **Authentication** > **SMTP Settings**, configure SMTP host, port, user, password, sender `Genra <no-reply@genra.dev>`, and reply-to `support@genra.dev`.
3. **Paste Templates:** Copy templates from [`docs/EMAIL-TEMPLATES.md`](./EMAIL-TEMPLATES.md) into Supabase Dashboard for Confirm Signup, Magic Link, and Change Email.
4. **Send Test Email:** Confirm delivery and clean formatting.
5. **Switch to OTP:** In Vercel, change `NEXT_PUBLIC_EMAIL_AUTH_MODE=otp` and redeploy.
6. **Rollback:** If deliverability issues arise, set `NEXT_PUBLIC_EMAIL_AUTH_MODE=magic_link` in Vercel and redeploy immediately.

---

## 7. Content Security Policy (CSP) Transition

Follow the staged rollout strategy in [`docs/CSP.md`](./CSP.md):

1. **Launch in Report-Only:** Ensure `CSP_MODE=report-only` (or unset) on production.
2. **7-Day Observation:** Monitor `/api/csp-report` telemetry in Sentry / server logs for 7 consecutive days of live traffic.
3. **Audit Violations:** Ensure all video embeds, Google profile avatars, Supabase Storage assets, and PostHog tracking execute without valid policy violations.
4. **Enforce Policy:** Set `CSP_MODE=enforce` in Vercel and trigger a production redeploy.

---

## 8. Analytics & Monitoring Setup

### 8.1 PostHog
1. Create a dedicated project in [PostHog Cloud](https://eu.posthog.com).
2. Copy Project API Key to `NEXT_PUBLIC_POSTHOG_KEY`.
3. Verify `/ingest` reverse proxy handles pageviews without browser extension ad-blocker interference.
4. Verify memory persistence and absence of personal identifiers (user email, search queries) in captured events.

### 8.2 Sentry
1. Create a production project in [Sentry.io](https://sentry.io).
2. Add `NEXT_PUBLIC_SENTRY_DSN` and build credentials (`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`).
3. Deploy to production. Verify release commit SHA tags appear on incoming events.
4. Test source map unminification.

### 8.3 Upstash Redis
1. Create an Upstash Redis database in `eu-west-1` (Ireland).
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
3. Rate limits apply to auth requests, creation creation, and public sharing.

---

## 9. Seed & Bootstrap Data

1. **Categories:** Verify default categories are present in `public.categories` (`websites`, `apps`, `images`, `video`, `agents`, `automations`, `threed`, `design`).
2. **Verified Tools:** Seed core AI tools in `public.tools` (e.g. `claude-code`, `cursor`, `midjourney`, `chatgpt`, `v0`, `bolt-new`, `runway`, `elevenlabs`).
3. **Staff / Featured Creations:** If pre-launch showcase creations are prepared, publish them so first-time visitors immediately encounter high-quality examples on `/discover`.

---

## 10. Smoke Testing Checklist (Owner Manual Script)

Execute this comprehensive checklist on `https://genra.dev` after production deployment:

- [ ] **Anonymous Browsing:** Home (`/`), Discover (`/discover`), Prompts (`/prompts`), Resources (`/resources`), and Tools (`/tools/[slug]`) load cleanly without login.
- [ ] **Search & Filtering:** Search for a term; filter by category; filter by tool. Verify URL state updates and results match.
- [ ] **Magic Link Sign-In:** Enter email in `/login`. Receive link, click, and verify session completes in browser.
- [ ] **Google OAuth Sign-In:** Click "Continue with Google". Complete OAuth consent and verify redirection back to target URL.
- [ ] **OTP Code Sign-In:** (When in OTP mode) Request code, enter 6 digits, verify automatic session creation.
- [ ] **New User Onboarding:** New account redirects to `/onboarding`. Choose username, bio, and avatar. Verify persistence.
- [ ] **Avatar Upload:** Upload a profile picture. Verify resizing, public bucket display, and lack of layout shift.
- [ ] **Create Creation:** Navigate to `/new`. Enter title, select category, upload cover image, and select tool.
- [ ] **Autosave Verification:** Edit description; verify "Saved" status indicator debounces and updates cleanly.
- [ ] **Publish Flow:** Click "Publish". Verify status updates to published and creation is viewable at `https://genra.dev/c/[slug]`.
- [ ] **Idempotent Like & Save:** Click Like and Save while authenticated. Confirm counters increment. Refresh page; confirm liked/saved state persists.
- [ ] **Copy Prompt Action:** Copy a prompt; verify clipboard toast displays.
- [ ] **Share Menu & Native Sheet:** Click Share. Verify copy link, social shortcuts, and deduplicated share counter.
- [ ] **Social Preview Card (OG):** Paste a creation URL into Twitter Card Validator or opengraph.xyz. Verify 1200x630 preview image renders.
- [ ] **User Profile Page:** Navigate to `/u/[username]`. Verify user creations, saved tab (private to owner), and bio.
- [ ] **Settings & Profile Edit:** Update profile bio and link in `/settings`. Confirm changes reflect.
- [ ] **Account Data Export:** Click "Export data (JSON)" in `/settings`. Verify downloaded JSON contains all user data.
- [ ] **Dark / Light Mode Toggle:** Toggle theme between light, dark, and system. Confirm contrast across all views.
- [ ] **Mobile Responsiveness:** View on mobile viewport (<400px width). Ensure zero horizontal overflow and full touch usability.
- [ ] **Legal Pages & Security.txt:**
  - View `/terms`, `/privacy`, `/copyright`, `/content-policy`. Confirm `support@genra.dev` contact links work.
  - View `https://genra.dev/.well-known/security.txt`. Confirm RFC 9116 format.
- [ ] **Logout:** Sign out from navigation menu. Verify session cookie clears and gated actions prompt login.
- [ ] **Account Deletion:** Delete test account in `/settings`. Confirm database user and profile rows cascade cleanly.

---

## 11. Keepalive Verification

1. In the GitHub repository settings > **Secrets and variables** > **Actions**:
   - Add repository variable: `SITE_URL = https://genra.dev`.
2. Navigate to **Actions** > **Supabase Database Keep-Alive**.
3. Click **Run workflow** (workflow_dispatch).
4. Verify the step pings `https://genra.dev/api/health` and logs `200 OK` (keeping Supabase free tier active).

---

## 12. Launch Day Communications Checklist

- [ ] **Preview Verification:** Run `https://genra.dev` and key creation links through [OpenGraph.xyz](https://www.opengraph.xyz/) to confirm Twitter/LinkedIn cards look crisp.
- [ ] **Product Hunt:** Schedule post with tagline *"The discovery & learning platform for things built with AI"*.
- [ ] **Twitter / X:** Post launch announcement thread showcasing 3 real AI creations with video embeds.
- [ ] **LinkedIn / Reddit / Discord:** Share in relevant AI developer and creator communities (`r/artificial`, `r/nextjs`, Cursor / Claude communities).

---

## 13. Day 1 & Week 1 Operations Runbook

- **Moderation Queue:** Log into an admin account and check `/admin` daily for reported creations or resources.
- **Sentry Error Budget:** Review unhandled error trends. Filter out client-side network disconnects or ad-blocker noise.
- **Support Inbox:** Monitor `support@genra.dev` for bug reports, account assistance, or DMCA notices.
- **DMCA / Copyright Requests:** Follow statutory takedown procedure outlined in `/copyright`.
- **Resource Monitoring:** In Supabase Dashboard > **Settings** > **Usage**, monitor database size (<500 MB) and storage (<1 GB).

---

## 14. Rollback & Disaster Recovery Runbook

### 14.1 Instant Vercel Rollback
If a faulty deployment reaches production:
1. Open Vercel Dashboard > **Deployments**.
2. Locate the last known good deployment.
3. Click the three dots menu > **Instant Rollback**.
4. Traffic is rerouted to the prior build in less than 5 seconds.

### 14.2 Database Recovery
1. If data corruption occurs, restore from the latest automated Supabase point-in-time backup.
2. In disaster scenarios, reapply `supabase/prod/consolidated.sql` to a clean project.

### 14.3 Incident Communication
1. Update status on official social channels.
2. Direct all inquiries to `support@genra.dev`.
