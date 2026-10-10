import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateTurnstileToken } from '@/lib/auth/turnstile';

describe('Cloudflare Turnstile Verification', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('passes through when TURNSTILE_SECRET is not configured', async () => {
    delete process.env.TURNSTILE_SECRET;
    const result = await validateTurnstileToken({
      token: 'some-token',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty or invalid tokens when secret is configured', async () => {
    process.env.TURNSTILE_SECRET = '0x4AAAAAA-test-secret';
    const emptyResult = await validateTurnstileToken({
      token: '',
    });
    expect(emptyResult.success).toBe(false);
    expect(emptyResult.error).toBe('invalid-token-length');
  });

  it('verifies token successfully against Cloudflare siteverify endpoint', async () => {
    process.env.TURNSTILE_SECRET = '0x4AAAAAA-test-secret';
    process.env.TURNSTILE_HOSTNAMES = 'localhost,genra.vercel.app';

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        action: 'login',
        hostname: 'localhost',
      }),
    } as unknown as Response);

    const result = await validateTurnstileToken({
      token: 'valid-turnstile-token',
      expectedAction: 'login',
      remoteIp: '127.0.0.1',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({
        method: 'POST',
      })
    );
    expect(result.success).toBe(true);
  });

  it('rejects on action mismatch', async () => {
    process.env.TURNSTILE_SECRET = '0x4AAAAAA-test-secret';
    process.env.TURNSTILE_HOSTNAMES = 'localhost';

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        action: 'signup',
        hostname: 'localhost',
      }),
    } as unknown as Response);

    const result = await validateTurnstileToken({
      token: 'valid-turnstile-token',
      expectedAction: 'login',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('action-mismatch');
  });

  it('rejects on hostname mismatch', async () => {
    process.env.TURNSTILE_SECRET = '0x4AAAAAA-test-secret';
    process.env.TURNSTILE_HOSTNAMES = 'genra.vercel.app';

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        action: 'login',
        hostname: 'attacker.com',
      }),
    } as unknown as Response);

    const result = await validateTurnstileToken({
      token: 'valid-turnstile-token',
      expectedAction: 'login',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('hostname-mismatch');
  });

  it('handles siteverify API errors safely without throwing', async () => {
    process.env.TURNSTILE_SECRET = '0x4AAAAAA-test-secret';

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        'error-codes': ['invalid-input-response'],
      }),
    } as unknown as Response);

    const result = await validateTurnstileToken({
      token: 'expired-token',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid-input-response');
  });
});
