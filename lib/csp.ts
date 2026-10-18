/**
 * Content Security Policy (CSP) generator for Genra.
 * Supports report-only mode (default) and enforce mode via server-only CSP_MODE env var.
 */

export interface CspOptions {
  cspMode?: string;
  isProduction?: boolean;
  supabaseUrl?: string;
}

export function getCspHeaderKey(cspMode?: string): 'Content-Security-Policy' | 'Content-Security-Policy-Report-Only' {
  const mode = cspMode !== undefined ? cspMode : process.env.CSP_MODE;
  return mode === 'enforce'
    ? 'Content-Security-Policy'
    : 'Content-Security-Policy-Report-Only';
}

export function buildCspHeader(options: CspOptions = {}): string {
  const isProduction =
    options.isProduction !== undefined
      ? options.isProduction
      : process.env.VERCEL_ENV === 'production';

  const supabaseUrl =
    options.supabaseUrl !== undefined
      ? options.supabaseUrl
      : process.env.NEXT_PUBLIC_SUPABASE_URL;

  let supabaseOrigin = 'https://*.supabase.co';
  let supabaseWss = 'wss://*.supabase.co';

  if (supabaseUrl) {
    try {
      const parsed = new URL(supabaseUrl);
      supabaseOrigin = parsed.origin;
      supabaseWss = `wss://${parsed.host}`;
    } catch {
      // Fallback to standard wildcard Supabase hosts
    }
  }

  const directives: string[] = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us.i.posthog.com https://eu.i.posthog.com https://us-assets.i.posthog.com https://eu-assets.i.posthog.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    `img-src 'self' data: blob: ${supabaseOrigin} https://*.supabase.co https://lh3.googleusercontent.com https://us.i.posthog.com https://eu.i.posthog.com`,
    `media-src 'self' blob: ${supabaseOrigin} https://*.supabase.co`,
    `connect-src 'self' ${supabaseOrigin} https://*.supabase.co ${supabaseWss} wss://*.supabase.co https://us.i.posthog.com https://eu.i.posthog.com https://*.ingest.sentry.io https://*.ingest.us.sentry.io https://*.ingest.de.sentry.io https://*.upstash.io`,
    "frame-src 'self' https://youtube.com https://www.youtube.com https://youtube-nocookie.com https://www.youtube-nocookie.com https://player.vimeo.com https://loom.com https://www.loom.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  if (isProduction) {
    directives.push('upgrade-insecure-requests');
  }

  directives.push('report-uri /api/csp-report');

  return directives.join('; ').replace(/\s{2,}/g, ' ').trim() + ';';
}
