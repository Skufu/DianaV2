import { test, expect } from '@playwright/test';
import { TEST_PROFILE, SELECTORS, createMockJwt } from './fixtures/test-data';

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
      '/users/me/export/pdf',
      '/analytics/summary',
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
            email: ({ ...{ ...TEST_PROFILE, onboarding_completed: true }, onboarding_completed: true }).email,
            role: 'user',
          },
        })
      );
    }

    if (url.includes('/users/me/profile') && method === 'GET') {
      const profile = resolveOverride(overrides.profile, ({ ...{ ...TEST_PROFILE, onboarding_completed: true }, onboarding_completed: true }));
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

    if (url.includes('/analytics/summary')) {
      return route.fulfill(buildJsonResponse({
        totalAssessments: 0,
        averageRiskScore: 0,
        recentAssessments: [],
      }));
    }

    if (url.includes('/users/me/export/pdf') && method === 'GET') {
      const mockPdfContent = Buffer.from('Mock PDF content');
      return route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders,
          'content-type': 'application/pdf',
          'content-disposition': 'attachment; filename="diana_health_report.pdf"',
          'content-length': mockPdfContent.length.toString(),
        },
        body: mockPdfContent,
      });
    }

    return route.fulfill(buildJsonResponse({ error: 'Not mocked in export tests' }, 404));
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
  const sidebar = page.locator('text=Health Report').locator('..').locator('..').locator('..');
  const onboardingHeader = page.locator('text=Welcome to DIANA');

  await Promise.race([
    sidebar.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
    onboardingHeader.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
  ]);
};

test.describe('Export Page Tests', () => {
  test.beforeEach(async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
        console.log('Console error:', msg.text());
      }
    });

    const accessToken = createMockJwt();
    await mockAuthenticatedSession(page, accessToken);
    await setStoredSession(page, accessToken);
    await page.goto('/');
    await waitForAppShell(page);
    await completeOnboardingIfNeeded(page);
    await expect(page.locator('text=Health Report').locator('..').locator('..').locator('..')).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to health report tab and display content', async ({ page }) => {
    const sidebar = page.locator('text=Health Report').locator('..').locator('..').locator('..');
    const exportTab = sidebar.locator('button:has-text("Health Report")');

    await exportTab.click();

    await expect(page.locator('h2:has-text("Health Report")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Download a summary of your health data for your records or to share with your doctor')).toBeVisible();
    await expect(page.locator('h3:has-text("Download Health Report")')).toBeVisible();
    await expect(page.locator('button:has-text("Download PDF")')).toBeVisible();
  });

  test('should generate PDF report and trigger download', async ({ page, context }) => {
    const sidebar = page.locator('text=Health Report').locator('..').locator('..').locator('..');
    const exportTab = sidebar.locator('button:has-text("Health Report")');

    await exportTab.click();

    const generateButton = page.locator('button:has-text("Download PDF")');

    const logs = [];
    page.on('console', msg => {
      logs.push({ type: msg.type(), text: msg.text() });
    });

    const downloadPromise = page.waitForEvent('download');

    await generateButton.click();

    const hasErrors = logs.some(log => log.type === 'error');
    if (hasErrors) {
      console.log('Console errors:', logs.filter(l => l.type === 'error'));
    }

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/diana_health_report.*\.pdf$/);
  });
});
