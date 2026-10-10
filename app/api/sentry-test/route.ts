import { NextRequest } from 'next/server';
import { validateSentryTestToken } from '@/lib/monitoring/token-gate';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  // Token gate: return 404 if token is missing or invalid
  if (!validateSentryTestToken(token)) {
    return new Response(null, { status: 404 });
  }

  // Rate limit protection
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon';
  const limit = await checkRateLimit('report', `sentry_api:${ip}`);
  if (!limit.success) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  const kind = request.nextUrl.searchParams.get('kind');
  if (kind === 'server') {
    // Intentionally throws an unhandled server error to verify onRequestError capture
    throw new Error('Intentional test server error from /api/sentry-test for Sentry verification');
  }

  return Response.json({
    ok: true,
    message: 'Sentry test API route active. Use ?kind=server to trigger an unhandled server exception.',
  });
}
