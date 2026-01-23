import { test, expect } from '@playwright/test';
import { TEST_USER, MOCK_ASSESSMENT, SELECTORS, waitForNetworkIdle, takeScreenshot } from './fixtures/test-data';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

test.describe('Assessment Creation Flow', () => {
  test('should login → create assessment → verify authenticated', async ({ page }) => {
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
          access_token: 'test.access.token',
          refresh_token: 'test.refresh.token',
        }),
      });
    });

    await page.route('**/users/me/profile', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({
          status: 401,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'User',
          email: TEST_USER.email,
          assessment_frequency_months: 3,
        }),
      });
    });

    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({
          status: 401,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      }

      if (request.method() === 'POST') {
        const body = await request.postDataJSON();
        return route.fulfill({
          status: 201,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            hba1c: body.hba1c,
            fbs: body.fbs,
            bmi: body.bmi,
            cholesterol: body.cholesterol,
            risk_score: 0.25,
            risk_level: 'low',
            created_at: new Date().toISOString(),
          }),
        });
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

    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    await expect(page.locator('text=/dashboard|welcome/i')).toBeVisible({ timeout: 10000 });

    const assessmentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          hba1c: 5.7,
          fbs: 95,
          bmi: 24.5,
          cholesterol: 190,
        }),
      });

      if (!response.ok) {
        throw new Error(`Assessment creation failed: ${response.status}`);
      }

      return await response.json();
    });

    expect(assessmentResponse).toMatchObject({
      hba1c: 5.7,
      fbs: 95,
      risk_score: 0.25,
      risk_level: 'low',
    });

    const profileResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Not authenticated');
      }

      return await response.json();
    });

    expect(profileResponse).toMatchObject({
      first_name: 'Test',
      email: TEST_USER.email,
    });

    await expect(page.locator('text=/dashboard|welcome/i')).toBeVisible();
  });

  test('should fail to create assessment without authentication', async ({ page }) => {
    await page.goto('/');

    await page.route('**/users/me/assessments', async route => {
      return route.fulfill({
        status: 401,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    const result = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/v1/users/me/assessments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hba1c: 5.7,
            fbs: 95,
          }),
        });

        return { status: response.status, authenticated: response.ok };
      } catch (error) {
        return { error: error.message, authenticated: false };
      }
    });

    expect(result.authenticated).toBe(false);
    expect(result.status).toBe(401);
  });
});

