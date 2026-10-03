import { test, expect } from '@playwright/test'

test.describe('Phase 02 — Creation Authoring E2E Specs', () => {
  test('/new redirects signed-out user to /login with next=/new&intent=create', async ({
    page,
  }) => {
    await page.goto('/new')
    await expect(page).toHaveURL(/\/login\?next=%2Fnew&intent=create/)
    await expect(page.getByText('Welcome back')).toBeVisible()
  })

  test('/creations dashboard redirects signed-out user to /login', async ({
    page,
  }) => {
    await page.goto('/creations')
    await expect(page).toHaveURL(/\/login\?next=%2Fcreations/)
    await expect(page.getByText('Welcome back')).toBeVisible()
  })

  test('/c/[slug] returns 404 for non-existent creation', async ({ page }) => {
    const response = await page.goto('/c/non-existent-creation-slug-99999')
    expect(response?.status()).toBe(404)
    await expect(page.getByText(/404/i)).toBeVisible()
  })

  test('/c/[slug]/edit redirects signed-out user to /login', async ({ page }) => {
    await page.goto('/c/sample-slug/edit')
    await expect(page).toHaveURL(/\/login\?next=%2Fc%2Fsample-slug%2Fedit/)
  })
})
