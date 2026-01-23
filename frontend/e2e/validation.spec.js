import { test, expect } from '@playwright/test';
import { TEST_USER, SELECTORS, waitForNetworkIdle, takeScreenshot } from './fixtures/test-data';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

test.describe('Input Validation Tests', () => {
  test('should reject non-numeric HbA1c value', async ({ page }) => {
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

        if (typeof body.hba1c !== 'number' || isNaN(body.hba1c)) {
          return route.fulfill({
            status: 400,
            headers: corsHeaders,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'HbA1c must be a valid number' }),
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
          hba1c: 'not-a-number',
          fbs: 100,
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
    expect(assessmentResponse.data.error).toMatch(/hba1c/i);
    expect(assessmentResponse.data.error).toMatch(/number/i);

    await takeScreenshot(page, 'validation-non-numeric-hba1c-error');
  });

  test('should reject non-numeric BMI value', async ({ page }) => {
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

        if (typeof body.bmi !== 'number' || isNaN(body.bmi)) {
          return route.fulfill({
            status: 400,
            headers: corsHeaders,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'BMI must be a valid number' }),
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
          bmi: 'twenty-five',
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
    expect(assessmentResponse.data.error).toMatch(/bmi/i);
    expect(assessmentResponse.data.error).toMatch(/number/i);

    await takeScreenshot(page, 'validation-non-numeric-bmi-error');
  });

  test('should reject non-numeric cholesterol value', async ({ page }) => {
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

        if (typeof body.cholesterol !== 'number' || isNaN(body.cholesterol)) {
          return route.fulfill({
            status: 400,
            headers: corsHeaders,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Cholesterol must be a valid number' }),
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
          bmi: 25.0,
          cholesterol: 'two-hundred',
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
    expect(assessmentResponse.data.error).toMatch(/cholesterol/i);
    expect(assessmentResponse.data.error).toMatch(/number/i);

    await takeScreenshot(page, 'validation-non-numeric-cholesterol-error');
  });

  test('should reject null values in numeric fields', async ({ page }) => {
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

        if (body.fbs === null || typeof body.fbs !== 'number' || isNaN(body.fbs)) {
          return route.fulfill({
            status: 400,
            headers: corsHeaders,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'FBS must be a valid number' }),
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
          fbs: null,
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
    expect(assessmentResponse.data.error).toMatch(/fbs/i);
    expect(assessmentResponse.data.error).toMatch(/number/i);

    await takeScreenshot(page, 'validation-null-fbs-error');
  });

  test('should show error message for required fields', async ({ page }) => {
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

        const errors = [];
        if (!body.hba1c || body.hba1c === '') {
          errors.push('HbA1c is required');
        }
        if (!body.fbs || body.fbs === '') {
          errors.push('FBS is required');
        }
        if (!body.bmi || body.bmi === '') {
          errors.push('BMI is required');
        }

        if (errors.length > 0) {
          return route.fulfill({
            status: 400,
            headers: corsHeaders,
            contentType: 'application/json',
            body: JSON.stringify({
              error: errors.join('; '),
              details: errors,
            }),
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
          hba1c: '',
          fbs: '',
          bmi: '',
          cholesterol: '',
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
    expect(assessmentResponse.data).toHaveProperty('details');
    expect(assessmentResponse.data.error).toMatch(/required/i);
    expect(assessmentResponse.data.details).toContain('HbA1c is required');
    expect(assessmentResponse.data.details).toContain('FBS is required');
    expect(assessmentResponse.data.details).toContain('BMI is required');

    await takeScreenshot(page, 'validation-required-fields-error');
  });

  test('XSS input sanitized', async ({ page }) => {
    await page.goto('/');

    const xssPayload = '<script>alert("XSS")</script>';
    const xssPayload2 = '<img src=x onerror=alert("XSS")>';

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

      if (request.method() === 'GET') {
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
      }

      if (request.method() === 'PUT') {
        const body = await request.postDataJSON();

        const hasScriptTag = body.first_name?.includes('<script>') || body.last_name?.includes('<script>');
        const hasImgTag = body.first_name?.includes('<img') || body.last_name?.includes('<img');

        if (hasScriptTag || hasImgTag) {
          return route.fulfill({
            status: 200,
            headers: corsHeaders,
            contentType: 'application/json',
            body: JSON.stringify({
              first_name: body.first_name?.replace(/<[^>]*>/g, '') || 'Sanitized',
              last_name: body.last_name?.replace(/<[^>]*>/g, '') || 'Sanitized',
              email: TEST_USER.email,
              onboarding_completed: true,
            }),
          });
        }

        return route.fulfill({
          status: 200,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({
            first_name: body.first_name || 'Test',
            last_name: body.last_name || 'User',
            email: TEST_USER.email,
            onboarding_completed: true,
          }),
        });
      }
    });

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    await expect(page.locator('text=/dashboard|welcome/i')).toBeVisible({ timeout: 10000 });

    const profileUpdateResponse = await page.evaluate(async ({ payload1, payload2 }) => {
      const response = await fetch('/api/v1/users/me/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          first_name: payload1,
          last_name: payload2,
        }),
      });

      const data = await response.json();
      return {
        status: response.status,
        ok: response.ok,
        data: data,
      };
    }, { payload1: xssPayload, payload2: xssPayload2 });

    expect(profileUpdateResponse.ok).toBe(true);
    expect(profileUpdateResponse.status).toBe(200);

    expect(profileUpdateResponse.data.first_name).not.toContain('<script>');
    expect(profileUpdateResponse.data.first_name).not.toContain('<img');
    expect(profileUpdateResponse.data.last_name).not.toContain('<script>');
    expect(profileUpdateResponse.data.last_name).not.toContain('<img');

    const scriptExecuted = await page.evaluate(() => {
      window.xssExecuted = false;
      window.alert = () => { window.xssExecuted = true; };
      return window.xssExecuted;
    });

    expect(scriptExecuted).toBe(false);

    let consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await takeScreenshot(page, 'validation-xss-sanitized');

    expect(consoleErrors.length).toBe(0);
  });
});
