import { test, expect } from '@playwright/test'

test.describe('Phase 01 & 01b — Auth and Profiles Smoke Tests', () => {
  test('gate demo redirects to /login when signed out', async ({ page }) => {
    await page.goto('/design')

    // Click the gated action demo button
    const demoButton = page.getByRole('button', {
      name: /Test Gated Action/i,
    })
    await expect(demoButton).toBeVisible()
    await demoButton.click()

    // Should direct to /login page with next, intent, and message params
    await expect(page).toHaveURL(/\/login\?next=.*&intent=.*&message=.*/)
    await expect(page.getByText('Welcome back')).toBeVisible()
    await expect(
      page.getByText('Sign in to test the action gating primitive')
    ).toBeVisible()
  })

  test('/login sanitizes open redirects to evil sites', async ({ page }) => {
    await page.goto('/login?next=https://evil.example')

    // Expect the page to remain on /login and form to render
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByText('Welcome back')).toBeVisible()
  })

  test('/login displays friendly error on link_expired', async ({ page }) => {
    await page.goto('/login?error=link_expired')

    await expect(
      page.getByText(/That link has expired or was already used/i)
    ).toBeVisible()
  })

  test('/login displays friendly error on link_wrong_browser', async ({ page }) => {
    await page.goto('/login?error=link_wrong_browser')

    await expect(
      page.getByText(/different browser or app/i)
    ).toBeVisible()
  })

  test('/login displays friendly error on link_invalid', async ({ page }) => {
    await page.goto('/login?error=link_invalid')

    await expect(
      page.getByText(/invalid or incomplete/i)
    ).toBeVisible()
  })

  test('/u/[username] shows 404 for unknown user', async ({ page }) => {
    const response = await page.goto('/u/non_existent_profile_xyz_9999')
    expect(response?.status()).toBe(404)
    await expect(page.getByText(/404/i)).toBeVisible()
    await expect(page.getByText(/Page not found/i)).toBeVisible()
  })

  test('theme toggle works consistently across auth pages', async ({ page }) => {
    await page.goto('/login')
    const html = page.locator('html')

    // Default theme is light
    await expect(html).not.toHaveClass(/dark/)

    // Toggle to dark
    const toggleButton = page.getByRole('button', { name: /toggle theme/i })
    await toggleButton.click()
    await expect(html).toHaveClass(/dark/)

    // Toggle back to light
    await toggleButton.click()
    await expect(html).not.toHaveClass(/dark/)
  })

  test('Phase 07a2 — /login loads cleanly without Cloudflare Turnstile requests and enables submit immediately', async ({
    page,
  }) => {
    const cloudflareRequests: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('challenges.cloudflare.com')) {
        cloudflareRequests.push(req.url())
      }
    })

    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /Welcome back/i })).toBeVisible()

    // Verify zero requests to challenges.cloudflare.com
    expect(cloudflareRequests).toHaveLength(0)

    // Verify no Turnstile widget container in the DOM
    const turnstileWidget = page.locator('.cf-turnstile')
    await expect(turnstileWidget).toHaveCount(0)

    // Verify submit button is disabled initially (empty email)
    const submitBtn = page.getByRole('button', { name: /Continue/i })
    await expect(submitBtn).toBeDisabled()

    // Typing email enables the submit button immediately without waiting for a CAPTCHA token
    const emailInput = page.getByPlaceholder(/Enter email address/i)
    await emailInput.fill('tester@example.com')
    await expect(submitBtn).toBeEnabled()
  })

  test('Phase 07a2 — /signup loads cleanly without Cloudflare Turnstile requests and enables submit immediately', async ({
    page,
  }) => {
    const cloudflareRequests: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('challenges.cloudflare.com')) {
        cloudflareRequests.push(req.url())
      }
    })

    await page.goto('/signup')
    await expect(
      page.getByRole('heading', { name: /Welcome to Genra/i })
    ).toBeVisible()

    // Verify zero requests to challenges.cloudflare.com
    expect(cloudflareRequests).toHaveLength(0)

    // Verify no Turnstile widget container in the DOM
    const turnstileWidget = page.locator('.cf-turnstile')
    await expect(turnstileWidget).toHaveCount(0)

    // Typing email enables the submit button immediately
    const emailInput = page.getByPlaceholder(/Enter email address/i)
    const submitBtn = page.getByRole('button', { name: /Continue/i })
    await expect(submitBtn).toBeDisabled()
    await emailInput.fill('newuser@example.com')
    await expect(submitBtn).toBeEnabled()
  })

  test.skip('Google OAuth login flow (requires live credentials, manual verification)', async () => {
    // This flow redirects through accounts.google.com and is verified manually by the owner
  })
})

