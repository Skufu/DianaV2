import { test, expect } from '@playwright/test';
import { TEST_USER, MOCK_ASSESSMENT, SELECTORS, waitForNetworkIdle, takeScreenshot } from './fixtures/test-data';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

/** Helper: build a mock assessment object from body data and MOCK_ASSESSMENT defaults */
function buildMockAssessment(id, body = {}) {
  return {
    id,
    age: body.age || MOCK_ASSESSMENT.age,
    bmi: body.bmi || MOCK_ASSESSMENT.bmi,
    ldl: body.ldl || MOCK_ASSESSMENT.ldl,
    hdl: body.hdl || MOCK_ASSESSMENT.hdl,
    triglycerides: body.triglycerides || MOCK_ASSESSMENT.triglycerides,
    risk_score: 40,
    risk_level: 'moderate',
    cluster: 'Cluster_A',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/** Helper: standard auth + profile route mocking */
async function setupAuthRoutes(page) {
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
        access_token: 'test.access.token',
        refresh_token: 'test.refresh.token',
        user: { id: 'e2e-user-123', email: TEST_USER.email, role: 'user' },
      }),
    });
  });

  await page.route('**/users/me/profile', async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      return route.fulfill({ status: 204, headers: corsHeaders });
    }
    const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
    if (!authHeader) {
      return route.fulfill({
        status: 401, headers: corsHeaders, contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    }
    return route.fulfill({
      status: 200, headers: corsHeaders, contentType: 'application/json',
      body: JSON.stringify({
        first_name: 'Test', last_name: 'User', email: TEST_USER.email, onboarding_completed: true,
      }),
    });
  });
}

/** Helper: login and wait for dashboard */
async function loginAndWait(page) {
  await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
  await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
  await page.click(SELECTORS.loginButton);
  await waitForNetworkIdle(page);
  await expect(page.locator('text=/dashboard|welcome/i')).toBeVisible({ timeout: 10000 });
}

