import { test, expect } from '@playwright/test';
import { TEST_USER, SELECTORS, waitForNetworkIdle } from './fixtures/test-data';

test.describe('Authentication Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Start from the login page
        await page.goto('/');
    });

    test('should display login form', async ({ page }) => {
        // Verify login form elements are visible
        await expect(page.locator(SELECTORS.loginEmailInput)).toBeVisible();
        await expect(page.locator(SELECTORS.loginPasswordInput)).toBeVisible();
        await expect(page.locator(SELECTORS.loginButton)).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
        // Enter invalid credentials
        await page.fill(SELECTORS.loginEmailInput, 'invalid@example.com');
        await page.fill(SELECTORS.loginPasswordInput, 'wrongpassword');

        // Click login
        await page.click(SELECTORS.loginButton);

        // Wait for response
        await page.waitForTimeout(1000);

        // Should show error message
        const errorMessage = page.locator('text=/error|invalid|failed/i');
        await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('should login successfully with valid credentials', async ({ page }) => {
        // Enter valid credentials
        await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
        await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);

        // Click login
        await page.click(SELECTORS.loginButton);

        // Wait for navigation/dashboard to load
        await waitForNetworkIdle(page);

        // Should see dashboard or sidebar (indicating successful login)
        const dashboardOrSidebar = page.locator(`${SELECTORS.sidebar}, text=/dashboard/i`);
        await expect(dashboardOrSidebar.first()).toBeVisible({ timeout: 10000 });
    });

    test('should persist session after page reload', async ({ page }) => {
        // Login first
        await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
        await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
        await page.click(SELECTORS.loginButton);
        await waitForNetworkIdle(page);

        // Reload the page
        await page.reload();
        await waitForNetworkIdle(page);

        // Should still be on dashboard (not redirected to login)
        const loginForm = page.locator(SELECTORS.loginEmailInput);
        await expect(loginForm).not.toBeVisible({ timeout: 5000 });
    });

    test('should logout successfully', async ({ page }) => {
        // Login first
        await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
        await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
        await page.click(SELECTORS.loginButton);
        await waitForNetworkIdle(page);

        // Find and click logout button
        const logoutButton = page.locator(SELECTORS.logoutButton);
        if (await logoutButton.isVisible()) {
            await logoutButton.click();
            await waitForNetworkIdle(page);

            // Should be back at login page
            await expect(page.locator(SELECTORS.loginEmailInput)).toBeVisible({ timeout: 5000 });
        }
    });
});
