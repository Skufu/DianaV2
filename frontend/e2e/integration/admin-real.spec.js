import { test, expect } from '@playwright/test';
import { ADMIN_USER, SELECTORS, waitForNetworkIdle } from '../fixtures/test-data';

/**
 * Integration Test Suite for Real Admin Operations
 *
 * These tests hit REAL backend without mocking API responses.
 * Purpose: Catch real integration issues between admin frontend and backend.
 *
 * Requirements:
 * - Backend must be running at http://localhost:8080
 * - Admin user must exist (run `make seed` if needed)
 * - Database must be accessible
 *
 * Demo Credentials:
 * - Admin: admin@diana.app / admin123
 *
 * NOTE: These tests modify real data. Use a test database or restore state after tests.
 */

test.describe('Integration: Real Admin Operations', () => {
  let testUserId = null;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(SELECTORS.loginEmailInput)).toBeVisible({ timeout: 10000 });
  });

  test('should login as admin and access admin dashboard', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'admin@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'admin123');
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const adminDashboard = page.locator('text=/admin|system|dashboard/i');
    await expect(adminDashboard.first()).toBeVisible({ timeout: 10000 });

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
    expect(profileResponse.data.is_admin).toBe(true);
  });

  test('should list users with pagination via real API', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'admin@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'admin123');
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const listResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/admin/users?page=1&limit=10', {
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

    expect(listResponse.ok).toBe(true);
    expect(listResponse.status).toBe(200);
    expect(listResponse.data).toHaveProperty('users');
    expect(Array.isArray(listResponse.data.users)).toBe(true);
    expect(listResponse.data).toHaveProperty('pagination');
    expect(listResponse.data.pagination).toHaveProperty('total');
    expect(listResponse.data.pagination).toHaveProperty('page');
    expect(listResponse.data.pagination).toHaveProperty('limit');
  });

  test('should create new user via real API', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `e2e-integration-${timestamp}@test.app`;

    await page.fill(SELECTORS.loginEmailInput, 'admin@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'admin123');
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const createResponse = await page.evaluate(async (email) => {
      const response = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          email: email,
          password: 'TestPassword123!',
          is_admin: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      return { ok: true, status: response.status, data: await response.json() };
    }, testEmail);

    expect(createResponse.ok).toBe(true);
    expect(createResponse.status).toBe(201);
    expect(createResponse.data).toHaveProperty('id');
    expect(createResponse.data.email).toBe(testEmail);

    testUserId = createResponse.data.id;

    const listResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/admin/users?page=1&limit=50', {
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

    expect(listResponse.ok).toBe(true);
    const createdUser = listResponse.data.users.find(u => u.email === testEmail);
    expect(createdUser).toBeDefined();
    expect(createdUser.id).toBe(testUserId);
  });

  test('should fail to create user with duplicate email via real API', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'admin@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'admin123');
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const duplicateResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          email: 'demo@diana.app',
          password: 'TestPassword123!',
          is_admin: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      return { ok: true, status: response.status, data: await response.json() };
    });

    expect(duplicateResponse.ok).toBe(false);
    expect(duplicateResponse.status === 409 || duplicateResponse.status === 400).toBe(true);
    expect(duplicateResponse.error).toMatch(/email|duplicate|exists/i);
  });

  test('should update user via real API', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'admin@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'admin123');
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const timestamp = Date.now();
    const testEmail = `e2e-update-${timestamp}@test.app`;

    const createResponse = await page.evaluate(async (email) => {
      const response = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          email: email,
          password: 'TestPassword123!',
          is_admin: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      return { ok: true, status: response.status, data: await response.json() };
    }, testEmail);

    expect(createResponse.ok).toBe(true);
    const userId = createResponse.data.id;

    const updateResponse = await page.evaluate(async (id) => {
      const response = await fetch(`/api/v1/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          is_admin: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      return { ok: true, status: response.status, data: await response.json() };
    }, userId);

    expect(updateResponse.ok).toBe(true);
    expect(updateResponse.status).toBe(200);
    expect(updateResponse.data.is_admin).toBe(true);
  });

  test('should deactivate user via real API', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'admin@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'admin123');
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const timestamp = Date.now();
    const testEmail = `e2e-deactivate-${timestamp}@test.app`;

    const createResponse = await page.evaluate(async (email) => {
      const response = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          email: email,
          password: 'TestPassword123!',
          is_admin: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      return { ok: true, status: response.status, data: await response.json() };
    }, testEmail);

    expect(createResponse.ok).toBe(true);
    const userId = createResponse.data.id;

    const deactivateResponse = await page.evaluate(async (id) => {
      const response = await fetch(`/api/v1/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          is_active: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      return { ok: true, status: response.status, data: await response.json() };
    }, userId);

    expect(deactivateResponse.ok).toBe(true);
    expect(deactivateResponse.status).toBe(200);
    expect(deactivateResponse.data.is_active).toBe(false);

    const verifyResponse = await page.evaluate(async (id) => {
      const response = await fetch('/api/v1/admin/users?page=1&limit=50', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      const data = await response.json();
      const user = data.users.find(u => u.id === id);
      return { ok: true, user };
    }, userId);

    expect(verifyResponse.ok).toBe(true);
    expect(verifyResponse.user.is_active).toBe(false);
  });

  test('should view audit logs via real API', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'admin@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'admin123');
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const auditResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/admin/audit?page=1&limit=20', {
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

    expect(auditResponse.ok).toBe(true);
    expect(auditResponse.status).toBe(200);
    expect(auditResponse.data).toHaveProperty('events');
    expect(Array.isArray(auditResponse.data.events)).toBe(true);
    expect(auditResponse.data).toHaveProperty('pagination');
  });

  test('should view model runs via real API', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'admin@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'admin123');
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const modelsResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/admin/models?page=1&limit=20', {
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

    expect(modelsResponse.ok).toBe(true);
    expect(modelsResponse.status).toBe(200);
    expect(modelsResponse.data).toHaveProperty('runs');
    expect(Array.isArray(modelsResponse.data.runs)).toBe(true);
    expect(modelsResponse.data).toHaveProperty('pagination');
  });

  test('should handle non-admin access to admin endpoints', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'demo@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'demopassword123');
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const listUsersResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/admin/users?page=1&limit=10', {
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

    expect(listUsersResponse.ok).toBe(false);
    expect(listUsersResponse.status === 403 || listUsersResponse.status === 401).toBe(true);
    expect(listUsersResponse.error).toMatch(/forbidden|unauthorized|admin/i);
  });

  test('should handle unauthorized access without token', async ({ page }) => {
    await page.goto('/');

    const listUsersResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/admin/users?page=1&limit=10', {
        method: 'GET',
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      return { ok: true, status: response.status, data: await response.json() };
    });

    expect(listUsersResponse.ok).toBe(false);
    expect(listUsersResponse.status === 401 || listUsersResponse.status === 500).toBe(true);
  });
});
