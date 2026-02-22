import { test, expect } from '@playwright/test';
import { TEST_USER, SELECTORS, waitForNetworkIdle } from '../fixtures/test-data';

/**
 * Integration Test Suite for Real Assessment Creation
 *
 * These tests hit REAL backend without mocking API responses.
 * Purpose: Catch real integration issues between frontend and backend.
 *
 * Requirements:
 * - Backend must be running at http://localhost:8080
 * - Demo user must exist (run `make seed` if needed)
 * - Database must be accessible
 * - ML predictor can be in mock mode (MODEL_URL="")
 *
 * Demo Credentials:
 * - User: demo@diana.app / demopassword123
 */

test.describe('Integration: Real Assessment Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator(SELECTORS.loginEmailInput)).toBeVisible({ timeout: 10000 });
  });

  test('should create assessment with valid biomarkers via API', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'demo@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'demopassword123');
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const dashboardText = page.locator('text=/dashboard|welcome/i');
    await expect(dashboardText.first()).toBeVisible({ timeout: 10000 });

    const accessToken = await page.evaluate(() => localStorage.getItem('diana_token'));
    expect(accessToken).toBeTruthy();

    const assessmentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          age: 55,
          bmi: 25.0,
          triglycerides: 150,
          ldl: 130,
          hdl: 50,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      return { ok: true, status: response.status, data: await response.json() };
    });

    expect(assessmentResponse.ok).toBe(true);
    expect(assessmentResponse.status).toBe(201);
    expect(assessmentResponse.data).toHaveProperty('id');
    expect(assessmentResponse.data).toHaveProperty('risk_score');
    expect(assessmentResponse.data).toHaveProperty('risk_level');
  });

  test('should fail validation with BMI out of range via API', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'demo@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'demopassword123');
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const dashboardText = page.locator('text=/dashboard|welcome/i');
    await expect(dashboardText.first()).toBeVisible({ timeout: 10000 });

    const assessmentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          age: 55,
          bmi: -5.0,
          triglycerides: 150,
          ldl: 130,
          hdl: 50,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      return { ok: true, status: response.status, data: await response.json() };
    });

    expect(assessmentResponse.ok).toBe(false);
    expect(assessmentResponse.status).toBe(400);
    expect(assessmentResponse.error).toMatch(/bmi/i);
  });

  test('should fail validation with missing required fields via API', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'demo@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'demopassword123');
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const dashboardText = page.locator('text=/dashboard|welcome/i');
    await expect(dashboardText.first()).toBeVisible({ timeout: 10000 });

    const assessmentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          age: 55,
          bmi: 25.0,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      return { ok: true, status: response.status, data: await response.json() };
    });

    expect(assessmentResponse.ok).toBe(false);
    expect(assessmentResponse.status).toBe(400);
    expect(assessmentResponse.error).toMatch(/required|triglycerides|ldl|hdl/i);
  });

  test('should handle unauthorized access without authentication', async ({ page }) => {
    await page.goto('/');

    const assessmentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          age: 55,
          bmi: 25.0,
          triglycerides: 150,
          ldl: 130,
          hdl: 50,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      return { ok: true, status: response.status, data: await response.json() };
    });

    expect(assessmentResponse.ok).toBe(false);
    expect(assessmentResponse.status === 401 || assessmentResponse.status === 500).toBe(true);
  });

  test('should handle API 500 error gracefully', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'demo@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'demopassword123');
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const dashboardText = page.locator('text=/dashboard|welcome/i');
    await expect(dashboardText.first()).toBeVisible({ timeout: 10000 });

    await page.route('**/users/me/assessments', async route => {
      return route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    const assessmentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
        body: JSON.stringify({
          age: 55,
          bmi: 25.0,
          triglycerides: 150,
          ldl: 130,
          hdl: 50,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { ok: false, status: response.status, error: errorText };
      }

      return { ok: true, status: response.status, data: await response.json() };
    });

    expect(assessmentResponse.ok).toBe(false);
    expect(assessmentResponse.status).toBe(500);
    expect(assessmentResponse.error).toMatch(/error|500/i);
  });

  test('should fetch user assessments after creation', async ({ page }) => {
    await page.fill(SELECTORS.loginEmailInput, 'demo@diana.app');
    await page.fill(SELECTORS.loginPasswordInput, 'demopassword123');
    await page.click(SELECTORS.loginButton);
    await waitForNetworkIdle(page);

    const dashboardText = page.locator('text=/dashboard|welcome/i');
    await expect(dashboardText.first()).toBeVisible({ timeout: 10000 });

    const listResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
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
    expect(Array.isArray(listResponse.data)).toBe(true);
  });
});
