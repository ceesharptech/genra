import { describe, it, expect, afterEach } from 'vitest';
import { validateSentryTestToken } from '@/lib/monitoring/token-gate';

describe('validateSentryTestToken', () => {
  const originalEnv = process.env.SENTRY_TEST_TOKEN;

  afterEach(() => {
    process.env.SENTRY_TEST_TOKEN = originalEnv;
  });

  it('returns false when SENTRY_TEST_TOKEN is unset in environment', () => {
    delete process.env.SENTRY_TEST_TOKEN;
    expect(validateSentryTestToken('any-token')).toBe(false);
  });

  it('returns false when SENTRY_TEST_TOKEN is empty or whitespace', () => {
    process.env.SENTRY_TEST_TOKEN = '';
    expect(validateSentryTestToken('any-token')).toBe(false);

    process.env.SENTRY_TEST_TOKEN = '   ';
    expect(validateSentryTestToken('any-token')).toBe(false);
  });

  it('returns false when provided token is null, undefined, or empty', () => {
    process.env.SENTRY_TEST_TOKEN = 'secret-token-123';
    expect(validateSentryTestToken(null)).toBe(false);
    expect(validateSentryTestToken(undefined)).toBe(false);
    expect(validateSentryTestToken('')).toBe(false);
  });

  it('returns false when provided token is wrong value with same length', () => {
    process.env.SENTRY_TEST_TOKEN = 'secret-token-123';
    expect(validateSentryTestToken('secret-token-999')).toBe(false);
  });

  it('returns false when provided token is wrong length', () => {
    process.env.SENTRY_TEST_TOKEN = 'secret-token-123';
    expect(validateSentryTestToken('short')).toBe(false);
    expect(validateSentryTestToken('secret-token-123-extra-long')).toBe(false);
  });

  it('returns true when provided token matches exactly', () => {
    process.env.SENTRY_TEST_TOKEN = 'my-super-secret-token-456';
    expect(validateSentryTestToken('my-super-secret-token-456')).toBe(true);
  });
});
