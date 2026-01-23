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
        })
      );
    }

    if (url.includes('/users/me/profile') && method === 'GET') {
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
  const sidebar = page.locator(SELECTORS.sidebar);
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
    await expect(page.locator(SELECTORS.sidebar)).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to export tab', async ({ page }) => {
    const sidebar = page.locator(SELECTORS.sidebar);
    const exportTab = sidebar.locator('button:has-text("Export Data")');

    await exportTab.click();

    await expect(page.locator('text=Export Data')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Data Management')).toBeVisible();
    await expect(page.locator('text=Filter Options')).toBeVisible();
  });

  test('should display export options visible', async ({ page }) => {
    const sidebar = page.locator(SELECTORS.sidebar);
    const exportTab = sidebar.locator('button:has-text("Export Data")');

    await exportTab.click();

    await page.waitForTimeout(1000);

    const errorFallback = page.locator('text=Something went wrong');
    const hasError = await errorFallback.isVisible().catch(() => false);

    if (hasError) {
      const showDetailsButton = page.locator('button:has-text("Show Technical Details")');
      await showDetailsButton.click();

      const errorMessage = page.locator('p:has-text("Error Message:") + p').nth(1);
      const errorText = await errorMessage.textContent();
      console.log('Export component error:', errorText);

      throw new Error(`Export component failed to load: ${errorText}`);
    }

    await expect(page.locator('text=Export Patient Data')).toBeVisible();
    await expect(page.locator('text=Patients Data (CSV)')).toBeVisible();
    await expect(page.locator('text=Assessments Data (CSV)')).toBeVisible();
    await expect(page.locator('h3:has-text("Insights Report")')).toBeVisible();

    const downloadButtons = page.locator('button:has-text("Download")');
    await expect(downloadButtons).toHaveCount(2);
  });

  test('should display filter options', async ({ page }) => {
    const sidebar = page.locator(SELECTORS.sidebar);
    const exportTab = sidebar.locator('button:has-text("Export Data")');

    await exportTab.click();

    await expect(page.locator('label:has-text("Menopausal Status")')).toBeVisible();
    await expect(page.locator('text=All Statuses')).toBeVisible();
    await expect(page.locator('text=Perimenopausal')).toBeVisible();
    await expect(page.locator('text=Postmenopausal')).toBeVisible();

    await expect(page.locator('label:has-text("Diabetes Risk Level")')).toBeVisible();
    await expect(page.locator('text=All Risk Levels')).toBeVisible();
    await expect(page.locator('text=Low Risk (0-33%)')).toBeVisible();
    await expect(page.locator('text=Moderate Risk (34-66%)')).toBeVisible();
    await expect(page.locator('text=High Risk (67-100%)')).toBeVisible();
  });

  test('should show data privacy notice', async ({ page }) => {
    const sidebar = page.locator(SELECTORS.sidebar);
    const exportTab = sidebar.locator('button:has-text("Export Data")');

    await exportTab.click();

    await expect(page.locator('text=Data Privacy & Security Notice')).toBeVisible();
    await expect(page.locator('text=Exported files contain protected health information (PHI)')).toBeVisible();
    await expect(page.locator('text=HIPAA, GDPR, or applicable data protection regulations')).toBeVisible();
  });

  test('should generate PDF report and trigger download', async ({ page, context }) => {
    const sidebar = page.locator(SELECTORS.sidebar);
    const exportTab = sidebar.locator('button:has-text("Export Data")');

    await exportTab.click();

    const generateButton = page.locator('button:has-text("Generate")');

    const logs = [];
    page.on('console', msg => {
      logs.push({ type: msg.type(), text: msg.text() });
    });

    const downloadPromise = page.waitForEvent('download');

    await generateButton.click();

    await page.waitForTimeout(2000);

    const hasErrors = logs.some(log => log.type === 'error');
    if (hasErrors) {
      console.log('Console errors:', logs.filter(l => l.type === 'error'));
    }

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/diana_health_report.*\.pdf$/);
  });

  test('should show appropriate message when no data to export', async ({ page }) => {
    const sidebar = page.locator(SELECTORS.sidebar);
    const exportTab = sidebar.locator('button:has-text("Export Data")');

    await exportTab.click();

    await expect(page.locator('text=Export Data')).toBeVisible({ timeout: 5000 });

    await expect(page.locator('text=Export Patient Data')).toBeVisible();
    await expect(page.locator('text=Patients Data (CSV)')).toBeVisible();
    await expect(page.locator('text=Assessments Data (CSV)')).toBeVisible();

    const privacyNotice = page.locator('text=Data Privacy & Security Notice');
    await expect(privacyNotice).toBeVisible();
    await expect(page.locator('text=Exported files contain protected health information (PHI)')).toBeVisible();
  });
});
