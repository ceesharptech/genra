import { describe, expect, it, afterEach } from 'vitest'
import { getEmailAuthMode } from '@/lib/auth/config'
import {
  mapAuthCallbackError,
  getAuthErrorMessage,
  buildAuthCallbackUrl,
} from '@/lib/auth/errors'

describe('getEmailAuthMode', () => {
  const originalEnv = process.env.NEXT_PUBLIC_EMAIL_AUTH_MODE

  afterEach(() => {
    process.env.NEXT_PUBLIC_EMAIL_AUTH_MODE = originalEnv
  })

  it('defaults to magic_link when env var is unset', () => {
    delete process.env.NEXT_PUBLIC_EMAIL_AUTH_MODE
    expect(getEmailAuthMode()).toBe('magic_link')
  })

  it('returns magic_link when explicitly set to magic_link', () => {
    process.env.NEXT_PUBLIC_EMAIL_AUTH_MODE = 'magic_link'
    expect(getEmailAuthMode()).toBe('magic_link')
  })

  it('returns otp when explicitly set to otp', () => {
    process.env.NEXT_PUBLIC_EMAIL_AUTH_MODE = 'otp'
    expect(getEmailAuthMode()).toBe('otp')
  })

  it('handles casing and whitespace gracefully', () => {
    process.env.NEXT_PUBLIC_EMAIL_AUTH_MODE = '  OTP  '
    expect(getEmailAuthMode()).toBe('otp')

    process.env.NEXT_PUBLIC_EMAIL_AUTH_MODE = 'Magic_Link'
    expect(getEmailAuthMode()).toBe('magic_link')
  })

  it('falls back to magic_link on unknown or invalid values', () => {
    process.env.NEXT_PUBLIC_EMAIL_AUTH_MODE = 'passwordless'
    expect(getEmailAuthMode()).toBe('magic_link')

    process.env.NEXT_PUBLIC_EMAIL_AUTH_MODE = 'sms'
    expect(getEmailAuthMode()).toBe('magic_link')
  })
})

describe('mapAuthCallbackError', () => {
  it('maps PKCE code verifier missing / different browser errors to link_wrong_browser', () => {
    expect(
      mapAuthCallbackError({
        exchangeErrorMessage: 'both auth code and code verifier should be non-empty',
      })
    ).toBe('link_wrong_browser')

    expect(
      mapAuthCallbackError({
        exchangeErrorMessage: 'code challenge does not match',
      })
    ).toBe('link_wrong_browser')

    expect(
      mapAuthCallbackError({
        errorDescription: 'PKCE verifier cookie not found',
      })
    ).toBe('link_wrong_browser')
  })

  it('maps expired or already-used token errors to link_expired', () => {
    expect(
      mapAuthCallbackError({
        errorCode: 'otp_expired',
      })
    ).toBe('link_expired')

    expect(
      mapAuthCallbackError({
        exchangeErrorMessage: 'Token has expired or is invalid',
      })
    ).toBe('link_expired')

    expect(
      mapAuthCallbackError({
        errorDescription: 'This link has already used or expired',
      })
    ).toBe('link_expired')
  })

  it('maps missing or invalid code to link_invalid', () => {
    expect(
      mapAuthCallbackError({
        errorCode: 'missing_code',
      })
    ).toBe('link_invalid')

    expect(
      mapAuthCallbackError({
        error: 'invalid_code',
      })
    ).toBe('link_invalid')
  })

  it('maps OAuth cancellations or provider errors', () => {
    expect(
      mapAuthCallbackError({
        error: 'access_denied',
        errorDescription: 'oauth user cancelled',
      })
    ).toBe('oauth_error')
  })

  it('maps unknown errors to auth_failed', () => {
    expect(
      mapAuthCallbackError({
        error: 'server_error',
        errorDescription: 'Internal database timeout',
      })
    ).toBe('auth_failed')

    expect(mapAuthCallbackError({})).toBe('auth_failed')
  })
})

describe('getAuthErrorMessage', () => {
  it('returns appropriate friendly messages for error codes', () => {
    expect(getAuthErrorMessage('link_wrong_browser')).toContain('different browser')
    expect(getAuthErrorMessage('link_expired')).toContain('expired or was already used')
    expect(getAuthErrorMessage('link_invalid')).toContain('invalid or incomplete')
    expect(getAuthErrorMessage('oauth_error')).toContain('Google sign-in')
    expect(getAuthErrorMessage('auth_failed')).toContain('could not be completed')
    expect(getAuthErrorMessage(null)).toBeNull()
    expect(getAuthErrorMessage(undefined)).toBeNull()
  })
})

describe('buildAuthCallbackUrl', () => {
  const origin = 'http://localhost:3000'

  it('builds callback URL with safe relative path', () => {
    const url = buildAuthCallbackUrl({
      origin,
      next: '/discover',
    })
    expect(url).toBe('http://localhost:3000/auth/callback?next=%2Fdiscover')
  })

  it('preserves valid intent parameter intact', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000'
    const intent = `like:creation:${uuid}`
    const url = buildAuthCallbackUrl({
      origin,
      next: '/design',
      intent,
    })

    const parsed = new URL(url)
    const nextParam = parsed.searchParams.get('next')
    expect(nextParam).toBe(`/design?intent=${encodeURIComponent(intent)}`)
  })

  it('survives intact when intent is already encoded in next', () => {
    const next = '/design?intent=demo%3Apage%3Adev'
    const url = buildAuthCallbackUrl({
      origin,
      next,
    })

    const parsed = new URL(url)
    expect(parsed.searchParams.get('next')).toBe(next)
  })

  it('sanitizes external and protocol-relative attacker URLs to fallback root /', () => {
    const attackers = [
      'https://evil.example',
      'http://evil.example/login',
      '//evil.example',
      '///evil.example',
      '/\\evil.example',
      '\\evil.example',
      '/%5cevil.example',
      '/%2fevil.example',
      'javascript:alert(1)',
      '/javascript:alert(1)',
    ]

    for (const attacker of attackers) {
      const url = buildAuthCallbackUrl({
        origin,
        next: attacker,
      })
      const parsed = new URL(url)
      expect(parsed.searchParams.get('next')).toBe('/')
    }
  })
})
