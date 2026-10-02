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
