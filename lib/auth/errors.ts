import { safeRedirectPath } from './redirect'

export type AuthErrorCode =
  | 'link_wrong_browser'
  | 'link_expired'
  | 'link_invalid'
  | 'auth_failed'
  | 'oauth_error'

/**
 * Maps Supabase auth error parameters and exchange errors to fixed error codes.
 * Raw error text is never leaked directly to the client or URL.
 */
export function mapAuthCallbackError({
  error,
  errorCode,
  errorDescription,
  exchangeErrorMessage,
}: {
  error?: string | null
  errorCode?: string | null
  errorDescription?: string | null
  exchangeErrorMessage?: string | null
}): AuthErrorCode {
  const combined = [error, errorCode, errorDescription, exchangeErrorMessage]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  // 1. Missing PKCE verifier / different browser or app
  if (
    combined.includes('code challenge') ||
    combined.includes('code_verifier') ||
    combined.includes('code verifier') ||
    combined.includes('pkce') ||
    combined.includes('both auth code and code verifier')
  ) {
    return 'link_wrong_browser'
  }

  // 2. Expired or already-used token / OTP
  if (
    combined.includes('otp_expired') ||
    combined.includes('expired') ||
    combined.includes('already used') ||
    combined.includes('invalid or expired')
  ) {
    return 'link_expired'
  }

  // 3. OAuth provider error
  if (combined.includes('access_denied') && combined.includes('oauth')) {
    return 'oauth_error'
  }

  // 4. Missing or invalid code
  if (
    combined.includes('missing_code') ||
    combined.includes('invalid_code') ||
    combined.includes('invalid flow state')
  ) {
    return 'link_invalid'
  }

  // 5. Default fallback
  return 'auth_failed'
}

/**
 * Returns a calm, friendly, user-facing error message for an auth error code.
 */
export function getAuthErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null

  switch (code) {
    case 'link_wrong_browser':
      return 'That link was opened in a different browser or app than the one you asked for it from. Request a new link and open it in the same browser.'
    case 'link_expired':
      return 'That link has expired or was already used. Request a new one.'
    case 'link_invalid':
    case 'missing_code':
    case 'invalid_code':
      return 'That sign-in link is invalid or incomplete. Please request a new link.'
    case 'oauth_error':
      return 'Google sign-in was cancelled or failed. Please try again.'
    case 'auth_failed':
      return 'Authentication could not be completed. Please try again.'
    default:
      return 'Unable to sign in. Please try again.'
  }
}

/**
 * Builds a secure callback URL with sanitized `next` and preserved intent parameters.
 * Open-redirect targets are sanitized to fallback '/' before generating the URL.
 */
export function buildAuthCallbackUrl({
  origin,
  next,
  intent,
}: {
  origin: string
  next?: string | null
  intent?: string | null
}): string {
  const safeNext = safeRedirectPath(next, '/')
  const targetNext = intent
    ? safeNext.includes('?')
      ? `${safeNext}&intent=${encodeURIComponent(intent)}`
      : `${safeNext}?intent=${encodeURIComponent(intent)}`
    : safeNext

  return `${origin}/auth/callback?next=${encodeURIComponent(targetNext)}`
}
