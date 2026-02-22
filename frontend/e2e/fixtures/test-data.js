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
    bmi: 25.0,
    age: 55,
    ldl: 130,
    hdl: 50,
    triglycerides: 150,
    smoking_status: 'Never',
    physical_activity: 'Moderate',
    alcohol: 'None',
};

export const TEST_PROFILE = {
    name: 'E2E Test User',
    first_name: 'E2E Test',
    last_name: 'User',
    email: 'clinician@example.com',
    onboarding_completed: true,
};

export const TEST_TRENDS = {
    dates: [],
    bmi_values: [],
    ldl_values: [],
    hdl_values: [],
    triglycerides_values: [],
    risk_scores: [],
};

export const MOCK_TRENDS_DATA = {
    dates: ['2024-01-15', '2024-02-15', '2024-03-15'],
    bmi_values: [25.0, 24.5, 25.5],
    ldl_values: [130, 125, 135],
    hdl_values: [50, 52, 48],
    triglycerides_values: [150, 145, 155],
    risk_scores: ['low', 'low', 'medium'],
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
    ldl: 130,
    hdl: 55,
    triglycerides: 160,
    bmi: 27.8,
    activity: 'moderate',
    smoking: 'never',
    familyHistory: true,
};

export const SELECTORS = {
    // Auth
    loginEmailInput: 'input[type="email"]',
    loginPasswordInput: 'input[type="password"]',
    loginButton: '[data-testid="login-submit-button"]',
    logoutButton: '[data-testid="logout-button"], button:has-text("Log Out"), button:has-text("Logout")',
    brandLogo: 'img[alt="DIANA Logo"]',

    // Navigation
    sidebar: 'nav',
    dashboardTab: '[data-testid="dashboard-tab"], button:has-text("Dashboard")',
    profileTab: '[data-testid="profile-tab"], button:has-text("My Profile")',
    trendsTab: 'button:has-text("Health Trends")',
    insightsTab: '[data-testid="insights-tab"], button:has-text("Insights")',
    educationTab: '[data-testid="education-tab"], button:has-text("Education")',
    exportTab: '[data-testid="export-tab"], button:has-text("Export Data")',

    // Dashboard
    patientCount: '[data-testid="patient-count"]',
    startAssessmentButton: 'button:has-text("Log Assessment"), button:has-text("Start Assessment"), button:has-text("New Assessment")',

    // Patient form
    patientNameInput: 'input[name="first_name"], input[name="last_name"], input[placeholder="Jane"], input[placeholder="Doe"], input[name="name"], input[placeholder*="name"]',
    patientAgeInput: 'input[name="date_of_birth"], input[type="date"], input[name="age"], input[placeholder*="age"]',
    nextStepButton: 'button:has-text("Next"), button:has-text("Continue")',
    submitButton: 'button:has-text("Complete Setup"), button:has-text("Submit"), button[type="submit"]',

    // Results
    riskScore: '[data-testid="risk-score"], [class*="risk"]',
    clusterBadge: '[data-testid="cluster"], [class*="cluster"]',
};

/**
 * Wait for Framer Motion animations to complete
 */
export async function waitForAnimations(page, timeout = 1000) {
    // Wait for a small amount of time for animations to settle
    // In production, we could check for presence of animating classes if we had them
    await page.waitForTimeout(timeout);
}

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
