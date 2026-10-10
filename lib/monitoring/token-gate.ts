import crypto from 'node:crypto';

/**
 * Validates the provided test token against SENTRY_TEST_TOKEN in constant time.
 * If SENTRY_TEST_TOKEN is unset or empty, always returns false.
 * Never throws exceptions, never logs the token.
 */
export function validateSentryTestToken(
  providedToken: string | null | undefined
): boolean {
  const secret = process.env.SENTRY_TEST_TOKEN;
  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    return false;
  }

  if (!providedToken || typeof providedToken !== 'string') {
    return false;
  }

  const secretBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(providedToken);

  if (secretBuffer.length !== providedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(secretBuffer, providedBuffer);
}
