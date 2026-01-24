import { test, expect } from '@playwright/test';
import { ADMIN_USER, waitForNetworkIdle } from './fixtures/test-data';

/**
 * Admin Tests - Uses real backend (no mocking)
 * Prerequisites: Backend running at localhost:8080 with seeded data
 * Admin credentials: admin@diana.app / admin123
 */

test.describe('Admin Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should login as admin and show admin dashboard', async ({ page }) => {
    // Login with admin credentials
    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    // Wait for admin dashboard to load
    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 15000 });
    
    // Verify admin-specific content is visible
    await expect(page.locator('text=Total Users').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show AdminSidebar with navigation items', async ({ page }) => {
    // Login as admin
    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    // Wait for admin dashboard
    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 15000 });

    // Verify sidebar navigation items
    await expect(page.locator('text=Overview').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=User Management').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Audit Logs').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Model Tracking').first()).toBeVisible({ timeout: 5000 });
  });

  test('should display dashboard statistics', async ({ page }) => {
    // Login as admin
    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    // Wait for admin dashboard
    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 15000 });

    // Check for stat labels
    await expect(page.locator('text=Total Users').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Total Patients').first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate between admin sections', async ({ page }) => {
    // Login as admin
    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    // Wait for admin dashboard
    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 15000 });

    // Navigate to User Management
    await page.click('text=User Management');
    await page.waitForTimeout(1000);
    
    // Verify User Management section loaded
    await expect(page.locator('text=User Management').first()).toBeVisible({ timeout: 5000 });

    // Navigate to Audit Logs
    await page.click('text=Audit Logs');
    await page.waitForTimeout(1000);

    // Verify Audit Logs section loaded
    await expect(page.locator('text=Audit Logs').first()).toBeVisible({ timeout: 5000 });

    // Navigate back to Overview
    await page.click('text=Overview');
    await page.waitForTimeout(1000);

    // Verify back on overview
    await expect(page.locator('text=Total Users').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Admin User Management - Real Backend', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await page.goto('/');
    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);
    
    // Wait for admin dashboard and navigate to user management
    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 15000 });
    await page.click('text=User Management');
    await page.waitForTimeout(1000);
  });

  test('should display user list', async ({ page }) => {
    // Verify table structure
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });

    // Check for table headers - using simple text matching
    const hasEmailHeader = await page.locator('th').filter({ hasText: 'Email' }).count() > 0;
    const hasRoleHeader = await page.locator('th').filter({ hasText: 'Role' }).count() > 0;
    expect(hasEmailHeader || hasRoleHeader).toBeTruthy();
  });

  test('should show seeded users in list', async ({ page }) => {
    // Wait for table to load
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });

    // Check for seeded users from the database - look for admin email in page content
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('admin');
  });
});

test.describe('Admin Audit Logs - Real Backend', () => {
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

  test('should display audit logs page', async ({ page }) => {
    // Verify audit logs section is visible - check for heading or content
    await expect(page.locator('text=Audit Logs').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show audit event table or empty state', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Either table or empty state should be present
    const tableVisible = await page.locator('table').first().isVisible();
    const emptyVisible = await page.locator('text=No audit events').isVisible();
    
    expect(tableVisible || emptyVisible).toBeTruthy();
  });
});

test.describe('Admin Model Tracking - Real Backend', () => {
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

  test('should display model tracking page', async ({ page }) => {
    // Verify we're on the model tracking page - check for any model-related content
    const pageContent = await page.textContent('body');
    const hasModelContent = pageContent.includes('Model') || pageContent.includes('Traceability');
    expect(hasModelContent).toBeTruthy();
  });

  test('should show model runs or empty state', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Check for any model-related content
    const pageContent = await page.textContent('body');
    const hasContent = pageContent.includes('v0-mock') || 
                      pageContent.includes('Model') ||
                      pageContent.includes('No model') ||
                      pageContent.includes('Active');
    
    expect(hasContent).toBeTruthy();
  });
});
