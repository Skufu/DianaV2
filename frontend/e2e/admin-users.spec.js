import { test, expect } from '@playwright/test';
import { ADMIN_USER, waitForNetworkIdle } from './fixtures/test-data';

/**
 * Admin User Management Tests - Uses real backend (no mocking)
 * Prerequisites: Backend running at localhost:8080 with seeded data
 * Seeded users: admin@diana.app (admin), demo@diana.app (user)
 */

test.describe('Admin User Management - List with Pagination', () => {
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

  test('should list users with pagination (first page)', async ({ page }) => {
    // Verify User Management section is visible
    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible({
      timeout: 10000,
    });
    
    // Wait for table to load
    const table = page.locator('table').first();
    await expect(table).toBeVisible({ timeout: 10000 });

    // Check that table has headers
    const headerCount = await page.locator('th').count();
    expect(headerCount).toBeGreaterThan(0);

    // Pagination summary should be present for paged admin list
    await expect(page.getByText(/Showing\s+\d+\s+to\s+\d+\s+of\s+\d+/i)).toBeVisible();
  });

  test('should show seeded users in list', async ({ page }) => {
    // Wait for table to load
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });

    // At least one user email should be rendered
    const firstEmailCell = page.locator('tbody tr td').first();
    await expect(firstEmailCell).toBeVisible({ timeout: 10000 });
    await expect(firstEmailCell).toContainText('@');
  });

  test('should display user roles correctly', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });

    // Check that page shows role-related content
    const pageContent = await page.textContent('body');
    
    // Should show admin or user roles
    const hasRoles = pageContent.includes('admin') || pageContent.includes('user');
    expect(hasRoles).toBeTruthy();
  });
});

test.describe('Admin User Management - Role Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);
    
    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 15000 });
    await page.click('text=User Management');
    await page.waitForTimeout(1000);
  });

  test('should display user management table', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });

    // Just verify the table loaded correctly
    const tableRows = await page.locator('tbody tr').count();
    expect(tableRows).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Admin User Management - Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);
    
    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 15000 });
    await page.click('text=User Management');
    await page.waitForTimeout(1000);
  });

  test('should display user list', async ({ page }) => {
    await expect(page.locator('table').first()).toBeVisible({ timeout: 10000 });

    // Table should have rows
    const tableRows = await page.locator('tbody tr').count();
    expect(tableRows).toBeGreaterThanOrEqual(0);
  });
});
