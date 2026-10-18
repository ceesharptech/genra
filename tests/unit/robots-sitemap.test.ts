import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

describe('robots.txt configuration', () => {
  const originalVercelEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    process.env.VERCEL_ENV = originalVercelEnv;
  });

  describe('in preview or development (VERCEL_ENV !== "production")', () => {
    it('disallows all crawling and omits sitemap', () => {
      process.env.VERCEL_ENV = 'preview';
      const config = robots();
      expect(config.sitemap).toBeUndefined();
      const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
      expect(rules?.userAgent).toBe('*');
      expect(rules?.disallow).toEqual(['/']);
    });
  });

  describe('in production (VERCEL_ENV === "production")', () => {
    beforeEach(() => {
      process.env.VERCEL_ENV = 'production';
    });

    it('generates a valid robots config referencing the site sitemap', () => {
      const config = robots();
      expect(config.sitemap).toContain('/sitemap.xml');
      expect(config.rules).toBeDefined();
    });

    it('keeps public pages and social preview routes crawlable', () => {
      const config = robots();
      const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;

      expect(rules).toBeDefined();
      const allowList = Array.isArray(rules?.allow)
        ? rules.allow
        : [rules?.allow];

      expect(allowList).toContain('/');
      expect(allowList).toContain('/discover');
      expect(allowList).toContain('/c/');
      expect(allowList).toContain('/u/');

      // Ensure preview image routes are NOT disallowed
      const disallowList = Array.isArray(rules?.disallow)
        ? rules.disallow
        : [rules?.disallow];

      for (const disallowed of disallowList) {
        expect(disallowed).not.toContain('/og');
      }
    });

    it('disallows private and app routes from indexation', () => {
      const config = robots();
      const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
      const disallowList = Array.isArray(rules?.disallow)
        ? rules.disallow
        : [rules?.disallow];

      const privateRoutes = [
        '/saved',
        '/creations',
        '/settings',
        '/onboarding',
        '/login',
        '/signup',
        '/new',
        '/c/*/edit',
        '/design',
      ];

      for (const route of privateRoutes) {
        expect(disallowList).toContain(route);
      }
    });
  });
});

describe('sitemap.xml configuration', () => {
  const originalVercelEnv = process.env.VERCEL_ENV;

  afterEach(() => {
    process.env.VERCEL_ENV = originalVercelEnv;
  });

  it('returns empty array when VERCEL_ENV is not production', async () => {
    process.env.VERCEL_ENV = 'preview';
    const entries = await sitemap();
    expect(entries).toEqual([]);
  });
});
