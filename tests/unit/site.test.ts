import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { getSiteUrl, absoluteUrl } from '@/lib/site';

describe('site URL resolution', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prefers NEXT_PUBLIC_SITE_URL when provided', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://custom-domain.com';
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'genra-prod.vercel.app';
    process.env.VERCEL_URL = 'preview-123.vercel.app';

    expect(getSiteUrl()).toBe('https://custom-domain.com');
  });

  it('falls back to VERCEL_PROJECT_PRODUCTION_URL with https:// prefix', () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'genra-main.vercel.app';
    process.env.VERCEL_URL = 'preview-branch.vercel.app';

    expect(getSiteUrl()).toBe('https://genra-main.vercel.app');
  });

  it('falls back to VERCEL_URL when production project URL is absent', () => {
    process.env.VERCEL_URL = 'preview-pr-42.vercel.app';

    expect(getSiteUrl()).toBe('https://preview-pr-42.vercel.app');
  });

  it('falls back to localhost:3000 when no environment variables are set', () => {
    expect(getSiteUrl()).toBe('http://localhost:3000');
  });

  it('normalizes URLs by stripping trailing slashes', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://genra.co///';
    expect(getSiteUrl()).toBe('https://genra.co');
  });

  it('prepends https:// if protocol is missing on a domain', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'genra.co';
    expect(getSiteUrl()).toBe('https://genra.co');
  });

  describe('absoluteUrl', () => {
    it('generates fully-qualified absolute URLs', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://genra.co';

      expect(absoluteUrl('/c/chowbuddy')).toBe('https://genra.co/c/chowbuddy');
      expect(absoluteUrl('c/chowbuddy')).toBe('https://genra.co/c/chowbuddy');
      expect(absoluteUrl('/')).toBe('https://genra.co');
      expect(absoluteUrl('')).toBe('https://genra.co');
    });
  });
});
