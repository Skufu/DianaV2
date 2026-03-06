const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
};

const fulfillJson = (route, body, status = 200) =>
  route.fulfill({
    status,
    headers: corsHeaders,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });

const handleOptions = async route => {
  const request = route.request();
  if (request.method() === 'OPTIONS') {
    await route.fulfill({ status: 204, headers: corsHeaders });
    return true;
  }
  return false;
};

const BREAKPOINTS = [
  { name: '375', width: 375, height: 812 },
  { name: '430', width: 430, height: 932 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
];

async function setupMocks(page) {
  // Auth mocks
  await page.route('**/auth/login', async route => {
    if (await handleOptions(route)) return;
    return fulfillJson(route, {
      access_token: 'test.access.token',
      refresh_token: 'test.refresh.token',
      user: {
        id: 'verify-user-id',
        email: 'verify@diana.app',
        role: 'user',
      },
    });
  });

  await page.route('**/users/me/profile', async route => {
    if (await handleOptions(route)) return;
    return fulfillJson(route, {
      name: 'Verification User',
      email: 'verify@diana.app',
      onboarding_completed: true,
    });
  });

  await page.route('**/users/me/assessments**', async route => {
    if (await handleOptions(route)) return;
    return fulfillJson(route, [
      {
        id: 'assessment-1',
        hba1c: 6.2,
        fbs: 110,
        ldl: 130,
        hdl: 45,
        triglycerides: 160,
        total_cholesterol: 220,
        bmi: 28.5,
        age: 52,
        risk_score: 67,
        risk_level: 'High',
        cluster_name: 'MOD - Mild Obesity-Related Diabetes',
        created_at: '2026-03-01T10:00:00Z',
      },
      {
        id: 'assessment-2',
        hba1c: 5.8,
        fbs: 95,
        ldl: 115,
        hdl: 55,
        triglycerides: 140,
        total_cholesterol: 195,
        bmi: 26.0,
        age: 52,
        risk_score: 34,
        risk_level: 'Low',
        cluster_name: 'MARD - Mild Age-Related Diabetes',
        created_at: '2026-02-15T10:00:00Z',
      },
      {
        id: 'assessment-3',
        hba1c: 6.5,
        fbs: 125,
        ldl: 145,
        hdl: 40,
        triglycerides: 180,
        total_cholesterol: 240,
        bmi: 31.2,
        age: 52,
        risk_score: 78,
        risk_level: 'High',
        cluster_name: 'SIDD - Severe Insulin-Deficient Diabetes',
        created_at: '2026-01-20T10:00:00Z',
      },
    ]);
  });

  await page.route('**/users/me/trends**', async route => {
    if (await handleOptions(route)) return;
    return fulfillJson(route, {
      assessments: [
        { id: 'a1', risk_score: 45, risk_level: 'Medium', created_at: '2026-01-01T00:00:00Z', bmi: 27.5, hba1c: 6.0, fbs: 105 },
        { id: 'a2', risk_score: 67, risk_level: 'High', created_at: '2026-02-01T00:00:00Z', bmi: 28.5, hba1c: 6.2, fbs: 110 },
        { id: 'a3', risk_score: 34, risk_level: 'Low', created_at: '2026-03-01T00:00:00Z', bmi: 26.0, hba1c: 5.8, fbs: 95 },
      ],
      trend: 'stable',
    });
  });

  await page.route('**/analytics/summary', async route => {
    if (await handleOptions(route)) return;
    return fulfillJson(route, {
      total_assessments: 3,
      latest_risk_score: 67,
      latest_risk_level: 'High',
    });
  });
}

async function captureScreenshots() {
  const outputDir = path.join(__dirname, '..', '..', '.sisyphus', 'notepads', 'education-results-responsive-fix', 'screenshots');
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // Set up all mocks
  await setupMocks(page);

  // Navigate to login and authenticate
  await page.goto('http://localhost:4000/login');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Fill login form
  await page.fill('input[type="email"]', 'verify@diana.app');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(2000);

  console.log('✓ Authenticated and loaded dashboard');

  // Capture screenshots for each breakpoint
  for (const bp of BREAKPOINTS) {
    await page.setViewportSize({ width: bp.width, height: bp.height });
    await page.waitForTimeout(500);

    // Dashboard (contains Past Results, RiskIndicator)
    await page.goto('http://localhost:4000/dashboard');
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(outputDir, `dashboard-${bp.name}.png`),
      fullPage: false,
    });
    console.log(`✓ Dashboard screenshot at ${bp.name}px`);

    // Personal Trends
    await page.goto('http://localhost:4000/trends');
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(outputDir, `trends-${bp.name}.png`),
      fullPage: false,
    });
    console.log(`✓ Trends screenshot at ${bp.name}px`);

    // Education
    await page.goto('http://localhost:4000/education');
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(outputDir, `education-${bp.name}.png`),
      fullPage: false,
    });
    console.log(`✓ Education screenshot at ${bp.name}px`);
  }

  // Capture MLResultModal by simulating an assessment result
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('http://localhost:4000/dashboard');
  await page.waitForTimeout(1500);

  // Look for a "View" button on an assessment card and click it to open modal
  const viewButtons = await page.locator('button:has-text("View")').all();
  if (viewButtons.length > 0) {
    await viewButtons[0].click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(outputDir, 'modal-375.png'),
      fullPage: false,
    });
    console.log('✓ Modal screenshot at 375px');

    // Close modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  }

  // Capture at 768px for modal action row alignment check
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);

  viewButtons.length = 0;
  const viewButtons768 = await page.locator('button:has-text("View")').all();
  if (viewButtons768.length > 0) {
    await viewButtons768[0].click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(outputDir, 'modal-768.png'),
      fullPage: false,
    });
    console.log('✓ Modal screenshot at 768px');
  }

  // Reduced motion check
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('http://localhost:4000/education');
  await page.waitForTimeout(1500);
  await page.screenshot({
    path: path.join(outputDir, 'education-reduced-motion-768.png'),
    fullPage: false,
  });
  console.log('✓ Education reduced-motion screenshot');

  // Keyboard focus-visible check
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('http://localhost:4000/dashboard');
  await page.waitForTimeout(1500);

  // Press Tab to focus first interactive element
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(outputDir, 'dashboard-focus-visible-768.png'),
    fullPage: false,
  });
  console.log('✓ Dashboard focus-visible screenshot');

  await browser.close();
  console.log(`\n✅ All screenshots saved to: ${outputDir}`);
}

captureScreenshots().catch(err => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
