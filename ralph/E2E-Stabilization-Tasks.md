# E2E Test Stabilization - Task List

> **Instructions for AI Agent**: Complete each task in order. Run the test, fix issues, verify with actual test run. Mark tasks with `[x]` when tests pass.

---

## Prerequisites
- [x] Backend running at localhost:8080
- [x] Frontend dev server running at localhost:4000
- [x] Database seeded

---

## Phase 1: Auth Tests (CRITICAL)

- [x] Fix auth.spec.js:131 - should show error for invalid credentials
- [x] Fix auth.spec.js:171 - should prevent double submit while login is loading
- [x] Fix auth-errors.spec.js:61 - should redirect to login with invalid token format

---

## Phase 2: Assessment Tests (HIGH)

- [x] Fix assessment.spec.js:27 - should navigate to profile tab
- [x] Fix assessment.spec.js:37 - should display personal info inputs
- [x] Fix assessment.spec.js:44 - should render profile sections
- [x] Fix assessment-creation.spec.js:11 - should login → create assessment → verify authenticated

---

## Phase 3: Profile Tests (HIGH)

- [x] Fix profile.spec.js:142 - should navigate to profile tab
- [x] Fix profile.spec.js:150 - should display user data in profile form
- [x] Fix profile.spec.js:170 - should edit first name, save, and verify persisted
- [x] Fix profile.spec.js:189 - should show validation error when editing with invalid data
- [x] Fix profile.spec.js:212 - should toggle consent settings and save
- [x] Fix profile.spec.js:232 - should show confirmation dialog when clicking delete
- [x] Fix profile.spec.js:245 - should delete account and redirect to login

---

## Phase 4: Navigation Tests (HIGH)

- [x] Fix navigation.spec.js:131 - should show primary navigation items
- [x] Fix navigation.spec.js:147 - should hide sidebar on profile tab
- [x] Fix navigation.spec.js:154 - should navigate to education and export screens
- [x] Fix navigation.spec.js:163 - should open health trends and show empty state
- [x] Fix navigation.spec.js:170 - should show profile error state when profile API fails
- [x] Fix navigation.spec.js:192 - should render dashboard error state when assessments fail
- [x] Fix navigation.spec.js:208 - should send user to onboarding when profile is incomplete

---

## Phase 5: Error Handling Tests (MEDIUM)

- [x] Fix error-handling.spec.js:40 - API timeout → loading then error message
- [x] Fix error-handling.spec.js:63 - 500 Internal Server Error → error banner visible
- [x] Fix error-handling.spec.js:107 - Multiple API failures → all error states show correctly
- [x] Fix error-handling.spec.js:132 - Slow network response → loading state persists
- [x] Fix error-handling.spec.js:194 - Retry button works when loading fails

---

## Phase 6: Export Tests (MEDIUM)

- [x] Fix export.spec.js:148 - should navigate to export tab
- [ ] Fix export.spec.js:159 - should display export options visible
- [ ] Fix export.spec.js:190 - should display filter options
- [ ] Fix export.spec.js:208 - should show data privacy notice
- [ ] Fix export.spec.js:219 - should generate PDF report and trigger download
- [ ] Fix export.spec.js:248 - should show appropriate message when no data to export

---

## Phase 7: Trends Tests (MEDIUM)

- [ ] Fix trends.spec.js:70 - should navigate to trends tab
- [ ] Fix trends.spec.js:82 - should render charts with mock data
- [ ] Fix trends.spec.js:91 - should work with time range selector
- [ ] Fix trends.spec.js:112 - should navigate from dashboard to trends via quick action button

---

## Phase 8: Integration Tests (MEDIUM)

- [ ] Fix integration/auth-real.spec.js:26 - should login successfully with demo user credentials
- [ ] Fix integration/auth-real.spec.js:81 - should logout successfully and clear tokens
- [ ] Fix integration/auth-real.spec.js:106 - should persist session after page reload
- [ ] Fix integration/auth-real.spec.js:120 - should redirect to login after token expires
- [ ] Fix integration/assessment-real.spec.js:26 - should create assessment with valid biomarkers via API
- [ ] Fix integration/assessment-real.spec.js:70 - should fail validation with HbA1c > 15 via API
- [ ] Fix integration/assessment-real.spec.js:107 - should fail validation with missing required fields via API
- [ ] Fix integration/assessment-real.spec.js:212 - should fetch user assessments after creation

---

## Phase 9: Quality Tests (LOW)

- [ ] Fix validation.spec.js:673 - XSS input sanitized
- [ ] Fix visual-regression.spec.js:183 - should capture all extracted components individually

---

## Final

- [ ] Run full suite: npx playwright test --reporter=list
- [ ] All 46 failing tests pass

---

## Reference

```javascript
const ADMIN_USER = { email: 'admin@diana.app', password: 'admin123' };
const DEMO_USER = { email: 'demo@diana.app', password: 'demo123' };
import { waitForNetworkIdle } from './fixtures/test-data';
```
