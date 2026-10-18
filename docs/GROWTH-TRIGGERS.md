# Genra Growth Triggers & Infrastructure Upgrade Path

This document defines the quantitative thresholds, cost triggers, and step-by-step action plans for graduating Genra from its zero-cost free tiers (Vercel Hobby, Supabase Free, Upstash Redis, PostHog Free, Sentry Developer) to production scale.

---

## 1. Free Tier Matrix & Constraints

| Service | Plan | Free Limits | Bottleneck Risk |
| :--- | :--- | :--- | :--- |
| **Supabase** | Free Tier | 500 MB database, 1 GB storage, 5 GB egress, 50,000 MAUs | Project auto-pauses after 7 days inactivity; 1 GB storage limit |
| **Vercel** | Hobby | 100 GB bandwidth, 100k edge invocations/day, personal use | Commercial monetization restriction; bandwidth overage |
| **Upstash Redis** | Free | 10,000 commands / day | Rate limit exhaustion during viral traffic spikes |
| **PostHog** | Cloud Free | 1,000,000 events / month | Minimal risk in V1 (cookieless, minimal event schema) |
| **Sentry** | Developer | 5,000 errors / month | Log flooding if unhandled exceptions loop |

---

## 2. Growth Triggers & Action Plans

### Trigger 1: Supabase Free Tier Storage & Disk Limits Reached
- **Threshold**:
  - Database disk reaches **400 MB** (80% of 500 MB).
  - Storage bucket usage reaches **800 MB** (80% of 1 GB).
  - Egress bandwidth reaches **4 GB** (80% of 5 GB).
  - Or database auto-pauses due to inactivity (mitigated by `.github/workflows/keepalive.yml` pinging `https://genra.dev/api/health`).
- **Action Plan**:
  1. Upgrade to **Supabase Pro** ($25/month).
  2. Enables: 8 GB database, 100 GB storage, 50 GB egress, daily automated backups, no project pausing.
  3. No application code modifications required; upgrades seamlessly in the Supabase Dashboard.

---

### Trigger 2: High Media Volume -> Migrate Storage to Cloudflare R2
- **Threshold**:
  - Image and video uploads exceed **5 GB** or Supabase egress costs escalate.
- **Action Plan**:
  1. Provision a Cloudflare R2 bucket with zero egress fees ($0.015/GB storage).
  2. Implement `R2StorageProvider` conforming to `StorageProvider` in `lib/storage/types.ts`.
  3. Update `lib/storage/index.ts` to instantiate `R2StorageProvider` using S3-compatible credentials.
  4. Run an automated migration script to mirror existing files from Supabase Storage to R2.

---

### Trigger 3: Email Delivery Rate Limits -> Custom SMTP & OTP Code Mode
- **Threshold**:
  - Sign-ups exceed **30 emails per hour** (Supabase default mailer limit).
  - Or custom branded transactional templates are required.
- **Action Plan**:
  1. Follow [`docs/EMAIL-TEMPLATES.md`](./EMAIL-TEMPLATES.md) for DNS verification (Resend / AWS SES).
  2. Configure SMTP in Supabase **Project Settings > Authentication > SMTP**.
  3. Switch `NEXT_PUBLIC_EMAIL_AUTH_MODE=otp` in Vercel environment variables to enable the 6-digit OTP code verification flow instead of magic links.
  4. Paste branded templates from [`docs/EMAIL-TEMPLATES.md`](./EMAIL-TEMPLATES.md).

---

### Trigger 4: Live Domain Configuration (Achieved)
- **Status:** **COMPLETE**
- **Canonical Domain:** **`https://genra.dev`** (Apex canonical, `www.genra.dev` redirects).
- **DNS:** A record (`76.76.21.21`), CNAME (`cname.vercel-dns.com`).
- **Auth URLs:** Configured for `https://genra.dev/**` and `https://genra.dev/auth/callback`.

---

### Trigger 5: Bot Traffic & Abusive Sign-ups -> Re-enable Turnstile CAPTCHA
- **Threshold**:
  - Noticeable bot registrations, automated spam reports, or rate limit spikes on auth endpoints.
- **Action Plan**:
  1. Follow the re-integration guide in [`docs/CAPTCHA.md`](./CAPTCHA.md).
  2. Create a Cloudflare Turnstile widget (free tier).
  3. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in environment variables.
  4. Restore the Turnstile widget render in `components/auth/login-form.tsx` and enable verification in `lib/auth/captcha.ts`.
  5. Add `https://challenges.cloudflare.com` to CSP `script-src` and `frame-src` per [`docs/CSP.md`](./CSP.md).

---

### Trigger 6: Vercel Hobby Bandwidth or Commercial Constraints
- **Threshold**:
  - Monthly bandwidth approaches **80 GB** (80% of 100 GB Hobby limit).
  - Or monetization / commercial revenue streams are introduced.
- **Action Plan**:
  1. Upgrade to **Vercel Pro** ($20/month per seat).
  2. Increases bandwidth to 1 TB/month and edge execution limits.
