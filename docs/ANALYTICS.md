# Analytics & Telemetry Specification (PostHog)

This document defines the product analytics architecture, privacy model, event taxonomy, and operational guidelines for Genra.

## 1. Privacy-First Architecture

Genra's analytics infrastructure strictly adheres to privacy-by-design standards:

1. **Cookieless Tracking**:
   - PostHog runs exclusively in **memory persistence** mode (`persistence: 'memory'`).
   - No cookies, `localStorage`, or persistent browser device fingerprints are written or stored.
2. **Zero Autocapture**:
   - `autocapture: false` ensures that generic DOM clicks, mouse movements, keystrokes, and form inputs are never scraped or recorded.
3. **No Session Recording**:
   - `disable_session_recording: true` completely disables screen recordings and session replays.
4. **Strict Identity Isolation**:
   - Users are identified solely by their internal UUID (`distinctId: user.id`).
   - Personally Identifiable Information (PII) — including email addresses, display names, and IP addresses — is strictly prohibited from analytics payloads.
5. **No Free Text / Prompts**:
   - Prompt texts, descriptions, comments, or search queries are never sent to analytics to ensure creator confidentiality.
6. **Same-Origin Reverse Proxy**:
   - Client events route through Next.js rewrites (`/ingest/*`) to avoid third-party connection blocks and adblocker interference.
7. **Graceful Degradation**:
   - If `NEXT_PUBLIC_POSTHOG_KEY` is omitted, the SDK completely no-ops without errors or network activity.

---

## 2. Event Catalog & Taxonomy

All events are strictly typed in `lib/analytics.ts` (`AnalyticsEventMap`):

### `landing_from_share`
Triggered when an incoming visitor lands via a shared link containing campaign/channel tags.
- `channel`: String (e.g. `'twitter'`, `'linkedin'`, `'copy'`).
- `path`: Normalized pathname (e.g. `'/c/prompt-architect'`).
- `creationId`: Optional UUID of the creation.

### `share_click`
Triggered when an authenticated or anonymous creator triggers the share dialog or copies a share URL.
- `channel`: Target platform channel (e.g. `'x'`, `'linkedin'`, `'link'`).
- `creationId`: UUID of the creation being shared.

### `creation_publish`
Triggered when a creation successfully transitions to published state.
- `creationId`: UUID of the published creation.
- `category`: Taxonomy category (e.g. `'websites'`, `'apps'`, `'prompts'`).

### `prompt_copy`
Triggered when a user clicks the "Copy Prompt" action.
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

## 3. Reverse Proxy Configuration

Configured in `next.config.ts`:
```ts
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
