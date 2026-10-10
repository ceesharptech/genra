# Analytics & Telemetry Specification (PostHog)

This document defines the product analytics architecture, privacy model, event taxonomy, and operational guidelines for Genra.

---

## 1. Architecture & Privacy Model

Genra uses PostHog to observe product usage, track web analytics (visitors, page views, sessions, bounce rate, entry paths, and referrers), and measure core engagement actions.

### Privacy Guarantees
1. **Standard Browser Persistence for Web Analytics**:
   - Web analytics requires stable session stitching and returning visitor attribution.
   - PostHog uses its default browser persistence (`persistence: 'localStorage+cookie'`).
   - Replaces the earlier experimental cookieless memory mode to enable Visitors, Sessions, and Paths reporting.
2. **Zero Autocapture**:
   - `autocapture: false` ensures that arbitrary DOM clicks, keystrokes, form submissions, and text inputs are never captured.
3. **No Session Recording**:
   - `disable_session_recording: true` completely disables screen recordings and session replays.
4. **Strict Identity Isolation**:
   - Users are identified solely by their internal UUID (`distinctId: user.id`) upon sign-in.
   - Personally Identifiable Information (PII) — including emails, usernames, display names, and IP addresses — is strictly excluded from analytics payloads.
   - On sign-out, `posthog.reset()` is invoked immediately to unlink subsequent anonymous sessions.
5. **No Personal Data in URLs (Automated URL Scrubbing)**:
   - All automatic `$pageview`, `$pageleave`, and event URL properties are scrubbed via a client-side `before_send` hook before leaving the browser.
   - Filter parameter allow-list: `category`, `sort`, `tab`, `kind`, `tool`, `ref`.
   - Search text query parameter `q=...` is replaced with `has_query=true`.
   - Sensitive auth tokens, OAuth codes, verification codes, return intents, and error details (`code`, `token`, `next`, `intent`, `error*`) are completely stripped.
   - Hash fragments (`#...`) are stripped to prevent leaking callback fragments.
6. **Reverse-Proxied via `/ingest`**:
   - Client requests are routed through Next.js rewrites to `/ingest/*` so all traffic is first-party, avoiding third-party tracker blockers.
7. **Development Isolation**:
   - PostHog is disabled in development by default to prevent polluting production data.
   - To enable locally for debugging, set `NEXT_PUBLIC_POSTHOG_DEBUG=true` in `.env.local` (enables verbose SDK logging via `posthog.debug()`).
8. **Privacy Page Disclosure**:
   - The Privacy page (Phase 07b) discloses the use of PostHog for aggregated, pseudonymous product and web analytics using first-party storage, and provides an opt-out mechanism (`posthog.opt_out_capturing()`).

---

## 2. Automatic Web Analytics Events

### `$pageview`
Captured automatically on initial page load and SPA client navigations (history changes) via `defaults: '2026-05-30'`.
- **Required Properties**:
  - `$current_url`: Sanitized URL (pathname + allow-listed filters + `has_query=true` if search query present).
  - `$pathname`: Clean URL pathname (e.g. `/discover`, `/c/chowbuddy-website-e971cb`).
  - `$host`: Hostname (e.g. `genra.vercel.app` or `localhost`).
  - `$referrer`: Sanitized referrer URL.
  - `$session_id`: PostHog session identifier.
  - `distinct_id`: Stable anonymous ID or user UUID.

### `$pageleave`
Captured automatically when navigating away or closing a page via `capture_pageleave: true`.
- Powers duration on page, session bounce rate, and exit paths.

---

## 3. Custom Event Catalog & Taxonomy

All custom events are strictly typed in `lib/analytics.ts` (`AnalyticsEventMap`):

### `landing_from_share`
Triggered when an incoming visitor lands via a shared link containing campaign/channel tags.
- `channel`: String (e.g. `'x'`, `'linkedin'`, `'copy'`).
- `path`: Normalized pathname (e.g. `'/c/prompt-architect'`).
- `creationId`: Optional UUID of the creation.

### `share_click`
Triggered when a user clicks a share button or copies a share link.
- `channel`: Target platform channel (e.g. `'x'`, `'linkedin'`, `'link'`).
- `creationId`: UUID of the creation being shared.

### `creation_publish`
Triggered when a creation successfully transitions to published state.
- `creationId`: UUID of the published creation.
- `category`: Taxonomy category (e.g. `'websites'`, `'apps'`, `'prompts'`).

### `prompt_copy`
Triggered when a user clicks "Copy Prompt".
- `promptId`: UUID of the prompt resource.

### `collection_create`
Triggered when a creator creates a new collection.
- `collectionId`: UUID of the created collection.

### `like_toggle`
Triggered when a user sets the liked state on a creation.
- `creationId`: UUID of the creation.
- `action`: `'like'` | `'unlike'`.

### `save_toggle`
Triggered when a user bookmarks/saves a creation to their library.
- `creationId`: UUID of the creation.
- `action`: `'save'` | `'unsave'`.

---

## 4. Reverse Proxy Configuration

Configured in `next.config.ts`:
```ts
skipTrailingSlashRedirect: true,
async rewrites() {
  return [
    {
      source: '/ingest/static/:path*',
      destination: `${posthogAssetHost}/static/:path*`,
    },
    {
      source: '/ingest/:path*',
      destination: `${posthogHost}/:path*`,
    },
  ];
}
```
`skipTrailingSlashRedirect: true` is required to ensure PostHog API endpoints (like `/ingest/decide/`) are not redirected by Next.js.
