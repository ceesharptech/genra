import { test, expect } from '@playwright/test'

test.describe('App Shell and Smoke Tests', () => {
  test('Home page loads with headline and seeded categories', async ({
    page,
  }) => {
    await page.goto('/')

    // Verify main headline is visible
    const heading = page.locator('h1')
    await expect(heading).toContainText(/Discover what creators build with AI/i)

    // Verify categories from database render
    const categoriesSection = page.locator(
      'section[aria-labelledby="categories-heading"]'
    )
    await expect(categoriesSection).toBeVisible()
    await expect(page.locator('text=Websites')).toBeVisible()
    await expect(page.locator('text=Apps')).toBeVisible()
  })

  test('Theme defaults to light and switches to dark and back', async ({
    page,
  }) => {
    await page.goto('/')

    const html = page.locator('html')

    // Initial default theme should be light
    await expect(html).toHaveClass(/(^|\s)light(\s|$)/)

    // Click theme toggle button
    const themeToggle = page.locator(
      'button[aria-label="Switch to dark theme"]'
    )
    await expect(themeToggle).toBeVisible()
    await themeToggle.click()

    // Should switch to dark mode
    await expect(html).toHaveClass(/(^|\s)dark(\s|$)/)

    // Click toggle again to switch back to light
    const lightToggle = page.locator(
      'button[aria-label="Switch to light theme"]'
    )
    await expect(lightToggle).toBeVisible()
    await lightToggle.click()

    // Should be back to light mode
    await expect(html).toHaveClass(/(^|\s)light(\s|$)/)
  })

  test('404 page renders for unknown routes', async ({ page }) => {
    await page.goto('/unknown-nonexistent-route')

    await expect(page.locator('h1')).toContainText(/Page not found/i)
    await expect(page.locator('text=404 Error')).toBeVisible()
  })
})