test.describe('Assessment CRUD Operations', () => {
  test('List user assessments → paginated results', async ({ page }) => {
    await page.goto('/');

    let assessmentIdCounter = 0;
    const assessments = [];

    await setupAuthRoutes(page);

    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({
          status: 401, headers: corsHeaders, contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      }

      const url = new URL(request.url());
      const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
      const limitParam = parseInt(url.searchParams.get('limit') || '10', 10);

      if (request.method() === 'POST') {
        const body = await request.postDataJSON();
        const newAssessment = buildMockAssessment(++assessmentIdCounter, body);
        assessments.push(newAssessment);
        return route.fulfill({
          status: 201, headers: corsHeaders, contentType: 'application/json',
          body: JSON.stringify(newAssessment),
        });
      }

      const startIndex = (pageParam - 1) * limitParam;
      const endIndex = startIndex + limitParam;
      return route.fulfill({
        status: 200, headers: corsHeaders, contentType: 'application/json',
        body: JSON.stringify(assessments.slice(startIndex, endIndex)),
      });
    });

    await loginAndWait(page);

    for (let i = 1; i <= 15; i++) {
      await page.evaluate(async (assessmentNum) => {
        const response = await fetch('/api/v1/users/me/assessments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
          },
          body: JSON.stringify({
            age: 50 + assessmentNum,
            bmi: 23 + assessmentNum,
            triglycerides: 140 + assessmentNum,
            ldl: 120 + assessmentNum,
            hdl: 45 + assessmentNum,
          }),
        });
        if (!response.ok) throw new Error(`Assessment creation failed: ${response.status}`);
        return await response.json();
      }, i);
    }

    await takeScreenshot(page, 'assessments-created');

    const page1Response = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments?page=1&limit=10', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
      });
      if (!response.ok) throw new Error(`Assessment list failed: ${response.status}`);
      return { status: response.status, data: await response.json() };
    });

    expect(page1Response.status).toBe(200);
    expect(page1Response.data).toHaveLength(10);
    expect(Array.isArray(page1Response.data)).toBe(true);

    page1Response.data.forEach(assessment => {
      expect(assessment).toHaveProperty('id');
      expect(assessment).toHaveProperty('bmi');
      expect(assessment).toHaveProperty('risk_score');
      expect(assessment).toHaveProperty('risk_level');
      expect(assessment).toHaveProperty('created_at');
    });

    const page2Response = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments?page=2&limit=10', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
      });
      if (!response.ok) throw new Error(`Assessment list page 2 failed: ${response.status}`);
      return { status: response.status, data: await response.json() };
    });

    expect(page2Response.status).toBe(200);
    expect(page2Response.data).toHaveLength(5);

    const page1Limit5Response = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments?page=1&limit=5', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
      });
      if (!response.ok) throw new Error(`Assessment list with limit=5 failed: ${response.status}`);
      return { status: response.status, data: await response.json() };
    });

    expect(page1Limit5Response.status).toBe(200);
    expect(page1Limit5Response.data).toHaveLength(5);

    const defaultResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('diana_token')}`,
        },
      });
      if (!response.ok) throw new Error(`Assessment list with defaults failed: ${response.status}`);
      return { status: response.status, data: await response.json() };
    });

    expect(defaultResponse.status).toBe(200);
  });

  test('Get single assessment by ID → full details', async ({ page }) => {
    await page.goto('/');

    let assessmentIdCounter = 0;
    const assessments = [];

    await setupAuthRoutes(page);

    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders });
      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({ status: 401, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) });
      }

      if (request.method() === 'POST') {
        const body = await request.postDataJSON();
        const newAssessment = buildMockAssessment(++assessmentIdCounter, body);
        assessments.push(newAssessment);
        return route.fulfill({ status: 201, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(newAssessment) });
      }

      return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(assessments) });
    });

    await page.route('**/users/me/assessments/*', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders });
      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({ status: 401, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) });
      }
      if (request.method() !== 'GET') return route.fallback();

      const url = new URL(request.url());
      const pathParts = url.pathname.split('/');
      const assessmentId = parseInt(pathParts[pathParts.length - 1], 10);
      const assessment = assessments.find(a => a.id === assessmentId);

      if (!assessment) {
        return route.fulfill({ status: 404, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ error: 'Assessment not found' }) });
      }
      return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(assessment) });
    });

    await loginAndWait(page);

    const createdAssessment = await page.evaluate(async (mockAssessment) => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('diana_token')}` },
        body: JSON.stringify(mockAssessment),
      });
      if (!response.ok) throw new Error(`Assessment creation failed: ${response.status}`);
      return await response.json();
    }, MOCK_ASSESSMENT);

    expect(createdAssessment).toHaveProperty('id');
    const assessmentId = createdAssessment.id;

    const retrievedAssessment = await page.evaluate(async (id) => {
      const response = await fetch(`/api/v1/users/me/assessments/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('diana_token')}` },
      });
      if (!response.ok) throw new Error(`Get assessment failed: ${response.status}`);
      return { status: response.status, data: await response.json() };
    }, assessmentId);

    expect(retrievedAssessment.status).toBe(200);
    expect(retrievedAssessment.data).toMatchObject({
      id: assessmentId,
      bmi: MOCK_ASSESSMENT.bmi,
      ldl: MOCK_ASSESSMENT.ldl,
      hdl: MOCK_ASSESSMENT.hdl,
      triglycerides: MOCK_ASSESSMENT.triglycerides,
      risk_score: expect.any(Number),
      risk_level: expect.any(String),
      cluster: expect.any(String),
      created_at: expect.any(String),
      updated_at: expect.any(String),
    });

    const notFoundResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments/99999', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('diana_token')}` },
      });
      return { status: response.status, data: await response.json().catch(() => null) };
    });

    expect(notFoundResponse.status).toBe(404);
    expect(notFoundResponse.data).toHaveProperty('error');

    const unauthorizedResponse = await page.evaluate(async (id) => {
      const response = await fetch(`/api/v1/users/me/assessments/${id}`, {
        method: 'GET', headers: { 'Content-Type': 'application/json' },
      });
      return { status: response.status, data: await response.json().catch(() => null) };
    }, assessmentId);

    expect(unauthorizedResponse.status).toBe(401);
    expect(unauthorizedResponse.data).toHaveProperty('error');
  });

  test('Update assessment → changes persist', async ({ page }) => {
    await page.goto('/');

    let assessmentIdCounter = 0;
    const assessments = [];

    await setupAuthRoutes(page);

    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders });
      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({ status: 401, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) });
      }
      if (request.method() === 'POST') {
        const body = await request.postDataJSON();
        const newAssessment = buildMockAssessment(++assessmentIdCounter, body);
        assessments.push(newAssessment);
        return route.fulfill({ status: 201, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(newAssessment) });
      }
      return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(assessments) });
    });

    await page.route('**/users/me/assessments/*', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders });
      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({ status: 401, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) });
      }
      const url = new URL(request.url());
      const pathParts = url.pathname.split('/');
      const assessmentId = parseInt(pathParts[pathParts.length - 1], 10);
      const assessment = assessments.find(a => a.id === assessmentId);

      if (!assessment) {
        return route.fulfill({ status: 404, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ error: 'Assessment not found' }) });
      }

      if (request.method() === 'PUT') {
        const body = await request.postDataJSON();
        assessment.bmi = body.bmi ?? assessment.bmi;
        assessment.ldl = body.ldl ?? assessment.ldl;
        assessment.hdl = body.hdl ?? assessment.hdl;
        assessment.triglycerides = body.triglycerides ?? assessment.triglycerides;
        assessment.updated_at = new Date().toISOString();
        return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(assessment) });
      }

      return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(assessment) });
    });

    await loginAndWait(page);

    const createdAssessment = await page.evaluate(async (mockAssessment) => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('diana_token')}` },
        body: JSON.stringify(mockAssessment),
      });
      if (!response.ok) throw new Error(`Assessment creation failed: ${response.status}`);
      return await response.json();
    }, MOCK_ASSESSMENT);

    expect(createdAssessment).toHaveProperty('id');
    const assessmentId = createdAssessment.id;

    const updatedData = { bmi: 28.5, ldl: 145, hdl: 42, triglycerides: 180 };

    const updateResponse = await page.evaluate(async ({ id, data }) => {
      const response = await fetch(`/api/v1/users/me/assessments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('diana_token')}` },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`Assessment update failed: ${response.status}`);
      return { status: response.status, data: await response.json() };
    }, { id: assessmentId, data: updatedData });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.data).toMatchObject({
      id: assessmentId,
      bmi: updatedData.bmi,
      ldl: updatedData.ldl,
      hdl: updatedData.hdl,
      triglycerides: updatedData.triglycerides,
    });

    const retrievedAssessment = await page.evaluate(async (id) => {
      const response = await fetch(`/api/v1/users/me/assessments/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('diana_token')}` },
      });
      if (!response.ok) throw new Error(`Get assessment failed: ${response.status}`);
      return { status: response.status, data: await response.json() };
    }, assessmentId);

    expect(retrievedAssessment.status).toBe(200);
    expect(retrievedAssessment.data).toMatchObject({
      id: assessmentId,
      bmi: updatedData.bmi,
      ldl: updatedData.ldl,
    });

    expect(retrievedAssessment.data.updated_at).not.toBe(createdAssessment.updated_at);

    const updateNonExistentResponse = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments/99999', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('diana_token')}` },
        body: JSON.stringify({ bmi: 30.0 }),
      });
      return { status: response.status, data: await response.json().catch(() => null) };
    });

    expect(updateNonExistentResponse.status).toBe(404);
    expect(updateNonExistentResponse.data).toHaveProperty('error');

    const unauthorizedUpdateResponse = await page.evaluate(async (id) => {
      const response = await fetch(`/api/v1/users/me/assessments/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bmi: 30.0 }),
      });
      return { status: response.status, data: await response.json().catch(() => null) };
    }, assessmentId);

    expect(unauthorizedUpdateResponse.status).toBe(401);
    expect(unauthorizedUpdateResponse.data).toHaveProperty('error');

    await takeScreenshot(page, 'assessment-updated');
  });

  test('Delete assessment → removed from list', async ({ page }) => {
    await page.goto('/');

    let assessmentIdCounter = 0;
    const assessments = [];

    await setupAuthRoutes(page);

    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders });
      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({ status: 401, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) });
      }
      if (request.method() === 'POST') {
        const body = await request.postDataJSON();
        const newAssessment = buildMockAssessment(++assessmentIdCounter, body);
        assessments.push(newAssessment);
        return route.fulfill({ status: 201, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(newAssessment) });
      }
      return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(assessments) });
    });

    await page.route('**/users/me/assessments/*', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders });
      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({ status: 401, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) });
      }
      const url = new URL(request.url());
      const pathParts = url.pathname.split('/');
      const assessmentId = parseInt(pathParts[pathParts.length - 1], 10);
      const assessmentIndex = assessments.findIndex(a => a.id === assessmentId);

      if (assessmentIndex === -1) {
        return route.fulfill({ status: 404, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ error: 'Assessment not found' }) });
      }

      if (request.method() === 'DELETE') {
        assessments.splice(assessmentIndex, 1);
        return route.fulfill({ status: 204, headers: corsHeaders });
      }

      return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(assessments[assessmentIndex]) });
    });

    await loginAndWait(page);

    const createdAssessment = await page.evaluate(async (mockAssessment) => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('diana_token')}` },
        body: JSON.stringify(mockAssessment),
      });
      if (!response.ok) throw new Error(`Assessment creation failed: ${response.status}`);
      return await response.json();
    }, MOCK_ASSESSMENT);

    expect(createdAssessment).toHaveProperty('id');
    const assessmentId = createdAssessment.id;

    const listBeforeDelete = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('diana_token')}` },
      });
      if (!response.ok) throw new Error(`Assessment list failed: ${response.status}`);
      return await response.json();
    });

    expect(listBeforeDelete).toHaveLength(1);
    expect(listBeforeDelete[0].id).toBe(assessmentId);

    const deleteResponse = await page.evaluate(async (id) => {
      const response = await fetch(`/api/v1/users/me/assessments/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('diana_token')}` },
      });
      return { status: response.status, data: await response.json().catch(() => null) };
    }, assessmentId);

    expect(deleteResponse.status).toBe(204);
    expect(deleteResponse.data).toBeNull();

    const listAfterDelete = await page.evaluate(async () => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('diana_token')}` },
      });
      if (!response.ok) throw new Error(`Assessment list after delete failed: ${response.status}`);
      return await response.json();
    });

    expect(listAfterDelete).toHaveLength(0);
    expect(listAfterDelete).not.toContainEqual(expect.objectContaining({ id: assessmentId }));
  });

  test('Access deleted assessment → 404 error', async ({ page }) => {
    await page.goto('/');

    let assessmentIdCounter = 0;
    const assessments = [];

    await setupAuthRoutes(page);

    await page.route('**/users/me/assessments**', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders });
      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({ status: 401, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) });
      }
      if (request.method() === 'POST') {
        const body = await request.postDataJSON();
        const newAssessment = buildMockAssessment(++assessmentIdCounter, body);
        assessments.push(newAssessment);
        return route.fulfill({ status: 201, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(newAssessment) });
      }
      return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(assessments) });
    });

    await page.route('**/users/me/assessments/*', async route => {
      const request = route.request();
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders });
      const authHeader = request.headers()['authorization'] || request.headers()['Authorization'];
      if (!authHeader) {
        return route.fulfill({ status: 401, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ error: 'Unauthorized' }) });
      }
      const url = new URL(request.url());
      const pathParts = url.pathname.split('/');
      const assessmentId = parseInt(pathParts[pathParts.length - 1], 10);
      const assessmentIndex = assessments.findIndex(a => a.id === assessmentId);

      if (assessmentIndex === -1) {
        return route.fulfill({ status: 404, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify({ error: 'Assessment not found' }) });
      }
      if (request.method() === 'DELETE') {
        assessments.splice(assessmentIndex, 1);
        return route.fulfill({ status: 204, headers: corsHeaders });
      }
      return route.fulfill({ status: 200, headers: corsHeaders, contentType: 'application/json', body: JSON.stringify(assessments[assessmentIndex]) });
    });

    await loginAndWait(page);

    const createdAssessment = await page.evaluate(async (mockAssessment) => {
      const response = await fetch('/api/v1/users/me/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('diana_token')}` },
        body: JSON.stringify(mockAssessment),
      });
      if (!response.ok) throw new Error(`Assessment creation failed: ${response.status}`);
      return await response.json();
    }, MOCK_ASSESSMENT);

    expect(createdAssessment).toHaveProperty('id');
    const assessmentId = createdAssessment.id;

    const deleteResponse = await page.evaluate(async (id) => {
      const response = await fetch(`/api/v1/users/me/assessments/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('diana_token')}` },
      });
      return { status: response.status, data: await response.json().catch(() => null) };
    }, assessmentId);

    expect(deleteResponse.status).toBe(204);

    const getDeletedAssessment = await page.evaluate(async (id) => {
      const response = await fetch(`/api/v1/users/me/assessments/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('diana_token')}` },
      });
      return { status: response.status, data: await response.json().catch(() => null) };
    }, assessmentId);

    expect(getDeletedAssessment.status).toBe(404);
    expect(getDeletedAssessment.data).toHaveProperty('error');
    expect(getDeletedAssessment.data.error).toMatch(/not found/i);

    const updateDeletedAssessment = await page.evaluate(async (id) => {
      const response = await fetch(`/api/v1/users/me/assessments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('diana_token')}` },
        body: JSON.stringify({ bmi: 30.0 }),
      });
      return { status: response.status, data: await response.json().catch(() => null) };
    }, assessmentId);

    expect(updateDeletedAssessment.status).toBe(404);
    expect(updateDeletedAssessment.data).toHaveProperty('error');

    await takeScreenshot(page, 'deleted-assessment-404');
  });
});
