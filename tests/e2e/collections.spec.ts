import { test, expect } from '@playwright/test';

test.describe('Collections Flow', () => {
  test('Nonexistent collection returns 404', async ({ page }) => {
    await page.goto('/collections/00000000-0000-0000-0000-000000000999');
    await expect(page.locator('h1')).toContainText(/Page not found/i);
  });

  test('Saved library page requires authentication and redirects to login', async ({
    page,
  }) => {
    await page.goto('/saved');
    await page.waitForURL(/\/login\?next=%2Fsaved/);
    await expect(page.locator('h1')).toContainText(/Log in/i);
  });

  test('Profile page displays Creations, Library, and Collections tabs', async ({
    page,
  }) => {
    await page.goto('/u/ceesharptech');

    const creationsTab = page.locator('nav[aria-label="Profile Tabs"] a:has-text("Creations")');
    const libraryTab = page.locator('nav[aria-label="Profile Tabs"] a:has-text("Library")');
    const collectionsTab = page.locator('nav[aria-label="Profile Tabs"] a:has-text("Collections")');

    await expect(creationsTab).toBeVisible();
    await expect(libraryTab).toBeVisible();
    await expect(collectionsTab).toBeVisible();

    // Clicking Library tab switches URL to ?tab=library
    await libraryTab.click();
    await page.waitForURL(/\/u\/ceesharptech\?tab=library/);
    await expect(page.locator('h2:has-text("Authored Prompts")')).toBeVisible();

    // Clicking Collections tab switches URL to ?tab=collections
    await collectionsTab.click();
    await page.waitForURL(/\/u\/ceesharptech\?tab=collections/);
    await expect(page.locator('h2:has-text("Collections")')).toBeVisible();
  });
});
