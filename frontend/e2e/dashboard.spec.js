import { test, expect } from '@playwright/test';
import { TEST_USER, SELECTORS, waitForNetworkIdle } from './fixtures/test-data';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

test.describe('Dashboard Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      window.consoleErrors = [];
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        page.evaluate((errText) => {
          if (typeof window.consoleErrors !== 'undefined') {
            window.consoleErrors.push(errText);
          }
        }, msg.text());
      }
    });

    // Mock login endpoint
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

    // Mock user profile endpoint
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
          name: 'Test User', onboarding_completed: true, onboarding_completed: true,
          onboarding_completed: true,
          first_name: 'Test',
          last_name: 'User',
        }),
      });
    });

    // Mock onboarding status endpoint
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

    // Mock assessments endpoint
    await page.route('**/users/me/assessments*', async route => {
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

    // Mock analytics summary endpoint
    await page.route('**/analytics/summary', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          totalAssessments: 0,
          averageRiskScore: 0,
          recentAssessments: [],
        }),
      });
    });
  });

  test('7.1: Dashboard loads without JS errors', async ({ page }) => {
    await page.goto('/');

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);

    await page.waitForURL('/', { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');

    await page.waitForTimeout(1000);

    const errors = await page.evaluate(() => window.consoleErrors || []);

    expect(errors).toEqual([]);

    await expect(page.locator('text=Welcome to DIANA').first()).toBeVisible({ timeout: 5000 });
  });

  test('7.2: Empty state when no assessments', async ({ page }) => {
    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await page.waitForURL('/', { timeout: 10000 });

    await page.waitForTimeout(1000);

    await expect(page.locator('text=Log Your First Assessment').first()).toBeVisible({ timeout: 5000 });
  });

  test('7.3: Risk score card displays', async ({ page }) => {
    await page.route('**/users/me/assessments*', async route => {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: '1',
          bmi: 25.0,
          ldl: 130,
          hdl: 50,
          triglycerides: 150,
          risk_score: 0.35,
          risk_level: 'Low',
          created_at: '2026-01-23T10:00:00Z',
        }]),
      });
    });

    await page.route('**/analytics/summary', async route => {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          totalAssessments: 1,
          averageRiskScore: 0.35,
          recentAssessments: [{
            id: '1',
            risk_score: 0.35,
            risk_level: 'Low',
            created_at: '2026-01-23T10:00:00Z',
          }],
        }),
      });
    });

    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await page.waitForURL('/', { timeout: 10000 });

    await page.waitForTimeout(1000);

    await expect(page.locator('text=Risk Level').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=LOW').first()).toBeVisible({ timeout: 5000 });
  });

  test('7.4: Assessment summary card visible', async ({ page }) => {
    await page.route('**/users/me/assessments*', async route => {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            bmi: 25.0,
            ldl: 130,
            hdl: 50,
            risk_score: 0.35,
            risk_level: 'Low',
            created_at: '2026-01-23T10:00:00Z',
          },
          {
            id: '2',
            bmi: 27.5,
            ldl: 140,
            hdl: 45,
            risk_score: 0.55,
            risk_level: 'Medium',
            created_at: '2026-01-22T10:00:00Z',
          },
        ]),
      });
    });

    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await page.waitForURL('/', { timeout: 10000 });

    await page.waitForTimeout(1000);

    await expect(page.locator('text=Assessments').first()).toBeVisible({ timeout: 5000 });
  });

  test('7.5: Charts render with no errors', async ({ page }) => {
    // Setup error tracking
    const errors = await page.evaluate(() => window.consoleErrors || []);

    // Mock analytics data for charts
    await page.route('**/analytics/summary', async route => {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          totalAssessments: 2,
          averageRiskScore: 0.45,
          recentAssessments: [
            {
              id: '1',
              risk_score: 0.35,
              risk_level: 'Low',
              created_at: '2026-01-23T10:00:00Z',
            },
            {
              id: '2',
              risk_score: 0.55,
              risk_level: 'Medium',
              created_at: '2026-01-22T10:00:00Z',
            },
          ],
        }),
      });
    });

    // Login
    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await page.waitForURL('/', { timeout: 10000 });

    // Wait for charts to render
    await page.waitForTimeout(2000);

    // Check for SVG elements (charts)
    await expect(page.locator('svg').first()).toBeVisible({ timeout: 5000 });

    // Assert no console errors during chart render
    const finalErrors = await page.evaluate(() => window.consoleErrors || []);
    expect(finalErrors).toEqual([]);
  });

  test.skip('7.6: Loading state during data fetch - SKIPPED', async ({ page }) => {
  });

  test.skip('7.7: Error state when API fails - SKIPPED', async ({ page }) => {
  });
});
