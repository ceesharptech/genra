# AGENTS.md — Genra

Instructions for any AI coding agent working in this repository. **Read this file fully at the start of every session.** New instructions from the project owner are appended to the "Additional instructions" section at the bottom; they take precedence over earlier text.

## 1. Project in brief

Genra is a discovery and learning platform for things people create with AI. Creators publish a **creation** (website, app, image, video, agent, workflow…) together with how it was made: **tools**, **prompts**, **process steps** and **resources**. Visitors browse, filter, learn from the process, and reuse prompts and resources. Think Dribbble + GitHub + Product Hunt for AI-made work.

Product rules that must always hold:

- Published content is **publicly viewable without login**. Every **action** (like, save, copy prompt, create, report) requires login, via the shared login-gating mechanism, with the action replayed after login.
- **Sharing outside the platform** is a core feature (public URLs, rich social previews, share menu, share tracking).
- Posting must stay **low friction**. Required to publish: title, category, one cover image, one tool. Prompts, resources, steps, tags and description are **optional**, added through "Add …" pickers that select existing items, with quick-create when nothing matches.
- **AI features are not part of V1.** Only the extension points exist (section 8).

## 2. Source-of-truth documents

Read these before working, in this order:

| File                          | Purpose                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| `AGENTS.md`                   | This file: rules for the agent                             |
| `DESIGN.md`                   | Design tokens and UI rules (colour, type, spacing, motion) |
| `genra-docs/PRD.md`           | Product requirements, scope, flows, open questions         |
| `genra-docs/phases/README.md` | Phase order, conventions, definition of done               |
| `genra-docs/phases/NN-*.md`   | The phase currently being built                            |
| `genra-docs/genra_schema.sql` | Initial database schema (migration `0001`)                 |

Rules:

- Work on **one phase at a time**, the one the owner names. Do not start work from later phases. Respect the dependencies in the phases README.
- Follow the phase file's tasks, technical notes and acceptance criteria. Tick the checkboxes in the phase file as tasks are completed.
- If documents conflict, or something required is unspecified, **stop and ask** rather than guess. Do not silently change scope, requirements or the schema design. Record decisions the owner makes in "Additional instructions".
- Do not edit `PRD.md` or the phase files unless asked, except to tick completed checkboxes.

## 3. Tech stack

- **Framework:** Next.js (App Router), TypeScript in strict mode
- **Styling:** Tailwind CSS with the tokens from `DESIGN.md`; shadcn/ui components
- **Font:** Geist (Sans and Mono)
- **Backend:** Next.js Server Components, Server Actions and Route Handlers. No separate backend, no microservices.
- **Database, auth, storage:** Supabase (hosted PostgreSQL, Supabase Auth, Supabase Storage)
- **Validation:** Zod
- **Hosting:** Vercel
- **Tests:** Vitest (unit), Playwright (end to end)
- Do not add new major dependencies (state libraries, ORMs, UI kits, animation libraries) without asking. Prefer what the stack already provides.

## 4. Supabase rules (hosted project, via MCP)

The Supabase project already exists online and is connected to you through the **Supabase MCP**. All database work happens on this hosted project.

**Do not use the local Supabase CLI or Docker.** This machine has no Docker. Never run `supabase start`, `supabase db reset`, `supabase db push`, `supabase link` or similar local-stack commands, and do not create a local Supabase environment.

How to work with the database:

- **Schema changes are migrations.** Write the SQL as a numbered file in `supabase/migrations/` (for example `0005_save_creation.sql`) **and** apply the same SQL to the hosted project with the MCP's migration tool (`apply_migration`) using the same name. The files in the repo must always match what has been applied. Check applied migrations with the MCP's migration listing before adding new ones.
- Use the MCP's SQL tool (`execute_sql`) for **reading, inspection, seed data and RLS testing**, not for schema changes.
- **After every schema change:** run the MCP security and performance advisors, fix any findings that relate to your change, and regenerate the TypeScript types into `types/database.ts` using the MCP's type generation tool.
- **RLS is mandatory** on every table in `public`. Every new table ships with policies in the same migration. Test policies as anonymous, as the owner and as a different authenticated user (use role impersonation inside a transaction, for example `set local role authenticated` with `request.jwt.claims` set, then roll back).
- Pin `search_path` on every `security definer` function.
- **Destructive operations need explicit owner approval first:** `drop table`, `drop column`, `truncate`, `delete` or `update` without a precise `where`, deleting storage objects or buckets, changing auth settings. State what you are about to do and wait.
- Treat the hosted project as the **development database** but with real care: do not wipe it, and keep any dummy data clearly marked and removable. A separate production project is created in Phase 07 by replaying the migrations in order.
- **Secrets:** use the project URL and the public (anon/publishable) key in `.env.local` for the browser and server clients. The service-role key is server-only, never prefixed with `NEXT_PUBLIC_`, never committed, never logged. Keep `.env.example` up to date with variable names only.
- Some setup cannot be done through the MCP (for example enabling Google OAuth, redirect URLs, email templates, cron configuration through the dashboard). When a phase needs it, **give the owner an exact checklist** of what to click or paste, and continue once confirmed.
- If a tool name differs from the above in your MCP version, use the equivalent available tool.

