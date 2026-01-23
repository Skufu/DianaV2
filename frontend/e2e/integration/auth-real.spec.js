import { test, expect } from '@playwright/test';
import { TEST_USER, ADMIN_USER, SELECTORS, waitForNetworkIdle } from '../fixtures/test-data';

/**
 * Integration Test Suite for Real Authentication
 *
 * These tests hit the REAL backend without mocking API responses.
 * Purpose: Catch real integration issues between frontend and backend.
 *
 * Requirements:
 * - Backend must be running at http://localhost:8080
 * - Demo user must exist (run `make seed` if needed)
 * - Database must be accessible
 *
 * Demo Credentials:
 * - User: demo@diana.app / demopassword123
 * - Admin: admin@diana.app / admin123
 */

test.describe('Integration: Real Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(SELECTORS.loginEmailInput)).toBeVisible({ timeout: 10000 });
  });

  test('should login successfully with demo user credentials', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'demo@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'demopassword123');

    await page.click(SELECTORS.loginButton);

    await waitForNetworkIdle(page);

    const dashboardOrSidebar = page.locator(
      `${SELECTORS.sidebar}, text=/dashboard|welcome|health/i`
    );

    await expect(dashboardOrSidebar.first()).toBeVisible({ timeout: 10000 });

    await expect(page.locator(SELECTORS.loginEmailInput)).not.toBeVisible({ timeout: 5000 });

    const accessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('diana_refresh_token'));

    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
  });

  test('should login successfully with admin credentials', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'admin@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'admin123');

    await page.click(SELECTORS.loginButton);

    await waitForNetworkIdle(page);

    const dashboardOrAdmin = page.locator(
      `${SELECTORS.sidebar}, text=/dashboard|admin|system/i`
    );

    await expect(dashboardOrAdmin.first()).toBeVisible({ timeout: 10000 });

    const accessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('diana_refresh_token'));

    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
  });

  test('should show error for invalid real credentials', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'nonexistent@example.com');
    await page.fill(SELECTORS.loginPasswordInput, 'wrongpassword');

    await page.click(SELECTORS.loginButton);

    await page.waitForTimeout(2000);

    const errorMessage = page.locator(
      'text=/invalid credentials|unauthorized|authentication failed|error/i'
    );

    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    await expect(page.locator(SELECTORS.loginEmailInput)).toBeVisible();

    const accessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    expect(accessToken).toBeNull();
  });

  test('should logout successfully and clear tokens', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'demo@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'demopassword123');
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    await expect(page.locator(SELECTORS.loginEmailInput)).not.toBeVisible({ timeout: 5000 });

    const logoutButton = page.locator(SELECTORS.logoutButton);

    await expect(logoutButton).toBeVisible({ timeout: 10000 });

    await logoutButton.click();
    await waitForNetworkIdle(page);

    await expect(page.locator(SELECTORS.loginEmailInput)).toBeVisible({ timeout: 5000 });

    const accessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('diana_refresh_token'));

    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
  });

  test('should persist session after page reload', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'demo@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'demopassword123');
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    await expect(page.locator(SELECTORS.loginEmailInput)).not.toBeVisible({ timeout: 5000 });

    await page.reload();
    await waitForNetworkIdle(page);

    await expect(page.locator(SELECTORS.loginEmailInput)).not.toBeVisible({ timeout: 5000 });

    const dashboardOrSidebar = page.locator(
      `${SELECTORS.sidebar}, text=/dashboard|welcome|health/i`
    );

    await expect(dashboardOrSidebar.first()).toBeVisible();
  });

  test('should redirect to login after token expires', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'demo@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'demopassword123');
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    await expect(page.locator(SELECTORS.loginEmailInput)).not.toBeVisible({ timeout: 5000 });

    await page.evaluate(() => {
      localStorage.setItem('diana_token', 'expired.invalid.token');
    });

    await page.reload();
    await waitForNetworkIdle(page);

    await expect(page.locator(SELECTORS.loginEmailInput)).toBeVisible({ timeout: 10000 });

    const accessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    expect(accessToken).toBeNull();
  });
});
