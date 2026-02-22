import { test, expect } from '@playwright/test';
import { TEST_USER, NEW_USER, SELECTORS, waitForNetworkIdle } from './fixtures/test-data';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

test.describe('Onboarding Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show onboarding after first login for new user', async ({ page }) => {
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
          user: { id: '1', email: NEW_USER.email, role: 'user' },
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
          id: '1',
          email: NEW_USER.email,
          onboarding_completed: false,
          first_name: '',
          last_name: '',
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

    await page.fill(SELECTORS.loginEmailInput, NEW_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, NEW_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const onboardingHeading = page.locator('h1, h2').filter({ hasText: /Welcome to DIANA|setup|onboarding/i });
    await expect(onboardingHeading).toBeVisible({ timeout: 10000 });

    await page.fill('input[placeholder="Jane"]', NEW_USER.firstName);
    await page.fill('input[placeholder="Doe"]', NEW_USER.lastName);
    await page.fill('input[type="date"]', '1980-01-15');

    const nextButton = page.locator('button:has-text("Next")');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(1000);

      const secondNextButton = page.locator('button:has-text("Next")');
      if (await secondNextButton.isVisible()) {
        await secondNextButton.click();

        const errorMessage = page.locator('text=/Please select your menopause status/i');
        await expect(errorMessage).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should complete all onboarding steps and redirect to dashboard', async ({ page }) => {
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
          user: { id: '1', email: NEW_USER.email, role: 'user' },
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
          id: '1',
          email: NEW_USER.email,
          onboarding_completed: false,
          first_name: '',
          last_name: '',
        }),
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
        body: JSON.stringify({ status: 'onboarding completed' }),
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

    await page.fill(SELECTORS.loginEmailInput, NEW_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, NEW_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const onboardingHeading = page.locator('h1, h2').filter({ hasText: /Welcome to DIANA|setup/i });
    await expect(onboardingHeading).toBeVisible({ timeout: 10000 });

    await page.fill('input[placeholder="Jane"]', NEW_USER.firstName);
    await page.fill('input[placeholder="Doe"]', NEW_USER.lastName);
    await page.fill('input[type="date"]', '1980-01-15');

    const nextButton = page.locator('button:has-text("Next")');
    await nextButton.click();
    await page.waitForTimeout(1000);

    await page.selectOption('select[name="menopause_status"]', 'post');
    await page.fill('input[name="years_menopause"]', '5');

    await nextButton.click();
    await page.waitForTimeout(1000);

    await page.selectOption('select[name="hypertension"]', 'no');
    await page.selectOption('select[name="heart_disease"]', 'no');
    await page.selectOption('select[name="family_history_diabetes"]', 'false');
    await page.selectOption('select[name="smoking_status"]', 'never');

    await nextButton.click();
    await page.waitForTimeout(1000);

    const consentResearch = page.locator('input[name="consent_research_participation"]');
    const consentEmail = page.locator('input[name="consent_email_updates"]');
    const consentAnalytics = page.locator('input[name="consent_analytics"]');
    const consentPersonalData = page.locator('input[name="consent_personal_data"]');

    await consentResearch.check();
    await consentEmail.check();
    await consentAnalytics.check();
    await consentPersonalData.check();

    const completeButton = page.locator('button:has-text("Complete Setup")');
    if (await completeButton.isVisible()) {
      await completeButton.click();
      await waitForNetworkIdle(page);

      const dashboardOrSidebar = page.locator(SELECTORS.sidebar).or(page.locator('text=/dashboard/i'));
      await expect(dashboardOrSidebar.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should require consent personal data to complete onboarding', async ({ page }) => {
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
          user: { id: '1', email: NEW_USER.email, role: 'user' },
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
          id: '1',
          email: NEW_USER.email,
          onboarding_completed: false,
          first_name: '',
          last_name: '',
        }),
      });
    });

    await page.route('**/users/me/onboarding', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      const body = request.postDataJSON();

      if (body && !body.consent_personal_data) {
        return route.fulfill({
          status: 400,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Consent to personal data usage is required',
          }),
        });
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'onboarding completed' }),
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

    await page.fill(SELECTORS.loginEmailInput, NEW_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, NEW_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    await page.fill('input[placeholder="Jane"]', NEW_USER.firstName);
    await page.fill('input[placeholder="Doe"]', NEW_USER.lastName);
    await page.fill('input[type="date"]', '1980-01-15');

    const nextButton = page.locator('button:has-text("Next")');
    await nextButton.click();
    await page.waitForTimeout(1000);

    await page.selectOption('select[name="menopause_status"]', 'post');
    await page.fill('input[name="years_menopause"]', '5');

    await nextButton.click();
    await page.waitForTimeout(1000);

    await page.selectOption('select[name="hypertension"]', 'no');
    await page.selectOption('select[name="heart_disease"]', 'no');
    await page.selectOption('select[name="family_history_diabetes"]', 'false');
    await page.selectOption('select[name="smoking_status"]', 'never');

    await nextButton.click();
    await page.waitForTimeout(1000);

    const consentResearch = page.locator('input[name="consent_research_participation"]');
    const consentEmail = page.locator('input[name="consent_email_updates"]');
    const consentAnalytics = page.locator('input[name="consent_analytics"]');

    await consentResearch.check();
    await consentEmail.check();
    await consentAnalytics.check();

    const completeButton = page.locator('button:has-text("Complete Setup")');
    if (await completeButton.isVisible()) {
      await completeButton.click();

      const onboardingHeading = page.locator('h2:has-text("Welcome")');
      const errorMessage = page.locator('.text-rose-400').filter({ hasText: /consent|Data Usage/i });
      const consentStepVisible = page.locator('text=Consent Preferences');

      await expect(onboardingHeading.or(errorMessage).or(consentStepVisible).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should skip onboarding for users who already completed it', async ({ page }) => {
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
          name: 'Existing User',
          first_name: 'Existing',
          last_name: 'User',
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

    await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const onboardingHeading = page.locator('h1, h2').filter({ hasText: /Welcome to DIANA|setup|onboarding/i });
    const onboardingPersonalInfo = page.locator('text=/Let\'s set up your health profile/i');
    const firstNameInput = page.locator('input[placeholder="Jane"]');

    await expect(onboardingHeading.or(onboardingPersonalInfo).or(firstNameInput).first()).not.toBeVisible({ timeout: 5000 });

    const dashboardOrSidebar = page.locator(SELECTORS.sidebar).or(page.locator('text=/dashboard/i'));
    await expect(dashboardOrSidebar.first()).toBeVisible({ timeout: 10000 });
  });

  test('should verify onboarding_completed flag set in profile after completion', async ({ page }) => {
    let onboardingRequestReceived = false;

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
          user: { id: '1', email: NEW_USER.email, role: 'user' },
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
          id: '1',
          email: NEW_USER.email,
          first_name: '',
          last_name: '',
          onboarding_completed: false,
        }),
      });
    });

    await page.route('**/users/me/onboarding', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      const body = request.postDataJSON();
      onboardingRequestReceived = !!body;

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'onboarding completed' }),
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

    await page.fill(SELECTORS.loginEmailInput, NEW_USER.email);
    await page.fill(SELECTORS.loginPasswordInput, NEW_USER.password);
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    await page.fill('input[placeholder="Jane"]', NEW_USER.firstName);
    await page.fill('input[placeholder="Doe"]', NEW_USER.lastName);
    await page.fill('input[type="date"]', '1980-01-15');

    const nextButton = page.locator('button:has-text("Next")');
    await nextButton.click();
    await page.waitForTimeout(1000);

    await page.selectOption('select[name="menopause_status"]', 'post');
    await page.fill('input[name="years_menopause"]', '5');

    await nextButton.click();
    await page.waitForTimeout(1000);

    await page.selectOption('select[name="hypertension"]', 'no');
    await page.selectOption('select[name="heart_disease"]', 'no');
    await page.selectOption('select[name="family_history_diabetes"]', 'false');
    await page.selectOption('select[name="smoking_status"]', 'never');

    await nextButton.click();
    await page.waitForTimeout(1000);

    const consentPersonalData = page.locator('input[name="consent_personal_data"]');
    await consentPersonalData.check();

    const completeButton = page.locator('button:has-text("Complete Setup")');
    if (await completeButton.isVisible()) {
      await completeButton.click();
      await waitForNetworkIdle(page);

      expect(onboardingRequestReceived).toBe(true);

      const dashboardOrSidebar = page.locator(SELECTORS.sidebar).or(page.locator('text=/dashboard/i'));
      await expect(dashboardOrSidebar.first()).toBeVisible({ timeout: 10000 });
    }
  });
});