## 5. Frontend work: skills are mandatory

Three skills are installed in the `.agents/` folder:

| Skill                   | Use for                                                        |
| ----------------------- | -------------------------------------------------------------- |
| `design-taste-frontend` | Design taste and avoiding generic "AI slop" interface patterns |
| `frontend-design`       | Distinctive, intentional visual design, typography and layout  |
| `emil-design-eng`       | Animation and interaction craft                                |

**Treat all three as active skills for every frontend task.** Before building or changing any page, component, layout, styling, empty state, microcopy or animation, find and read each skill's `SKILL.md` inside `.agents/` and apply it. Re-read them at the start of each new frontend task or session.

**Precedence when guidance conflicts:**

1. The project owner's instructions in this file.
2. `DESIGN.md` for palette, Geist typography, spacing, radius, elevation and default motion tokens. The skills must not change the colour palette, introduce other fonts, or add decorative purple gradients or glow effects, even if a skill suggests otherwise.
3. The skills for everything else: composition, hierarchy, polish, interaction details, animation craft and anti-slop patterns.

UI requirements for all work:

- Use design tokens and Tailwind theme classes; never hard-code colours.
- Support **light (default) and dark** themes everywhere.
- Mobile first and responsive. The editor must work on a phone.
- Every data view has loading (skeleton), empty and error states.
- Accessible: keyboard operation, visible focus, labels, alt text, AA contrast, `prefers-reduced-motion`.
- The brand purple `#774CFF` is used sparingly, as defined in `DESIGN.md`.

## 6. Code conventions

- TypeScript strict, no `any` without a comment explaining why. Use the generated `types/database.ts` types.
- Server Components by default; add `"use client"` only where interaction needs it.
- Mutations are **Server Actions** (or route handlers where required). Each one: validate input with Zod, call `requireUser()` first, return typed results, and never trust client-supplied ids or ownership.
- RLS is the second line of defence, never the only one.
- Keep shared Zod schemas in `lib/validation/`, shared between client and server.
- Data access lives in `lib/data/`. Components do not build raw queries inline.
- File and folder layout as in `genra-docs/phases/README.md`. Name files in kebab-case, components in PascalCase.
- Sanitize all user markdown before rendering; never use `dangerouslySetInnerHTML` with unsanitized input. User-provided links open with `rel="nofollow ugc noopener"`.
- Use `next/image` for images; set sizes to avoid layout shift.
- Handle errors explicitly and show users a useful message. No silent failures, no `console.log` left behind.
- Keep functions small, comment the "why" rather than the "what".

## 7. Quality gates (definition of done)

A task is done only when:

- `typecheck`, `lint` and tests pass.
- Schema changes have a numbered migration file, applied through MCP, advisors checked, and types regenerated.
- RLS behaviour is verified for any new or changed table.
- New server actions validate input and check the session.
- UI matches `DESIGN.md` in light and dark, works on mobile, and has loading, empty and error states.
- The relevant phase checklist items are ticked and the acceptance criteria are met.

Write or update tests for logic, security-relevant behaviour (RLS, auth gating, redirect validation) and critical flows.

## 8. AI enrichment: extension points only

Do **not** build AI features or add AI SDK dependencies in V1. Maintain and use only these seams:

