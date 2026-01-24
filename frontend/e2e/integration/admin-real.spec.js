import { test, expect } from '@playwright/test';
import { ADMIN_USER, waitForNetworkIdle } from '../fixtures/test-data';

/**
 * Integration Test Suite for Real Admin Operations
 *
 * These tests hit REAL backend without mocking API responses.
 * Purpose: Catch real integration issues between admin frontend and backend.
 *
 * Requirements:
 * - Backend must be running at http://localhost:8080
 * - Admin user must exist (run migrations if needed)
 * - Database must be accessible
 *
 * Admin Credentials: admin@diana.app / admin123
 */

test.describe('Integration: Real Admin Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
  });

  test('should login as admin and access admin dashboard', async ({ page }) => {
    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 15000 });

    const accessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    expect(accessToken).toBeTruthy();

    const profileResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      return { ok: true, status: response.status, data: await response.json() };
    });

    expect(profileResponse.ok).toBe(true);
    expect(profileResponse.data.role).toBe('admin');
  });

  test('should list users with pagination via real API', async ({ page }) => {
    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    // Wait for admin dashboard to load
    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 15000 });
    
    // Wait for token to be stored
    await page.waitForTimeout(500);

    const listResponse = await page.evaluate(async () => {
      const token = localStorage.getItem('diana_token');
      if (!token) {
        return { ok: false, status: 0, error: 'No token in localStorage' };
      }
      
      const response = await fetch('/api/v1/admin/users?page=1&page_size=10', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      return { ok: true, status: response.status, data: await response.json() };
    });

    expect(listResponse.ok).toBe(true);
    expect(listResponse.status).toBe(200);
    expect(listResponse.data).toHaveProperty('data');
    expect(Array.isArray(listResponse.data.data)).toBe(true);
  });

  test('should view audit logs via real API', async ({ page }) => {
    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    // Wait for admin dashboard to load
    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 15000 });
    
    // Wait for token to be stored
    await page.waitForTimeout(500);

    const auditResponse = await page.evaluate(async () => {
      const token = localStorage.getItem('diana_token');
      if (!token) {
        return { ok: false, status: 0, error: 'No token in localStorage' };
      }
      
      const response = await fetch('/api/v1/admin/audit?page=1&page_size=20', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      return { ok: true, status: response.status, data: await response.json() };
    });

    expect(auditResponse.ok).toBe(true);
    expect(auditResponse.status).toBe(200);
    expect(auditResponse.data).toHaveProperty('data');
    expect(Array.isArray(auditResponse.data.data)).toBe(true);
  });

  test('should view model runs via real API', async ({ page }) => {
    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    // Wait for admin dashboard to load
    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 15000 });
    
    // Wait for token to be stored
    await page.waitForTimeout(500);

    const modelsResponse = await page.evaluate(async () => {
      const token = localStorage.getItem('diana_token');
      if (!token) {
        return { ok: false, status: 0, error: 'No token in localStorage' };
      }
      
      const response = await fetch('/api/v1/admin/models?page=1&page_size=20', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      return { ok: true, status: response.status, data: await response.json() };
    });

    // If the endpoint works, validate response structure
    if (modelsResponse.ok) {
      expect(modelsResponse.status).toBe(200);
      expect(modelsResponse.data).toHaveProperty('data');
      expect(Array.isArray(modelsResponse.data.data)).toBe(true);
    } else {
      // Accept 404 (no models yet) but not 5xx
      expect(modelsResponse.status).toBeLessThan(500);
    }
  });

  test('should handle unauthorized access without token', async ({ page }) => {
    await page.goto('/');

    const listUsersResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/admin/users?page=1&page_size=10', {
        method: 'GET',
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      return { ok: true, status: response.status, data: await response.json() };
    });

    expect(listUsersResponse.ok).toBe(false);
    // 401 Unauthorized is expected for missing token
    expect(listUsersResponse.status).toBe(401);
  });
});
