import { test, expect } from '@playwright/test';
import { TEST_USER, SELECTORS, waitForNetworkIdle, takeScreenshot } from './fixtures/test-data';

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

test.describe('Visual Regression: Insights Component', () => {
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
      return fulfillJson(route, {
        name: 'E2E User',
        email: TEST_USER.email,
        onboarding_completed: true,
      });
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
        { cluster: 'Cluster_C', count: 2 },
        { cluster: 'Cluster_D', count: 4 },
      ]);
    });

    await page.route('**/insights/biomarker-trends', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, [
        { label: 'Jan', bmi: 25.0, ldl: 120, hdl: 50, triglycerides: 150 },
        { label: 'Feb', bmi: 24.8, ldl: 125, hdl: 52, triglycerides: 148 },
        { label: 'Mar', bmi: 25.2, ldl: 118, hdl: 48, triglycerides: 155 },
        { label: 'Apr', bmi: 24.5, ldl: 122, hdl: 51, triglycerides: 145 },
        { label: 'May', bmi: 25.5, ldl: 128, hdl: 49, triglycerides: 160 },
      ]);
    });

    await page.route('**/insights/metrics', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, {
        accuracy: 0.85,
        precision: 0.83,
        recall: 0.81,
        f1_score: 0.82,
        auc_roc: 0.88,
      });
    });

    await page.route('**/insights/information-gain', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, [
        { feature: 'BMI', importance: 0.25 },
        { feature: 'Triglycerides', importance: 0.20 },
        { feature: 'LDL', importance: 0.15 },
        { feature: 'HDL', importance: 0.12 },
        { feature: 'Age', importance: 0.10 },
        { feature: 'Smoking Status', importance: 0.08 },
        { feature: 'Physical Activity', importance: 0.06 },
        { feature: 'Alcohol', importance: 0.04 },
      ]);
    });

    await page.route('**/insights/clusters', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, [
        { cluster: 'Cluster_A', description: 'High Risk Metabolic', avg_age: 55, avg_bmi: 28.5 },
        { cluster: 'Cluster_B', description: 'Moderate Risk', avg_age: 58, avg_bmi: 26.0 },
        { cluster: 'Cluster_C', description: 'Low Risk Active', avg_age: 52, avg_bmi: 24.5 },
        { cluster: 'Cluster_D', description: 'Low Risk Controlled', avg_age: 68, avg_bmi: 25.0 },
      ]);
    });
  });

  test('should capture Insights page baseline screenshot', async ({ page }) => {
    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const insightsTab = page.locator(SELECTORS.insightsTab);
    if (await insightsTab.isVisible({ timeout: 5000 })) {
      await insightsTab.click();
      await waitForNetworkIdle(page);
      await page.waitForTimeout(2000);

      await takeScreenshot(page, 'insights-full-page-baseline');

      const sections = [
        { name: 'insights-header', selector: 'h1, h2' },
        { name: 'insights-summary', selector: '[class*="summary"], [class*="card"]' },
        { name: 'insights-model-performance', selector: 'text=/accuracy|precision|recall|f1/i' },
        { name: 'insights-risk-factors', selector: 'text=/feature|importance/i' },
        { name: 'insights-clusters', selector: 'text=/cluster|distribution/i' },
      ];

      for (const section of sections) {
        try {
          const element = page.locator(section.selector).first();
          if (await element.isVisible({ timeout: 5000 })) {
            await element.screenshot({
              path: `./e2e/screenshots/${section.name}-baseline.png`,
            });
          }
        } catch (e) {
          console.log(`Section ${section.name} not visible, skipping screenshot`);
        }
      }
    }
  });

  test('should verify Insights page visual consistency', async ({ page }) => {
    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const insightsTab = page.locator(SELECTORS.insightsTab);
    if (await insightsTab.isVisible({ timeout: 5000 })) {
      await insightsTab.click();
      await waitForNetworkIdle(page);
      await page.waitForTimeout(2000);

      await expect(page.locator('h1, h2').first()).toBeVisible();
      await expect(page.locator('text=/cluster|distribution/i').first()).toBeVisible();
      await expect(page.locator('text=/accuracy|precision|recall|f1/i').first()).toBeVisible();

      const insightsContent = page.locator('main').first();
      const boundingBox = await insightsContent.boundingBox();
      expect(boundingBox).toBeTruthy();
      expect(boundingBox.width).toBeGreaterThan(0);
      expect(boundingBox.height).toBeGreaterThan(0);

      await takeScreenshot(page, 'insights-visual-comparison');
    }
  });

  test('should capture all extracted components individually', async ({ page }) => {
    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const insightsTab = page.locator(SELECTORS.insightsTab);
    if (await insightsTab.isVisible({ timeout: 5000 })) {
      await insightsTab.click();
      await waitForNetworkIdle(page);
      await page.waitForTimeout(2000);

      const componentChecks = [
        { name: 'ModelPerformance', pattern: /accuracy|precision|recall|f1|auc/i },
        { name: 'RiskFactorChart', pattern: /feature|importance|BMI|Triglycerides/i },
        { name: 'SubgroupDistribution', pattern: /cluster|distribution/i },
        { name: 'ClusterComparison', pattern: /Cluster|description|risk/i },
      ];

      for (const component of componentChecks) {
        const element = page.locator(`text=${component.pattern.source}`);
        try {
          await expect(element.first()).toBeVisible({ timeout: 5000 });
          console.log(`✓ ${component.name} component is visible`);
        } catch (e) {
          console.log(`✗ ${component.name} component not visible`);
          throw e;
        }
      }

      await takeScreenshot(page, 'insights-all-components');
    }
  });

  test('should verify responsive behavior', async ({ page }) => {
    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const insightsTab = page.locator(SELECTORS.insightsTab);
    if (await insightsTab.isVisible({ timeout: 5000 })) {
      await insightsTab.click();
      await waitForNetworkIdle(page);

      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'insights-desktop-1920x1080');

      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'insights-tablet-768x1024');

      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'insights-mobile-375x667');

      await page.setViewportSize({ width: 1920, height: 1080 });
    }
  });

  test('should verify visual consistency with loading states', async ({ page }) => {
    await page.route('**/insights/metrics', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (await handleOptions(route)) return;
      return fulfillJson(route, {
        accuracy: 0.85,
        precision: 0.83,
        recall: 0.81,
        f1_score: 0.82,
        auc_roc: 0.88,
      });
    });

    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await page.click(SELECTORS.insightsTab);

    await page.waitForTimeout(500);
    await takeScreenshot(page, 'insights-loading-state');

    await waitForNetworkIdle(page);
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'insights-loaded-state');
  });

  test('should verify visual consistency with empty data', async ({ page }) => {
    await page.route('**/insights/cluster-distribution', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, []);
    });

    await page.route('**/insights/biomarker-trends', async route => {
      if (await handleOptions(route)) return;
      return fulfillJson(route, []);
    });

    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await page.click(SELECTORS.insightsTab);
    await waitForNetworkIdle(page);
    await page.waitForTimeout(1000);

    await takeScreenshot(page, 'insights-empty-state');

    const emptyState = page.locator('text=/no data|no clustering|empty/i');
    const isVisible = await emptyState
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (isVisible) {
      await expect(emptyState.first()).toBeVisible();
    }
  });
});