- `lib/ai/enrichment.ts` with the `EnrichmentProvider` interface and `NoopEnrichment`, selected by the `AI_ENRICHMENT_ENABLED` flag (default false). The publish flow calls `enqueue()`, which does nothing in V1.
- Schema hooks already present: `source` columns on `creation_tools` and `creation_tags`, `creations.ai_metadata`, the `ai_jobs` table, and the commented `embeddings` table.
- Rows with `source = 'ai_suggested'` must never appear in public pages, search or filters.

## 9. Working style

- Before coding a phase, restate the plan briefly: the tasks you will do and anything you need from the owner.
- **Git is handled by the owner.** Do not run `git add`, `git commit` or `git push`. In your final report, suggest logical groupings and conventional commit messages (`feat:`, `fix:`, `chore:`, `docs:`). Never put secrets in tracked files; `.env*` files stay git-ignored.
- Do not leave the app broken between steps. Keep the app running and deployable.
- When finished, summarise: what changed, migrations applied, new env vars, manual steps for the owner, and any open questions or follow-ups.
- Be honest about what is untested or incomplete. Do not mark work done that you have not verified.
- If instructed to do something that conflicts with this file, point out the conflict and ask which to follow.

## 10. Known gaps in the initial schema (handled in phases)

- `avatars` storage bucket and policies: migration `0002_avatars.sql` (Phase 01).
- `profiles.onboarded_at` column to track username onboarding: migration `0003_profile_onboarding.sql` (Phase 01).
- Function hardening (pinned `search_path`, revoked execute on internal functions): migration `0004_function_hardening.sql` (Phase 01).
- Atomic `save_creation(payload jsonb)` function: migration `0005_save_creation.sql` (Phase 02).
- Size and MIME limits for the `creation-media` bucket: migration `0006_creation_media_limits.sql` (Phase 02).

---

## Additional instructions

_Append new instructions below with a date. Later entries override earlier ones._

- **2026-10-01** Supabase: use the hosted project through the Supabase MCP only; no local CLI or Docker (see section 4).
- **2026-10-01** Frontend: always load and follow the `.agents/` skills `design-taste-frontend`, `frontend-design` and `emil-design-eng`; `DESIGN.md` wins on palette and typography (see section 5).
- **2026-10-01** Design: monochrome soft black and white interface, lavender purple `#774CFF` used sparingly, light theme default with dark mode, Geist font (see `DESIGN.md`).
- **2026-10-02** Git: the owner stages, commits and pushes. The agent never runs git write commands (see section 9).
- **2026-10-02** Browser testing is done manually by the owner. Write Playwright specs, but do not download browser binaries or run browser tests; give the owner a manual test checklist instead.
- **2026-10-02** Icons: use Hugeicons (`@hugeicons/react` with `@hugeicons/core-free-icons`), not `lucide-react`.
- **2026-10-02** Stack notes from Phase 00: Next.js 16 (session refresh lives in `proxy.ts`, not `middleware.ts`), React 19, Tailwind v4, shadcn/ui built on Base UI primitives (do not use Radix `asChild` patterns), npm, no `src/` directory.
- **2026-10-02** The live database must always match `genra-docs/genra_schema.sql` plus the numbered follow-up migrations. If they ever diverge, stop and report instead of building on top.
- **2026-10-02** Email sign-in uses Supabase's default **magic link** (PKCE, completed at `/auth/callback`) until custom SMTP is configured, because email templates cannot be edited without it. The 6-digit code flow stays in the codebase behind `NEXT_PUBLIC_EMAIL_AUTH_MODE` (`magic_link` default, `otp` later).
- **2026-10-02** Auth UI: the login modal was replaced by dedicated login and sign-up pages. Gated actions send signed-out users to the login flow with `next` (and `intent` where used). Always read the current auth code (`lib/auth/*`, `components/auth/*`) before wiring a gated action; do not reintroduce a modal.
- **2026-10-02** Autosave rule: a save is scheduled only when the serialized payload differs from the last saved snapshot (kept in a ref). UI state, save status and server-returned values must never trigger a save. Debounce 3 s after the last edit, one request in flight, bounded retries, and no saves after publishing starts. Only fully uploaded media may appear in a save payload.
- **2026-10-02** PostgREST embeds: always use explicit relationship hints that were verified against the real constraint names (`pg_constraint`). `creations` and `creation_media` have two relationships (`creation_media_creation_id_fkey` and `creations_cover_fk`), so unhinted or guessed hints break. Data loaders must return errors to the UI instead of silently returning empty lists.
- **2026-10-02** Performance: measure before and after any optimisation. Avoid redundant auth and profile calls within one request, run independent awaits in parallel, and render markdown on the server for public pages.
- **2026-10-03** Scope: V1 engagement is **like and save only**. Do not build comments (no UI, actions or comment counts in the interface). The `comments` table, its trigger and `comment_count` columns stay in the schema for later and must not be dropped.
- **2026-10-03** Gated actions that change state (like, save) must be **idempotent set operations** (set liked = true/false), never blind toggles, so replaying an intent after login cannot undo the user's existing state. Actions that need a browser user gesture (clipboard copy) must not auto-run on replay.
- **2026-10-03** Latency: the Supabase project is in eu-west-1 (about 200 ms per round trip from Lagos). Count sequential round trips per page and per action, run independent queries in parallel, and report the numbers.
- **2026-10-09** Sharing and SEO: public pages and their metadata are server-rendered and contain no session data. Never disallow preview image routes in `robots`. Draft, archived and deleted creations return 404 from pages and preview image routes. Embed user-supplied text in JSON-LD only after safe serialisation (escape `<`).
- **2026-10-09** Reports must include evidence for every claim the agent can verify (test results, queries, code reading). A report that omits a required section is treated as unverified for that section.
- **2026-10-09** Measurements: the owner measures timings, bundle sizes, compile times and Lighthouse results manually. The agent does not need to report them and must not claim measurements it did not make; it may still reason about sequential round trips from the code. This overrides the earlier "measure before and after" wording.
- **2026-10-09** Library: resources are links or hosted markdown only (no file uploads in V1). Private or deleted prompts and resources render as "no longer available" for everyone except their author. Tool chips link to `/tools/<slug>`; `/discover?tools=` remains the filter URL. Collections are limited to 50 per user and 200 items each.

