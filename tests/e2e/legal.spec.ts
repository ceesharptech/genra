import { test, expect } from '@playwright/test';

test.describe('Legal Pages and Privacy Controls', () => {
  test('terms of service page renders and contains key sections', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.locator('h1')).toHaveText('Terms of Service');
    await expect(page.locator('text=User-Generated Content & License')).toBeVisible();
    await expect(page.locator('text=Disclaimers and Limitation of Liability')).toBeVisible();
  });

  test('privacy policy page renders with interactive telemetry toggle', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('h1')).toHaveText('Privacy Policy');
    await expect(page.locator('text=Analytics Telemetry Preference')).toBeVisible();
    
    // Opt-out button exists
    const toggleButton = page.locator('button:has-text("Opt out of analytics"), button:has-text("Re-enable analytics")');
    await expect(toggleButton).toBeVisible();
  });

  test('content policy page renders and describes prohibited content', async ({ page }) => {
    await page.goto('/content-policy');
    await expect(page.locator('h1')).toHaveText('Content Policy');
    await expect(page.locator('text=Prohibited Content')).toBeVisible();
    await expect(page.locator('text=Enforcement Actions')).toBeVisible();
  });

  test('copyright policy page renders with DMCA submission details', async ({ page }) => {
    await page.goto('/copyright');
    await expect(page.locator('h1')).toHaveText('Copyright & DMCA Policy');
    await expect(page.locator('text=Designated Copyright Agent')).toBeVisible();
    await expect(page.locator('text=Counter-Notice Procedure')).toBeVisible();
  });

  test('footer contains working links to all legal pages', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer.locator('a[href="/terms"]')).toBeVisible();
    await expect(footer.locator('a[href="/privacy"]')).toBeVisible();
    await expect(footer.locator('a[href="/content-policy"]')).toBeVisible();
    await expect(footer.locator('a[href="/copyright"]')).toBeVisible();
  });
});
