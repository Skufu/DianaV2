import { test, expect } from '@playwright/test';
import { TEST_USER, NEW_USER, SELECTORS, waitForNetworkIdle } from './fixtures/test-data';

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

  test('should display signup form from login page', async ({ page }) => {
    const signUpButton = page.locator('text=/Sign Up/i');
    await expect(signUpButton).toBeVisible();

    await signUpButton.click();

    const loginHeading = page.locator('text=Welcome Back');
    await expect(loginHeading).not.toBeVisible({ timeout: 5000 });

    const createAccountHeading = page.locator('h2:has-text("Create Account")');
    await expect(createAccountHeading).toBeVisible({ timeout: 10000 });

    const firstNameInput = page.locator('input[placeholder="Jane"]');
    await expect(firstNameInput).toBeVisible();

    const lastNameInput = page.locator('input[placeholder="Doe"]');
    await expect(lastNameInput).toBeVisible();

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();

    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    await expect(confirmPasswordInput).toBeVisible();
  });

  test('should register with valid credentials and redirect to onboarding', async ({ page }) => {
    await page.route('**/auth/register', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      const body = request.postDataJSON();

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
          name: `${NEW_USER.firstName} ${NEW_USER.lastName}`,
          email: NEW_USER.email,
          onboarding_completed: false,
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

    const signUpButton = page.locator('text=/Sign Up/i');
    if (await signUpButton.isVisible()) {
      await signUpButton.click();
      await page.waitForTimeout(2000);

      const createAccountHeading = page.locator('h2:has-text("Create Account")');
      if (await createAccountHeading.isVisible({ timeout: 5000 })) {
        await page.fill('input[placeholder="Jane"]', NEW_USER.firstName);
        await page.fill('input[placeholder="Doe"]', NEW_USER.lastName);
        await page.fill('input[type="email"]', NEW_USER.email);

        const passwordInput = page.locator('input[type="password"]').first();
        await passwordInput.fill(NEW_USER.password);

        const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
        await confirmPasswordInput.fill(NEW_USER.confirmPassword);

        const createAccountButton = page.locator('button:has-text("Create Account")');
        await createAccountButton.click();
        await waitForNetworkIdle(page);

        await expect(page.locator('text=/onboarding|welcome|setup/i').or(page.locator('[data-testid="onboarding"]')).or(page.locator('h2, h1').filter({ hasText: /welcome|setup|profile/i })).first()).toBeVisible({ timeout: 10000 });
      }
    }
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

  test('should show frontend validation error for invalid email format', async ({ page }) => {
    await page.route('**/auth/register', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      const body = request.postDataJSON();

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
        await page.fill('input[placeholder="Jane"]', 'John');
        await page.fill('input[placeholder="Doe"]', 'Doe');

        await page.fill('input[type="email"]', 'invalidemailformat');

        await page.fill('input[placeholder*="Password"], input[name="password"]', 'Password123!');
        await page.fill('input[placeholder*="Confirm"], input[name="confirmPassword"]', 'Password123!');

        const emailValidationIcon = page.locator('input[type="email"]').locator('..').locator('svg').first();
        await expect(emailValidationIcon).toBeVisible({ timeout: 3000 });

        const emailInput = page.locator('input[type="email"]');
        const borderClass = await emailInput.evaluate(el => {
          return el.className.includes('border-rose-500/60') || el.className.includes('border-rose-400');
        });
        expect(borderClass).toBe(true);

        await createAccountButton.click();

        await expect(page.locator('h2:has-text("Create Account")')).toBeVisible({ timeout: 3000 });

        await expect(emailValidationIcon).toBeVisible();
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

  test('should refresh token when access token expires', async ({ page }) => {
    let profileCallCount = 0;
    let refreshTokenCallCount = 0;
    let accessToken = 'expired.access.token';

    await page.route('**/auth/login', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      accessToken = 'initial.access.token';
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: 'test.refresh.token',
          user: { id: '1', email: TEST_USER.email, role: 'user' },
        }),
      });
    });

    await page.route('**/users/me/profile', async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      profileCallCount++;

      if (profileCallCount === 1) {
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
        body: JSON.stringify({ name: 'E2E User', email: TEST_USER.email }),
      });
    });

    await page.route('**/auth/refresh', async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      refreshTokenCallCount++;
      accessToken = 'new.access.token';

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'token refreshed successfully',
          access_token: accessToken,
          refresh_token: 'new.refresh.token',
          user: { id: '1', email: TEST_USER.email, role: 'user' },
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

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const sidebarLocator = page.locator(SELECTORS.sidebar);
    const dashboardTextLocator = page.locator('text=/dashboard/i');
    await expect(sidebarLocator.or(dashboardTextLocator).first()).toBeVisible({ timeout: 10000 });

    await page.evaluate(() => {
      localStorage.setItem('diana_token', 'expired.access.token');
    });

    await page.reload();
    await waitForNetworkIdle(page);

    expect(refreshTokenCallCount).toBeGreaterThanOrEqual(1);
    expect(profileCallCount).toBeGreaterThanOrEqual(2);
  });

  test('should logout on refresh token failure', async ({ page }) => {
    let refreshTokenCallCount = 0;
    let profileCallCount = 0;

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
          access_token: 'expired.access.token',
          refresh_token: 'expired.refresh.token',
          user: { id: '1', email: TEST_USER.email, role: 'user' },
        }),
      });
    });

    await page.route('**/users/me/profile', async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      profileCallCount++;

      if (profileCallCount === 1) {
        return route.fulfill({
          status: 200,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ name: 'E2E User', email: TEST_USER.email }),
        });
      }

      return route.fulfill({
        status: 401,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    await page.route('**/auth/refresh', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      refreshTokenCallCount++;

      return route.fulfill({
        status: 401,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid refresh token' }),
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

    await page.evaluate(() => {
      localStorage.setItem('diana_token', 'expired.access.token');
    });

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await page.waitForTimeout(5000);

    await expect(page.locator(SELECTORS.loginEmailInput)).toBeVisible({ timeout: 10000 });
    expect(refreshTokenCallCount).toBeGreaterThan(0);
  });
});
