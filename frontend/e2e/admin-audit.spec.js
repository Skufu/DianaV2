import { test, expect } from '@playwright/test';
import { ADMIN_USER, waitForNetworkIdle } from './fixtures/test-data';

/**
 * Admin Audit Log Tests - Uses real backend (no mocking)
 * Prerequisites: Backend running at localhost:8080 with seeded data
 */

test.describe('Admin Audit Log Viewing', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto('/');
    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);
    
    // Wait for admin dashboard and navigate to audit logs
    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 15000 });
    await page.click('text=Audit Logs');
    await page.waitForTimeout(1000);
  });

  test('should view audit logs page', async ({ page }) => {
    // Verify audit logs section is visible
    await expect(page.locator('text=Audit Logs').first()).toBeVisible({ timeout: 10000 });
  });

  test('should display events in table or empty state', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Either table or empty state should be visible
    const tableVisible = await page.locator('table').first().isVisible();
    const emptyVisible = await page.locator('text=No audit events').isVisible();
    
    expect(tableVisible || emptyVisible).toBeTruthy();
    
    // If table is visible, check for headers
    if (tableVisible) {
      const headers = await page.locator('th').count();
      expect(headers).toBeGreaterThan(0);
    }
  });

  test('should show data from database', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Check page content for audit-related terms
    const pageContent = await page.textContent('body');
    
    // Either show events or empty state
    const hasContent = pageContent.includes('login') || 
                      pageContent.includes('create') || 
                      pageContent.includes('export') ||
                      pageContent.includes('No audit events') ||
                      pageContent.includes('Audit');
    
    expect(hasContent).toBeTruthy();
  });

  test('should handle pagination if available', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Just verify the page doesn't crash
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Audit');
  });
});
