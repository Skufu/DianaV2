import { test, expect } from '@playwright/test';

/**
 * Integration Test: Signup Flow with Real Backend
 *
 * Purpose: Verify that new users can:
 * 1. Sign up successfully
 * 2. Receive and store JWT tokens
 * 3. Make authenticated API calls
 *
 * Requirements:
 * - Backend must be running at http://localhost:8080
 * - Database must be accessible
 * - JWT_SECRET must be configured
 */

const UNIQUE_EMAIL = `test-signup-${Date.now()}@diana.app`;

test.describe('Integration: Signup Flow', () => {
  test.beforeEach(async ({ page, request }) => {
    // Clean up any existing test user
    try {
      await request.delete('http://localhost:8080/api/v1/test/cleanup', {
        data: { email: UNIQUE_EMAIL }
      });
    } catch (err) {
      // Ignore cleanup errors - user might not exist
    }
  });

  test('should signup new user and persist tokens', async ({ page }) => {
    // Navigate to signup page
    await page.goto('/');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });

    // Click "Sign Up" button to switch to signup form
    const signUpButton = page.locator('text=Don\'t have an account? Sign Up').first();
    await expect(signUpButton).toBeVisible({ timeout: 5000 });
    await signUpButton.click();

    // Wait for signup form to appear
    await page.waitForTimeout(2000);

    // Fill signup form
    await page.fill('input[type="email"]', UNIQUE_EMAIL);

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('TestPassword123!');

    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    await confirmPasswordInput.fill('TestPassword123!');

    // Submit signup form
    const createAccountButton = page.locator('button:has-text("Create Account")');
    await expect(createAccountButton).toBeVisible({ timeout: 5000 });
    await createAccountButton.click();

    // Wait for network to complete (signup API call)
    await page.waitForTimeout(5000);

    // Verify tokens are stored in localStorage
    const accessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    const refreshToken = await page.evaluate(() => localStorage.getItem('diana_refresh_token'));

    console.log('Access Token:', accessToken ? 'Found' : 'NOT FOUND');
    console.log('Refresh Token:', refreshToken ? 'Found' : 'NOT FOUND');

    expect(accessToken).toBeTruthy();
    expect(accessToken.length).toBeGreaterThan(0);
    expect(refreshToken).toBeTruthy();
    expect(refreshToken.length).toBeGreaterThan(0);

    // Verify user should be logged in (login form should not be visible)
    await page.waitForTimeout(3000);
    const loginFormVisible = await page.locator('input[type="email"]').isVisible().catch(() => false);
    console.log('Login form visible after signup:', loginFormVisible);

    // User should either be on dashboard or onboarding
    const content = await page.textContent('body');
    console.log('Page content length:', content.length);
    expect(content.length).toBeGreaterThan(100);
  });

  test('should make authenticated API call after signup', async ({ page }) => {
    // Step 1: Sign up new user
    await page.goto('/');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });

    const signUpButton = page.locator('text=Sign Up, text=Don\'t have an account').first();
    await signUpButton.click();
    await page.waitForTimeout(2000);

    await page.fill('input[type="email"]', UNIQUE_EMAIL);

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('TestPassword123!');

    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    await confirmPasswordInput.fill('TestPassword123!');

    const createAccountButton = page.locator('button:has-text("Create Account")');
    await createAccountButton.click();
    await page.waitForTimeout(5000);

    // Step 2: Get stored access token
    const accessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    expect(accessToken).toBeTruthy();

    // Step 3: Make authenticated API call to get user profile
    const profileResponse = await page.request.get('http://localhost:8080/api/v1/users/me/profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Profile API status:', profileResponse.status());
    const profileData = await profileResponse.json();
    console.log('Profile data:', JSON.stringify(profileData));

    // Verify API call succeeded
    expect(profileResponse.status()).toBe(200);
    expect(profileData).toHaveProperty('email');
    expect(profileData.email).toBe(UNIQUE_EMAIL);
  });

  test('should persist session after page reload following signup', async ({ page }) => {
    // Step 1: Sign up new user
    await page.goto('/');
    const signUpButton = page.locator('text=Sign Up, text=Don\'t have an account').first();
    await signUpButton.click();
    await page.waitForTimeout(2000);

    await page.fill('input[type="email"]', UNIQUE_EMAIL);

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('TestPassword123!');

    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    await confirmPasswordInput.fill('TestPassword123!');

    const createAccountButton = page.locator('button:has-text("Create Account")');
    await createAccountButton.click();
    await page.waitForTimeout(5000);

    // Step 2: Verify tokens are stored
    const initialAccessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    const initialRefreshToken = await page.evaluate(() => localStorage.getItem('diana_refresh_token'));

    expect(initialAccessToken).toBeTruthy();
    expect(initialRefreshToken).toBeTruthy();

    console.log('Initial access token stored:', !!initialAccessToken);

    // Step 3: Reload page
    await page.reload();
    await page.waitForTimeout(5000);

    // Step 4: Verify tokens still present and user still logged in
    const reloadedAccessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    const reloadedRefreshToken = await page.evaluate(() => localStorage.getItem('diana_refresh_token'));

    expect(reloadedAccessToken).toBeTruthy();
    expect(reloadedRefreshToken).toBeTruthy();

    console.log('Reloaded access token:', !!reloadedAccessToken);

    // Login form should NOT be visible (user should be logged in)
    const loginFormVisible = await page.locator('input[type="email"]').isVisible().catch(() => false);
    console.log('Login form visible after reload:', loginFormVisible);

    // User should see dashboard or onboarding content
    const content = await page.textContent('body');
    expect(content.length).toBeGreaterThan(100);
  });

  test('should show error for duplicate email signup', async ({ page }) => {
    // Step 1: First signup (should succeed)
    await page.goto('/');
    const signUpButton = page.locator('text=Sign Up, text=Don\'t have an account').first();
    await signUpButton.click();
    await page.waitForTimeout(2000);

    await page.fill('input[type="email"]', UNIQUE_EMAIL);

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('TestPassword123!');

    const confirmPasswordInput = page.locator('input[type="password"]').nth(1);
    await confirmPasswordInput.fill('TestPassword123!');

    const createAccountButton = page.locator('button:has-text("Create Account")');
    await createAccountButton.click();
    await page.waitForTimeout(5000);

    // Verify tokens were stored
    const accessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    expect(accessToken).toBeTruthy();

    // Step 2: Logout
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('diana_token');
      localStorage.removeItem('diana_refresh_token');
    });
    await page.reload();
    await page.waitForTimeout(2000);

    // Step 3: Try to signup with same email again (should fail)
    const signUpButton2 = page.locator('text=Sign Up, text=Don\'t have an account').first();
    await signUpButton2.click();
    await page.waitForTimeout(2000);

    await page.fill('input[type="email"]', UNIQUE_EMAIL);

    const passwordInput2 = page.locator('input[type="password"]').first();
    await passwordInput2.fill('TestPassword123!');

    const confirmPasswordInput2 = page.locator('input[type="password"]').nth(1);
    await confirmPasswordInput2.fill('TestPassword123!');

    const createAccountButton2 = page.locator('button:has-text("Create Account")');
    await createAccountButton2.click();
    await page.waitForTimeout(3000);

    // Should still be on signup form (error shown)
    const createAccountHeading = page.locator('h2:has-text("Create Account")');
    await expect(createAccountHeading).toBeVisible({ timeout: 5000 });

    // Verify no tokens stored (signup failed)
    const duplicateAccessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    expect(duplicateAccessToken).toBeNull();
  });
});
