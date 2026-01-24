import { test, expect } from '@playwright/test';
import { TEST_USER, SELECTORS, createMockJwt, MOCK_TRENDS_DATA } from './fixtures/test-data';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

const buildJsonResponse = (body, status = 200) => ({
  status,
  contentType: 'application/json',
  headers: corsHeaders,
  body: JSON.stringify(body),
});

const mockAuthenticatedSession = async (page, accessToken, overrides = {}) => {
  await page.route('**/*', route => {
    const request = route.request();
    const url = request.url();
    const method = request.method();
    const isMockedEndpoint = [
      '/auth/login',
      '/users/me/profile',
      '/users/me/assessments',
      '/users/me/trends',
    ].some(path => url.includes(path));

    if (!isMockedEndpoint) {
      return route.fallback();
    }

    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: corsHeaders,
      });
    }

    if (url.includes('/auth/login')) {
      return route.fulfill(
        buildJsonResponse({
          access_token: accessToken,
          refresh_token: 'refresh-token',
          user: {
            id: 'e2e-user',
            email: TEST_USER.email,
            role: 'user',
          },
        })
      );
    }

    if (url.includes('/users/me/profile') && method === 'GET') {
      const profile = overrides.profile || {
        id: 'e2e-user',
        first_name: 'Test',
        last_name: 'User',
        email: TEST_USER.email,
        onboarding_completed: true,
      };
      return route.fulfill(buildJsonResponse(profile));
    }

    if (url.includes('/users/me/assessments')) {
      const assessments = overrides.assessments || [];
      return route.fulfill(buildJsonResponse(assessments));
    }

    if (url.includes('/users/me/trends')) {
      const trends = overrides.trends || MOCK_TRENDS_DATA;
      return route.fulfill(buildJsonResponse(trends));
    }

    return route.fallback();
  });
};

test.describe('Trends Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const mockToken = createMockJwt({ user_id: 'e2e-user' });
    await mockAuthenticatedSession(page, mockToken);

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to trends tab', async ({ page }) => {
    await expect(page.locator('text=Welcome Back!')).toBeVisible({ timeout: 10000 });

    const trendsTab = page.locator(SELECTORS.trendsTab);
    await expect(trendsTab).toBeVisible();
    await trendsTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page.locator('h1:has-text("Health Trends")')).toBeVisible({ timeout: 10000 });
  });

  test('should render charts with mock data', async ({ page }) => {
    await page.click(SELECTORS.trendsTab);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const svgElements = await page.locator('svg').count();
    expect(svgElements).toBeGreaterThan(0);
  });

  test('should work with time range selector', async ({ page }) => {
    await page.click(SELECTORS.trendsTab);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const timeButtons = page.locator('button').filter(async (btn) => {
      const text = await btn.textContent();
      return ['1 Month', '3 Months', '6 Months', '1 Year', '2 Years', '5 Years', 'All Time'].some(label => text?.includes(label));
    });
    await expect(timeButtons.first()).toBeVisible();

    const threeMonthsButton = page.locator('button:has-text("3 Months")');
    await expect(threeMonthsButton).toBeVisible();
    await threeMonthsButton.click();

    await page.waitForTimeout(1000);

    const svgElements = await page.locator('svg').count();
    expect(svgElements).toBeGreaterThan(0);
  });

  test('should navigate from dashboard to trends via quick action button', async ({ page }) => {
    await expect(page.locator('text=Welcome Back!')).toBeVisible({ timeout: 10000 });

    const viewTrendsButton = page.locator('button:has-text("View Trends")');
    await expect(viewTrendsButton).toBeVisible();
    await viewTrendsButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page.locator('h1:has-text("Health Trends")')).toBeVisible();
    await expect(page.locator(SELECTORS.trendsTab)).toHaveAttribute('class', /.*bg-slate-700.*/);
  });

  test('should display loading state while fetching data', async ({ page }) => {
    await page.route('**/users/me/trends', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_TRENDS_DATA),
      });
    });

    await expect(page.locator('text=Welcome Back!')).toBeVisible();
    const viewTrendsButton = page.locator('button:has-text("View Trends")');
    await viewTrendsButton.click();
    await page.waitForTimeout(100);

    await expect(page.locator('text=Loading trends...')).toBeVisible({ timeout: 2000 });

    await expect(page.locator('h1:has-text("Health Trends")')).toBeVisible({ timeout: 5000 });
  });
});
