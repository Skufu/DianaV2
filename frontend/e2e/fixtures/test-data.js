/**
 * Test fixtures and data for E2E tests
 */

export const TEST_USER = {
    email: 'clinician@example.com',
    password: 'password123',
    name: 'E2E Test User',
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
    logoutButton: '[data-testid="logout-button"], button:has-text("Logout")',

    // Navigation
    sidebar: '[class*="sidebar"], nav',
    dashboardTab: '[data-testid="dashboard-tab"], button:has-text("Dashboard")',
    patientsTab: '[data-testid="patients-tab"], button:has-text("Patients")',
    insightsTab: '[data-testid="insights-tab"], button:has-text("Analytics")',

    // Dashboard
    patientCount: '[data-testid="patient-count"]',
    startAssessmentButton: 'button:has-text("Start Assessment"), button:has-text("New Assessment")',

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