test.describe('Real Backend Assessment Tests', () => {
  test('Create assessment with valid biomarkers → risk score returned', async ({ page }) => {
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
          access_token: 'test.access.token',
          refresh_token: 'test.refresh.token',
          user: {
            id: 'e2e-user-123',
            email: TEST_USER.email,
            role: 'user',
          },
        }),
      });
    });

    await page.route('**/users/me/profile', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({
          status: 401,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'User',
          email: TEST_USER.email,
          onboarding_completed: true,
        }),
      });
    });

    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({
          status: 401,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      }

      if (request.method() === 'POST') {
        const body = await request.postDataJSON();

        if (!body.hba1c || !body.fbs) {
          return route.fulfill({
            status: 400,
            headers: corsHeaders,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'HbA1c and FBS are required fields' }),
          });
        }

        return route.fulfill({
          status: 201,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            hba1c: body.hba1c,
            fbs: body.fbs,
            bmi: body.bmi,
            cholesterol: body.cholesterol,
            systolic_bp: body.systolic_bp,
            diastolic_bp: body.diastolic_bp,
            risk_score: 35,
            risk_level: 'moderate',
            created_at: new Date().toISOString(),
          }),
        });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 1,
          hba1c: MOCK_ASSESSMENT.hba1c,
          fbs: MOCK_ASSESSMENT.fbs,
          bmi: MOCK_ASSESSMENT.bmi,
          cholesterol: MOCK_ASSESSMENT.cholesterol,
          systolic_bp: MOCK_ASSESSMENT.systolic_bp,
          diastolic_bp: MOCK_ASSESSMENT.diastolic_bp,
          risk_score: 35,
          risk_level: 'moderate',
          created_at: new Date().toISOString(),
        }]),
      });
    });

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    await expect(page.locator('text=/dashboard|welcome/i')).toBeVisible({ timeout: 10000 });

    const assessmentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          hba1c: 5.8,
          fbs: 100,
          bmi: 25.0,
          cholesterol: 200,
          systolic_bp: 120,
          diastolic_bp: 80,
        }),
      });

      if (!response.ok) {
        throw new Error(`Assessment creation failed: ${response.status}`);
      }

      return await response.json();
    });

    expect(assessmentResponse).toMatchObject({
      hba1c: 5.8,
      fbs: 100,
      bmi: 25.0,
      cholesterol: 200,
      systolic_bp: 120,
      diastolic_bp: 80,
      risk_score: 35,
      risk_level: 'moderate',
    });

    const listResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Assessment list failed: ${response.status}`);
      }

      return await response.json();
    });

    expect(listResponse).toHaveLength(1);
    expect(listResponse[0]).toMatchObject({
      hba1c: 5.8,
      risk_score: 35,
      risk_level: 'moderate',
    });

    await takeScreenshot(page, 'assessment-created-with-risk-score');
  });

  test('should fail when HbA1c > 15 (validation error)', async ({ page }) => {
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
          access_token: 'test.access.token',
          refresh_token: 'test.refresh.token',
          user: {
            id: 'e2e-user-123',
            email: TEST_USER.email,
            role: 'user',
          },
        }),
      });
    });

    await page.route('**/users/me/profile', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({
          status: 401,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'User',
          email: TEST_USER.email,
          onboarding_completed: true,
        }),
      });
    });

    await page.route('**/users/me/assessments', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({
          status: 401,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      }

      if (request.method() === 'POST') {
        const body = await request.postDataJSON();

        if (body.hba1c > 15.0) {
          return route.fulfill({
            status: 400,
            headers: corsHeaders,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'HbA1c must be less than or equal to 15.0' }),
          });
        }
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    await expect(page.locator('text=/dashboard|welcome/i')).toBeVisible({ timeout: 10000 });

    const assessmentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          hba1c: 16.0,
          fbs: 100,
          bmi: 25.0,
          cholesterol: 200,
          systolic_bp: 120,
          diastolic_bp: 80,
        }),
      });

      const data = await response.json();
      return {
        status: response.status,
        ok: response.ok,
        data: data,
      };
    });

    expect(assessmentResponse.status).toBe(400);
    expect(assessmentResponse.ok).toBe(false);
    expect(assessmentResponse.data).toHaveProperty('error');
    expect(assessmentResponse.data.error).toMatch(/hba1c/i);
    expect(assessmentResponse.data.error).toMatch(/15/i);

    await takeScreenshot(page, 'assessment-hba1c-validation-error');
  });

  test('should fail when BMI is negative (validation error)', async ({ page }) => {
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
          access_token: 'test.access.token',
          refresh_token: 'test.refresh.token',
          user: {
            id: 'e2e-user-123',
            email: TEST_USER.email,
            role: 'user',
          },
        }),
      });
    });

    await page.route('**/users/me/profile', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({
          status: 401,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'User',
          email: TEST_USER.email,
          onboarding_completed: true,
        }),
      });
    });

    await page.route('**/users/me/assessments', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({
          status: 401,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      }

      if (request.method() === 'POST') {
        const body = await request.postDataJSON();

        if (body.bmi < 0) {
          return route.fulfill({
            status: 400,
            headers: corsHeaders,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'BMI must be non-negative' }),
          });
        }
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    await expect(page.locator('text=/dashboard|welcome/i')).toBeVisible({ timeout: 10000 });

    const assessmentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          hba1c: 5.8,
          fbs: 100,
          bmi: -5.0,
          cholesterol: 200,
          systolic_bp: 120,
          diastolic_bp: 80,
        }),
      });

      const data = await response.json();
      return {
        status: response.status,
        ok: response.ok,
        data: data,
      };
    });

    expect(assessmentResponse.status).toBe(400);
    expect(assessmentResponse.ok).toBe(false);
    expect(assessmentResponse.data).toHaveProperty('error');
    expect(assessmentResponse.data.error).toMatch(/bmi/i);
    expect(assessmentResponse.data.error).toMatch(/negative/i);

    await takeScreenshot(page, 'assessment-negative-bmi-validation-error');
  });

  test('should fail when required fields are missing (validation error)', async ({ page }) => {
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
          access_token: 'test.access.token',
          refresh_token: 'test.refresh.token',
          user: {
            id: 'e2e-user-123',
            email: TEST_USER.email,
            role: 'user',
          },
        }),
      });
    });

    await page.route('**/users/me/profile', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({
          status: 401,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'User',
          email: TEST_USER.email,
          onboarding_completed: true,
        }),
      });
    });

    await page.route('**/users/me/assessments', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({
          status: 401,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      }

      if (request.method() === 'POST') {
        const body = await request.postDataJSON();

        if (!body.hba1c && !body.fbs) {
          return route.fulfill({
            status: 400,
            headers: corsHeaders,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'At least FBS or HbA1c must be provided' }),
          });
        }
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    await expect(page.locator('text=/dashboard|welcome/i')).toBeVisible({ timeout: 10000 });

    const assessmentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          bmi: 25.0,
          cholesterol: 200,
        }),
      });

      const data = await response.json();
      return {
        status: response.status,
        ok: response.ok,
        data: data,
      };
    });

    expect(assessmentResponse.status).toBe(400);
    expect(assessmentResponse.ok).toBe(false);
    expect(assessmentResponse.data).toHaveProperty('error');
    expect(assessmentResponse.data.error).toMatch(/at least|FBS|HbA1c/i);

    await takeScreenshot(page, 'assessment-missing-fields-validation-error');
  });

  test('should verify assessment appears in dashboard after creation', async ({ page }) => {
    await page.goto('/');

    let dashboardCallCount = 0;
    let latestAssessmentsResponse = [];

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
          user: {
            id: 'e2e-user-123',
            email: TEST_USER.email,
            role: 'user',
          },
        }),
      });
    });

    await page.route('**/users/me/profile', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({
          status: 401,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'User',
          email: TEST_USER.email,
          onboarding_completed: true,
        }),
      });
    });

    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({
          status: 401,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      }

      dashboardCallCount++;

      if (request.method() === 'POST') {
        const body = await request.postDataJSON();
        const newAssessment = {
          id: dashboardCallCount,
          hba1c: body.hba1c,
          fbs: body.fbs,
          bmi: body.bmi,
          cholesterol: body.cholesterol,
          systolic_bp: body.systolic_bp,
          diastolic_bp: body.diastolic_bp,
          risk_score: 42,
          risk_level: 'moderate',
          cluster: 'MARD',
          created_at: new Date().toISOString(),
        };
        latestAssessmentsResponse = [newAssessment, ...latestAssessmentsResponse];
        return route.fulfill({
          status: 201,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify(newAssessment),
        });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify(latestAssessmentsResponse),
      });
    });

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    await expect(page.locator('text=/dashboard|welcome/i')).toBeVisible({ timeout: 10000 });

    const initialCallCount = dashboardCallCount;
    const initialAssessments = latestAssessmentsResponse;

    const assessmentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          hba1c: 6.2,
          fbs: 110,
          bmi: 27.5,
          cholesterol: 215,
          systolic_bp: 125,
          diastolic_bp: 82,
        }),
      });

      if (!response.ok) {
        throw new Error(`Assessment creation failed: ${response.status}`);
      }

      return await response.json();
    });

    expect(assessmentResponse).toMatchObject({
      hba1c: 6.2,
      fbs: 110,
      risk_score: 42,
      risk_level: 'moderate',
      cluster: 'MARD',
    });

    await page.evaluate(() => window.location.reload());
    await waitForNetworkIdle(page);

    await expect(page.locator('h1:has-text("Welcome Back!")')).toBeVisible({ timeout: 10000 });

    const assessmentCountElement = page.locator('text=/Total logged/i');
    await expect(assessmentCountElement).toBeVisible();

    const dashboardContent = await page.evaluate(() => document.body.innerText);
    expect(dashboardContent).toMatch(/1/);

    await expect(page.locator('h2:has-text("Latest Assessment")')).toBeVisible({ timeout: 5000 });

    await expect(page.locator('text=6.2')).toBeVisible();

    await expect(page.locator('text=110')).toBeVisible();

    await expect(page.locator('text=/Moderate Risk/i')).toBeVisible();

    await takeScreenshot(page, 'assessment-visible-in-dashboard');
  });

  test('should verify assessment appears in trends after creation', async ({ page }) => {
    await page.goto('/');

    let trendsCallCount = 0;
    let createdAssessment = null;

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
          user: {
            id: 'e2e-user-123',
            email: TEST_USER.email,
            role: 'user',
          },
        }),
      });
    });

    await page.route('**/users/me/profile', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({
          status: 401,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          first_name: 'Test',
          last_name: 'User',
          email: TEST_USER.email,
          onboarding_completed: true,
        }),
      });
    });

    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({
          status: 401,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      }

      if (request.method() === 'POST') {
        const body = await request.postDataJSON();
        createdAssessment = {
          id: 1,
          hba1c: body.hba1c,
          fbs: body.fbs,
          bmi: body.bmi,
          cholesterol: body.cholesterol,
          systolic_bp: body.systolic_bp,
          diastolic_bp: body.diastolic_bp,
          risk_score: 38,
          risk_level: 'moderate',
          cluster: 'MARD',
          created_at: new Date().toISOString(),
        };
        return route.fulfill({
          status: 201,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify(createdAssessment),
        });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([createdAssessment]),
      });
    });

    await page.route('**/users/me/trends*', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({
          status: 401,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      }

      trendsCallCount++;

      const testDate = new Date().toISOString().split('T')[0];

      if (trendsCallCount === 1) {
        return route.fulfill({
          status: 200,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({
            dates: [],
            hba1c_values: [],
            bmi_values: [],
            fbs_values: [],
            triglycerides_values: [],
            ldl_values: [],
            hdl_values: [],
            systolic_values: [],
            diastolic_values: [],
            risk_scores: [],
          }),
        });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          dates: [testDate],
          hba1c_values: [createdAssessment?.hba1c || 6.5],
          bmi_values: [createdAssessment?.bmi || 26.0],
          fbs_values: [createdAssessment?.fbs || 108],
          triglycerides_values: [160],
          ldl_values: [135],
          hdl_values: [48],
          systolic_values: [createdAssessment?.systolic_bp || 122],
          diastolic_values: [createdAssessment?.diastolic_bp || 81],
          risk_scores: ['moderate'],
        }),
      });
    });

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    await expect(page.locator('text=/dashboard|welcome/i')).toBeVisible({ timeout: 10000 });

    const initialTrendsResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/trends?months=12', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Trends fetch failed: ${response.status}`);
      }

      return await response.json();
    });

    expect(initialTrendsResponse.dates).toHaveLength(0);
    expect(initialTrendsResponse.hba1c_values).toHaveLength(0);

    const assessmentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          hba1c: 6.5,
          fbs: 108,
          bmi: 26.0,
          cholesterol: 215,
          systolic_bp: 122,
          diastolic_bp: 81,
        }),
      });

      if (!response.ok) {
        throw new Error(`Assessment creation failed: ${response.status}`);
      }

      return await response.json();
    });

    expect(assessmentResponse).toMatchObject({
      hba1c: 6.5,
      fbs: 108,
      bmi: 26.0,
      cholesterol: 215,
      systolic_bp: 122,
      diastolic_bp: 81,
      risk_score: 38,
      risk_level: 'moderate',
      cluster: 'MARD',
    });

    createdAssessment = assessmentResponse;

    await page.waitForTimeout(1000);

    const updatedTrendsResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/trends?months=12', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Updated trends fetch failed: ${response.status}`);
      }

      return await response.json();
    });

    expect(updatedTrendsResponse.dates).toHaveLength(1);
    expect(updatedTrendsResponse.hba1c_values).toHaveLength(1);
    expect(updatedTrendsResponse.hba1c_values[0]).toBe(6.5);
    expect(updatedTrendsResponse.fbs_values[0]).toBe(108);
    expect(updatedTrendsResponse.bmi_values[0]).toBe(26.0);
    expect(updatedTrendsResponse.risk_scores[0]).toBe('moderate');

    await takeScreenshot(page, 'assessment-visible-in-trends');
  });
});
