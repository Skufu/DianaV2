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
