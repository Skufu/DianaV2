import { test, expect } from '@playwright/test';
import { TEST_USER, SELECTORS } from './fixtures/test-data';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

const loginToDashboard = async (page) => {
  await page.goto('/');
  await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
  await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
  await page.click(SELECTORS.loginButton);
  await page.waitForURL('/', { timeout: 10000 });
};

const openLatestAssessmentModal = async (page) => {
  const latestResultRow = page.locator('table tbody tr').first();
  await expect(latestResultRow).toBeVisible({ timeout: 5000 });
  await latestResultRow.click();
  await expect(page.locator('text=AI-Assisted Results')).toBeVisible({ timeout: 5000 });
};

const openAssessmentForm = async (page) => {
  const openFormButton = page.locator('button:has-text("Log Your First Assessment")').first();
  await expect(openFormButton).toBeVisible({ timeout: 5000 });
  await openFormButton.click();
  await expect(page.locator('text=Log New Assessment')).toBeVisible({ timeout: 5000 });
};

const fillRequiredAssessmentFields = async (page, overrides = {}) => {
  const values = {
    age: '55',
    bmi: '28',
    triglycerides: '180',
    ldl: '120',
    hdl: '48',
    ...overrides,
  };

  await page.locator('input[name="age"]').fill(values.age);
  await page.locator('input[name="bmi"]').fill(values.bmi);
  await page.locator('input[name="triglycerides"]').fill(values.triglycerides);
  await page.locator('input[name="ldl"]').fill(values.ldl);
  await page.locator('input[name="hdl"]').fill(values.hdl);
};

const mockAssessment = (overrides = {}) => ({
  id: '1',
  bmi: 25.0,
  ldl: 130,
  hdl: 50,
  triglycerides: 150,
  risk_score: 55,
  risk_level: 'medium',
  predicted_status: 'At-Risk',
  at_risk_probability: 0.55,
  cluster: null,
  output_capabilities: {
    predicted_status: true,
    at_risk_probability: true,
    metabolic_subtype: false,
    cluster_description: false,
    treatment_focus: false,
  },
  cluster_capability: {
    supported: false,
  },
  model_version: 'binary_v2_no_bp',
  created_at: '2026-01-23T10:00:00Z',
  ...overrides,
});

