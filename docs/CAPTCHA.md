# CAPTCHA Architecture & Deferred Turnstile Runbook

This document records the architectural decisions, current state, residual risks, and exact steps required to re-enable CAPTCHA (such as Cloudflare Turnstile) in Genra.

---

## 1. Rationale & Decision

In Phase 07a2 (October 2026), Cloudflare Turnstile was removed and deferred:
- **Zero premature optimization:** Before product-market fit and sustained high traffic, running a CAPTCHA widget adds friction to user onboarding, loads third-party scripts, and introduces external failure modes.
- **Provider-agnostic seam:** Rather than hardcoding Cloudflare or ripping out all hooks, the authentication flow routes through a thin provider-agnostic abstraction (`lib/auth/captcha.ts`). This ensures re-enabling CAPTCHA or swapping to another provider (e.g., hCaptcha or friendly-captcha) is completely isolated and takes under 30 minutes.
- **Clean CSP & Zero Third-Party Footprint:** `challenges.cloudflare.com` was stripped from Content Security Policy directives in `next.config.ts`, reducing attack surface and speeding up auth page loads.

---

## 2. Current Architecture & Seam

The CAPTCHA subsystem is encapsulated entirely in `lib/auth/captcha.ts`:

- **`useCaptcha()`**: React hook returning:
  ```ts
  export interface CaptchaState {
    enabled: boolean        // false in deferred state
    token: string | null    // null in deferred state
    reset: () => void       // safe no-op
    widget: React.ReactNode | null // null in deferred state
  }
  ```
- **`isSubmitDisabled({ email, isLoading, cooldown, captchaEnabled, captchaToken })`**: Pure function determining whether the sign-in / sign-up submit button should be enabled. When `captchaEnabled: false`, submission is allowed immediately once a valid email is entered.
- **`buildSignInOptions(baseOptions, captchaToken)`**: Pure helper attaching `captchaToken` to Supabase `signInWithOtp` options only when a non-empty token string is present.
- **`handleCaptchaError(error)`**: Inspects Supabase auth errors. If Supabase rejects a request due to missing CAPTCHA tokens (e.g. if CAPTCHA protection is turned on in the Supabase Dashboard by accident), it:
  1. Captures a warning message in Sentry with tag `misconfiguration: supabase_dashboard_captcha_active` (de-duplicated, once per session).
  2. Returns a clear user-facing message: `"Sign-in is temporarily unavailable. Please try again later or continue with Google."`

---

## 3. Residual Risks & Mitigations

| Risk | Likelihood | Impact | Current Mitigations |
| :--- | :--- | :--- | :--- |
| **Email Enumeration / Scraping** | Low | Low | Supabase returns indistinguishable responses for existing vs new emails. Client redirects to generic "Check your email" screen. |
| **Email Rate Limit Exhaustion (Spam / Bot loops)** | Low-Medium | Medium | 1. Client-side 60s cooldown timer between requests.<br>2. Supabase built-in IP-level and email-level rate limiting on `signInWithOtp`.<br>3. Handled 429 error message directs users to Google OAuth.<br>4. Upstash Redis rate limiting available in Phase 07b. |
| **Accidental Dashboard Activation** | Low | High | If Supabase Dashboard CAPTCHA is toggled on without client code, `handleCaptchaError()` alerts Sentry and displays friendly recovery copy rather than raw API errors. |

---

## 4. Re-Enablement Runbook (Step-by-Step)

When traffic scale or abuse necessitates turning CAPTCHA back on:

### Step 1: Cloudflare Dashboard Setup
1. Log into Cloudflare -> **Turnstile**.
2. Click **Add Site**:
   - Site name: `Genra Web`
   - Domain: `genra.app` (and development domains `localhost`, preview domains `*.vercel.app`)
   - Widget Mode: **Managed** (recommended) or **Non-interactive**.
3. Note the **Site Key** (public) and **Secret Key** (secret).

> **Testing Keys (Cloudflare Standard Test Credentials):**
> - **Always Passes:** Site Key: `1x00000000000000000000AA`, Secret: `1x0000000000000000000000000000000AA`
> - **Always Fails:** Site Key: `2x00000000000000000000AB`, Secret: `2x0000000000000000000000000000000AB`
> - **Always Challenges:** Site Key: `3x00000000000000000000AB`, Secret: `3x0000000000000000000000000000000AB`

### Step 2: Supabase Dashboard Configuration
1. Open Supabase Dashboard -> **Authentication** -> **Protection**.
2. Enable **Enable Captcha protection**.
3. Select **Turnstile** as the provider.
4. Paste the Cloudflare **Secret Key**.
5. Save changes.

