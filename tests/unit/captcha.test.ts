import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as Sentry from '@sentry/nextjs'
import {
  useCaptcha,
  buildSignInOptions,
  isSubmitDisabled,
  handleCaptchaError,
  resetCaptchaSentryReportedForTesting,
} from '@/lib/auth/captcha'

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
}))

describe('useCaptcha', () => {
  it('returns disabled state with null token and no widget', () => {
    const state = useCaptcha()
    expect(state.enabled).toBe(false)
    expect(state.token).toBeNull()
    expect(state.widget).toBeNull()
    expect(typeof state.reset).toBe('function')
    expect(() => state.reset()).not.toThrow()
  })
})

describe('buildSignInOptions', () => {
  it('preserves base options when token is not provided or empty', () => {
    const base = { shouldCreateUser: true }
    expect(buildSignInOptions(base)).toEqual({ shouldCreateUser: true })
    expect(buildSignInOptions(base, null)).toEqual({ shouldCreateUser: true })
    expect(buildSignInOptions(base, undefined)).toEqual({ shouldCreateUser: true })
    expect(buildSignInOptions(base, '')).toEqual({ shouldCreateUser: true })
    expect(buildSignInOptions(base, '   ')).toEqual({ shouldCreateUser: true })
  })

  it('attaches trimmed captchaToken when a non-empty token is provided', () => {
    const base = {
      shouldCreateUser: true,
      emailRedirectTo: 'https://example.com/callback',
    }
    const result = buildSignInOptions(base, '  token-abc-123  ')
    expect(result).toEqual({
      shouldCreateUser: true,
      emailRedirectTo: 'https://example.com/callback',
      captchaToken: 'token-abc-123',
    })
  })
})

describe('isSubmitDisabled', () => {
  it('disables when loading or in cooldown', () => {
    expect(
      isSubmitDisabled({ email: 'user@example.com', isLoading: true })
    ).toBe(true)
    expect(
      isSubmitDisabled({
        email: 'user@example.com',
        isLoading: false,
        cooldown: 10,
      })
    ).toBe(true)
  })

  it('disables when email is empty or only whitespace', () => {
    expect(isSubmitDisabled({ email: '', isLoading: false })).toBe(true)
    expect(isSubmitDisabled({ email: '   ', isLoading: false })).toBe(true)
  })

  it('enables when email is valid and captcha is disabled (current default state)', () => {
    expect(
      isSubmitDisabled({
        email: 'user@example.com',
        isLoading: false,
        cooldown: 0,
        captchaEnabled: false,
        captchaToken: null,
      })
    ).toBe(false)
  })

  it('handles future enabled captcha state correctly', () => {
    // Disabled if captcha is enabled but token is null or empty
    expect(
      isSubmitDisabled({
        email: 'user@example.com',
        isLoading: false,
        captchaEnabled: true,
        captchaToken: null,
      })
    ).toBe(true)
    expect(
      isSubmitDisabled({
        email: 'user@example.com',
        isLoading: false,
        captchaEnabled: true,
        captchaToken: '',
      })
    ).toBe(true)

    // Enabled if captcha is enabled and valid token exists
    expect(
      isSubmitDisabled({
        email: 'user@example.com',
        isLoading: false,
        captchaEnabled: true,
        captchaToken: 'valid-token',
      })
    ).toBe(false)
  })
})

describe('handleCaptchaError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetCaptchaSentryReportedForTesting()
  })

  it('returns null for falsy error or non-captcha errors', () => {
    expect(handleCaptchaError(null)).toBeNull()
    expect(handleCaptchaError(undefined)).toBeNull()
    expect(handleCaptchaError({ message: 'Invalid email format' })).toBeNull()
    expect(handleCaptchaError({ message: 'Rate limit exceeded' })).toBeNull()
    expect(Sentry.captureMessage).not.toHaveBeenCalled()
  })

  it('maps captcha error message and captures warning to Sentry once', () => {
    const error = { message: 'Captcha verification failed', status: 400 }
    const result1 = handleCaptchaError(error)

    expect(result1).toBe(
      'Sign-in is temporarily unavailable. Please try again later or continue with Google.'
    )
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1)
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'Supabase CAPTCHA protection error detected on client while CAPTCHA is deferred',
      expect.objectContaining({
        level: 'warning',
        tags: expect.objectContaining({
          area: 'auth',
          subsystem: 'captcha',
          misconfiguration: 'supabase_dashboard_captcha_active',
        }),
      })
    )

    // Second call does not trigger Sentry again (de-duplication)
    const result2 = handleCaptchaError({ message: 'Missing captcha token' })
    expect(result2).toBe(
      'Sign-in is temporarily unavailable. Please try again later or continue with Google.'
    )
    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1)
  })
})