test.describe('Dashboard Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
      window.consoleErrors = [];
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        page.evaluate((errText) => {
          if (typeof window.consoleErrors !== 'undefined') {
            window.consoleErrors.push(errText);
          }
        }, msg.text());
      }
    });

    // Mock login endpoint
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
          access_token: 'test.access.token',
          refresh_token: 'test.refresh.token',
          user: { id: '1', email: TEST_USER.email, role: 'user' },
        }),
      });
    });

    // Mock user profile endpoint
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
          id: '1',
          email: TEST_USER.email,
          name: 'Test User',
          onboarding_completed: true,
          first_name: 'Test',
          last_name: 'User',
        }),
      });
    });

    // Mock onboarding status endpoint
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

    // Mock assessments endpoint
    await page.route('**/users/me/assessments*', async route => {
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

    // Mock analytics summary endpoint
    await page.route('**/analytics/summary', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          totalAssessments: 0,
          averageRiskScore: 0,
          recentAssessments: [],
        }),
      });
    });
  });

  test('7.1: Dashboard loads without JS errors', async ({ page }) => {
    await page.goto('/');

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);

    await page.waitForURL('/', { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');

    await page.waitForTimeout(1000);

    const errors = await page.evaluate(() => window.consoleErrors || []);

    expect(errors).toEqual([]);

    await expect(page.locator('text=Welcome to DIANA').first()).toBeVisible({ timeout: 5000 });
  });

  test('7.2: Empty state when no assessments', async ({ page }) => {
    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await page.waitForURL('/', { timeout: 10000 });

    await page.waitForTimeout(1000);

    await expect(page.locator('text=Log Your First Assessment').first()).toBeVisible({ timeout: 5000 });
  });

  test('7.3: Risk score card displays', async ({ page }) => {
    await page.route('**/users/me/assessments*', async route => {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: '1',
          bmi: 25.0,
          ldl: 130,
          hdl: 50,
          triglycerides: 150,
          risk_score: 0.35,
          risk_level: 'Low',
          created_at: '2026-01-23T10:00:00Z',
        }]),
      });
    });

    await page.route('**/analytics/summary', async route => {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          totalAssessments: 1,
          averageRiskScore: 0.35,
          recentAssessments: [{
            id: '1',
            risk_score: 0.35,
            risk_level: 'Low',
            created_at: '2026-01-23T10:00:00Z',
          }],
        }),
      });
    });

    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await page.waitForURL('/', { timeout: 10000 });

    await page.waitForTimeout(1000);

    await expect(page.locator('text=Risk Level').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=LOW').first()).toBeVisible({ timeout: 5000 });
  });

  test('7.4: Assessment summary card visible', async ({ page }) => {
    await page.route('**/users/me/assessments*', async route => {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            bmi: 25.0,
            ldl: 130,
            hdl: 50,
            risk_score: 0.35,
            risk_level: 'Low',
            created_at: '2026-01-23T10:00:00Z',
          },
          {
            id: '2',
            bmi: 27.5,
            ldl: 140,
            hdl: 45,
            risk_score: 0.55,
            risk_level: 'Medium',
            created_at: '2026-01-22T10:00:00Z',
          },
        ]),
      });
    });

    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await page.waitForURL('/', { timeout: 10000 });

    await page.waitForTimeout(1000);

    await expect(page.locator('text=Assessments').first()).toBeVisible({ timeout: 5000 });
  });

  test('7.5: Charts render with no errors', async ({ page }) => {
    // Setup error tracking
    // Mock analytics data for charts
    await page.route('**/analytics/summary', async route => {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          totalAssessments: 2,
          averageRiskScore: 0.45,
          recentAssessments: [
            {
              id: '1',
              risk_score: 0.35,
              risk_level: 'Low',
              created_at: '2026-01-23T10:00:00Z',
            },
            {
              id: '2',
              risk_score: 0.55,
              risk_level: 'Medium',
              created_at: '2026-01-22T10:00:00Z',
            },
          ],
        }),
      });
    });

    // Login
    await page.goto('/');
    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await page.waitForURL('/', { timeout: 10000 });

    // Wait for charts to render
    await page.waitForTimeout(2000);

    // Check for SVG elements (charts)
    await expect(page.locator('svg').first()).toBeVisible({ timeout: 5000 });

    // Assert no console errors during chart render
    const finalErrors = await page.evaluate(() => window.consoleErrors || []);
    expect(finalErrors).toEqual([]);
  });

  test('7.6: Backend-provided risk level wins at boundary scores', async ({ page }) => {
    await page.route('**/users/me/assessments*', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([
          mockAssessment({
            id: '1',
            risk_score: 30,
            risk_level: 'medium',
            cluster: null,
          }),
          mockAssessment({
            id: '2',
            risk_score: 69,
            risk_level: 'medium',
            cluster: null,
            created_at: '2026-01-22T10:00:00Z',
          }),
          mockAssessment({
            id: '3',
            risk_score: 70,
            risk_level: 'high',
            cluster: null,
            created_at: '2026-01-21T10:00:00Z',
          }),
        ]),
      });
    });

    await loginToDashboard(page);

    const rows = page.locator('table tbody tr');
    await expect(rows.nth(0)).toContainText(/medium/i);
    await expect(rows.nth(1)).toContainText(/medium/i);
    await expect(rows.nth(2)).toContainText(/high/i);

    await rows.nth(0).click();
    await expect(page.locator('text=AI-Assisted Results')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Time for a Check-in')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Looking Good')).toHaveCount(0);
    await page.locator('button[aria-label="Close results"]').click();

    await rows.nth(1).click();
    await expect(page.locator('text=Time for a Check-in')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Looking Good')).toHaveCount(0);
    await page.locator('button[aria-label="Close results"]').click();

    await rows.nth(2).click();
    await expect(page.locator('text=Action Recommended')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Time for a Check-in')).toHaveCount(0);
  });

  test('7.7: Unknown cluster output stays neutral even when subtype capability is declared', async ({ page }) => {
    await page.route('**/users/me/assessments*', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([
          mockAssessment({
            risk_score: 62,
            risk_level: 'medium',
            cluster: 'Cluster_A',
            cluster_description: 'Should not be shown for non-canonical clusters',
            treatment_focus: 'Should not be shown for non-canonical clusters',
            output_capabilities: {
              predicted_status: true,
              at_risk_probability: true,
              metabolic_subtype: true,
              cluster_description: true,
              treatment_focus: true,
            },
            cluster_capability: {
              supported: true,
            },
          }),
        ]),
      });
    });

    await loginToDashboard(page);

    const latestResultRow = page.locator('table tbody tr').first();
    await expect(latestResultRow).toContainText('N/A');

    await openLatestAssessmentModal(page);

    await expect(page.locator('text=Subtype information unavailable')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=This assessment result does not include subtype/cluster output.')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Cluster:')).toHaveCount(0);
    await expect(page.locator('text=Focus on:')).toHaveCount(0);
  });

  test('7.8: Clustering-unsupported result does not render subtype claims', async ({ page }) => {
    await page.route('**/users/me/assessments*', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([
          mockAssessment({
            cluster: 'SIRD',
            cluster_description: 'Should not be shown when unsupported',
            treatment_focus: 'Should not be shown when unsupported',
          }),
        ]),
      });
    });

    await loginToDashboard(page);
    await openLatestAssessmentModal(page);

    await expect(page.locator('text=Subtype information unavailable')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Cluster: SIRD')).toHaveCount(0);
    await expect(page.locator('text=Focus on:')).toHaveCount(0);
  });

  test('7.9: Clustering-supported result renders subtype claims', async ({ page }) => {
    await page.route('**/users/me/assessments*', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: '1',
          bmi: 30.0,
          ldl: 155,
          hdl: 40,
          triglycerides: 200,
          risk_score: 78,
          risk_level: 'high',
          predicted_status: 'At-Risk',
          at_risk_probability: 0.78,
          cluster: 'SIRD',
          cluster_description: 'Insulin resistance cluster',
          treatment_focus: 'Weight and insulin sensitivity',
          output_capabilities: {
            predicted_status: true,
            at_risk_probability: true,
            metabolic_subtype: true,
            cluster_description: true,
            treatment_focus: true,
          },
          cluster_capability: {
            supported: true,
          },
          model_version: 'binary_v2_no_bp',
          created_at: '2026-01-23T10:00:00Z',
        }]),
      });
    });

    await loginToDashboard(page);
    await openLatestAssessmentModal(page);

    await expect(page.locator('text=Cluster: SIRD')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Focus on: Weight and insulin sensitivity')).toBeVisible({ timeout: 5000 });
  });

  test('7.10: Assessment form blocks out-of-range age before submit', async ({ page }) => {
    let assessmentPostCount = 0;

    await page.route('**/users/me/assessments*', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      if (request.method() === 'POST') {
        assessmentPostCount += 1;
        return route.fulfill({
          status: 201,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify(mockAssessment()),
        });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await loginToDashboard(page);
    await openAssessmentForm(page);
    await fillRequiredAssessmentFields(page, { age: '61' });

    await page.locator('button:has-text("Submit for Analysis")').click();

    const ageValidity = await page.locator('input[name="age"]').evaluate((input) => ({
      valid: input.checkValidity(),
      rangeOverflow: input.validity.rangeOverflow,
      validationMessage: input.validationMessage,
      min: input.min,
      max: input.max,
    }));

    expect(ageValidity).toMatchObject({
      valid: false,
      rangeOverflow: true,
      min: '45',
      max: '60',
    });
    expect(ageValidity.validationMessage.length).toBeGreaterThan(0);
    expect(assessmentPostCount).toBe(0);
  });

  test('7.11: Assessment form allows supported lower age boundary', async ({ page }) => {
    let assessmentPostCount = 0;
    let capturedAssessmentBody = null;

    await page.route('**/users/me/assessments*', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      if (request.method() === 'POST') {
        assessmentPostCount += 1;
        capturedAssessmentBody = await request.postDataJSON();
        return route.fulfill({
          status: 201,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify(mockAssessment({
            age: 45,
            risk_score: 25,
            risk_level: 'low',
          })),
        });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await loginToDashboard(page);
    await openAssessmentForm(page);
    await fillRequiredAssessmentFields(page, { age: '45' });

    await page.locator('button:has-text("Submit for Analysis")').click();

    await expect.poll(() => assessmentPostCount).toBe(1);
    expect(capturedAssessmentBody).toMatchObject({
      age: 45,
      bmi: 28,
      triglycerides: 180,
      ldl: 120,
      hdl: 48,
    });
    await expect(page.locator('text=AI-Assisted Results')).toBeVisible({ timeout: 5000 });
  });

  test('7.12: Assessment create array response is normalized for modal rendering', async ({ page }) => {
    let assessmentPostCount = 0;

    await page.route('**/users/me/assessments*', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      if (request.method() === 'POST') {
        assessmentPostCount += 1;
        return route.fulfill({
          status: 200,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify([
            mockAssessment({
              risk_score: 78,
              risk_level: 'high',
              cluster: 'SIRD',
              cluster_description: 'Insulin resistance cluster',
              treatment_focus: 'Weight and insulin sensitivity',
              output_capabilities: {
                predicted_status: true,
                at_risk_probability: true,
                metabolic_subtype: true,
                cluster_description: true,
                treatment_focus: true,
              },
              cluster_capability: {
                supported: true,
              },
            }),
          ]),
        });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await loginToDashboard(page);
    await openAssessmentForm(page);
    await fillRequiredAssessmentFields(page, { age: '55' });

    await page.locator('button:has-text("Submit for Analysis")').click();

    await expect.poll(() => assessmentPostCount).toBe(1);
    await expect(page.locator('text=AI-Assisted Results')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Action Recommended')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Cluster: SIRD')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('span.text-\\[80px\\]').first()).toHaveText('78');
  });
});
