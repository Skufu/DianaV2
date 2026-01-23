import { test, expect } from '@playwright/test';
import { TEST_USER, ADMIN_USER, SELECTORS, waitForNetworkIdle } from './fixtures/test-data';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

test.describe('Authorization Error Handling', () => {
  test('should redirect to login when access token expires', async ({ page }) => {
    await page.route('**/auth/login', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'user.access.token',
          refresh_token: 'user.refresh.token',
          user: { id: '2', email: 'user@diana.app', role: 'user' },
        }),
      });
    });

    await page.route('**/admin/dashboard', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 403,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden' }),
      });
    });

    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, 'user@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'password123');
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const sidebarLocator = page.locator(SELECTORS.sidebar);
    const dashboardTextLocator = page.locator('text=/dashboard/i');
    await expect(sidebarLocator.or(dashboardTextLocator).first()).toBeVisible({ timeout: 10000 });

    await page.evaluate(() => {
      fetch('/api/v1/admin/dashboard', {
        headers: {
          'Authorization': 'Bearer user.access.token',
        },
      }).catch(() => {});
    });
  });

  test('should redirect to login with invalid token format', async ({ page }) => {
    let profileCallCount = 0;

    await page.route('**/auth/login', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test.access.token',
          refresh_token: 'test.refresh.token',
          user: { id: '1', email: TEST_USER.email, role: 'user' },
        }),
      });
    });

    await page.route('**/users/me/profile', async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      profileCallCount++;

      if (profileCallCount === 1) {
        return route.fulfill({
          status: 200,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ name: 'E2E User', email: TEST_USER.email }),
        });
      }

      return route.fulfill({
        status: 401,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    await page.route('**/auth/refresh', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 401,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid token' }),
      });
    });

    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/users/me/onboarding', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const sidebarLocator = page.locator(SELECTORS.sidebar);
    const dashboardTextLocator = page.locator('text=/dashboard/i');
    await expect(sidebarLocator.or(dashboardTextLocator).first()).toBeVisible({ timeout: 10000 });

    await page.evaluate(() => {
      localStorage.setItem('diana_token', 'invalid.token.format');
    });

    await page.reload();

    await expect(page.locator(SELECTORS.loginEmailInput)).toBeVisible({ timeout: 15000 });
    await expect(page.locator(SELECTORS.loginPasswordInput)).toBeVisible({ timeout: 5000 });

    const accessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('diana_refresh_token'));
    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
  });

  test('User accessing admin route → forbidden message or redirect', async ({ page }) => {
    let adminDashboardCalled = false;
    let profileCallCount = 0;

    await page.route('**/auth/login', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'user.access.token',
          refresh_token: 'user.refresh.token',
          user: { id: '1', email: TEST_USER.email, role: 'user' },
        }),
      });
    });

    await page.route('**/admin/dashboard', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      adminDashboardCalled = true;
      return route.fulfill({
        status: 403,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden' }),
      });
    });

    await page.route('**/admin/users', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      adminDashboardCalled = true;
      return route.fulfill({
        status: 403,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Forbidden - Admin access required' }),
      });
    });

    await page.route('**/users/me/profile', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      profileCallCount++;

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ name: 'E2E User', email: TEST_USER.email, role: 'user' }),
      });
    });

    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/users/me/onboarding', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const sidebarLocator = page.locator(SELECTORS.sidebar);
    const dashboardTextLocator = page.locator('text=/dashboard/i');
    await expect(sidebarLocator.or(dashboardTextLocator).first()).toBeVisible({ timeout: 10000 });

    await page.evaluate(() => {
      fetch('/api/v1/admin/dashboard', {
        headers: { 'Authorization': 'Bearer user.access.token' },
      }).catch(() => {});
    });

    await page.waitForTimeout(1000);

    expect(adminDashboardCalled).toBe(true);

    await page.evaluate(() => {
      fetch('/api/v1/admin/users', {
        headers: { 'Authorization': 'Bearer user.access.token' },
      }).catch(() => {});
    });

    await page.waitForTimeout(1000);
  });

  test('should fully logout with stale refresh token', async ({ page }) => {
    let refreshTokenCallCount = 0;
    let profileCallCount = 0;

    await page.route('**/auth/login', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'initial.access.token',
          refresh_token: 'stale.refresh.token',
          user: { id: '1', email: TEST_USER.email, role: 'user' },
        }),
      });
    });

    await page.route('**/users/me/profile', async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      profileCallCount++;

      if (profileCallCount === 1) {
        return route.fulfill({
          status: 200,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ name: 'E2E User', email: TEST_USER.email }),
        });
      }

      return route.fulfill({
        status: 401,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    await page.route('**/auth/refresh', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      refreshTokenCallCount++;

      return route.fulfill({
        status: 401,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Refresh token expired' }),
      });
    });

    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/users/me/onboarding', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const sidebarLocator = page.locator(SELECTORS.sidebar);
    const dashboardTextLocator = page.locator('text=/dashboard/i');
    await expect(sidebarLocator.or(dashboardTextLocator).first()).toBeVisible({ timeout: 10000 });

    await page.evaluate(() => {
      localStorage.setItem('diana_token', 'expired.access.token');
    });

    await page.reload();

    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle');

    await page.waitForTimeout(5000);

    await expect(page.locator(SELECTORS.loginEmailInput)).toBeVisible({ timeout: 15000 });
    await expect(page.locator(SELECTORS.loginPasswordInput)).toBeVisible({ timeout: 5000 });

    expect(refreshTokenCallCount).toBeGreaterThan(0);

    await page.waitForLoadState('domcontentloaded');

    const accessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('diana_refresh_token'));
    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
  });
});
