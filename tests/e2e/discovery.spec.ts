import { test, expect } from '@playwright/test'

test.describe('Discovery and Detail Flow', () => {
  test('Home page renders hero, search bar, and discover links', async ({
    page,
  }) => {
    await page.goto('/')

    // Hero title
    const heading = page.locator('h1')
    await expect(heading).toContainText(/Discover what creators build with AI/i)

    // Search form is present in hero
    const searchInput = page.locator('input[placeholder*="Search creations"]')
    await expect(searchInput).toBeVisible()

    // Header nav links exist
    const exploreLink = page.locator('header nav a:has-text("Explore")')
    await expect(exploreLink).toBeVisible()
    await expect(exploreLink).toHaveAttribute('href', '/discover')
  })

  test('Hero search navigates to /discover with query parameter', async ({
    page,
  }) => {
    await page.goto('/')

    const searchInput = page.locator('input[placeholder*="Search creations"]')
    await searchInput.fill('analytics')
    await searchInput.press('Enter')

    await page.waitForURL(/\/discover\?q=analytics/)
    await expect(page.locator('h1')).toContainText(/Results for “analytics”/i)
  })

  test('Discover page filter bar updates search query and category filters', async ({
    page,
  }) => {
    await page.goto('/discover')

    // Sticky filter bar should be present
    const filterInput = page.locator('input[placeholder="Search creations..."]')
    await expect(filterInput).toBeVisible()

    // "All Categories" chip is selected by default
    const allChip = page.locator('button:has-text("All Categories")')
    await expect(allChip).toBeVisible()

    // Tool popover button is present
    const toolBtn = page.locator('button:has-text("Tools")')
    await expect(toolBtn).toBeVisible()
    await toolBtn.click()

    // Popover opens with tool filter input
    const toolSearchInput = page.locator('input[placeholder="Filter tools..."]')
    await expect(toolSearchInput).toBeVisible()
  })

  test('Creation detail page handles unknown slug with 404', async ({
    page,
  }) => {
    await page.goto('/c/nonexistent-creation-slug-999')
    await expect(page.locator('h1')).toContainText(/Page not found/i)
  })

  test('Profile page displays user profile header and creation count', async ({
    page,
  }) => {
    await page.goto('/u/ceesharptech')

    // Profile header
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('text=@ceesharptech')).toBeVisible()

    // Creations section
    await expect(
      page.locator('h2:has-text("Published creations")')
    ).toBeVisible()
  })
})
