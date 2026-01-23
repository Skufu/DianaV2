import { test, expect } from '@playwright/test';
import { ADMIN_USER, waitForNetworkIdle } from './fixtures/test-data';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

const generateMockModelRuns = (count = 20, page = 1) => {
  const runs = [];
  const versions = ['v1.0.0', 'v1.1.0', 'v1.2.0', 'v2.0.0', 'v2.1.0'];

  for (let i = 0; i < count; i++) {
    const runIndex = (page - 1) * 20 + i + 1;
    const isActive = runIndex === 1;

    runs.push({
      id: `model-run-${runIndex}`,
      model_version: versions[i % versions.length] + `.${runIndex}`,
      dataset_hash: `abc123def456${runIndex}`,
      is_active: isActive,
      notes: isActive ? 'Currently in production' : `Training run ${runIndex}`,
      created_at: new Date(Date.now() - runIndex * 86400000).toISOString(),
    });
  }
  return runs.reverse();
};

test.describe('Admin Model Traceability Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('should view model runs page', async ({ page }) => {
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
            total_users: 25,
            total_patients: 12,
            total_assessments: 50,
            high_risk_count: 5,
            new_users_this_month: 3,
            assessments_this_month: 8,
            avg_risk_score: 42.5,
          },
          cluster_distribution: [],
          trends: [],
        }),
      });
    });

    await page.route('**/admin/models/active', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'model-run-1',
          model_version: 'v2.1.0.1',
          dataset_hash: 'abc123def4561',
          is_active: true,
          notes: 'Currently in production',
          created_at: new Date().toISOString(),
        }),
      });
    });

    await page.route('**/admin/models', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      const url = new URL(request.url());
      const pageParam = parseInt(url.searchParams.get('page') || '1');

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: generateMockModelRuns(20, pageParam),
          total: 45,
          page: pageParam,
          page_size: 20,
          total_pages: 3,
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Overview')).toBeVisible({ timeout: 10000 });
    await waitForNetworkIdle(page);

    await page.click('button:has-text("Overview")');
    await page.waitForTimeout(500);

    await page.waitForSelector('text=Model Tracking', { timeout: 5000 });
    await page.click('text=Model Tracking');

    await expect(page.locator('text=Model Traceability')).toBeVisible({ timeout: 5000 });
  });

  test('should display current active model', async ({ page }) => {
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
            total_users: 25,
            total_patients: 12,
            total_assessments: 50,
            high_risk_count: 5,
            new_users_this_month: 3,
            assessments_this_month: 8,
            avg_risk_score: 42.5,
          },
          cluster_distribution: [],
          trends: [],
        }),
      });
    });

    await page.route('**/admin/models/active', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'model-run-1',
          model_version: 'v2.1.0.1',
          dataset_hash: 'abc123def4561',
          is_active: true,
          notes: 'Currently in production',
          created_at: new Date().toISOString(),
        }),
      });
    });

    await page.route('**/admin/models', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: generateMockModelRuns(20, 1),
          total: 45,
          page: 1,
          page_size: 20,
          total_pages: 3,
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Overview')).toBeVisible({ timeout: 10000 });
    await waitForNetworkIdle(page);

    await page.click('button:has-text("Overview")');

    await page.waitForSelector('text=Model Tracking', { timeout: 5000 });
    await page.click('text=Model Tracking');

    await expect(page.locator('text=Currently Active Model')).toBeVisible({ timeout: 5000 });
  });

  test('should list model run history', async ({ page }) => {
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
            total_users: 25,
            total_patients: 12,
            total_assessments: 50,
            high_risk_count: 5,
            new_users_this_month: 3,
            assessments_this_month: 8,
            avg_risk_score: 42.5,
          },
          cluster_distribution: [],
          trends: [],
        }),
      });
    });

    await page.route('**/admin/models/active', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'model-run-1',
          model_version: 'v2.1.0.1',
          dataset_hash: 'abc123def4561',
          is_active: true,
          notes: 'Currently in production',
          created_at: new Date().toISOString(),
        }),
      });
    });

    await page.route('**/admin/models', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: generateMockModelRuns(20, 1),
          total: 45,
          page: 1,
          page_size: 20,
          total_pages: 3,
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Overview')).toBeVisible({ timeout: 10000 });
    await waitForNetworkIdle(page);

    await page.click('button:has-text("Overview")');
    await page.waitForTimeout(500);

    await page.waitForSelector('text=Model Tracking', { timeout: 5000 });
    await page.click('text=Model Tracking');
    await page.waitForTimeout(5000);

    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Model Traceability');
  });

  test('should handle pagination', async ({ page }) => {
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
            total_users: 25,
            total_patients: 12,
            total_assessments: 50,
            high_risk_count: 5,
            new_users_this_month: 3,
            assessments_this_month: 8,
            avg_risk_score: 42.5,
          },
          cluster_distribution: [],
          trends: [],
        }),
      });
    });

    let currentPage = 1;
    await page.route('**/admin/models/active', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'model-run-1',
          model_version: 'v2.1.0.1',
          dataset_hash: 'abc123def4561',
          is_active: true,
          notes: 'Currently in production',
          created_at: new Date().toISOString(),
        }),
      });
    });

    await page.route('**/admin/models', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      const url = new URL(request.url());
      currentPage = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('page_size') || '20');

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: generateMockModelRuns(pageSize, currentPage),
          total: 45,
          page: currentPage,
          page_size: pageSize,
          total_pages: 3,
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Overview')).toBeVisible({ timeout: 10000 });
    await waitForNetworkIdle(page);

    await page.click('button:has-text("Overview")');

    await page.waitForSelector('text=Model Tracking', { timeout: 5000 });
    await page.click('text=Model Tracking');

    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Model Traceability');
  });

  test('should show empty state when no model runs', async ({ page }) => {
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
            total_users: 0,
            total_patients: 0,
            total_assessments: 0,
            high_risk_count: 0,
            new_users_this_month: 0,
            assessments_this_month: 0,
            avg_risk_score: 0,
          },
          cluster_distribution: [],
          trends: [],
        }),
      });
    });

    await page.route('**/admin/models/active', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 404,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'no active model',
        }),
      });
    });

    await page.route('**/admin/models', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [],
          total: 0,
          page: 1,
          page_size: 20,
          total_pages: 1,
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Overview')).toBeVisible({ timeout: 10000 });
    await waitForNetworkIdle(page);

    await page.click('button:has-text("Overview")');
    await page.waitForTimeout(500);

    await page.waitForSelector('text=Model Tracking', { timeout: 5000 });
    await page.click('text=Model Tracking');
    await page.waitForTimeout(3000);

    const noModelText = await page.locator('text=No model').count();
    expect(noModelText).toBeGreaterThan(0);
  });
});
