import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildCspHeader, getCspHeaderKey } from '@/lib/csp';

describe('CSP Configuration', () => {
  const originalCspMode = process.env.CSP_MODE;
  const originalVercelEnv = process.env.VERCEL_ENV;
  const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    delete process.env.CSP_MODE;
    delete process.env.VERCEL_ENV;
  });

  afterEach(() => {
    process.env.CSP_MODE = originalCspMode;
    process.env.VERCEL_ENV = originalVercelEnv;
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
  });

  describe('getCspHeaderKey', () => {
    it('defaults to Content-Security-Policy-Report-Only when CSP_MODE is unset', () => {
      expect(getCspHeaderKey()).toBe('Content-Security-Policy-Report-Only');
    });

    it('returns Content-Security-Policy-Report-Only when CSP_MODE is report-only', () => {
      process.env.CSP_MODE = 'report-only';
      expect(getCspHeaderKey()).toBe('Content-Security-Policy-Report-Only');
      expect(getCspHeaderKey('report-only')).toBe('Content-Security-Policy-Report-Only');
    });

    it('returns Content-Security-Policy when CSP_MODE is enforce', () => {
      process.env.CSP_MODE = 'enforce';
      expect(getCspHeaderKey()).toBe('Content-Security-Policy');
      expect(getCspHeaderKey('enforce')).toBe('Content-Security-Policy');
    });
  });

  describe('buildCspHeader', () => {
    it('always includes frame-ancestors none', () => {
      const csp = buildCspHeader();
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it('includes upgrade-insecure-requests in production', () => {
      const prodCsp = buildCspHeader({ isProduction: true });
      expect(prodCsp).toContain('upgrade-insecure-requests');

      process.env.VERCEL_ENV = 'production';
      expect(buildCspHeader()).toContain('upgrade-insecure-requests');
    });

    it('omits upgrade-insecure-requests in non-production environments', () => {
      const devCsp = buildCspHeader({ isProduction: false });
      expect(devCsp).not.toContain('upgrade-insecure-requests');

      process.env.VERCEL_ENV = 'preview';
      expect(buildCspHeader()).not.toContain('upgrade-insecure-requests');
    });

    it('allows video embed players in frame-src', () => {
      const csp = buildCspHeader();
      expect(csp).toContain('https://youtube.com');
      expect(csp).toContain('https://www.youtube.com');
      expect(csp).toContain('https://player.vimeo.com');
      expect(csp).toContain('https://loom.com');
    });

    it('does NOT include Cloudflare Turnstile or CAPTCHA domains', () => {
      const csp = buildCspHeader();
      expect(csp).not.toContain('challenges.cloudflare.com');
      expect(csp).not.toContain('turnstile');
    });

    it('wires the /api/csp-report endpoint', () => {
      const csp = buildCspHeader();
      expect(csp).toContain('report-uri /api/csp-report');
    });

    it('incorporates Supabase project origin into connect-src and img-src', () => {
      const customSupabase = 'https://custom-project.supabase.co';
      const csp = buildCspHeader({ supabaseUrl: customSupabase });
      expect(csp).toContain(customSupabase);
      expect(csp).toContain('wss://custom-project.supabase.co');
    });
  });
});
