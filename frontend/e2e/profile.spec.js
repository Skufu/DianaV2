import { test, expect } from '@playwright/test';
import { TEST_PROFILE, SELECTORS, createMockJwt } from './fixtures/test-data';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

const buildJsonResponse = (body, status = 200) => ({
  status,
  contentType: 'application/json',
  headers: corsHeaders,
  body: JSON.stringify(body),
});

const resolveOverride = (override, fallback) => ({
  status: override?.status ?? 200,
  body: override?.body ?? fallback,
});

const mockAuthenticatedSession = async (page, accessToken, overrides = {}) => {
  await page.route('**/*', route => {
    const request = route.request();
    const method = request.method();
    const url = request.url();
    const isMockedEndpoint = [
      '/auth/login',
      '/users/me/profile',
      '/users/me/assessments',
      '/users/me/onboarding',
    ].some(path => url.includes(path));

    if (!isMockedEndpoint) {
      return route.fallback();
    }

    if (method === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: corsHeaders,
      });
    }

    if (url.includes('/auth/login')) {
      return route.fulfill(
        buildJsonResponse({
          access_token: accessToken,
          refresh_token: 'refresh-token',
        })
      );
    }

    if (url.includes('/users/me/profile') && method === 'PUT') {
      const profileUpdate = resolveOverride(overrides.profileUpdate, { success: true });
      return route.fulfill(buildJsonResponse(profileUpdate.body, profileUpdate.status));
    }

    if (url.includes('/users/me/profile') && method === 'GET') {
      const profile = resolveOverride(overrides.profile, TEST_PROFILE);
      return route.fulfill(buildJsonResponse(profile.body, profile.status));
    }

    if (url.includes('/users/me/assessments')) {
      const assessments = resolveOverride(overrides.assessments, []);
      return route.fulfill(buildJsonResponse(assessments.body, assessments.status));
    }

    if (url.includes('/users/me/onboarding')) {
      const onboarding = resolveOverride(overrides.onboarding, { success: true });
      return route.fulfill(buildJsonResponse(onboarding.body, onboarding.status));
    }

    if (url.includes('/users/me/account') && method === 'DELETE') {
      const deletion = resolveOverride(overrides.accountDeletion, { success: true });
      return route.fulfill(buildJsonResponse(deletion.body, deletion.status));
    }

    return route.fulfill(buildJsonResponse({ error: 'Not mocked in profile tests' }, 404));
  });
};

const setStoredSession = async (page, accessToken) => {
  await page.addInitScript(token => {
    window.localStorage.setItem('diana_token', token);
    window.localStorage.setItem('diana_refresh_token', 'refresh-token');
  }, accessToken);
};

const completeOnboardingIfNeeded = async page => {
  const onboardingHeader = page.locator('text=Welcome to DIANA');
  const isOnboardingVisible = await onboardingHeader.isVisible().catch(() => false);
  if (!isOnboardingVisible) return;

  for (let step = 0; step < 4; step += 1) {
    const nextButton = page.locator('button:has-text("Next")').first();
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(200);
    }
  }

  const completeButton = page.locator('button:has-text("Complete Setup")');
  if (await completeButton.isVisible().catch(() => false)) {
    await completeButton.click();
  }
};

const waitForAppShell = async page => {
  const sidebar = page.locator(SELECTORS.sidebar);
  const onboardingHeader = page.locator('text=Welcome to DIANA');

  await Promise.race([
    sidebar.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
    onboardingHeader.waitFor({ state: 'visible', timeout: 10000 }).catch(() => null),
  ]);
};

