import 'server-only';

/**
 * Cloudflare Turnstile Server-Side Siteverify Module.
 * Conforms to canonical siteverify contract in Cloudflare Turnstile specifications.
 */

interface ValidateTurnstileOptions {
  token: string;
  expectedAction?: string;
  remoteIp?: string | null;
}

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

export async function validateTurnstileToken({
  token,
  expectedAction,
  remoteIp,
}: ValidateTurnstileOptions): Promise<{ success: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET;

  // If TURNSTILE_SECRET is not configured (e.g. preview or local dev without secret), pass through gracefully
  if (!secret) {
    return { success: true };
  }

  if (
    typeof token !== 'string' ||
    token.length === 0 ||
    token.length > 2048
  ) {
    return { success: false, error: 'invalid-token-length' };
  }

  const expectedHostnames = new Set(
    (process.env.TURNSTILE_HOSTNAMES ?? 'localhost,127.0.0.1')
      .split(',')
      .map((h) => h.trim())
      .filter(Boolean)
  );

  try {
    const params = new URLSearchParams({
      secret,
      response: token,
    });
    if (remoteIp) {
      params.append('remoteip', remoteIp);
    }

    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        signal: AbortSignal.timeout(10_000),
        body: params,
      }
    );

    if (!res.ok) {
      return { success: false, error: `siteverify-http-${res.status}` };
    }

    const data: TurnstileVerifyResponse = await res.json();

    if (!data.success) {
      const errorCodes = data['error-codes']?.join(',') || 'failed';
      return { success: false, error: errorCodes };
    }

    if (expectedAction && data.action && data.action !== expectedAction) {
      return { success: false, error: 'action-mismatch' };
    }

    if (
      expectedHostnames.size > 0 &&
      data.hostname &&
      !expectedHostnames.has(data.hostname)
    ) {
      return { success: false, error: 'hostname-mismatch' };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'siteverify-error';
    return { success: false, error: message };
  }
}
