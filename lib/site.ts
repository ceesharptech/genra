/**
 * Resolves the application site URL following the prioritized fallback order:
 * 1. NEXT_PUBLIC_SITE_URL
 * 2. VERCEL_PROJECT_PRODUCTION_URL (prefixed with https://)
 * 3. VERCEL_URL (prefixed with https://)
 * 4. http://localhost:3000
 *
 * Normalizes by trimming whitespace and removing trailing slashes.
 */
export function getSiteUrl(): string {
  let url = process.env.NEXT_PUBLIC_SITE_URL;

  if (!url && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    url = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (!url && process.env.VERCEL_URL) {
    url = `https://${process.env.VERCEL_URL}`;
  }

  if (!url) {
    url = 'http://localhost:3000';
  }

  url = url.trim();

  // If protocol is missing, prepend https:// (or http:// for localhost)
  if (!/^https?:\/\//i.test(url)) {
    url = url.includes('localhost') ? `http://${url}` : `https://${url}`;
  }

  // Remove trailing slashes
  return url.replace(/\/+$/, '');
}

/**
 * Creates an absolute URL by combining getSiteUrl() with the given path.
 */
export function absoluteUrl(path: string = ''): string {
  const base = getSiteUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (normalizedPath === '/') {
    return base;
  }
  return `${base}${normalizedPath}`;
}
