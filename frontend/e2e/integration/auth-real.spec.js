import { test, expect } from '@playwright/test';
import { ADMIN_USER, waitForNetworkIdle } from '../fixtures/test-data';

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
 * - User: demo@diana.app / demo123
 * - Admin: admin@diana.app / admin123
 */

test.describe('Integration: Real Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('should login successfully with demo user credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'demo@diana.app');
    await page.fill('input[type="password"]', 'demo123');

    await page.click('button:has-text("Sign In")');

    await waitForNetworkIdle(page);

    // Wait for navigation to dashboard - login form should disappear
    await expect(page.locator('input[type="email"]')).not.toBeVisible({ timeout: 10000 });

    // Verify we're now on a dashboard page
    const pageContent = await page.textContent('body');
    expect(pageContent.length).toBeGreaterThan(100);

    const accessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('diana_refresh_token'));

    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
  });

  test('should login successfully with admin credentials', async ({ page }) => {
    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);

    await page.click('button:has-text("Sign In")');

    await waitForNetworkIdle(page);

    // Wait for admin dashboard
    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 15000 });

    const accessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('diana_refresh_token'));

    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
  });

  test('should show error for invalid real credentials', async ({ page }) => {
    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    await page.click('button:has-text("Sign In")');

    await page.waitForTimeout(2000);

    // Should still be on login page
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });

    const accessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    expect(accessToken).toBeNull();
  });

  test('should logout successfully and clear tokens', async ({ page }) => {
    await page.fill('input[type="email"]', 'demo@diana.app');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    await expect(page.locator('input[type="email"]')).not.toBeVisible({ timeout: 10000 });

    // Find and click logout button
    const logoutButton = page.locator('button:has-text("Log Out")').or(page.locator('button:has-text("Logout")'));

    await expect(logoutButton.first()).toBeVisible({ timeout: 10000 });

    await logoutButton.first().click();
    await waitForNetworkIdle(page);

    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });

    const accessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('diana_refresh_token'));

    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
  });

  test('should persist session after page reload', async ({ page }) => {
    await page.fill('input[type="email"]', 'demo@diana.app');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    await expect(page.locator('input[type="email"]')).not.toBeVisible({ timeout: 10000 });

    await page.reload();
    await waitForNetworkIdle(page);

    await expect(page.locator('input[type="email"]')).not.toBeVisible({ timeout: 5000 });
  });

  test('should redirect to login after token expires', async ({ page }) => {
    await page.fill('input[type="email"]', 'demo@diana.app');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    await expect(page.locator('input[type="email"]')).not.toBeVisible({ timeout: 10000 });

    await page.evaluate(() => {
      localStorage.setItem('diana_token', 'expired.invalid.token');
    });

    await page.reload();
    await waitForNetworkIdle(page);

    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });
});
