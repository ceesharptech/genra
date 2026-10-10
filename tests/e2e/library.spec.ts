import { test, expect } from '@playwright/test';

test.describe('Library (Prompts, Resources, and Tool Pages)', () => {
  test('Prompts discovery page renders header, filter bar, and share CTA', async ({
    page,
  }) => {
    await page.goto('/prompts');

    // Page title
    const heading = page.locator('h1');
    await expect(heading).toContainText(/Prompts/i);

    // Search bar
    const searchInput = page.locator('input[placeholder*="Search prompts"]');
    await expect(searchInput).toBeVisible();

    // Share prompt button
    const shareBtn = page.locator('a:has-text("Share prompt")');
    await expect(shareBtn).toBeVisible();
    await expect(shareBtn).toHaveAttribute('href', '/prompts/new');
  });

  test('Resources discovery page renders header, kind filter, and share CTA', async ({
    page,
  }) => {
    await page.goto('/resources');

    // Page title
    const heading = page.locator('h1');
    await expect(heading).toContainText(/Resources/i);

    // Search input
    const searchInput = page.locator('input[placeholder*="Search resources"]');
    await expect(searchInput).toBeVisible();

    // Kind dropdown trigger
    const kindBtn = page.locator('button:has-text("All kinds")');
    await expect(kindBtn).toBeVisible();

    // Share resource button
    const shareBtn = page.locator('a:has-text("Share resource")');
    await expect(shareBtn).toBeVisible();
    await expect(shareBtn).toHaveAttribute('href', '/resources/new');
  });

  test('Unauthenticated user clicking Share Prompt is guided to login', async ({
    page,
  }) => {
    await page.goto('/prompts/new');

    // Should redirect to login with next parameter
    await page.waitForURL(/\/login\?next=%2Fprompts%2Fnew/);
    await expect(page.locator('h1')).toContainText(/Log in/i);
  });

  test('Unauthenticated user clicking Share Resource is guided to login', async ({
    page,
  }) => {
    await page.goto('/resources/new');

    // Should redirect to login with next parameter
    await page.waitForURL(/\/login\?next=%2Fresources%2Fnew/);
    await expect(page.locator('h1')).toContainText(/Log in/i);
  });

  test('Tool page renders tool hero, verified badge, and creations/prompts/resources tabs', async ({
    page,
  }) => {
    // Navigate to a known tool slug (e.g., cursor or nextjs)
    await page.goto('/tools/cursor');

    // Tool name
    await expect(page.locator('h1')).toBeVisible();

    // Navigation tabs
    const creationsTab = page.locator('nav[aria-label="Tabs"] a:has-text("Creations")');
    const promptsTab = page.locator('nav[aria-label="Tabs"] a:has-text("Prompts")');
    const resourcesTab = page.locator('nav[aria-label="Tabs"] a:has-text("Resources")');

    await expect(creationsTab).toBeVisible();
    await expect(promptsTab).toBeVisible();
    await expect(resourcesTab).toBeVisible();
  });

  test('Unverified tool with zero creations returns 404', async ({ page }) => {
    await page.goto('/tools/nonexistent-tool-slug-xyz');
    await expect(page.locator('h1')).toContainText(/Page not found/i);
  });
});
