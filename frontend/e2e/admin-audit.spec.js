import { test, expect } from '@playwright/test';
import { ADMIN_USER, waitForNetworkIdle } from './fixtures/test-data';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

const generateMockAuditEvents = (count = 20, page = 1) => {
  const events = [];
  const actions = ['user.create', 'user.update', 'user.deactivate', 'user.activate'];
  const actors = ['admin@diana.app', 'manager@clinic.com', 'clinician@example.com'];
  const targets = ['user', 'patient', 'assessment'];

  for (let i = 0; i < count; i++) {
    const eventIndex = (page - 1) * 20 + i + 1;
    events.push({
      id: `audit-event-${eventIndex}`,
      actor: actors[Math.floor(Math.random() * actors.length)],
      action: actions[Math.floor(Math.random() * actions.length)],
      target_type: targets[Math.floor(Math.random() * targets.length)],
      target_id: `target-${eventIndex}`,
      details: {
        field: 'email',
        old_value: `old${eventIndex}@example.com`,
        new_value: `new${eventIndex}@example.com`,
      },
      created_at: new Date(Date.now() - eventIndex * 60000).toISOString(),
    });
  }
  return events.reverse(); // Newest first
};

test.describe('Admin Audit Log Viewing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('should view audit logs page', async ({ page }) => {
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
          cluster_distribution: [
            { cluster: 'SIRD', count: 8 },
            { cluster: 'SIDD', count: 5 },
            { cluster: 'MOD', count: 6 },
            { cluster: 'MARD', count: 6 },
          ],
          trends: [
            { label: 'Jan', hba1c: 6.2, fbs: 110 },
            { label: 'Feb', hba1c: 6.0, fbs: 105 },
            { label: 'Mar', hba1c: 6.1, fbs: 108 },
          ],
        }),
      });
    });

    await page.route('**/admin/audit**', async route => {
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
          data: generateMockAuditEvents(20, pageParam),
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

    await page.waitForSelector('text=Audit Logs', { timeout: 5000 });
    await page.click('text=Audit Logs');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Audit Logs').first()).toBeVisible();
    await expect(page.locator('text=System activity and admin action history').first()).toBeVisible();
  });

  test('should display events in table', async ({ page }) => {
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

    await page.route('**/admin/audit**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: generateMockAuditEvents(20, 1),
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

    await page.waitForSelector('text=Audit Logs', { timeout: 5000 });
    await page.click('text=Audit Logs');
    await page.waitForTimeout(500);

    const table = page.locator('table');
    await expect(table).toBeVisible();

    await expect(page.locator('text=Timestamp').first()).toBeVisible();
    await expect(page.locator('text=Actor').first()).toBeVisible();
    await expect(page.locator('text=Action').first()).toBeVisible();
    await expect(page.locator('text=Target').first()).toBeVisible();

    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);

    await expect(page.locator('text=user.create').first()).toBeVisible();
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
    await page.route('**/admin/audit**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      const url = new URL(request.url());
      currentPage = parseInt(url.searchParams.get('page') || '1');

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: generateMockAuditEvents(20, currentPage),
          total: 45,
          page: currentPage,
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

    await page.waitForSelector('text=Audit Logs', { timeout: 5000 });
    await page.click('text=Audit Logs');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Showing 1 to 20 of 45').first()).toBeVisible();
    await expect(page.locator('text=Page 1 of 3').first()).toBeVisible();

    const nextButton = page.locator('button:has([aria-label="Chevron Right"])').or(page.locator('svg[aria-label="Chevron Right"]').locator('..'));
    if (await nextButton.count() > 0) {
      await nextButton.first().click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=Page 2 of 3').first()).toBeVisible();
    }
  });

  test('should filter by action type', async ({ page }) => {
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

    await page.route('**/admin/audit**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      const url = new URL(request.url());
      const actionParam = url.searchParams.get('action');
      let events = generateMockAuditEvents(20, 1);
      if (actionParam) {
        events = events.filter(e => e.action === actionParam);
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: events,
          total: actionParam ? 5 : 45,
          page: 1,
          page_size: 20,
          total_pages: actionParam ? 1 : 3,
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

    await page.waitForSelector('text=Audit Logs', { timeout: 5000 });
    await page.click('text=Audit Logs');
    await page.waitForTimeout(500);

    const actionSelect = page.locator('select[id="audit-action-filter"]');
    if (await actionSelect.count() > 0) {
      await actionSelect.selectOption('user.create');
      await page.click('button:has-text("Apply")');
      await page.waitForTimeout(500);

      await expect(page.locator('text=user.create').first()).toBeVisible();
    }
  });

  test('should show empty state when no audit events', async ({ page }) => {
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

    await page.route('**/admin/audit**', async route => {
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

    await page.waitForSelector('text=Audit Logs', { timeout: 5000 });
    await page.click('text=Audit Logs');
    await page.waitForTimeout(500);

    await expect(page.locator('text=No audit events found').first()).toBeVisible();
  });
});
