import { test, expect } from '@playwright/test';

test.describe('Sharing and SEO (Phase 05)', () => {
  test('Robots.txt contains sitemap directive and does not disallow preview images', async ({
    page,
  }) => {
    const response = await page.goto('/robots.txt');
    expect(response?.status()).toBe(200);

    const text = await response?.text();
    expect(text).toContain('sitemap.xml');
    expect(text).toContain('Disallow: /saved');
    expect(text).toContain('Disallow: /settings');
    expect(text).not.toContain('Disallow: /c/*/og');
  });

  test('Sitemap.xml returns valid XML sitemap with home and discover pages', async ({
    page,
  }) => {
    const response = await page.goto('/sitemap.xml');
    expect(response?.status()).toBe(200);

    const xml = await response?.text();
    expect(xml).toContain('<urlset');
    expect(xml).toContain('<loc>');
    expect(xml).toContain('/discover');
  });

  test('Private routes include noindex robots meta tag', async ({ page }) => {
    const privatePaths = ['/login', '/signup', '/new', '/saved', '/settings', '/creations'];

    for (const path of privatePaths) {
      await page.goto(path);
      const robotsMeta = page.locator('meta[name="robots"]');
      const content = await robotsMeta.getAttribute('content');
      expect(content).toContain('noindex');
    }
  });

  test('Discover page with extra filters has noindex and clean canonical URL', async ({
    page,
  }) => {
    await page.goto('/discover?q=canvas&sort=trending');
    const robotsMeta = page.locator('meta[name="robots"]');
    const content = await robotsMeta.getAttribute('content');
    expect(content).toContain('noindex');

    const canonicalLink = page.locator('link[rel="canonical"]');
    const href = await canonicalLink.getAttribute('href');
    expect(href).toMatch(/\/discover$/);
  });

  test('Creation detail page includes canonical, Open Graph metadata, and JSON-LD', async ({
    page,
  }) => {
    await page.goto('/discover');
    const firstCard = page.locator('a[href^="/c/"]').first();

    if (await firstCard.isVisible()) {
      const href = await firstCard.getAttribute('href');
      if (href) {
        await page.goto(href);

        // Canonical link without ref
        const canonical = page.locator('link[rel="canonical"]');
        await expect(canonical).toHaveCount(1);
        const canonicalHref = await canonical.getAttribute('href');
        expect(canonicalHref).not.toContain('?ref=');

        // OpenGraph tags
        const ogTitle = page.locator('meta[property="og:title"]');
        await expect(ogTitle).toHaveCount(1);

        const ogImage = page.locator('meta[property="og:image"]');
        await expect(ogImage).toHaveCount(1);

        // Twitter card
        const twitterCard = page.locator('meta[name="twitter:card"]');
        await expect(twitterCard).toHaveAttribute('content', 'summary_large_image');

        // JSON-LD structured data
        const jsonLdScript = page.locator('script[type="application/ld+json"]').first();
        await expect(jsonLdScript).toHaveCount(1);
        const jsonText = await jsonLdScript.textContent();
        expect(jsonText).toContain('CreativeWork');
        expect(jsonText).not.toContain('<script');

        // Share button is present and ungated
        const shareBtn = page.locator('button[aria-label="Share creation"]');
        await expect(shareBtn).toBeVisible();

        // Join card is visible for anonymous visitors
        const joinCard = page.locator('aside[aria-label="Join Genra community"]');
        if (await joinCard.isVisible()) {
          const dismissBtn = joinCard.locator('button[aria-label="Dismiss invitation"]');
          await dismissBtn.click();
          await expect(joinCard).not.toBeVisible();
        }
      }
    }
  });

  test('Preview image route handler returns 404 for nonexistent creation', async ({
    page,
  }) => {
    const response = await page.goto('/c/non-existent-creation-slug-xyz/og');
    expect(response?.status()).toBe(404);
  });
});
