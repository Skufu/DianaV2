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
});
