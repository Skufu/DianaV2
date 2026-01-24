import { test, expect } from '@playwright/test';
import { TEST_PROFILE, TEST_TRENDS, SELECTORS, createMockJwt } from './fixtures/test-data';

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

const resolveOverride = (override, fallback) => ({
  status: override?.status ?? 200,
  body: override?.body ?? fallback,
});

const mockAuthenticatedSession = async (page, accessToken, overrides = {}) => {
  await page.route('**/*', route => {
    const request = route.request();
    const method = request.method();
    const url = request.url();
    const isMockedEndpoint = [
      '/auth/login',
      '/users/me/profile',
      '/users/me/assessments',
      '/users/me/onboarding',
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
            email: TEST_PROFILE.email,
            role: 'user',
          },
        })
      );
    }

    if (url.includes('/users/me/profile')) {
      const profile = resolveOverride(overrides.profile, TEST_PROFILE);
      return route.fulfill(buildJsonResponse(profile.body, profile.status));
    }

    if (url.includes('/users/me/assessments')) {
      const assessments = resolveOverride(overrides.assessments, []);
      return route.fulfill(buildJsonResponse(assessments.body, assessments.status));
    }

    if (url.includes('/users/me/onboarding')) {
      const onboarding = resolveOverride(overrides.onboarding, { success: true });
      return route.fulfill(buildJsonResponse(onboarding.body, onboarding.status));
    }

    if (url.includes('/users/me/trends')) {
      const trends = resolveOverride(overrides.trends, TEST_TRENDS);
      return route.fulfill(buildJsonResponse(trends.body, trends.status));
    }

    return route.fulfill(buildJsonResponse({ error: 'Not mocked in navigation tests' }, 404));
  });
};

const setStoredSession = async (page, accessToken) => {
  await page.addInitScript(token => {
    window.localStorage.setItem('diana_token', token);
    window.localStorage.setItem('diana_refresh_token', 'refresh-token');
  }, accessToken);
};

const completeOnboardingIfNeeded = async page => {
  const onboardingHeader = page.locator('text=Welcome to DIANA');
  const isOnboardingVisible = await onboardingHeader.isVisible().catch(() => false);
  if (!isOnboardingVisible) return;

  for (let step = 0; step < 4; step += 1) {
    const nextButton = page.locator('button:has-text("Next")').first();
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(200);
    }
  }

  const completeButton = page.locator('button:has-text("Complete Setup")');
  if (await completeButton.isVisible().catch(() => false)) {
    await completeButton.click();
  }
};

const waitForAppShell = async page => {
  const sidebar = page.locator(SELECTORS.sidebar);
  const onboardingHeader = page.locator('text=Welcome to DIANA');

  await Promise.race([
    sidebar.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
    onboardingHeader.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
  ]);
};

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    const accessToken = createMockJwt();
    await mockAuthenticatedSession(page, accessToken);
    await setStoredSession(page, accessToken);
    await page.goto('/');
    await waitForAppShell(page);
    await completeOnboardingIfNeeded(page);
    await expect(page.locator(SELECTORS.sidebar)).toBeVisible({ timeout: 10000 });
  });

  test('should show primary navigation items', async ({ page }) => {
    const sidebar = page.locator(SELECTORS.sidebar);
    const navLabels = [
      'Dashboard',
      'My Profile',
      'Health Trends',
      'Insights',
      'Education',
      'Export Data',
    ];

    for (const label of navLabels) {
      await expect(sidebar.locator(`button:has-text("${label}")`).first()).toBeVisible();
    }
  });

  test('should hide sidebar on profile tab', async ({ page }) => {
    const sidebar = page.locator(SELECTORS.sidebar);
    await sidebar.locator('button:has-text("My Profile")').click();
    await expect(page.locator(SELECTORS.sidebar)).toHaveCount(0);
    await expect(page.locator('text=My Profile')).toBeVisible();
  });

  test('should navigate to education and export screens', async ({ page }) => {
    const sidebar = page.locator(SELECTORS.sidebar);
    await sidebar.locator('button:has-text("Education")').click();
    await expect(page.locator('text=Education Center')).toBeVisible();

    await sidebar.locator('button:has-text("Export Data")').click();
    await expect(page.locator('text=Export Data')).toBeVisible();
  });

  test('should open health trends and show empty state', async ({ page }) => {
    const sidebar = page.locator(SELECTORS.sidebar);
    await sidebar.locator('button:has-text("Health Trends")').click();
    await expect(page.locator('text=Health Trends')).toBeVisible();

    // Wait for loading state to complete
    await expect(page.locator('text=Loading trends...')).not.toBeVisible({ timeout: 5000 });

    // Check for empty state message
    await expect(page.locator('text=No trend data available. Log your first assessment to start tracking.')).toBeVisible();
  });

  test('should show profile error state when profile API fails', async ({ page }) => {
    const accessToken = createMockJwt();
    await mockAuthenticatedSession(page, accessToken, {
      profile: { status: 500, body: { error: 'Profile error' } },
    });
    await setStoredSession(page, accessToken);

    await page.goto('/');
    await waitForAppShell(page);
    await completeOnboardingIfNeeded(page);

    const sidebar = page.locator(SELECTORS.sidebar);
    await sidebar.locator('button:has-text("My Profile")').click();

    await expect(page.locator('text=/failed to load profile/i')).toBeVisible({ timeout: 10000 });
  });

  test('should render dashboard error state when assessments fail', async ({ page }) => {
    const accessToken = createMockJwt();
    await mockAuthenticatedSession(page, accessToken, {
      assessments: { status: 500, body: { error: 'Assessments failed' } },
    });
    await setStoredSession(page, accessToken);

    await page.goto('/');
    await waitForAppShell(page);
    await completeOnboardingIfNeeded(page);

    await expect(page.locator('text=/failed to load assessments/i')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should send user to onboarding when profile is incomplete', async ({ page }) => {
    const accessToken = createMockJwt();
    await mockAuthenticatedSession(page, accessToken, {
      profile: { status: 200, body: { name: '', email: '' } },
    });
    await setStoredSession(page, accessToken);

    await page.goto('/');
    await waitForAppShell(page);

    await expect(page.locator('text=Welcome to DIANA')).toBeVisible({ timeout: 10000 });
  });
});
