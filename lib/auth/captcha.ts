import * as Sentry from '@sentry/nextjs'

export interface CaptchaState {
  enabled: boolean
  token: string | null
  reset: () => void
  widget: React.ReactNode | null
}

/**
 * Thin provider-agnostic CAPTCHA seam hook.
 * Returns disabled state while CAPTCHA is deferred.
 */
export function useCaptcha(): CaptchaState {
  return {
    enabled: false,
    token: null,
    reset: () => {},
    widget: null,
  }
}

/**
 * Pure helper that builds signInWithOtp options, attaching captchaToken
 * only when a non-empty token string exists.
 */
export function buildSignInOptions<T extends Record<string, unknown>>(
  baseOptions: T,
  captchaToken?: string | null
): T & { captchaToken?: string } {
  if (captchaToken && captchaToken.trim().length > 0) {
    return { ...baseOptions, captchaToken: captchaToken.trim() }
  }
  return { ...baseOptions }
}

/**
 * Pure logic determining whether the email submit button should be disabled.
 */
export function isSubmitDisabled({
  email,
  isLoading,
  cooldown = 0,
  captchaEnabled = false,
  captchaToken = null,
}: {
  email: string
  isLoading: boolean
  cooldown?: number
  captchaEnabled?: boolean
  captchaToken?: string | null
}): boolean {
  if (isLoading || cooldown > 0) return true
  if (!email || email.trim().length === 0) return true
  if (captchaEnabled && (!captchaToken || captchaToken.trim().length === 0)) return true
  return false
}

let sentryCaptchaReported = false

export function resetCaptchaSentryReportedForTesting() {
  sentryCaptchaReported = false
}

/**
 * Inspects a Supabase error message. If it indicates CAPTCHA protection is active
 * on the backend while the client has it disabled, logs once to Sentry and returns
 * a calm, user-facing error message.
 */
export function handleCaptchaError(
  error: { message?: string; status?: number } | null | undefined
): string | null {
  if (!error?.message) return null
  const msg = error.message.toLowerCase()
  if (msg.includes('captcha')) {
    if (!sentryCaptchaReported) {
      sentryCaptchaReported = true
      Sentry.captureMessage(
        'Supabase CAPTCHA protection error detected on client while CAPTCHA is deferred',
        {
          level: 'warning',
          tags: {
            area: 'auth',
            subsystem: 'captcha',
            misconfiguration: 'supabase_dashboard_captcha_active',
          },
          extra: {
            status: error.status,
            originalMessage: error.message,
          },
        }
      )
    }
    return 'Sign-in is temporarily unavailable. Please try again later or continue with Google.'
  }
  return null
}
