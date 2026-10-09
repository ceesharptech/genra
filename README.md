This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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
