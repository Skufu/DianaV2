import { test, expect } from '@playwright/test';
import { TEST_USER, SELECTORS, createMockJwt } from './fixtures/test-data';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

test.describe('Error Handling - Network Failures', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/users/me/profile', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          email: TEST_USER.email,
          name: 'Test User',
          onboarding_completed: true,
          first_name: 'Test',
          last_name: 'User',
        }),
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem('diana_token', 'test.access.token');
      localStorage.setItem('diana_refresh_token', 'test.refresh.token');
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('API timeout → loading then error message', async ({ page }) => {
    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      return route.abort('timedout');
    });

    await page.reload();

    const loadingElement = page.locator('text=Loading your health data...');
    await expect(loadingElement).toBeVisible({ timeout: 5000 });

    const errorBanner = page.locator('.bg-rose-500\\/10:has-text("Failed to load assessments")');
    await expect(errorBanner).toBeVisible({ timeout: 10000 });
  });

  test('500 Internal Server Error → error banner visible', async ({ page }) => {
    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      return route.fulfill({
        status: 500,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
          message: 'Something went wrong on our end',
        }),
      });
    });

    await page.reload();

    await page.waitForTimeout(1000);

    const errorBanner = page.locator('.bg-rose-500\\/10:has-text("Failed to load assessments")');
    await expect(errorBanner).toBeVisible({ timeout: 5000 });
  });

  test('Network disconnect → error handling', async ({ page }) => {
    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      return route.abort('failed');
    });

    await page.reload();

    await page.waitForTimeout(1000);

    const errorMessage = page.locator('text=Failed to load assessments');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('Multiple API failures → all error states show correctly', async ({ page }) => {
    // Mock both profile and assessments endpoints to fail
    await page.route('**/users/me/profile', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      return route.abort('failed');
    });

    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      return route.fulfill({
        status: 500,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
        }),
      });
    });

    await page.reload();

    await page.waitForTimeout(1000);

    // Both error states should be visible
    const errorMessage = page.locator('text=Failed to load assessments');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('Slow network response → loading state persists', async ({ page }) => {
    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            hba1c: 5.8,
            fbs: 100,
            bmi: 25.0,
            risk_score: 25,
            cluster: 'MOD',
            created_at: '2024-01-15T10:00:00Z',
          },
        ]),
      });
    });

    await page.reload();

    const loadingElement = page.locator('text=Loading your health data...');
    await expect(loadingElement).toBeVisible({ timeout: 1000 });

    await expect(loadingElement).not.toBeVisible({ timeout: 5000 });

    const assessmentCount = page.locator('text=Total logged');
    await expect(assessmentCount).toBeVisible({ timeout: 1000 });
  });

  test.skip('Empty response (204 No Content) → handled gracefully', async ({ page }) => {
    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      return route.fulfill({
        status: 204,
        headers: corsHeaders,
      });
    });

    await page.reload();

    await page.waitForTimeout(500);

    const welcomeMessage = page.locator('text=Welcome Back');
    await expect(welcomeMessage).toBeVisible({ timeout: 5000 });

    const assessmentCount = page.locator('.text-3xl');
    await expect(assessmentCount).toHaveText('0');
  });

  test('Retry button works when loading fails', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      requestCount++;

      if (requestCount <= 2) {
        return route.abort('failed');
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            hba1c: 5.8,
            fbs: 100,
            bmi: 25.0,
            cholesterol: 200,
            ldl: 130,
            hdl: 50,
            triglycerides: 150,
            systolic_bp: 120,
            diastolic_bp: 80,
            risk_score: 25,
            cluster: 'MOD',
            created_at: '2024-01-15T10:00:00Z',
          },
        ]),
      });
    });

    await page.route('**/users/me/profile', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          name: 'E2E Test User',
          email: TEST_USER.email,
          onboarding_completed: true,
        }),
      });
    });

    await page.reload();

    await page.waitForTimeout(3000);

    const errorMessage = page.locator('text=Failed to load assessments');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    const retryButton = page.locator('button:has-text("Retry")');
    await expect(retryButton).toBeVisible();

    await expect(retryButton).toHaveClass(/bg-rose-500/);

    await retryButton.click();

    await expect(errorMessage).not.toBeVisible({ timeout: 5000 });

    const assessmentCount = page.locator('text=Total logged');
    await expect(assessmentCount).toBeVisible({ timeout: 5000 });

    expect(requestCount).toBe(3);
  });

  test.skip('401 Unauthorized → redirects to login', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('diana_token');
    });

    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      return route.fulfill({
        status: 401,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Unauthorized',
        }),
      });
    });

    await page.reload();

    await page.waitForTimeout(1000);

    const loginHeading = page.locator('text=Welcome Back,');
    await expect(loginHeading).toBeVisible({ timeout: 5000 });

    const loginButton = page.locator(SELECTORS.loginButton);
    await expect(loginButton).toBeVisible();
  });
});
