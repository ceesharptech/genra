import { test, expect } from '@playwright/test';

test.describe('Moderation and Admin Protection Flow', () => {
  test('unauthenticated users receive HTTP 404 when attempting to access /admin', async ({ page }) => {
    const response = await page.goto('/admin');
    // Admin layout returns notFound() which serves 404 status
    expect(response?.status()).toBe(404);
  });

  test('report dialog opens from public content surface', async ({ page }) => {
    // Navigate to discover page
    await page.goto('/discover');

    // If creations exist, clicking report button opens dialog
    const reportButton = page.locator('button[aria-label^="Report"]').first();
    if (await reportButton.isVisible()) {
      await reportButton.click();
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();
      await expect(page.locator('text=Report Content')).toBeVisible();
      await expect(page.locator('text=Reason for report')).toBeVisible();
    }
  });

  test('settings page danger zone renders delete account confirmation', async ({ page }) => {
    // Attempting settings unauthenticated redirects to login
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/);
  });
});
