import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'anonymous';
    const rateLimit = await checkRateLimit('csp_report', ip);
    if (!rateLimit.success) {
      return new NextResponse(null, { status: 429 });
    }

    // Check payload size
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 10 * 1024) {
      return new NextResponse('Payload too large', { status: 413 });
    }

    const rawBody = await req.text();
    if (rawBody.length > 10 * 1024) {
      return new NextResponse('Payload too large', { status: 413 });
    }

    if (rawBody) {
      try {
        const payload = JSON.parse(rawBody);
        const report =
          payload['csp-report'] ||
          (Array.isArray(payload) ? payload[0]?.body : payload);
        const blockedUri =
          report?.['blocked-uri'] || report?.blockedURL || 'unknown';
        const directive =
          report?.['violated-directive'] ||
          report?.effectiveDirective ||
          'unknown';

        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `[CSP Report] Violated: ${directive} -> Blocked: ${blockedUri}`
          );
        }
      } catch {
        // Malformed JSON - ignore
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}
