import { describe, it, expect } from 'vitest';
import { sanitizeUrl, scrubEventUrls } from '@/lib/analytics/scrubber';

describe('sanitizeUrl', () => {
  it('preserves allow-listed query parameters on absolute URLs', () => {
    const input = 'https://genra.dev/discover?category=apps&sort=trending&tab=creations&kind=agent&tool=nextjs&ref=twitter';
    const output = sanitizeUrl(input);
    expect(output).toBe('https://genra.dev/discover?category=apps&sort=trending&tab=creations&kind=agent&tool=nextjs&ref=twitter');
  });

  it('replaces search query text q with has_query=true', () => {
    const input = 'https://genra.dev/discover?q=my%20secret%20search%20term&category=websites';
    const output = sanitizeUrl(input);
    expect(output).toContain('has_query=true');
    expect(output).toContain('category=websites');
    expect(output).not.toContain('my%20secret%20search%20term');
    expect(output).not.toContain('my secret search term');
  });

  it('strips sensitive auth tokens, code, next, intent, and error parameters', () => {
    const input = 'https://genra.dev/auth/callback?code=pkce_secret_12345&token=jwt_xyz&next=%2Fsettings&intent=like_creation&error=access_denied&error_description=failed';
    const output = sanitizeUrl(input);
    expect(output).toBe('https://genra.dev/auth/callback');
    expect(output).not.toContain('code');
    expect(output).not.toContain('token');
    expect(output).not.toContain('next');
    expect(output).not.toContain('intent');
  });

  it('strips hash fragments that could contain access tokens or errors', () => {
    const input = 'https://genra.dev/auth/callback#access_token=secret_hash_token&token_type=bearer';
    const output = sanitizeUrl(input);
    expect(output).toBe('https://genra.dev/auth/callback');
    expect(output).not.toContain('access_token');
    expect(output).not.toContain('#');
  });

  it('sanitizes relative URLs properly', () => {
    const input = '/discover?category=design&q=logo&code=secret123';
    const output = sanitizeUrl(input);
    expect(output).toBe('/discover?category=design&has_query=true');
  });

  it('handles empty, null, and non-string inputs safely', () => {
    expect(sanitizeUrl('')).toBe('');
    expect(sanitizeUrl(null)).toBe('');
    expect(sanitizeUrl(undefined)).toBe('');
  });

  it('handles malformed URLs without throwing exceptions', () => {
    const malformed = 'ht!tp://::bad_url/path?q=secret#hash';
    const result = sanitizeUrl(malformed);
    expect(typeof result).toBe('string');
    expect(result).not.toContain('secret');
  });
});

describe('scrubEventUrls', () => {
  it('scrubs standard PostHog URL properties in event before_send', () => {
    const event = {
      event: '$pageview',
      properties: {
        $current_url: 'https://genra.dev/discover?q=super_secret_query&sort=popular',
        $referrer: 'https://google.com/search?q=sensitive+query',
        $initial_current_url: 'https://genra.dev/login?next=%2Fdashboard&code=auth_code',
        $initial_referrer: 'https://partner.com/?token=secret_affiliate_token',
        $pathname: '/discover?q=secret',
        category: 'apps',
      },
    };

    const scrubbed = scrubEventUrls(event);
    expect(scrubbed).not.toBeNull();
    expect(scrubbed?.properties.$current_url).toBe('https://genra.dev/discover?sort=popular&has_query=true');
    expect(scrubbed?.properties.$referrer).toBe('https://google.com/search?has_query=true');
    expect(scrubbed?.properties.$initial_current_url).toBe('https://genra.dev/login');
    expect(scrubbed?.properties.$initial_referrer).toBe('https://partner.com/');
    expect(scrubbed?.properties.$pathname).toBe('/discover');
    expect(scrubbed?.properties.category).toBe('apps');
  });

  it('returns null when given null event', () => {
    expect(scrubEventUrls(null)).toBeNull();
  });
});