### Step 3: Environment Variables
1. Add to `.env.local` and `.env.example`:
   ```bash
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
   ```
2. Update `scripts/check-env.mjs` and `docs/ENVIRONMENTS.md` to register `NEXT_PUBLIC_TURNSTILE_SITE_KEY` as optional or required.

### Step 4: Content Security Policy (CSP)
Update `next.config.ts` to allow Cloudflare's scripts and frames:
```diff
- "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://eu-assets.i.posthog.com",
+ "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://eu-assets.i.posthog.com https://challenges.cloudflare.com",

- "connect-src 'self' https://*.supabase.co https://eu.i.posthog.com https://eu-assets.i.posthog.com https://*.ingest.sentry.io",
+ "connect-src 'self' https://*.supabase.co https://eu.i.posthog.com https://eu-assets.i.posthog.com https://*.ingest.sentry.io https://challenges.cloudflare.com",

- "frame-src 'self'",
+ "frame-src 'self' https://challenges.cloudflare.com",
```

### Step 5: Restore the Turnstile Widget in `lib/auth/captcha.ts`
Replace the stub in `lib/auth/captcha.ts` with the implementation below, importing the restored widget.

---

## 5. Archived Implementation

For reference and instant re-enablement, here are the audited component and verification code:

### Archived: `components/auth/turnstile-widget.tsx`
```tsx
'use client'

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

export interface TurnstileWidgetRef {
  reset: () => void
}

interface TurnstileWidgetProps {
  siteKey?: string
  onToken: (token: string) => void
  onError?: (errorCode: string) => void
  onExpire?: () => void
  className?: string
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string
          callback: (token: string) => void
          'error-callback'?: (code: string) => void
          'expired-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          size?: 'normal' | 'compact' | 'flexible'
        }
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
    onloadTurnstileCallback?: () => void
  }
}

export const TurnstileWidget = forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(
  function TurnstileWidget(
    { siteKey, onToken, onError, onExpire, className },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const widgetIdRef = useRef<string | null>(null)
    const resolvedSiteKey = siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

    useImperativeHandle(ref, () => ({
      reset() {
        if (typeof window !== 'undefined' && window.turnstile && widgetIdRef.current) {
          window.turnstile.reset(widgetIdRef.current)
        }
      },
    }))

    useEffect(() => {
      if (!resolvedSiteKey || !containerRef.current) return

      let isMounted = true

      const renderWidget = () => {
        if (!isMounted || !containerRef.current || !window.turnstile) return
        if (widgetIdRef.current) return

        try {
          const id = window.turnstile.render(containerRef.current, {
            sitekey: resolvedSiteKey,
            callback: (token: string) => {
              if (isMounted) onToken(token)
            },
            'error-callback': (code: string) => {
              if (isMounted) onError?.(code)
            },
            'expired-callback': () => {
              if (isMounted) onExpire?.()
            },
            theme: 'auto',
          })
          widgetIdRef.current = id
        } catch (e) {
          console.error('[Turnstile] Render error:', e)
        }
      }

      if (window.turnstile) {
        renderWidget()
      } else {
        const existingScript = document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')
        if (!existingScript) {
          const script = document.createElement('script')
          script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
          script.async = true
          script.defer = true
          script.onload = () => {
            renderWidget()
          }
          document.head.appendChild(script)
        } else {
          existingScript.addEventListener('load', renderWidget)
        }
      }

      return () => {
        isMounted = false
        if (widgetIdRef.current && window.turnstile) {
          try {
            window.turnstile.remove(widgetIdRef.current)
          } catch {
            // Ignore unmount error
          }
          widgetIdRef.current = null
        }
      }
    }, [resolvedSiteKey, onToken, onError, onExpire])

    if (!resolvedSiteKey) return null

    return <div ref={containerRef} className={className ?? 'my-2 flex justify-center'} />
  }
)
```

### Archived: `lib/auth/turnstile.ts` (Server Siteverify Verification)
```ts
import 'server-only'

interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
  challenge_ts?: string
  hostname?: string
  action?: string
  cdata?: string
}

export async function verifyTurnstileToken(
  token: string,
  remoteIp?: string
): Promise<{ success: boolean; error?: string }> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY
  if (!secretKey) {
    console.warn('[Turnstile] Secret key not configured; skipping verification in dev')
    return { success: true }
  }

  const formData = new URLSearchParams()
  formData.append('secret', secretKey)
  formData.append('response', token)
  if (remoteIp) {
    formData.append('remoteip', remoteIp)
  }

  try {
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    )

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status}` }
    }

    const data: TurnstileVerifyResponse = await res.json()
    return {
      success: data.success,
      error: data['error-codes']?.join(', '),
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown verification error',
    }
  }
}
```
