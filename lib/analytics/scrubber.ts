/**
 * URL and event property scrubber for analytics.
 * Ensures zero personal data, search queries, or auth secrets leak into telemetry.
 */

export const ALLOWED_QUERY_PARAMS = new Set([
  'category',
  'sort',
  'tab',
  'kind',
  'tool',
  'ref',
]);

/**
 * Sanitizes a URL string by:
 * 1. Preserving protocol, host, and pathname.
 * 2. Allowing only approved filter parameters: category, sort, tab, kind, tool, ref.
 * 3. Replacing search query text `q=...` with `has_query=true`.
 * 4. Stripping all sensitive tokens (code, token, next, intent, error*, etc.) and hash fragments.
 */
export function sanitizeUrl(rawUrl: string | null | undefined): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return '';
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return '';
  }

  const isAbsolute = /^https?:\/\//i.test(trimmed);
  const base = isAbsolute ? undefined : 'https://genra.local';

  try {
    const parsed = new URL(trimmed, base);
    const sanitizedParams = new URLSearchParams();

    let hasQuery = false;

    // Iterate through all query parameters
    for (const [key, value] of parsed.searchParams.entries()) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'q') {
        if (value.trim().length > 0) {
          hasQuery = true;
        }
      } else if (ALLOWED_QUERY_PARAMS.has(lowerKey)) {
        sanitizedParams.set(lowerKey, value);
      }
    }

    if (hasQuery) {
      sanitizedParams.set('has_query', 'true');
    }

    const searchString = sanitizedParams.toString()
      ? `?${sanitizedParams.toString()}`
      : '';

    if (isAbsolute) {
      return `${parsed.origin}${parsed.pathname}${searchString}`;
    }

    return `${parsed.pathname}${searchString}`;
  } catch {
    // Malformed URL fallback: strip query and hash
    const withoutHash = trimmed.split('#')[0];
    const withoutQuery = withoutHash.split('?')[0];
    return withoutQuery;
  }
}

const KNOWN_URL_PROPERTIES = new Set([
  '$current_url',
  '$referrer',
  '$initial_current_url',
  '$initial_referrer',
  'current_url',
  'referrer',
  'initial_current_url',
  'initial_referrer',
]);

/**
 * Hook for PostHog `before_send` to scrub URLs across event properties.
 */
export function scrubEventUrls<T extends { properties?: Record<string, unknown> }>(
  event: T | null
): T | null {
  if (!event) return null;

  if (event.properties && typeof event.properties === 'object') {
    for (const [key, value] of Object.entries(event.properties)) {
      if (typeof value === 'string') {
        const lowerKey = key.toLowerCase();
        if (
          KNOWN_URL_PROPERTIES.has(key) ||
          lowerKey.endsWith('_url') ||
          lowerKey.endsWith('url') ||
          lowerKey.includes('referrer')
        ) {
          event.properties[key] = sanitizeUrl(value);
        }
      }
    }

    // Ensure $pathname doesn't carry query or fragments
    const pathnameVal = event.properties.$pathname;
    if (typeof pathnameVal === 'string') {
      try {
        const parsed = new URL(pathnameVal, 'https://genra.local');
        event.properties.$pathname = parsed.pathname;
      } catch {
        event.properties.$pathname = pathnameVal.split('?')[0].split('#')[0];
      }
    }
  }

  return event;
}
