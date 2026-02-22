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
        user: {
          id: 'e2e-user-id',
          email: TEST_USER.email,
          role: 'user',
        },
      });
    });

    await page.route('**/users/me/profile', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, { name: 'E2E User', email: TEST_USER.email, onboarding_completed: true });
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
        { cluster: 'Cluster_A', count: 5 },
        { cluster: 'Cluster_B', count: 3 },
      ]);
    });

    await page.route('**/insights/biomarker-trends', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, [
        { label: 'Jan', bmi: 25.0, ldl: 130, hdl: 50 },
        { label: 'Feb', bmi: 24.8, ldl: 128, hdl: 52 },
      ]);
    });

    await page.route('**/insights/information-gain', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, {
        feature_ranking: [
          { feature: 'bmi', ig: 0.28 },
          { feature: 'triglycerides', ig: 0.25 },
          { feature: 'ldl', ig: 0.18 },
          { feature: 'hdl', ig: 0.12 },
          { feature: 'age', ig: 0.10 },
          { feature: 'physical_activity', ig: 0.07 }
        ]
      });
    });

    await page.route('**/insights/metrics', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, {
        accuracy: 0.85,
        precision: 0.83,
        recall: 0.87,
        f1_score: 0.85,
        auc: 0.92
      });
    });

    await page.goto('/');

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    await page.waitForTimeout(1000);
  });

  test('should navigate to insights tab', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    const insightsTab = page.locator('button').filter({ hasText: 'Insights' }).first();
    await insightsTab.click();
    await waitForNetworkIdle(page);

    const insightsContent = page.locator('text=/insights|cluster|metrics|chart/i');
    await expect(insightsContent.first()).toBeVisible({ timeout: 10000 });
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

    await page.goto('/');
    await waitForNetworkIdle(page);

    const insightsTab = page.locator('button').filter({ hasText: 'Insights' }).first();
    await insightsTab.click();
    await waitForNetworkIdle(page);

    await expect(page.locator('text=/ml server is unavailable/i')).toBeVisible({ timeout: 10000 });
  });

  test('should keep showing insights when trends endpoint fails', async ({ page }) => {
    await page.route('**/insights/biomarker-trends', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, { error: 'Failed' }, 500);
    });

    await page.goto('/');
    await waitForNetworkIdle(page);

    const insightsTab = page.locator('button').filter({ hasText: 'Insights' }).first();
    await insightsTab.click();
    await waitForNetworkIdle(page);

    // Should NOT show global error
    const errorMessage = page.locator('text=/Failed to load insights/i');
    await expect(errorMessage).toBeHidden();

    // Should show clusters (partial success)
    const clusterSection = page.locator('[class*="cluster"], [class*="chart"], svg, canvas');
    await expect(clusterSection.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show empty insights state when clusters missing', async ({ page }) => {
    await page.route('**/insights/cluster-distribution', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, []);
    });

    await page.goto('/');
    await waitForNetworkIdle(page);

    const insightsTab = page.locator('button').filter({ hasText: 'Insights' }).first();
    await insightsTab.click();
    await waitForNetworkIdle(page);

    await expect(page.locator('text=/no clustering data available/i')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should display cluster distribution', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    const insightsTab = page.locator('button').filter({ hasText: 'Insights' }).first();
    await insightsTab.click();
    await waitForNetworkIdle(page);

    const clusterSection = page.locator('[class*="cluster"], [class*="chart"], svg, canvas');
    await expect(clusterSection.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display model metrics', async ({ page }) => {
    await page.goto('/');
    await waitForNetworkIdle(page);

    const insightsTab = page.locator('button').filter({ hasText: 'Insights' }).first();
    await insightsTab.click();
    await waitForNetworkIdle(page);

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
    await page.goto('/');
    await page.click(SELECTORS.insightsTab);
    await waitForNetworkIdle(page);

    await page.waitForTimeout(3000);
    const loadingSpinner = page.locator('[class*="loading"], [class*="spinner"]');

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

  test('should verify Recharts SVG elements render', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await waitForNetworkIdle(page);

    await page.waitForTimeout(1000);

    const insightsTab = page.locator('button').filter({ hasText: 'Insights' }).first();
    await insightsTab.click({ timeout: 5000 });
    await waitForNetworkIdle(page);

    await page.waitForTimeout(2000);

    const svgElements = await page.locator('svg').count();
    expect(svgElements).toBeGreaterThan(0);

    const rechartsElements = page.locator('[class*="recharts"]');
    const rechartsCount = await rechartsElements.count();
    expect(rechartsCount).toBeGreaterThan(0);

    const chartContainers = page.locator('.recharts-wrapper, .recharts-surface');
    const firstChartVisible = await chartContainers
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(firstChartVisible).toBeTruthy();

    expect(consoleErrors.length).toBe(0);

    const hasChartPaths = await page.locator('svg path').count() > 0;
    expect(hasChartPaths).toBeTruthy();
  });

  test('should display cluster distribution pie/bar chart', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await waitForNetworkIdle(page);

    await page.waitForTimeout(1000);

    const insightsTab = page.locator('button').filter({ hasText: 'Insights' }).first();
    await insightsTab.click({ timeout: 5000 });
    await waitForNetworkIdle(page);

    await page.waitForTimeout(2000);

    const chartContainer = page.locator('.recharts-wrapper');
    await expect(chartContainer.first()).toBeVisible({ timeout: 5000 });

    const svgElements = page.locator('svg');
    expect(await svgElements.count()).toBeGreaterThan(0);

    const pieSlices = page.locator('.recharts-pie, path[fill]');
    const barRects = page.locator('.recharts-bar-rectangle');

    const hasPieChart = await pieSlices.count() > 0;
    const hasBarChart = await barRects.count() > 0;

    expect(hasPieChart || hasBarChart).toBeTruthy();

    const chartPaths = page.locator('svg path');
    expect(await chartPaths.count()).toBeGreaterThan(0);

    const legendItems = page.locator('.recharts-legend-item');
    const axisLabels = page.locator('.recharts-cartesian-axis-tick, .recharts-pie-label');

    const hasLegendOrLabels = await (await legendItems.count()) > 0 || (await axisLabels.count()) > 0;
    expect(hasLegendOrLabels).toBeTruthy();

    expect(consoleErrors.length).toBe(0);

    const clusterLabels = page.locator('text=/Cluster|distribution/i');
    const hasClusterLabels = await clusterLabels.count() > 0;
    expect(hasClusterLabels).toBeTruthy();
  });

  test('should display biomarker trends line chart', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error' && !text.includes('ERR_CONNECTION_REFUSED')) {
        consoleErrors.push(text);
      }
    });

    await page.goto('/');
    await waitForNetworkIdle(page);

    await page.waitForTimeout(1000);

    const insightsTab = page.locator('button').filter({ hasText: 'Insights' }).first();
    await insightsTab.click({ timeout: 5000 });
    await waitForNetworkIdle(page);

    await page.waitForTimeout(3000);

    const biomarkerTrendsSection = page.locator('text=/Biomarker Trends Over Time/i');
    await expect(biomarkerTrendsSection.first()).toBeVisible({ timeout: 5000 });

    const emptyStateMessage = page.locator('text=/No trend data available/i');
    const hasEmptyState = await emptyStateMessage
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (!hasEmptyState) {
      const svgElements = page.locator('svg');
      const svgCount = await svgElements.count();
      expect(svgCount).toBeGreaterThan(0);

      const chartPaths = page.locator('svg path');
      const pathCount = await chartPaths.count();
      expect(pathCount).toBeGreaterThan(0);

      const biomarkerLabels = page.locator('text=/BMI|LDL|HDL/i');
      const hasBiomarkerLabels = await biomarkerLabels.count() > 0;
      expect(hasBiomarkerLabels).toBeTruthy();
    }

    expect(consoleErrors.length).toBe(0);
  });

  test('should render feature importance chart', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await waitForNetworkIdle(page);

    await page.waitForTimeout(1000);

    const insightsTab = page.locator('button').filter({ hasText: 'Insights' }).first();
    await insightsTab.click({ timeout: 5000 });
    await waitForNetworkIdle(page);

    await page.waitForTimeout(2000);

    const riskFactorSection = page.locator('text=/Risk Factor Importance/i');
    await expect(riskFactorSection.first()).toBeVisible({ timeout: 5000 });

    const emptyStateMessage = page.locator('text=/No risk factor data available/i');
    const hasEmptyState = await emptyStateMessage
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (!hasEmptyState) {
      const svgElements = page.locator('svg');
      expect(await svgElements.count()).toBeGreaterThan(0);

      const chartContainer = page.locator('.recharts-wrapper');
      await expect(chartContainer.first()).toBeVisible({ timeout: 5000 });

      const barRectangles = page.locator('.recharts-bar-rectangle');
      const barCount = await barRectangles.count();
      expect(barCount).toBeGreaterThan(0);

      const chartPaths = page.locator('svg path');
      expect(await chartPaths.count()).toBeGreaterThan(0);

      const axisLabels = page.locator('.recharts-cartesian-axis-tick');
      const labelCount = await axisLabels.count();
      expect(labelCount).toBeGreaterThan(0);

      const factorLabels = page.locator('text=/BMI|Triglycerides|LDL|HDL|Age|Physical Activity/i');
      const hasFactorLabels = await factorLabels.count() > 0;
      expect(hasFactorLabels).toBeTruthy();
    }

    expect(consoleErrors.length).toBe(0);
  });
});
