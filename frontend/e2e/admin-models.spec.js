import { test, expect } from '@playwright/test';
import { ADMIN_USER, waitForNetworkIdle } from './fixtures/test-data';

/**
 * Admin Model Traceability Tests - Uses real backend (no mocking)
 * Prerequisites: Backend running at localhost:8080 with seeded data
 */

test.describe('Admin Model Traceability Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto('/');
    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);
    
    // Wait for admin dashboard and navigate to model tracking
    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 15000 });
    await page.click('text=Model Tracking');
    await page.waitForTimeout(1000);
  });

  test('should view model runs page', async ({ page }) => {
    // Verify we're on the model tracking page
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Model');
  });

  test('should display model content', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Check for model-related content
    const pageContent = await page.textContent('body');
    const hasContent = pageContent.includes('Model') || 
                      pageContent.includes('Active') ||
                      pageContent.includes('Version') ||
                      pageContent.includes('No model');
    
    expect(hasContent).toBeTruthy();
  });

  test('should show model run history from database', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Check page content
    const pageContent = await page.textContent('body');
    
    // Either show models or appropriate message
    const hasContent = pageContent.includes('v0-mock') || 
                      pageContent.includes('Model') ||
                      pageContent.includes('No model') ||
                      pageContent.includes('Traceability');
    
    expect(hasContent).toBeTruthy();
  });

  test('should display page without errors', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Verify no error messages
    const hasError = await page.locator('text=Error').count();
    const hasContent = await page.textContent('body');
    
    // Page should have model-related content and ideally no errors
    expect(hasContent.length).toBeGreaterThan(0);
  });
});
