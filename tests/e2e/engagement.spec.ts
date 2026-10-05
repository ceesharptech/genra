import { test, expect } from '@playwright/test';

test.describe('Phase 04 Engagement and Gating Flow', () => {
  test('Signed-out user visiting /saved redirects to /login with next parameter', async ({
    page,
  }) => {
    await page.goto('/saved');
    await page.waitForURL(/\/login\?next=%2Fsaved/);
    await expect(page.locator('h1')).toContainText(/Sign in to your account|Welcome back/i);
  });

  test('Signed-out user on creation page clicking Like button redirects to login with intent', async ({
    page,
  }) => {
    // Navigate to discover first or directly to a creation
    await page.goto('/discover');
    const firstCreationCard = page.locator('article a[href^="/c/"]').first();

    if (await firstCreationCard.count() > 0) {
      const creationHref = await firstCreationCard.getAttribute('href');
      if (creationHref) {
        await page.goto(creationHref);

        // Click Like button in EngagementBar
        const likeButton = page.locator('button[aria-label^="Like"]').first();
        await expect(likeButton).toBeVisible();
        await likeButton.click();

        // Should be redirected to /login with next and intent
        await page.waitForURL(/\/login\?next=.*&intent=like%3Acreation%3A/);
      }
    }
  });

  test('Signed-out user on creation page clicking Save button redirects to login with intent', async ({
    page,
  }) => {
    await page.goto('/discover');
    const firstCreationCard = page.locator('article a[href^="/c/"]').first();

    if (await firstCreationCard.count() > 0) {
      const creationHref = await firstCreationCard.getAttribute('href');
      if (creationHref) {
        await page.goto(creationHref);

        // Click Save button in EngagementBar
        const saveButton = page.locator('button[aria-label^="Save"]').first();
        await expect(saveButton).toBeVisible();
        await saveButton.click();

        // Should be redirected to /login with next and intent
        await page.waitForURL(/\/login\?next=.*&intent=save%3Acreation%3A/);
      }
    }
  });

  test('Creation detail page displays view count and no comment counts', async ({
    page,
  }) => {
    await page.goto('/discover');
    const firstCreationCard = page.locator('article a[href^="/c/"]').first();

    if (await firstCreationCard.count() > 0) {
      const creationHref = await firstCreationCard.getAttribute('href');
      if (creationHref) {
        await page.goto(creationHref);

        // Verify view count is visible
        const viewsCount = page.locator('[title$="views"]');
        await expect(viewsCount).toBeVisible();

        // Verify comment counts do NOT exist anywhere on the page
        const commentIcons = page.locator('[title$="comments"]');
        await expect(commentIcons).toHaveCount(0);
      }
    }
  });
});
