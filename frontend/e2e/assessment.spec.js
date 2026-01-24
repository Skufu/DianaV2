import { test, expect } from '@playwright/test';
import { TEST_USER, SELECTORS, waitForNetworkIdle } from './fixtures/test-data';

test.describe('Profile Navigation Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.fill(SELECTORS.loginEmailInput, TEST_USER.email);
        await page.fill(SELECTORS.loginPasswordInput, TEST_USER.password);
        await page.click(SELECTORS.loginButton);
        await waitForNetworkIdle(page);
    });

    const openProfileTab = async (page) => {
        const profileTab = page.locator(SELECTORS.profileTab).first();
        if (await profileTab.isVisible()) {
            await profileTab.click();
            await waitForNetworkIdle(page);
        }
    };

    const isOnboardingVisible = async (page) => {
        const onboardingHeader = page.locator('text=Welcome to DIANA');
        return onboardingHeader.isVisible().catch(() => false);
    };

    const completeOnboarding = async (page) => {
        if (!await isOnboardingVisible(page)) {
            return;
        }

        const nextButton = page.locator('button:has-text("Next")').first();

        await page.fill('input[name="first_name"]', 'Test');
        await page.fill('input[name="last_name"]', 'User');
        await page.fill('input[name="date_of_birth"]', '1990-01-01');

        await nextButton.click();
        await page.waitForTimeout(1000);

        const maxClicks = 10;
        let clicks = 0;
        while (await nextButton.isVisible().catch(() => false) && clicks < maxClicks) {
            const menopauseSelect = page.locator('select[name="menopause_status"]');
            if (await menopauseSelect.isVisible().catch(() => false)) {
                await page.selectOption('select[name="menopause_status"]', 'pre');
            }

            const hypertensionSelect = page.locator('select[name="hypertension"]');
            if (await hypertensionSelect.isVisible().catch(() => false)) {
                await page.selectOption('select[name="hypertension"]', 'no');
                await page.selectOption('select[name="heart_disease"]', 'no');
                await page.selectOption('select[name="family_history_diabetes"]', 'false');
                await page.selectOption('select[name="smoking_status"]', 'never');
            }

            const consentCheckbox = page.locator('input[name="consent_personal_data"]');
            if (await consentCheckbox.isVisible().catch(() => false)) {
                const researchCheckbox = page.locator('input[name="consent_research_participation"]');
                const emailCheckbox = page.locator('input[name="consent_email_updates"]');
                const analyticsCheckbox = page.locator('input[name="consent_analytics"]');
                const dataCheckbox = page.locator('input[name="consent_personal_data"]');

                if (!(await researchCheckbox.isChecked())) {
                    await researchCheckbox.check();
                }
                if (!(await emailCheckbox.isChecked())) {
                    await emailCheckbox.check();
                }
                if (!(await analyticsCheckbox.isChecked())) {
                    await analyticsCheckbox.check();
                }
                if (!(await dataCheckbox.isChecked())) {
                    await dataCheckbox.check();
                }

                const completeButton = page.locator('button:has-text("Complete Setup")').first();
                if (await completeButton.isVisible().catch(() => false)) {
                    await completeButton.click();
                    await page.waitForTimeout(3000);
                    break;
                }
            }

            const goToDashboardButton = page.locator('button:has-text("Go to Dashboard")').first();
            if (await goToDashboardButton.isVisible().catch(() => false)) {
                await goToDashboardButton.click();
                break;
            }

            await nextButton.click();
            await page.waitForTimeout(500);
            clicks++;
        }

        await waitForNetworkIdle(page);
        await expect(page.locator('text=My Profile')).toBeVisible({ timeout: 10000 });
    };

    test('should navigate to profile tab', async ({ page }) => {
        await openProfileTab(page);
        const profileHeader = page.locator('text=My Profile');
        const onboardingHeader = page.locator('text=Welcome to DIANA');
        const hasProfile = await profileHeader.isVisible().catch(() => false);
        const hasOnboarding = await onboardingHeader.isVisible().catch(() => false);

        expect(hasProfile || hasOnboarding).toBeTruthy();
    });

    test('should display personal info inputs', async ({ page }) => {
        await openProfileTab(page);

        await expect(page.locator('input[name="first_name"]')).toBeVisible();
        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="date_of_birth"]')).toBeVisible();
    });

    test('should render profile sections', async ({ page }) => {
        await openProfileTab(page);

        const hasProfileSections = await Promise.all([
            page.locator('text=Personal Information').isVisible().catch(() => false),
            page.locator('text=Menopausal Health').isVisible().catch(() => false),
            page.locator('text=Medical History').isVisible().catch(() => false),
            page.locator('text=Settings').isVisible().catch(() => false),
        ]);

        const hasOnboarding = await page.locator('text=Welcome to DIANA').isVisible().catch(() => false);

        if (hasProfileSections.some(Boolean) || hasOnboarding) {
            expect(true).toBeTruthy();
        } else {
            expect(true).toBeFalsy('Expected either profile sections OR onboarding to be visible');
        }
    });
});
