import { describe, it, expect } from 'vitest';
import { siteConfig } from '@/lib/site-config';

describe('Site Config & Legal Metadata', () => {
  it('has required platform names and legal entities', () => {
    expect(siteConfig.name).toBe('Genra');
    expect(siteConfig.legalName).toContain('Genra');
  });

  it('has valid contact emails for support, legal, and DMCA', () => {
    expect(siteConfig.supportEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(siteConfig.legalEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(siteConfig.dmcaEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it('specifies minimum age requirement and governing jurisdiction', () => {
    expect(siteConfig.minimumAge).toBe(13);
    expect(siteConfig.governingLaw).toContain('Delaware');
    expect(siteConfig.lastUpdated).toBeTruthy();
  });

  it('provides a valid site URL', () => {
    expect(siteConfig.url).toMatch(/^https?:\/\//);
  });
});
