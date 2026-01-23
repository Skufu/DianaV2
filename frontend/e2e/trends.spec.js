import { test, expect } from '@playwright/test';
import { TEST_USER, SELECTORS, createMockJwt, MOCK_TRENDS_DATA } from './fixtures/test-data';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

test.describe('Trends Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

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
          access_token: createMockJwt({ user_id: 'test-user-id' }),
          refresh_token: 'test.refresh.token',
          user: { id: 'test-user-id', email: TEST_USER.email, role: 'user' },
        }),
      });
    });

    await page.route('**/users/me/profile', async route => {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user-id',
          first_name: 'Test',
          last_name: 'User',
          email: TEST_USER.email,
          onboarding_completed: true,
        }),
      });
    });

    await page.route('**/users/me/assessments**', async route => {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/trends', async route => {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_TRENDS_DATA),
      });
    });

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await page.waitForLoadState('networkidle');
  });

  test('should navigate to trends tab', async ({ page }) => {
    await expect(page.locator('text=Welcome Back')).toBeVisible();

    const trendsTab = page.locator(SELECTORS.trendsTab);
    await expect(trendsTab).toBeVisible();
    await trendsTab.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Health Trends')).toBeVisible();
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
    await expect(page.locator('text=Welcome Back')).toBeVisible();

    const viewTrendsButton = page.locator('button:has-text("View Trends")');
    await expect(viewTrendsButton).toBeVisible();
    await viewTrendsButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page.locator('text=Health Trends')).toBeVisible();
    await expect(page.locator(SELECTORS.trendsTab)).toHaveAttribute('class', /.*bg-slate-700.*/);
  });

  test('should display loading state while fetching data', async ({ page }) => {
    await page.route('**/trends', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_TRENDS_DATA),
      });
    });

    await page.click(SELECTORS.trendsTab);

    await expect(page.locator('text=Loading trends...')).toBeVisible({ timeout: 1000 });

    await expect(page.locator('text=Health Trends')).toBeVisible({ timeout: 5000 });
  });
});
