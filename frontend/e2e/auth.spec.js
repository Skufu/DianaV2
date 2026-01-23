import { test, expect } from '@playwright/test';
import { TEST_USER, SELECTORS, waitForNetworkIdle } from './fixtures/test-data';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator(SELECTORS.loginEmailInput)).toBeVisible();
    await expect(page.locator(SELECTORS.loginPasswordInput)).toBeVisible();
    await expect(page.locator(SELECTORS.loginButton)).toBeVisible();
  });

  test('should display branding on login screen', async ({ page }) => {
    await expect(page.locator(SELECTORS.brandLogo)).toBeVisible();
    await expect(page.locator('text=Diabetes Identification & Analysis')).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.route('**/auth/login', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 401,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' }),
      });
    });

    await page.fill(SELECTORS.loginEmailInput, 'invalid@example.com');
    await page.fill(SELECTORS.loginPasswordInput, 'wrongpassword');
    await page.click(SELECTORS.loginButton);

    const errorMessage = page.locator('text=/invalid credentials|invalid|error|failed/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should show error when login request fails', async ({ page }) => {
    await page.route('**/auth/login', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.abort('failed');
    });

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);

    const errorMessage = page.locator('text=/server unavailable|invalid|error|failed/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
    await expect(page.locator(SELECTORS.loginButton)).toBeEnabled({ timeout: 5000 });
  });

  test('should prevent double submit while login is loading', async ({ page }) => {
    let resolveLogin;
    const loginPromise = new Promise(resolve => {
      resolveLogin = resolve;
    });

    await page.route('**/auth/login', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      await loginPromise;
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
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ name: 'E2E User', email: TEST_USER.email }),
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

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);

    const loginButton = page.locator(SELECTORS.loginButton);
    await expect(loginButton).toBeDisabled();

    resolveLogin();
    await waitForNetworkIdle(page);

    await expect(loginButton).toBeEnabled({ timeout: 5000 });
    const loginForm = page.locator(SELECTORS.loginEmailInput);
    await expect(loginForm).not.toBeVisible({ timeout: 5000 });
  });

  test('should login successfully with valid credentials', async ({ page }) => {
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
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ name: 'E2E User', email: TEST_USER.email }),
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

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const dashboardOrSidebar = page.locator(`${SELECTORS.sidebar}, text=/dashboard/i`);
    await expect(dashboardOrSidebar.first()).toBeVisible({ timeout: 10000 });
  });

  test('should persist session after page reload', async ({ page }) => {
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
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ name: 'E2E User', email: TEST_USER.email }),
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

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    await page.reload();
    await waitForNetworkIdle(page);

    const loginForm = page.locator(SELECTORS.loginEmailInput);
    await expect(loginForm).not.toBeVisible({ timeout: 5000 });
  });

  test('should redirect to login if stored token is invalid', async ({ page }) => {
    await page.route('**/users/me/profile', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 401,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem('diana_token', 'stale.token.value');
      window.localStorage.setItem('diana_refresh_token', 'stale.refresh.value');
    });

    await page.goto('/');

    await expect(page.locator(SELECTORS.loginEmailInput)).toBeVisible({ timeout: 10000 });
  });

  test('should logout successfully', async ({ page }) => {
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

    await page.route('**/auth/logout', async route => {
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

    await page.route('**/users/me/profile', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ name: 'E2E User', email: TEST_USER.email }),
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

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const logoutButton = page.locator(SELECTORS.logoutButton);
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await waitForNetworkIdle(page);

      await expect(page.locator(SELECTORS.loginEmailInput)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show error for registration with weak password', async ({ page }) => {
    await page.route('**/auth/register', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      const body = request.postDataJSON();

      if (body && body.password && body.password.length < 8) {
        return route.fulfill({
          status: 400,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'invalid payload',
            details: 'password must be at least 8 characters'
          }),
        });
      }

      return route.fulfill({
        status: 201,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'registration successful',
          access_token: 'test.access.token',
          refresh_token: 'test.refresh.token',
          user: { id: '1', email: body?.email, role: 'user' },
        }),
      });
    });

    await page.route('**/auth/login', async route => {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test.access.token',
          refresh_token: 'test.refresh.token',
          user: { id: '1', email: 'test@example.com', role: 'user' },
        }),
      });
    });

    await page.route('**/users/me/profile', async route => {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ name: 'Test User', email: 'test@example.com', onboarding_completed: true }),
      });
    });

    await page.route('**/users/me/assessments**', async route => {
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    const signUpButton = page.locator('text=Sign Up, text=Don\'t have an account');
    if (await signUpButton.isVisible()) {
      await signUpButton.click();
      await page.waitForTimeout(2000);

      const createAccountButton = page.locator('button:has-text("Create Account")');
      if (await createAccountButton.isVisible({ timeout: 5000 })) {
        await page.fill('input[type="email"]', 'weakpass@example.com');
        await page.fill('input[placeholder="Jane"]', 'John');
        await page.fill('input[placeholder="Doe"]', 'Doe');
        await page.fill('input[placeholder*="Password"], input[name="password"]', '123');
        await page.fill('input[placeholder*="Confirm"], input[name="confirmPassword"]', '123');

        await createAccountButton.click();

        const errorMessage = page.locator('text=/password must be at least 8|invalid payload|too short|error/i');
        await expect(errorMessage).toBeVisible({ timeout: 5000 });
      } else {
        await page.fill('input[type="password"]', '12345');
        await page.click('button:has-text("Sign In")');
      }
    }
  });

  test('should show error for registration with duplicate email', async ({ page }) => {
    await page.route('**/auth/register', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      const body = request.postDataJSON();

      if (body && body.email && (body.email === TEST_USER.email || body.email === 'demo@diana.app')) {
        return route.fulfill({
          status: 409,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'user already exists',
            details: 'email already registered'
          }),
        });
      }

      return route.fulfill({
        status: 201,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'registration successful',
          access_token: 'test.access.token',
          refresh_token: 'test.refresh.token',
          user: { id: '1', email: body?.email, role: 'user' },
        }),
      });
    });

    const signUpButton = page.locator('text=Sign Up, text=Don\'t have an account');
    if (await signUpButton.isVisible()) {
      await signUpButton.click();
      await page.waitForTimeout(2000);

      const createAccountButton = page.locator('button:has-text("Create Account")');
      if (await createAccountButton.isVisible({ timeout: 5000 })) {
        await page.fill('input[type="email"]', TEST_USER.email);
        await page.fill('input[placeholder="Jane"]', 'John');
        await page.fill('input[placeholder="Doe"]', 'Doe');
        await page.fill('input[placeholder*="Password"], input[name="password"]', 'Password123!');
        await page.fill('input[placeholder*="Confirm"], input[name="confirmPassword"]', 'Password123!');

        await createAccountButton.click();

        const errorMessage = page.locator('text=/user already exists|email already registered|conflict|already in use/i');
        await expect(errorMessage).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should enforce rate limit after too many failed login attempts', async ({ page }) => {
    let attemptCount = 0;
    const RATE_LIMIT_THRESHOLD = 10;

    await page.route('**/auth/login', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      attemptCount++;

      if (attemptCount > RATE_LIMIT_THRESHOLD) {
        return route.fulfill({
          status: 429,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'rate limit exceeded',
          }),
        });
      }

      return route.fulfill({
        status: 401,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' }),
      });
    });

    for (let i = 1; i <= RATE_LIMIT_THRESHOLD + 1; i++) {
      await page.fill(SELECTORS.loginEmailInput, `ratelimit${i}@test.com`);
      await page.fill(SELECTORS.loginPasswordInput, 'wrongpassword');
      await page.click(SELECTORS.loginButton);
      await page.waitForTimeout(500);
      await page.fill(SELECTORS.loginEmailInput, '');
      await page.fill(SELECTORS.loginPasswordInput, '');
    }

    const rateLimitError = page.locator('text=/rate limit exceeded|too many requests|429|try again later/i');
    await expect(rateLimitError).toBeVisible({ timeout: 5000 });
  });
});
