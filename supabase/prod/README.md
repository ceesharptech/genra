# Genra Production Database Deployment Guide

This package contains the consolidated SQL script and verification suite to provision a fresh, production-ready Supabase database for Genra.

---

## 1. Prerequisites

1. A new, empty Supabase project created via the [Supabase Dashboard](https://supabase.com/dashboard) (Free Tier recommended).
2. Choose a region close to your primary audience (e.g. `eu-west-1` or `us-east-1`).
3. Note your project API credentials under **Project Settings > API**:
   - **Project URL** (`https://<project-ref>.supabase.co`)
   - **anon / public key** (`eyJ...`)

> [!IMPORTANT]
> **Zero Service-Role Key**: Never copy or use the `service_role` secret key. Genra application code and deployment environments operate strictly using the public `anon` key. Administrative actions and account deletion utilize `SECURITY DEFINER` functions with pinned search paths and internal role validation.

---

## 2. Step-by-Step Deployment

### Step A: Apply Consolidated Schema
1. In your production Supabase dashboard, navigate to the **SQL Editor**.
2. Click **New Query**.
3. Open [`consolidated.sql`](./consolidated.sql) in this directory, copy its entire contents, and paste it into the editor.
4. Click **Run** (or `Ctrl+Enter`).
5. Ensure the execution completes with `Success. No rows returned`.

### Step B: Run Verification Script
1. In the **SQL Editor**, open another **New Query**.
2. Open [`verify.sql`](./verify.sql), copy its entire contents, and paste it into the editor.
3. Click **Run**.
4. Check the **Results / Messages** panel. You should see:
   ```
   [OK] All 23 expected public tables exist.
   [OK] Row Level Security (RLS) is enabled on all 23 public tables.
   [OK] All 26 core functions (RPCs) exist.
   [OK] Initial category seeds present (count: 6).
   [OK] Storage buckets "avatars" and "creation-media" exist.
   SUCCESS: Production database schema verification PASSED.
   ```

---

## 3. Post-Migration Dashboard Configuration

Complete these manual steps in the Supabase Dashboard:

### 1. Auth URL Configuration
- Navigate to **Authentication > URL Configuration**.
- Set **Site URL** to your production deployment domain:
  ```
  https://<your-project>.vercel.app
  ```
- Under **Redirect URLs**, add:
  ```
  https://<your-project>.vercel.app/auth/callback
  https://<your-project>.vercel.app/**
  ```

### 2. Email Auth Settings
- Navigate to **Authentication > Providers > Email**.
- Ensure **Enable Email provider** is switched ON.
- Ensure **Confirm email** is enabled.
- Note: Until custom SMTP is configured, emails use Supabase's default mailer with the **magic link** flow (`NEXT_PUBLIC_EMAIL_AUTH_MODE=magic_link`).

### 3. Verify Storage Buckets
- Navigate to **Storage**.
- Verify two public buckets exist:
  - `avatars` (Public, 2 MB max file size, MIME types: `image/png`, `image/jpeg`, `image/webp`)
  - `creation-media` (Public, 15 MB max file size, MIME types: `image/*`, `video/mp4`, `video/webm`)

### 4. Provision Initial Platform Administrator
After signing up with your personal account in production:
1. Open the **SQL Editor**.
2. Execute the following statement replacing with your actual registered username:
   ```sql
   UPDATE public.profiles
   SET is_admin = true
   WHERE username = 'your_username';
   ```
3. Refresh your user session; the **Admin panel** link will now appear in your avatar menu, granting access to `/admin`.

---

## 4. Rebuilding the Production Script

If you author new numbered migrations in `supabase/migrations/` in future phases, regenerate the consolidated script by running:

```bash
npm run build:prod-sql
```
