# Genra

The discovery and learning platform for things people create with AI. Live at **[https://genra.dev](https://genra.dev)**.

Creators publish a **creation** (website, app, image, video, agent, workflow) together with how it was made: tools, prompts, process steps, and resources. Visitors browse, filter, learn from the process, and reuse prompts and resources.

For full production deployment instructions, see the **[Production Go-Live Runbook](./docs/LAUNCH-CHECKLIST.md)**.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Email sign-in modes

Genra supports two passwordless email sign-in modes controlled by `NEXT_PUBLIC_EMAIL_AUTH_MODE`:

1. **`magic_link` (Default)**:
   - **How it works:** Supabase sends a confirmation email containing a magic link. Clicking the link completes the PKCE auth exchange at `/auth/callback?code=...` and establishes the user session.
   - **Why it is default:** Supabase default email templates cannot be edited without custom SMTP configured. Since default templates include `{{ .ConfirmationURL }}` rather than `{{ .Token }}`, magic links work out of the box without requiring custom email infrastructure.
   - **Same-browser requirement:** PKCE requires the code verifier cookie stored in the browser that initiated the sign-in request. If the link is opened in a different browser, incognito mode, or an isolated mobile app webview, the exchange fails gracefully and informs the user to open the link in the requesting browser.
2. **`otp` (6-digit one-time code)**:
   - **How it works:** Supabase emails a 6-digit verification code (`{{ .Token }}`) that the user types directly into the login form. Works across different browsers and devices.
   - **How to enable:**
     1. Configure custom SMTP in the Supabase Dashboard (under Project Settings > Authentication > SMTP Settings).
     2. Edit the email templates ("Confirm signup" and "Magic Link") to include `{{ .Token }}` instead of `{{ .ConfirmationURL }}`.
     3. Set `NEXT_PUBLIC_EMAIL_AUTH_MODE=otp` in your environment variables.

## CAPTCHA & Bot Protection

In Phase 07a2, frontend CAPTCHA challenges (Cloudflare Turnstile) were removed and deferred:
- Passwordless sign-in and sign-up operate without CAPTCHA tokens, eliminating external script overhead.
- Requests are protected by client cooldowns and Supabase Auth built-in rate limits.
- A provider-agnostic seam (`lib/auth/captcha.ts`) preserves room to restore Turnstile or another provider in under 30 minutes. Full details and archived code are in [`docs/CAPTCHA.md`](./docs/CAPTCHA.md).


## Regenerating Database Types

Database types in `types/database.ts` are generated from the hosted Supabase schema. After applying schema migrations via the Supabase MCP, regenerate the TypeScript types using the MCP `generate_typescript_types` tool:

```typescript
// Via Supabase MCP:
// Call generate_typescript_types with project_id: 'ngofkoeclkrxgpefkbuv'
// Output is written to types/database.ts
```

## Sharing and SEO Architecture (Phase 05)

- **Site Base URL:** Resolved via `lib/site.ts` (`NEXT_PUBLIC_SITE_URL` -> `VERCEL_PROJECT_PRODUCTION_URL` -> `VERCEL_URL` -> `http://localhost:3000`). Used for all `metadataBase`, canonical URLs, Open Graph images, sitemaps, and share intent URLs.
- **Dynamic Social Preview Images:** Generated via Next.js `ImageResponse` at `/c/[slug]/og` (creations) and `/u/[username]/og` (profiles), styled to 1200x630 with dark theme aesthetic and fallback mechanisms. Draft or non-existent items return 404.
- **Social Sharing & Deduplication:** The ungated `ShareButton` supports native share sheets on touch devices, falling back to desktop popover menus (Copy Link, X, LinkedIn, WhatsApp, Facebook, Reddit, Email). Authenticated shares are deduplicated in PostgreSQL within a 10-minute sliding window (migration `0010_share_dedupe.sql`). Anonymous shares are protected via an in-memory sliding window rate limiter and a 10-minute client cookie.
- **Indexing Rules & Sitemaps:**
  - `/discover` is indexable ONLY when query parameters are empty or contain only `category`. All search, tool, and sort filter queries emit `robots: { index: false, follow: true }` with canonical pointing to the clean base or category URL.
  - Private routes (`/login`, `/signup`, `/saved`, `/settings`, `/creations`, `/new`, `/c/[slug]/edit`, `/design`) emit `robots: { index: false, follow: false }`.
  - Preview image routes (`/c/*/og`, `/u/*/og`) remain fully crawlable in `robots.ts`.
  - `sitemap.xml` dynamically queries published creations and active creator profiles using a cookie-less public client.
- **Search Ranking Order:** The `discover_cards` PostgreSQL function ranks full-text search vector matches (`match_type = 1`) strictly ahead of fallback title pattern matches (`match_type = 0`).

---

## Observability & Diagnostics (Phase 07 & 07a)

### 1. PostHog Web Analytics & Local Debugging

Genra routes PostHog telemetry through a first-party reverse proxy at `/ingest/*` using default browser persistence (`localStorage+cookie`) to populate web analytics (Visitors, Page views, Sessions, Bounce rate, Paths, and Referrers).

- **Production:** Automatically enabled when `NEXT_PUBLIC_POSTHOG_KEY` is provided. Captures `$pageview` and `$pageleave` with automated URL scrubbing (search text scrubbed to `has_query=true`, auth tokens stripped).
- **Local Development:** PostHog is **disabled by default in development** to avoid polluting production data.
  To test locally without affecting production metrics:
  ```bash
  NEXT_PUBLIC_POSTHOG_DEBUG=true
  ```
  This activates PostHog in development mode and invokes `posthog.debug()` to print all telemetry events and decisions to the browser console.

### 2. Sentry Error Tracking & Debug Mode

Sentry is initialized across browser (`instrumentation-client.ts`), Node.js server (`sentry.server.config.ts`), and Edge (`sentry.edge.config.ts`), with `onRequestError` capturing unhandled server errors.

- **Debug Logging:** Set `SENTRY_DEBUG=true` (server) or `NEXT_PUBLIC_SENTRY_DEBUG=true` (client) to enable verbose SDK diagnostic logging.
- **Local Smoke Test:** Run the local Node SDK smoke test script to verify credentials and connectivity:
  ```bash
  npm run sentry:test
  ```
  This dispatches a test message and exception with tag `smoke_test: true` and prints the search URL to inspect issues in your Sentry dashboard.

### 3. Sentry Source Maps & Production Verification Playbook (Owner)

1. **Create Sentry Organization Auth Token:**
   - In Sentry, go to **Settings** > **Developer Settings** > **Custom Integrations** (or **Auth Tokens**).
   - Create a token with the following scopes:
     - `project:read`
     - `project:releases`
     - `org:read`
2. **Add Vercel Variables (Server-Only & Sensitive):**
   - In your Vercel Project Settings > Environment Variables, add:
     - `SENTRY_AUTH_TOKEN`: your Sentry auth token (mark as Sensitive).
     - `SENTRY_ORG`: your organization slug (e.g. `ceesharp-technologies`).
     - `SENTRY_PROJECT`: your project slug (e.g. `javascript-nextjs`).
     - *Note:* These build-time variables allow `withSentryConfig` to upload source maps during `next build` and delete them from the public output before serving.
3. **Run Production End-to-End Verification:**
   - In Vercel, temporarily add the variable `SENTRY_TEST_TOKEN` set to a secure random string (e.g. `test-token-7a8f9`).
   - Trigger a redeploy on Vercel.
   - Open `https://genra.dev/sentry-test?token=test-token-7a8f9` in your browser.
   - Test each button:
     1. **Trigger Client Error:** Dispatches a client-side exception through the browser SDK.
     2. **Trigger Server Action Error:** Invokes a Server Action throwing an unhandled exception.
     3. **Send Plain Message:** Dispatches info-level messages from client and server.
     4. **Trigger API Route Error:** Invokes `/api/sentry-test` to test `onRequestError` capture.
   - Open Sentry issues and verify:
     - Events appear with environment `production` and the release commit SHA.
     - Stack traces are de-minified and readable (confirming source map upload).
     - URL parameters and user identity are free of personal data.
4. **Decommission Test Console:**
   - Delete `SENTRY_TEST_TOKEN` from Vercel environment variables and redeploy.
   - Confirm that navigating to `/sentry-test` returns an HTTP 404.

