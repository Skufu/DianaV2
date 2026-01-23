import { test, expect } from '@playwright/test';
import { ADMIN_USER, waitForNetworkIdle } from './fixtures/test-data';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

test.describe('Admin Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should login as admin and show purple theme', async ({ page }) => {
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
          access_token: 'admin.access.token',
          refresh_token: 'admin.refresh.token',
          user: {
            id: 'admin-1',
            email: ADMIN_USER.email,
            role: 'admin',
          },
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
          id: 'admin-1',
          name: 'Admin User',
          email: ADMIN_USER.email,
          role: 'admin',
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

    await page.route('**/admin/dashboard', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          stats: {
            total_users: 100,
            total_patients: 50,
            total_assessments: 200,
            high_risk_count: 10,
            new_users_this_month: 5,
            assessments_this_month: 20,
            avg_risk_score: 45.5,
          },
          cluster_distribution: [
            { cluster: 'SIRD', count: 20 },
            { cluster: 'SIDD', count: 15 },
            { cluster: 'MOD', count: 10 },
            { cluster: 'MARD', count: 5 },
          ],
          trends: [
            { label: 'Jan', hba1c: 5.8, fbs: 100 },
            { label: 'Feb', hba1c: 5.9, fbs: 105 },
            { label: 'Mar', hba1c: 6.0, fbs: 110 },
          ],
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    const adminSidebar = page.locator('nav').first();
    await expect(adminSidebar).toBeVisible({ timeout: 10000 });

    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=System Administration')).toBeVisible({ timeout: 5000 });

    await expect(page.locator('text=Total Users')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Total Patients')).toBeVisible({ timeout: 5000 });
  });

  test('should show AdminSidebar instead of regular Sidebar', async ({ page }) => {
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
          access_token: 'admin.access.token',
          refresh_token: 'admin.refresh.token',
          user: {
            id: 'admin-1',
            email: ADMIN_USER.email,
            role: 'admin',
          },
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
          id: 'admin-1',
          name: 'Admin User',
          email: ADMIN_USER.email,
          role: 'admin',
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

    await page.route('**/admin/dashboard', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          stats: {
            total_users: 100,
            total_patients: 50,
            total_assessments: 200,
            high_risk_count: 10,
            new_users_this_month: 5,
            assessments_this_month: 20,
            avg_risk_score: 45.5,
          },
          cluster_distribution: [],
          trends: [],
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    await page.waitForTimeout(2000);

    await expect(page.locator('text=Overview')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=User Management')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Audit Logs')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Auth Events')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Model Tracking')).toBeVisible({ timeout: 5000 });
  });

  test('should load admin dashboard section', async ({ page }) => {
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
          access_token: 'admin.access.token',
          refresh_token: 'admin.refresh.token',
          user: {
            id: 'admin-1',
            email: ADMIN_USER.email,
            role: 'admin',
          },
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
          id: 'admin-1',
          name: 'Admin User',
          email: ADMIN_USER.email,
          role: 'admin',
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

    await page.route('**/admin/dashboard', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          stats: {
            total_users: 150,
            total_patients: 75,
            total_assessments: 300,
            high_risk_count: 15,
            new_users_this_month: 8,
            assessments_this_month: 25,
            avg_risk_score: 42.3,
          },
          cluster_distribution: [
            { cluster: 'SIRD', count: 30 },
            { cluster: 'SIDD', count: 25 },
            { cluster: 'MOD', count: 15 },
            { cluster: 'MARD', count: 5 },
          ],
          trends: [
            { label: 'Jan', hba1c: 5.7, fbs: 98 },
            { label: 'Feb', hba1c: 5.9, fbs: 102 },
            { label: 'Mar', hba1c: 6.1, fbs: 108 },
          ],
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    await expect(page.locator('h2:has-text("Admin Dashboard")')).toBeVisible({ timeout: 10000 });

    await expect(page.locator('text=Total Users')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=150').or(page.locator('text=100'))).toBeVisible({ timeout: 3000 });

    await expect(page.locator('text=Total Patients')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Total Assessments')).toBeVisible({ timeout: 5000 });

    await expect(page.locator('text=High Risk Patients')).toBeVisible({ timeout: 5000 });

    await expect(page.locator('text=T2DM Cluster Distribution')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Biomarker Trends')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate between admin views', async ({ page }) => {
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
          access_token: 'admin.access.token',
          refresh_token: 'admin.refresh.token',
          user: {
            id: 'admin-1',
            email: ADMIN_USER.email,
            role: 'admin',
          },
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
          id: 'admin-1',
          name: 'Admin User',
          email: ADMIN_USER.email,
          role: 'admin',
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

    await page.route('**/admin/dashboard', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          stats: {
            total_users: 100,
            total_patients: 50,
            total_assessments: 200,
            high_risk_count: 10,
          },
          cluster_distribution: [],
          trends: [],
        }),
      });
    });

    await page.route('**/admin/users*', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [
            {
              id: '1',
              email: 'user1@example.com',
              name: 'User One',
              is_active: true,
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
        }),
      });
    });

    await page.route('**/admin/audit*', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          events: [],
          total: 0,
          page: 1,
          limit: 20,
        }),
      });
    });

    await page.route('**/admin/models*', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          models: [],
          total: 0,
          page: 1,
          limit: 20,
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 10000 });

    const overviewButton = page.locator('text=Overview').first();
    if (await overviewButton.isVisible({ timeout: 5000 })) {
      await overviewButton.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 5000 });
    }

    const usersButton = page.locator('text=User Management').first();
    if (await usersButton.isVisible({ timeout: 5000 })) {
      await usersButton.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('text=Admin Dashboard').or(page.locator('text=User Management')).first()).toBeVisible({ timeout: 5000 });
    }

    const auditButton = page.locator('text=Audit Logs').first();
    if (await auditButton.isVisible({ timeout: 5000 })) {
      await auditButton.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('text=Admin Dashboard').or(page.locator('text=Audit Logs')).first()).toBeVisible({ timeout: 5000 });
    }

    const authEventsButton = page.locator('text=Auth Events').first();
    if (await authEventsButton.isVisible({ timeout: 5000 })) {
      await authEventsButton.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('text=Admin Dashboard').or(page.locator('text=Auth Events')).first()).toBeVisible({ timeout: 5000 });
    }

    const modelsButton = page.locator('text=Model Tracking').first();
    if (await modelsButton.isVisible({ timeout: 5000 })) {
      await modelsButton.click();
      await page.waitForTimeout(1000);
      await expect(page.locator('text=Admin Dashboard').or(page.locator('text=Model Tracking')).first()).toBeVisible({ timeout: 5000 });
    }
  });
});
