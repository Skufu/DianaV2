import { test, expect } from '@playwright/test';
import { SELECTORS, waitForNetworkIdle } from './fixtures/test-data';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization, X-API-Key',
};

const mockRoleAuth = async (page, role) => {
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
        access_token: `${role}.access.token`,
        refresh_token: `${role}.refresh.token`,
        user: { id: role === 'admin' ? '1' : '2', email: `${role}@diana.app`, role },
      }),
    });
  });

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
        id: role === 'admin' ? 1 : 2,
        role,
        email: `${role}@diana.app`,
        onboarding_completed: true,
      }),
    });
  });

  await page.route('**/users/me/assessments**', async route => {
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

  await page.route('**/admin/dashboard', async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: corsHeaders });
    }

    return route.fulfill({
      status: 200,
      headers: corsHeaders,
      contentType: 'application/json',
      body: JSON.stringify({
        stats: {
          total_users: 10,
          new_users_this_month: 1,
          total_patients: 8,
          total_assessments: 20,
          assessments_this_month: 2,
          high_risk_count: 3,
          avg_risk_score: 41.3,
        },
        cluster_distribution: [],
        trends: [],
      }),
    });
  });

  await page.route('**/admin/clinics/comparison', async route => {
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
};

const login = async (page, role) => {
  await page.goto('/');
  await page.fill(SELECTORS.loginEmailInput, `${role}@diana.app`);
  await page.fill(SELECTORS.loginPasswordInput, 'password123');
  await page.click(SELECTORS.loginButton);
  await waitForNetworkIdle(page);
};

test.describe('Doctor/Admin model selector lock smoke', () => {
  test('doctor sees no selectors and explainability is locked to no-BP', async ({ page }) => {
    await mockRoleAuth(page, 'doctor');

    let explainRequestUrl = '';
    await page.route('**/predict/explain**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      explainRequestUrl = request.url();

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          model_type: 'binary_v2_no_bp',
          probability: 0.72,
          explanation: {
            base_value: 0.5,
            prediction: 0.72,
            shap_values: [0.2, -0.1, 0.05],
            feature_values: [31.1, 45.0, 55.0],
            feature_names: ['bmi', 'hdl', 'age'],
          },
        }),
      });
    });

    await login(page, 'doctor');

    await expect(page.locator('text=Doctor Dashboard')).toBeVisible({ timeout: 10000 });

    const sidebar = page.locator('nav').first();
    await expect(sidebar.locator('button:has-text("Log Assessment")')).toBeVisible();
    await expect(sidebar.locator('button:has-text("Clinical Explainability")')).toBeVisible();
    await expect(sidebar.locator('button:has-text("User Management")')).toHaveCount(0);
    await expect(sidebar.locator('button:has-text("Model Tracking")')).toHaveCount(0);

    await page.screenshot({ path: './e2e/screenshots/doctor-sidebar-after-cleanup.png', fullPage: true });

    await sidebar.locator('button:has-text("Log Assessment")').click();
    await expect(page.locator('h2:has-text("Log New Assessment")')).toBeVisible();
    await expect(page.locator('#model_type')).toHaveCount(0);

    await page.screenshot({ path: './e2e/screenshots/doctor-assessment-no-selector.png', fullPage: true });

    await sidebar.locator('button:has-text("Clinical Explainability")').click();
    await expect(page.locator('h3:has-text("Clinical Explainability")')).toBeVisible();
    await expect(page.locator('#modelType')).toHaveCount(0);
    await expect(page.locator('text=Screening (No BP) — Binary at-risk')).toBeVisible();

    await page.fill('#age', '55');
    await page.fill('#bmi', '31.1');
    await page.fill('#triglycerides', '160');
    await page.fill('#ldl', '120');
    await page.fill('#hdl', '45');
    await page.click('button:has-text("Generate Explanation")');

    await expect.poll(() => explainRequestUrl).toContain('model_type=binary_v2_no_bp');
    await expect(page.locator('text=AI Explanation')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: './e2e/screenshots/doctor-explainability-locked-no-bp.png', fullPage: true });
  });

  test('admin workspace stays governance-only (no clinical tools)', async ({ page }) => {
    await mockRoleAuth(page, 'admin');
    await login(page, 'admin');

    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 10000 });

    const sidebar = page.locator('nav').first();
    await expect(sidebar.locator('button:has-text("Overview")')).toBeVisible();
    await expect(sidebar.locator('button:has-text("User Management")')).toBeVisible();
    await expect(sidebar.locator('button:has-text("Audit Logs")')).toBeVisible();
    await expect(sidebar.locator('button:has-text("Auth Events")')).toBeVisible();
    await expect(sidebar.locator('button:has-text("Model Tracking")')).toBeVisible();

    await expect(sidebar.locator('button:has-text("Log Assessment")')).toHaveCount(0);
    await expect(sidebar.locator('button:has-text("Clinical Explainability")')).toHaveCount(0);
    await expect(sidebar.locator('button:has-text("Insights")')).toHaveCount(0);
    await expect(sidebar.locator('button:has-text("Model Rationale")')).toHaveCount(0);
  });
});
