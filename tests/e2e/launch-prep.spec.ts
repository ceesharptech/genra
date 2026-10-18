import { test, expect } from '@playwright/test';

test.describe('Launch Prep & Live Domain Verification (https://genra.dev)', () => {
  test('canonical link on public home and discovery pages points to canonical domain', async ({ page }) => {
    await page.goto('/');
    const homeCanonical = page.locator('link[rel="canonical"]');
    if (await homeCanonical.count() > 0) {
      const href = await homeCanonical.getAttribute('href');
      expect(href).toMatch(/^https:\/\/genra\.dev\/?$/);
    }

    await page.goto('/discover');
    const discoverCanonical = page.locator('link[rel="canonical"]');
    if (await discoverCanonical.count() > 0) {
      const href = await discoverCanonical.getAttribute('href');
      expect(href).toMatch(/^https:\/\/genra\.dev\/discover/);
    }
  });

  test('robots.txt points to canonical sitemap in production', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    expect(response?.status()).toBe(200);
    const content = await response?.text();

    if (process.env.VERCEL_ENV === 'production') {
      expect(content).toContain('Sitemap: https://genra.dev/sitemap.xml');
      expect(content).toContain('Allow: /');
    } else {
      expect(content).toContain('Disallow: /');
    }
  });

  test('/.well-known/security.txt returns 200 with RFC 9116 compliant plaintext', async ({ page }) => {
    const response = await page.goto('/.well-known/security.txt');
    expect(response?.status()).toBe(200);

    const contentType = response?.headers()['content-type'] || '';
    expect(contentType).toContain('text/plain');

    const body = await response?.text() || '';
    expect(body).toContain('Contact: mailto:support@genra.dev');
    expect(body).toContain('Canonical: https://genra.dev/.well-known/security.txt');
    expect(body).toContain('Preferred-Languages: en');
    expect(body).toContain('Policy: https://genra.dev/terms');
    expect(body).toContain('Expires: ');
  });

  test('footer contains Contact link with mailto:support@genra.dev', async ({ page }) => {
    await page.goto('/');
    const contactLink = page.locator('footer a[href^="mailto:support@genra.dev"]');
    await expect(contactLink).toBeVisible();
    await expect(contactLink).toHaveAttribute('href', 'mailto:support@genra.dev');
  });

  test('login page renders the expected email auth mode', async ({ page }) => {
    await page.goto('/login');
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toBeVisible();

    const authMode = process.env.NEXT_PUBLIC_EMAIL_AUTH_MODE || 'magic_link';
    if (authMode === 'magic_link') {
      // In default magic link mode, submitting triggers the check your email instructions
      await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible();
    }
  });
});
