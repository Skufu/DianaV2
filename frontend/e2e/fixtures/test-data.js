/**
 * Test fixtures and data for E2E tests
 */

export const TEST_USER = {
    email: 'clinician@example.com',
    password: 'password123',
    name: 'E2E Test User',
};

export const ADMIN_USER = {
    email: 'admin@diana.app',
    password: 'admin123',
    name: 'E2E Admin User',
};

export const NEW_USER = {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'e2e-test-new@diana.app',
    password: 'TestPass123!',
    confirmPassword: 'TestPass123!',
};

export const MOCK_ASSESSMENT = {
    hba1c: 5.8,
    fbs: 100,
    bmi: 25.0,
    cholesterol: 200,
    ldl: 130,
    hdl: 50,
    triglycerides: 150,
    systolic_bp: 120,
    diastolic_bp: 80,
};

export const TEST_PROFILE = {
    name: 'E2E Test User',
    email: 'clinician@example.com',
};

export const TEST_TRENDS = {
    biomarkerHistory: [],
    clusterHistory: [],
    riskLevels: null,
};

export const createMockJwt = (payload = {}) => {
    const basePayload = {
        role: 'user',
        is_admin: false,
        user_id: 'e2e-user',
        ...payload,
    };
    const encodedPayload = Buffer.from(JSON.stringify(basePayload)).toString('base64');
    return `test.${encodedPayload}.signature`;
};

export const TEST_PATIENT = {
    name: 'John Test Patient',
    age: 55,
    height: 175,
    weight: 85,
    systolic: 130,
    diastolic: 85,
    cholesterol: 210,
    ldl: 130,
    hdl: 55,
    triglycerides: 160,
    fbs: 115,
    hba1c: 6.2,
    activity: 'moderate',
    smoking: 'never',
    familyHistory: true,
};

export const SELECTORS = {
    // Auth
    loginEmailInput: 'input[type="email"]',
    loginPasswordInput: 'input[type="password"]',
    loginButton: 'button:has-text("Sign In"), button:has-text("Login")',
    logoutButton: '[data-testid="logout-button"], button:has-text("Log Out"), button:has-text("Logout")',
    brandLogo: 'img[alt="DIANA Logo"]',

    // Navigation
    sidebar: '[class*="sidebar"], nav',
    dashboardTab: '[data-testid="dashboard-tab"], button:has-text("Dashboard")',
    profileTab: '[data-testid="profile-tab"], button:has-text("My Profile")',
    trendsTab: '[data-testid="trends-tab"], button:has-text("Health Trends")',
    insightsTab: '[data-testid="insights-tab"], button:has-text("Insights")',
    educationTab: '[data-testid="education-tab"], button:has-text("Education")',
    exportTab: '[data-testid="export-tab"], button:has-text("Export Data")',

    // Dashboard
    patientCount: '[data-testid="patient-count"]',
    startAssessmentButton: 'button:has-text("Log Assessment"), button:has-text("Start Assessment"), button:has-text("New Assessment")',

    // Patient form
    patientNameInput: 'input[name="name"], input[placeholder*="name"]',
    patientAgeInput: 'input[name="age"], input[placeholder*="age"]',
    nextStepButton: 'button:has-text("Next"), button:has-text("Continue")',
    submitButton: 'button:has-text("Submit"), button[type="submit"]',

    // Results
    riskScore: '[data-testid="risk-score"], [class*="risk"]',
    clusterBadge: '[data-testid="cluster"], [class*="cluster"]',
};

/**
 * Wait for network to be idle (useful after form submissions)
 */
export async function waitForNetworkIdle(page, timeout = 5000) {
    await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page, name) {
    await page.screenshot({
        path: `./e2e/screenshots/${name}.png`,
        fullPage: true
    });
}
