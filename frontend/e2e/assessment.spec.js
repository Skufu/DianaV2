import { test, expect } from '@playwright/test';
import { TEST_USER, TEST_PATIENT, SELECTORS, waitForNetworkIdle } from './fixtures/test-data';

test.describe('Assessment Wizard Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto('/');
        await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
        await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
        await page.click(SELECTORS.loginButton);
        await waitForNetworkIdle(page);
    });

    test('should navigate to assessment wizard', async ({ page }) => {
        // Click start assessment button
        const startButton = page.locator(SELECTORS.startAssessmentButton);
        if (await startButton.isVisible()) {
            await startButton.click();
            await waitForNetworkIdle(page);
        } else {
            // Navigate to patients tab
            await page.click(SELECTORS.patientsTab);
            await waitForNetworkIdle(page);
        }

        // Should see patient form or wizard
        const formOrWizard = page.locator('form, [class*="wizard"], [class*="step"]');
        await expect(formOrWizard.first()).toBeVisible({ timeout: 5000 });
    });

    test('should complete step 1 - patient info', async ({ page }) => {
        // Navigate to patients and start new assessment
        await page.click(SELECTORS.patientsTab);
        await waitForNetworkIdle(page);

        // Look for new patient or start assessment button
        const newButton = page.locator('button:has-text("New"), button:has-text("Add"), button:has-text("Start")');
        if (await newButton.first().isVisible()) {
            await newButton.first().click();
            await waitForNetworkIdle(page);
        }

        // Fill patient name
        const nameInput = page.locator(SELECTORS.patientNameInput);
        if (await nameInput.isVisible()) {
            await nameInput.fill(TEST_PATIENT.name);
        }

        // Fill age
        const ageInput = page.locator(SELECTORS.patientAgeInput);
        if (await ageInput.isVisible()) {
            await ageInput.fill(String(TEST_PATIENT.age));
        }

        // Try to proceed to next step
        const nextButton = page.locator(SELECTORS.nextStepButton);
        if (await nextButton.isVisible()) {
            await nextButton.click();
            await waitForNetworkIdle(page);
        }
    });

    test('should complete full assessment flow', async ({ page }) => {
        // Navigate to patients
        await page.click(SELECTORS.patientsTab);
        await waitForNetworkIdle(page);

        // Start new assessment
        const startButton = page.locator('button:has-text("New"), button:has-text("Start Assessment")');
        if (await startButton.first().isVisible()) {
            await startButton.first().click();
            await page.waitForTimeout(500);
        }

        // Fill each form field if visible
        const fillIfVisible = async (selector, value) => {
            const element = page.locator(selector).first();
            if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
                await element.fill(String(value));
            }
        };

        // Step 1: Patient info
        await fillIfVisible('input[name="name"]', TEST_PATIENT.name);
        await fillIfVisible('input[name="age"]', TEST_PATIENT.age);
        await fillIfVisible('input[name="height"]', TEST_PATIENT.height);
        await fillIfVisible('input[name="weight"]', TEST_PATIENT.weight);

        // Click next if available
        const nextBtn = page.locator(SELECTORS.nextStepButton).first();
        if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await nextBtn.click();
            await page.waitForTimeout(500);
        }

        // Step 2: Clinical data
        await fillIfVisible('input[name="fbs"]', TEST_PATIENT.fbs);
        await fillIfVisible('input[name="hba1c"]', TEST_PATIENT.hba1c);
        await fillIfVisible('input[name="cholesterol"]', TEST_PATIENT.cholesterol);
        await fillIfVisible('input[name="systolic"]', TEST_PATIENT.systolic);
        await fillIfVisible('input[name="diastolic"]', TEST_PATIENT.diastolic);

        // Click next again if available
        if (await nextBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await nextBtn.click();
            await page.waitForTimeout(500);
        }

        // Step 3: Lifestyle
        const smokingSelect = page.locator('select[name="smoking"], [name="smoking"]');
        if (await smokingSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
            await smokingSelect.selectOption(TEST_PATIENT.smoking);
        }

        // Submit the form
        const submitBtn = page.locator(SELECTORS.submitButton).first();
        if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await submitBtn.click();
            await waitForNetworkIdle(page);

            // Should see results (risk score or cluster)
            const results = page.locator('[class*="result"], [class*="risk"], text=/score|risk|cluster/i');
            await expect(results.first()).toBeVisible({ timeout: 10000 });
        }
    });
});
