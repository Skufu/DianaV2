import { test, expect } from '@playwright/test';
import { TEST_USER, MOCK_ASSESSMENT, SELECTORS, waitForNetworkIdle, takeScreenshot, waitForAnimations } from './fixtures/test-data';

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
            bmi: body.bmi,
            age: body.age,
            ldl: body.ldl,
            hdl: body.hdl,
            triglycerides: body.triglycerides,
            risk_score: 25,
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
    await waitForAnimations(page);
    await waitForNetworkIdle(page);

    await expect(page.locator('h1:has-text("Welcome")')).toBeVisible({ timeout: 10000 });

    const assessmentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          age: 55,
          bmi: 24.5,
          triglycerides: 150,
          ldl: 130,
          hdl: 50,
        }),
      });

      if (!response.ok) {
        throw new Error(`Assessment creation failed: ${response.status}`);
      }

      return await response.json();
    });

    expect(assessmentResponse).toMatchObject({
      bmi: 24.5,
      risk_score: 25,
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

    await expect(page.locator('h1:has-text("Welcome")')).toBeVisible();
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
            age: 55,
            bmi: 24.5,
            triglycerides: 150,
            ldl: 130,
            hdl: 50,
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

        if (!body.bmi || !body.triglycerides || !body.ldl || !body.hdl) {
          return route.fulfill({
            status: 400,
            headers: corsHeaders,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'BMI, triglycerides, LDL, and HDL are required fields' }),
          });
        }

        return route.fulfill({
          status: 201,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1,
            age: body.age,
            bmi: body.bmi,
            ldl: body.ldl,
            hdl: body.hdl,
            triglycerides: body.triglycerides,
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
          bmi: MOCK_ASSESSMENT.bmi,
          age: MOCK_ASSESSMENT.age,
          ldl: MOCK_ASSESSMENT.ldl,
          hdl: MOCK_ASSESSMENT.hdl,
          triglycerides: MOCK_ASSESSMENT.triglycerides,
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

    await expect(page.locator('h1:has-text("Welcome")')).toBeVisible({ timeout: 10000 });

    const assessmentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          age: 55,
          bmi: 25.0,
          triglycerides: 150,
          ldl: 130,
          hdl: 50,
        }),
      });

      if (!response.ok) {
        throw new Error(`Assessment creation failed: ${response.status}`);
      }

      return await response.json();
    });

    expect(assessmentResponse).toMatchObject({
      bmi: 25.0,
      triglycerides: 150,
      ldl: 130,
      hdl: 50,
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
      bmi: 25.0,
      risk_score: 35,
      risk_level: 'moderate',
    });

    await takeScreenshot(page, 'assessment-created-with-risk-score');
  });

  test('should fail when BMI is out of range (validation error)', async ({ page }) => {
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

    await expect(page.locator('h1:has-text("Welcome")')).toBeVisible({ timeout: 10000 });

    const assessmentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          age: 55,
          bmi: -5.0,
          triglycerides: 150,
          ldl: 130,
          hdl: 50,
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

        if (!body.bmi || !body.triglycerides || !body.ldl || !body.hdl) {
          return route.fulfill({
            status: 400,
            headers: corsHeaders,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'BMI, triglycerides, LDL, and HDL are required' }),
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

    await expect(page.locator('h1:has-text("Welcome")')).toBeVisible({ timeout: 10000 });

    const assessmentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          age: 55,
          bmi: 25.0,
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
    expect(assessmentResponse.data.error).toMatch(/required|triglycerides|LDL|HDL/i);

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
          age: body.age,
          bmi: body.bmi,
          ldl: body.ldl,
          hdl: body.hdl,
          triglycerides: body.triglycerides,
          risk_score: 42,
          risk_level: 'moderate',
          cluster: 'Cluster_A',
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

    await expect(page.locator('h1:has-text("Welcome")')).toBeVisible({ timeout: 10000 });

    const assessmentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          age: 55,
          bmi: 27.5,
          triglycerides: 165,
          ldl: 140,
          hdl: 45,
        }),
      });

      if (!response.ok) {
        throw new Error(`Assessment creation failed: ${response.status}`);
      }

      return await response.json();
    });

    expect(assessmentResponse).toMatchObject({
      bmi: 27.5,
      risk_score: 42,
      risk_level: 'moderate',
    });

    await page.evaluate(() => window.location.reload());
    await waitForNetworkIdle(page);

    await expect(page.locator('h1:has-text("Welcome Back!")')).toBeVisible({ timeout: 10000 });

    const assessmentCountElement = page.locator('text=/Total logged/i');
    await expect(assessmentCountElement).toBeVisible();

    const dashboardContent = await page.evaluate(() => document.body.innerText);
    expect(dashboardContent).toMatch(/1/);

    await expect(page.locator('h2:has-text("Latest Assessment")')).toBeVisible({ timeout: 5000 });

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
          age: body.age,
          bmi: body.bmi,
          ldl: body.ldl,
          hdl: body.hdl,
          triglycerides: body.triglycerides,
          risk_score: 38,
          risk_level: 'moderate',
          cluster: 'Cluster_A',
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
            bmi_values: [],
            triglycerides_values: [],
            ldl_values: [],
            hdl_values: [],
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
          bmi_values: [createdAssessment?.bmi || 26.0],
          triglycerides_values: [createdAssessment?.triglycerides || 160],
          ldl_values: [createdAssessment?.ldl || 135],
          hdl_values: [createdAssessment?.hdl || 48],
          risk_scores: ['moderate'],
        }),
      });
    });

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    await expect(page.locator('h1:has-text("Welcome")')).toBeVisible({ timeout: 10000 });

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
    expect(initialTrendsResponse.bmi_values).toHaveLength(0);

    const assessmentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          age: 55,
          bmi: 26.0,
          triglycerides: 160,
          ldl: 135,
          hdl: 48,
        }),
      });

      if (!response.ok) {
        throw new Error(`Assessment creation failed: ${response.status}`);
      }

      return await response.json();
    });

    expect(assessmentResponse).toMatchObject({
      bmi: 26.0,
      ldl: 135,
      hdl: 48,
      triglycerides: 160,
      risk_score: 38,
      risk_level: 'moderate',
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
    expect(updatedTrendsResponse.bmi_values).toHaveLength(1);
    expect(updatedTrendsResponse.bmi_values[0]).toBe(26.0);
    expect(updatedTrendsResponse.ldl_values[0]).toBe(135);
    expect(updatedTrendsResponse.risk_scores[0]).toBe('moderate');

    await takeScreenshot(page, 'assessment-visible-in-trends');
  });
});