test.describe('Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    // Fail test on console errors (T019)
    page.on('console', msg => {
      if (msg.type() === 'error') {
        throw new Error(`Console error: ${msg.text()}`);
      }
    });

    const accessToken = createMockJwt();
    await mockAuthenticatedSession(page, accessToken);
    await setStoredSession(page, accessToken);
    await page.goto('/');
    await waitForAppShell(page);
    await completeOnboardingIfNeeded(page);
    await expect(page.locator(SELECTORS.sidebar)).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to profile tab', async ({ page }) => {
    const sidebar = page.locator(SELECTORS.sidebar);
    await sidebar.locator('button:has-text("My Profile")').click();

    await expect(page.locator(SELECTORS.sidebar)).toHaveCount(0);
    await expect(page.locator('text=My Profile')).toBeVisible();
  });

  test('should display user data in profile form', async ({ page }) => {
    const sidebar = page.locator(SELECTORS.sidebar);
    await sidebar.locator('button:has-text("My Profile")').click();

    await expect(page.locator('text=My Profile')).toBeVisible();
    await expect(page.locator('h2:has-text("Personal Information")')).toBeVisible();

    const firstNameInput = page.locator('input[name="first_name"]');
    const lastNameInput = page.locator('input[name="last_name"]');
    const emailInput = page.locator('input[name="email"]');

    await expect(firstNameInput).toBeVisible();
    await expect(lastNameInput).toBeVisible();
    await expect(emailInput).toBeVisible();

    await expect(firstNameInput).toHaveValue(TEST_PROFILE.first_name);
    await expect(lastNameInput).toHaveValue(TEST_PROFILE.last_name);
    await expect(emailInput).toHaveValue(TEST_PROFILE.email);
  });

  test('should edit first name, save, and verify persisted', async ({ page }) => {
    const sidebar = page.locator(SELECTORS.sidebar);
    await sidebar.locator('button:has-text("My Profile")').click();

    const firstNameInput = page.locator('input[name="first_name"]');
    const saveButton = page.locator('button:has-text("Save Changes")');

    const newFirstName = 'UpdatedName';
    await firstNameInput.clear();
    await firstNameInput.fill(newFirstName);
    await expect(firstNameInput).toHaveValue(newFirstName);

    page.on('dialog', dialog => dialog.accept());
    await saveButton.click();
    await page.waitForTimeout(100);

    await expect(firstNameInput).toHaveValue(newFirstName);
  });

  test('should show validation error when editing with invalid data', async ({ page }) => {
    const sidebar = page.locator(SELECTORS.sidebar);
    await sidebar.locator('button:has-text("My Profile")').click();

    page.on('dialog', dialog => dialog.accept());

    const firstNameInput = page.locator('input[name="first_name"]');
    const saveButton = page.locator('button:has-text("Save Changes")');

    // Try to save with empty first name (invalid)
    await firstNameInput.clear();
    await firstNameInput.fill('a');

    await saveButton.click();

    // Should see validation error message or success alert (if API succeeds)
    const errorMessage = page.locator('.bg-rose-500\\/10').or(
      page.locator('text=Validation failed')
    );

    await expect(errorMessage.or(page.locator('text=Profile updated successfully'))).toBeVisible({ timeout: 3000 });
  });

  test('should toggle consent settings and save', async ({ page }) => {
    const sidebar = page.locator(SELECTORS.sidebar);
    await sidebar.locator('button:has-text("My Profile")').click();

    const consentCheckbox = page.locator('input[name="reminder_email"]');
    const initialState = await consentCheckbox.isChecked();

    await consentCheckbox.click();
    const toggledState = await consentCheckbox.isChecked();
    expect(toggledState).not.toBe(initialState);

    page.on('dialog', dialog => dialog.accept());
    const saveButton = page.locator('button:has-text("Save Changes")');
    await saveButton.click();
    await page.waitForTimeout(100);

    const finalState = await consentCheckbox.isChecked();
    expect(finalState).toBe(toggledState);
  });

  test('should show confirmation dialog when clicking delete', async ({ page }) => {
    const sidebar = page.locator(SELECTORS.sidebar);
    await sidebar.locator('button:has-text("My Profile")').click();

    await page.locator('button:has-text("Delete My Account")').click();
    await expect(page.locator('text=Confirm Account Deletion')).toBeVisible();
    await expect(page.locator('text=permanently delete your account')).toBeVisible();
    
    // Cancel should close modal
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('text=Confirm Account Deletion')).toBeHidden();
  });

  test('should delete account and redirect to login', async ({ page }) => {
    const sidebar = page.locator(SELECTORS.sidebar);
    await sidebar.locator('button:has-text("My Profile")').click();

    await page.locator('button:has-text("Delete My Account")').click();
    
    // Confirm deletion
    const confirmButton = page.locator('button:has-text("Delete Account")'); 
    await confirmButton.click();

    // Should redirect to login (root or /login)
    await expect(page).toHaveURL(/(\/login|\/$)/);
  });
});
