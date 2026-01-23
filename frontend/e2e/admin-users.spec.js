import { test, expect } from '@playwright/test';
import { ADMIN_USER, waitForNetworkIdle } from './fixtures/test-data';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

const generateMockUsers = (count = 10, page = 1) => {
  const users = [];
  for (let i = 0; i < count; i++) {
    const userIndex = (page - 1) * 10 + i + 1;
    users.push({
      id: `user-${userIndex}`,
      email: `user${userIndex}@example.com`,
      name: `User ${userIndex}`,
      role: i % 3 === 0 ? 'admin' : 'user',
      is_active: i % 5 !== 0,
      last_login_at: i % 2 === 0 ? '2024-01-23T10:00:00Z' : null,
      created_at: '2024-01-01T00:00:00Z',
    });
  }
  return users;
};

  test.describe('Admin User Management - List with Pagination', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('should list users with pagination (first page)', async ({ page }) => {
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
            total_users: 25,
            total_patients: 12,
            total_assessments: 50,
            high_risk_count: 5,
            new_users_this_month: 2,
            assessments_this_month: 8,
            avg_risk_score: 40.0,
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

      const url = new URL(request.url());
      const pageParam = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('page_size') || '10');

      const users = generateMockUsers(pageSize, pageParam);
      const total = 25;

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: users,
          total: total,
          page: pageParam,
          page_size: pageSize,
          total_pages: Math.ceil(total / pageSize),
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    await expect(page.locator('text=Admin Dashboard')).toBeVisible({ timeout: 10000 });
    const userManagementButton = page.locator('text=User Management').first();
    await expect(userManagementButton).toBeVisible({ timeout: 5000 });
    await userManagementButton.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('h3:has-text("User Management")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Manage clinician and admin accounts')).toBeVisible({ timeout: 5000 });

    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 5000 });

    await expect(page.locator('th:has-text("Email")')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('th:has-text("Role")')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('th:has-text("Status")')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('th:has-text("Last Login")')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('th:has-text("Created")')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('th:has-text("Actions")')).toBeVisible({ timeout: 3000 });

    const userRows = page.locator('tbody tr');
    const rowCount = await userRows.count();
    expect(rowCount).toBe(10);

    await expect(page.locator('tbody tr:nth-child(1)')).toContainText('user1@example.com');

    await expect(page.locator('text=Showing 1 to 10 of 25')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Page 1 of 3')).toBeVisible({ timeout: 3000 });
  });

  test('should navigate to next page', async ({ page }) => {
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
            total_users: 25,
            total_patients: 12,
            total_assessments: 50,
            high_risk_count: 5,
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

      const url = new URL(request.url());
      const pageParam = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('page_size') || '10');

      const users = generateMockUsers(pageSize, pageParam);
      const total = 25;

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: users,
          total: total,
          page: pageParam,
          page_size: pageSize,
          total_pages: Math.ceil(total / pageSize),
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    const userManagementButton = page.locator('text=User Management').first();
    await expect(userManagementButton).toBeVisible({ timeout: 5000 });
    await userManagementButton.click();
    await page.waitForTimeout(1000);

    const nextButton = page.locator('button[aria-label*="Next"], button:has(svg[class*="chevron-right"])');
    await expect(nextButton).toBeVisible({ timeout: 3000 });
    await nextButton.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Page 2 of 3')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Showing 11 to 20 of 25')).toBeVisible({ timeout: 3000 });

    await expect(page.locator('tbody tr:nth-child(1)')).toContainText('user11@example.com');
  });

  test('should navigate to previous page', async ({ page }) => {
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
          stats: { total_users: 25 },
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

      const url = new URL(request.url());
      const pageParam = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('page_size') || '10');

      const users = generateMockUsers(pageSize, pageParam);
      const total = 25;

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: users,
          total: total,
          page: pageParam,
          page_size: pageSize,
          total_pages: Math.ceil(total / pageSize),
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    const userManagementButton = page.locator('text=User Management').first();
    await expect(userManagementButton).toBeVisible({ timeout: 5000 });
    await userManagementButton.click();
    await page.waitForTimeout(1000);

    const nextButton = page.locator('button[aria-label*="Next"], button:has(svg[class*="chevron-right"])');
    await expect(nextButton).toBeVisible({ timeout: 3000 });
    await nextButton.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Page 2 of 3')).toBeVisible({ timeout: 3000 });

    const prevButton = page.locator('button[aria-label*="Previous"], button:has(svg[class*="chevron-left"])');
    await expect(prevButton).toBeVisible({ timeout: 3000 });
    await prevButton.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Page 1 of 3')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=Showing 1 to 10 of 25')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('tbody tr:nth-child(1)')).toContainText('user1@example.com');
  });

  test('should disable prev button on first page and next on last page', async ({ page }) => {
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
          stats: { total_users: 25 },
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

      const url = new URL(request.url());
      const pageParam = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('page_size') || '10');

      const users = generateMockUsers(pageSize, pageParam);
      const total = 25;

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: users,
          total: total,
          page: pageParam,
          page_size: pageSize,
          total_pages: Math.ceil(total / pageSize),
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    const userManagementButton = page.locator('text=User Management').first();
    await expect(userManagementButton).toBeVisible({ timeout: 5000 });
    await userManagementButton.click();
    await page.waitForTimeout(1000);

    const prevButton = page.locator('button[aria-label*="Previous"], button:has(svg[class*="chevron-left"])');
    await expect(prevButton).toHaveClass(/disabled|opacity-50/);
    await expect(prevButton).toBeDisabled();

    const nextButton = page.locator('button[aria-label*="Next"], button:has(svg[class*="chevron-right"])');
    await expect(nextButton).toBeVisible({ timeout: 3000 });
    await nextButton.click(); // page 2
    await page.waitForTimeout(1000);
    await nextButton.click(); // page 3 (last)
    await page.waitForTimeout(1000);

    await expect(nextButton).toBeDisabled();
  });

  test('should filter users by role', async ({ page }) => {
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
          stats: { total_users: 25 },
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

      const url = new URL(request.url());
      const pageParam = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('page_size') || '10');
      const roleFilter = url.searchParams.get('role');

      console.log('Admin users route - roleFilter:', roleFilter, 'page:', pageParam, 'url:', request.url());

      let allUsers = generateMockUsers(25, 1);

      if (roleFilter) {
        allUsers = allUsers.filter(user => user.role === roleFilter);
        console.log('Filtered users count:', allUsers.length);
      }

      const total = allUsers.length;
      const totalPages = Math.ceil(total / pageSize);

      if (total <= pageSize) {
        users = allUsers;
      } else {
        const startIndex = (pageParam - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, total);
        users = allUsers.slice(startIndex, endIndex);
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: users,
          total: total,
          page: pageParam,
          page_size: pageSize,
          total_pages: totalPages,
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    const userManagementButton = page.locator('text=User Management').first();
    await expect(userManagementButton).toBeVisible({ timeout: 5000 });
    await userManagementButton.click();
    await page.waitForTimeout(1000);

    await page.selectOption('select[name="roleFilter"]', 'admin');
    await page.waitForTimeout(2000);
    await waitForNetworkIdle(page);
    await page.waitForTimeout(1000);

    const tableRows = page.locator('tbody tr');
    await expect(tableRows).toHaveCount(9);

    const roleCells = page.locator('tbody tr td:nth-child(2)');
    const roleCount = await roleCells.filter({ hasText: 'admin' }).count();
    expect(roleCount).toBe(9);
  });

  test('should filter users by status', async ({ page }) => {
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
          stats: { total_users: 25 },
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

      const url = new URL(request.url());
      const pageParam = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('page_size') || '10');
      const activeFilter = url.searchParams.get('is_active');

      let allUsers = generateMockUsers(25, 1);

      if (activeFilter !== null) {
        const isActive = activeFilter === 'true';
        allUsers = allUsers.filter(user => user.is_active === isActive);
      }

      const total = allUsers.length;
      const totalPages = Math.ceil(total / pageSize);

      const startIndex = (pageParam - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, total);
      const users = allUsers.slice(startIndex, endIndex);

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: users,
          total: total,
          page: pageParam,
          page_size: pageSize,
          total_pages: totalPages,
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    const userManagementButton = page.locator('text=User Management').first();
    await expect(userManagementButton).toBeVisible({ timeout: 5000 });
    await userManagementButton.click();
    await page.waitForTimeout(1000);

    await page.selectOption('select[name="activeFilter"]', 'active');

    await expect(page.locator('text=Showing 1 to 10 of 20')).toBeVisible({ timeout: 3000 });
  });

  test('should search users by email', async ({ page }) => {
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
          stats: { total_users: 25 },
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

      const url = new URL(request.url());
      const pageParam = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('page_size') || '10');
      const search = url.searchParams.get('search');

      let allUsers = generateMockUsers(25, 1);

      if (search) {
        allUsers = allUsers.filter(user => user.email.includes(search));
      }

      const total = allUsers.length;
      const totalPages = Math.ceil(total / pageSize);

      let users;
      if (total <= pageSize) {
        users = allUsers;
      } else {
        const startIndex = (pageParam - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, total);
        users = allUsers.slice(startIndex, endIndex);
      }

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: users,
          total: total,
          page: pageParam,
          page_size: pageSize,
          total_pages: totalPages,
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    const userManagementButton = page.locator('text=User Management').first();
    await expect(userManagementButton).toBeVisible({ timeout: 5000 });
    await userManagementButton.click();
    await page.waitForTimeout(1000);

    await page.fill('input[name="search"]', 'user5');
    await page.click('button:has-text("Apply")');
    await waitForNetworkIdle(page);

    // Search matches user5@example.com (the user at index 4 in 0-based indexing)
    // After filtering with pagination (page 1, page_size 10), check if it appears
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(page.locator('tbody tr')).toContainText('user5@example.com');
  });

  test('should display empty state when no users found', async ({ page }) => {
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
          stats: { total_users: 25 },
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
          data: [],
          total: 0,
          page: 1,
          page_size: 10,
          total_pages: 0,
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    const userManagementButton = page.locator('text=User Management').first();
    await expect(userManagementButton).toBeVisible({ timeout: 5000 });
    await userManagementButton.click();
    await page.waitForTimeout(1000);

    await expect(page.locator('text=No users found')).toBeVisible({ timeout: 3000 });
  });

  test('should view user details', async ({ page }) => {
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
          stats: { total_users: 25 },
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

      const url = new URL(request.url());
      const pageParam = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('page_size') || '10');

      const users = generateMockUsers(pageSize, pageParam);
      const total = 25;

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: users,
          total: total,
          page: pageParam,
          page_size: pageSize,
          total_pages: Math.ceil(total / pageSize),
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    const userManagementButton = page.locator('text=User Management').first();
    await expect(userManagementButton).toBeVisible({ timeout: 5000 });
    await userManagementButton.click();
    await page.waitForTimeout(1000);

    const firstRowEditButton = page.locator('tbody tr:nth-child(1) button[title="Edit user"]');
    await expect(firstRowEditButton).toBeVisible({ timeout: 3000 });
    await firstRowEditButton.click();
    await page.waitForTimeout(500);

    await expect(page.locator('h3:has-text("Edit User")')).toBeVisible({ timeout: 3000 });

    const emailInput = page.locator('input#edit-user-email');
    await expect(emailInput).toHaveValue('user1@example.com');

    const roleSelect = page.locator('select#edit-user-role');
    await expect(roleSelect).toHaveValue('admin');

    await page.click('button:has-text("Cancel")');
    await expect(page.locator('h3:has-text("Edit User")')).not.toBeVisible({ timeout: 2000 });
  });

  test('should create new user → appears in list', async ({ page }) => {
    let createdUserEmail = 'newuser@example.com';

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
          stats: { total_users: 25 },
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

      if (request.method() === 'POST') {
        const body = await request.postDataJSON();
        createdUserEmail = body.email;
        return route.fulfill({
          status: 201,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'user-new-1',
            email: body.email,
            role: body.role,
            is_active: true,
            last_login_at: null,
            created_at: '2024-01-23T00:00:00Z',
          }),
        });
      }

      const url = new URL(request.url());
      const pageParam = parseInt(url.searchParams.get('page') || '1');
      const pageSize = parseInt(url.searchParams.get('page_size') || '10');

      let users = generateMockUsers(pageSize, pageParam);
      users.unshift({
        id: 'user-new-1',
        email: createdUserEmail,
        role: 'user',
        is_active: true,
        last_login_at: null,
        created_at: '2024-01-23T00:00:00Z',
      });

      const total = 26;

      return route.fulfill({
        status: 200,
        headers: corsHeaders,
        contentType: 'application/json',
        body: JSON.stringify({
          data: users,
          total: total,
          page: pageParam,
          page_size: pageSize,
          total_pages: Math.ceil(total / pageSize),
        }),
      });
    });

    await page.fill('input[type="email"]', ADMIN_USER.email);
    await page.fill('input[type="password"]', ADMIN_USER.password);
    await page.click('button:has-text("Sign In")');
    await waitForNetworkIdle(page);

    const userManagementButton = page.locator('text=User Management').first();
    await expect(userManagementButton).toBeVisible({ timeout: 5000 });
    await userManagementButton.click();
    await page.waitForTimeout(1000);

    const addUserButton = page.locator('button:has-text("Add User")');
    await expect(addUserButton).toBeVisible({ timeout: 3000 });
    await addUserButton.click();
    await page.waitForTimeout(500);

    await expect(page.locator('h3:has-text("Create User")')).toBeVisible({ timeout: 3000 });

    await page.fill('#create-user-email', 'newuser@example.com');
    await page.fill('#create-user-password', 'Password123');
    await page.selectOption('#create-user-role', 'user');

    await page.click('button:has-text("Create User")');
    await waitForNetworkIdle(page);

    await expect(page.locator('text=User created successfully')).toBeVisible({ timeout: 3000 });

    await expect(page.locator('h3:has-text("Create User")')).not.toBeVisible({ timeout: 2000 });

    await expect(page.locator('tbody tr').first()).toContainText('newuser@example.com', { timeout: 3000 });

    await expect(page.locator('text=Showing 1 to 10 of 26')).toBeVisible({ timeout: 3000 });
  });
});