- **2026-10-10** Budget constraints: no custom domain, Vercel Hobby and Supabase Free for now. The production URL is the `*.vercel.app` alias. Custom SMTP is on hold, so email sign-in stays the magic link flow. The Cloudflare R2 migration is deferred; only a storage abstraction is built. Do not add paid services or anything that requires a domain. Free tiers only: PostHog, Sentry Developer, Upstash.
- **2026-10-10** The service-role / secret key is **not** used anywhere in the application, CI or scripts. Account deletion uses a `security definer` RPC. The agent never connects to the production Supabase project; production SQL is delivered as a consolidated file the owner applies manually.
- **2026-10-10** Direct API write surface: clients (anon key plus a session) can call PostgREST directly, bypassing the app and Zod. Therefore counters, ranking fields, moderation fields, identity and ownership columns must not be client-writable (column-level grants), and URL and length rules must also exist as database constraints. Every new table or column must state its grants.
- **2026-10-10** Analytics and error tracking: PostHog runs cookieless (memory persistence), without autocapture or session replay, behind a same-origin reverse proxy, identifying users by UUID only and never sending emails or free text. Sentry runs without replay and without personal data. Neither may be required for the app to work; both are disabled when their keys are absent.
- **2026-10-10** Public keys (Supabase URL and anon key, PostHog project key, Sentry DSN) may use `NEXT_PUBLIC_`. Every other secret must be server-only, imported only in `server-only` modules, and never carry the prefix.
- **2026-10-11** CAPTCHA (Cloudflare Turnstile) is **deferred** until real growth and traffic. The app does not render a CAPTCHA widget or send CAPTCHA tokens, and Supabase's CAPTCHA protection must stay switched off. A thin provider-agnostic seam (`lib/auth/captcha.ts`) and `docs/CAPTCHA.md` keep re-integration cheap. Do not re-add Turnstile or any CAPTCHA unless the owner asks.
- **2026-10-13** Domain: Genra is live at https://genra.dev (apex canonical). Support email is support@genra.dev, sent from no-reply@genra.dev. Custom SMTP and OTP sign-in are enabled at cutover through NEXT_PUBLIC_EMAIL_AUTH_MODE. CAPTCHA remains deferred. CSP is controlled by CSP_MODE (report-only first). Preview and local environments use the development Supabase project; only Production uses the production project, which the agent never touches. Still free tiers only (Vercel Hobby is non-commercial).
