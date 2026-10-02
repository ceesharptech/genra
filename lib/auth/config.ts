export type EmailAuthMode = 'magic_link' | 'otp'

/**
 * Returns the active email authentication mode.
 * Defaults to 'magic_link' unless NEXT_PUBLIC_EMAIL_AUTH_MODE is explicitly set to 'otp'.
 */
export function getEmailAuthMode(): EmailAuthMode {
  const mode = process.env.NEXT_PUBLIC_EMAIL_AUTH_MODE?.toLowerCase().trim()
  if (mode === 'otp') {
    return 'otp'
  }
  return 'magic_link'
}
