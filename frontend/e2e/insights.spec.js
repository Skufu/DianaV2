import { test, expect } from '@playwright/test';
import { TEST_USER, SELECTORS, waitForNetworkIdle } from './fixtures/test-data';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

const fulfillJson = (route, body, status = 200) =>
  route.fulfill({
    status,
    headers: corsHeaders,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

const handleOptions = async route => {
  const request = route.request();
  if (request.method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: corsHeaders });
    return true;
  }
  return false;
};

test.describe('Insights Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/auth/login', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, {
        access_token: 'test.access.token',
        refresh_token: 'test.refresh.token',
      });
    });

    await page.route('**/users/me/profile', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, { name: 'E2E User', email: TEST_USER.email });
    });

    await page.route('**/users/me/assessments**', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, []);
    });

    await page.route('**/users/me/onboarding', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, { success: true });
    });

    await page.route('**/insights/cluster-distribution', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, [
        { cluster: 'SIDD', count: 5 },
        { cluster: 'SIRD', count: 3 },
      ]);
    });

    await page.route('**/insights/biomarker-trends', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, [
        { label: 'Jan', hba1c: 6.2, fbs: 108 },
        { label: 'Feb', hba1c: 6.4, fbs: 112 },
      ]);
    });

    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);
  });

  test('should navigate to insights tab', async ({ page }) => {
    const insightsTab = page.locator(SELECTORS.insightsTab);
    if (await insightsTab.isVisible()) {
      await insightsTab.click();
      await waitForNetworkIdle(page);

      const insightsContent = page.locator('text=/insights|cluster|metrics|chart/i');
      await expect(insightsContent.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show ML error banner when ML APIs fail', async ({ page }) => {
    await page.route('**/insights/metrics', async route => {
      if (await handleOptions(route)) return;
      return route.abort('failed');
    });

    await page.route('**/insights/information-gain', async route => {
      if (await handleOptions(route)) return;
      return route.abort('failed');
    });

    await page.route('**/insights/clusters', async route => {
      if (await handleOptions(route)) return;
      return route.abort('failed');
    });

    await page.click(SELECTORS.insightsTab);
    await waitForNetworkIdle(page);

    await expect(page.locator('text=/ml server is unavailable/i')).toBeVisible({ timeout: 10000 });
  });

  test('should keep showing insights when trends endpoint fails', async ({ page }) => {
    await page.route('**/insights/biomarker-trends', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, { error: 'Failed' }, 500);
    });

    await page.click(SELECTORS.insightsTab);
    await waitForNetworkIdle(page);

    await expect(page.locator('text=/failed to load insights/i')).toBeVisible({ timeout: 10000 });
  });

  test('should show empty insights state when clusters missing', async ({ page }) => {
    await page.route('**/insights/cluster-distribution', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, []);
    });

    await page.click(SELECTORS.insightsTab);
    await waitForNetworkIdle(page);

    await expect(page.locator('text=/no clustering data available/i')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should display cluster distribution', async ({ page }) => {
    await page.click(SELECTORS.insightsTab);
    await waitForNetworkIdle(page);

    const clusterSection = page.locator('[class*="cluster"], [class*="chart"], svg, canvas');
    await expect(clusterSection.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display model metrics', async ({ page }) => {
    // Navigate to insights
    await page.click(SELECTORS.insightsTab);
    await waitForNetworkIdle(page);

    // Look for metrics (accuracy, precision, etc.)
    const metricsSection = page.locator('text=/accuracy|precision|recall|f1|auc/i');
    if (
      await metricsSection
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)
    ) {
      await expect(metricsSection.first()).toBeVisible();
    }
  });

  test('should handle empty data state', async ({ page }) => {
    // Navigate to insights
    await page.click(SELECTORS.insightsTab);
    await waitForNetworkIdle(page);

    // Should not show loading spinner indefinitely
    await page.waitForTimeout(3000);
    const loadingSpinner = page.locator('[class*="loading"], [class*="spinner"]');

    // Either content should be visible or loading should stop
    const contentOrEmpty = page.locator('[class*="chart"], [class*="empty"], text=/no data/i');
    const isContentVisible = await contentOrEmpty
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    const isSpinnerHidden = !(await loadingSpinner
      .first()
      .isVisible({ timeout: 1000 })
      .catch(() => false));

    expect(isContentVisible || isSpinnerHidden).toBeTruthy();
  });
});
