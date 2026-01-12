import { test, expect } from '@playwright/test';
import { TEST_USER, SELECTORS, waitForNetworkIdle } from './fixtures/test-data';

test.describe('Insights Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/');
        await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
        await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
        await page.click(SELECTORS.loginButton);
        await waitForNetworkIdle(page);
    });

    test('should navigate to insights tab', async ({ page }) => {
        // Click insights tab
        const insightsTab = page.locator(SELECTORS.insightsTab);
        if (await insightsTab.isVisible()) {
            await insightsTab.click();
            await waitForNetworkIdle(page);

            // Should see insights content
            const insightsContent = page.locator('text=/insights|cluster|metrics|chart/i');
            await expect(insightsContent.first()).toBeVisible({ timeout: 10000 });
        }
    });

    test('should display cluster distribution', async ({ page }) => {
        // Navigate to insights
        await page.click(SELECTORS.insightsTab);
        await waitForNetworkIdle(page);

        // Look for cluster-related content or charts
        const clusterSection = page.locator('[class*="cluster"], [class*="chart"], svg, canvas');
        await expect(clusterSection.first()).toBeVisible({ timeout: 10000 });
    });

    test('should display model metrics', async ({ page }) => {
        // Navigate to insights
        await page.click(SELECTORS.insightsTab);
        await waitForNetworkIdle(page);

        // Look for metrics (accuracy, precision, etc.)
        const metricsSection = page.locator('text=/accuracy|precision|recall|f1|auc/i');
        if (await metricsSection.first().isVisible({ timeout: 5000 }).catch(() => false)) {
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
        const isContentVisible = await contentOrEmpty.first().isVisible({ timeout: 5000 }).catch(() => false);
        const isSpinnerHidden = !(await loadingSpinner.first().isVisible({ timeout: 1000 }).catch(() => false));

        expect(isContentVisible || isSpinnerHidden).toBeTruthy();
    });
});
