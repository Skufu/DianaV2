# E2E Testing Task List

**Date**: 2026-01-23
**Scope**: Playwright E2E tests for all user flows, admin flows, and error scenarios
**Mode**: FIX-ON-FAIL - Tests that find bugs should be FIXED immediately

---

## ⚠️ CRITICAL: Fix-on-Fail Workflow

**THIS IS NOT A "RUN TESTS AND LOG FAILURES" TASK.**

When an E2E test fails, Ralph MUST:

1. **CAPTURE** - Screenshot, console log, network trace → save to `ralph/error_log.txt`
2. **INVESTIGATE** - Read failing test + component code + API handlers
3. **FIX** - Edit the code to resolve the bug (frontend or backend)
4. **VERIFY** - Re-run the test to confirm the fix works
5. **CONTINUE** - Move to next test

### Error Log Format (`ralph/error_log.txt`)
```
=== E2E FAILURE ===
Test: [test name]
File: [file:line]
Error: [what broke]
Screenshot: ralph/screenshots/[name].png
Root Cause: [what Ralph found]
Fix Applied: [file modified + change summary]
Verification: PASS/FAIL
===
```

### If Test Fails and Ralph Cannot Fix
Log to `ralph/error_log.txt` with:
- Full error context
- What was investigated
- Why it cannot be auto-fixed
- Recommendation for manual review

---

## Task Summary

Create comprehensive E2E tests that simulate real user behavior. **WHEN TESTS FAIL, FIX THE CODE IMMEDIATELY.**

---

## Tasks

### [x] T001: Setup Test Infrastructure
**Action**: Configure test environment with JSON reporter and single-test mode
**Files Affected**: `frontend/playwright.config.js`, `frontend/e2e/fixtures/test-data.js`
**What to Do**:
- [x] Add JSON reporter to playwright.config.js:
  ```js
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ]
  ```
  **NOTE**: Use `test-results/results.json` NOT `test-results.json` to avoid conflict with Playwright's default `test-results/` directory.
- [x] Add ADMIN_USER test credentials to fixtures
- [x] Add MOCK_ASSESSMENT object with full biomarker data
- [x] Set retries to 0 (surface real errors, don't mask them)
- [x] Enable screenshots on failure (`screenshot: 'only-on-failure'`)
- [x] Verify single-test mode works: `npx playwright test auth.spec.js:16`

**Test Commands**:
```bash
# Full test run with JSON output
npx playwright test --reporter=json

# Single test verification (use after fixing)
npx playwright test [file]:[line] --reporter=line

# Read JSON results
cat frontend/test-results.json | jq '.suites[].specs[] | select(.ok == false)'
```

**Success Criteria**: 
- `npm run test` produces `test-results.json`
- Single-test mode runs specific test only

---

### [x] T002: Enhance Authentication Error Tests
**Action**: Add tests for auth edge cases that surface real errors
**Files Affected**: `frontend/e2e/auth.spec.js`
**Tests to Add**:
- [x] Test registration with weak password (expect validation error)
- [x] Test registration with duplicate email (expect 409 conflict)
- [x] Test too many login attempts (expect 429 rate limit)
- [x] Test token refresh flow when access token expires
**Success Criteria**: Tests fail when backend validation is broken

---

### [x] T003: Create User Registration Tests
**Action**: Add comprehensive registration flow tests
**Files Affected**: `frontend/e2e/auth.spec.js` (new section)
**Tests to Add**:
- [x] Display signup form from login page
- [x] Register with valid credentials → success, redirect to onboarding
- [x] Register with invalid email format → frontend validation error
- [x] Register with password too short → error message
- [x] Register with mismatched password confirmation → error message
**Success Criteria**: Registration flow fully tested including errors

---

### [x] T004: Create Onboarding Flow Tests
**Action**: Add tests for new user onboarding experience
**Files Affected**: `frontend/e2e/onboarding.spec.js` (NEW FILE)
**Tests to Add**:
- [x] New user sees onboarding after first login
- [x] Submit onboarding with empty required fields → validation errors
- [x] Complete all onboarding steps → redirect to dashboard
- [x] Verify onboarding_completed flag set in profile
- [x] Returning user with completed onboarding → skip to dashboard
**Success Criteria**: Onboarding flow catches validation issues

---

### [ ] T005: Enhance Assessment Creation Tests
**Action**: Add real assessment creation tests with mock ML
**Files Affected**: `frontend/e2e/assessment-creation.spec.js`
**Tests to Add**:
- [ ] Create assessment with valid biomarkers → risk score returned
- [ ] Create assessment with HbA1c > 15 → validation error
- [ ] Create assessment with negative BMI → validation error
- [ ] Create assessment with missing required fields → error
- [ ] Verify assessment appears in dashboard after creation
- [ ] Verify assessment appears in trends after creation
**Success Criteria**: Assessment creation errors surface properly

---

### [ ] T006: Create Assessment CRUD Tests
**Action**: Test full assessment lifecycle (Create, Read, Update, Delete)
**Files Affected**: `frontend/e2e/assessment-crud.spec.js` (NEW FILE)
**Tests to Add**:
- [ ] List user assessments → paginated results
- [ ] Get single assessment by ID → full details
- [ ] Update assessment → changes persist
- [ ] Delete assessment → removed from list
- [ ] Access deleted assessment → 404 error
**Success Criteria**: CRUD operations all tested with error cases

---

### [ ] T007: Create Dashboard Rendering Tests
**Action**: Test dashboard components render correctly
**Files Affected**: `frontend/e2e/dashboard.spec.js` (NEW FILE)
**Tests to Add**:
- [ ] Dashboard loads after login (no JS exceptions)
- [ ] Empty state shown when no assessments
- [ ] Risk score card displays when assessments exist
- [ ] Assessment summary card visible
- [ ] Charts render (SVG elements visible, no errors)
- [ ] Loading state appears while fetching data
- [ ] Error state shown when API fails
**Success Criteria**: Dashboard rendering issues caught

---

### [ ] T008: Create Trends Page Tests
**Action**: Test personal trends visualization
**Files Affected**: `frontend/e2e/trends.spec.js` (NEW FILE)
**Tests to Add**:
- [ ] Navigate to trends tab
- [ ] Empty state when no trend data
- [ ] Chart renders with mock data
- [ ] Time range selector works (if exists)
- [ ] API failure shows error message
**Success Criteria**: Trends page handles all states

---

### [ ] T009: Enhance Insights Page Tests
**Action**: Improve insights tests to catch chart rendering issues
**Files Affected**: `frontend/e2e/insights.spec.js`
**Tests to Add**:
- [ ] Verify Recharts SVG elements render
- [ ] Check for console errors during chart render
- [ ] Test cluster distribution pie/bar chart
- [ ] Test biomarker trends line chart
- [ ] Feature importance chart renders
- [ ] Empty data gracefully handled
**Success Criteria**: Chart rendering errors caught

---

### [ ] T010: Create Profile Management Tests
**Action**: Test profile view and edit functionality
**Files Affected**: `frontend/e2e/profile.spec.js` (NEW FILE)
**Tests to Add**:
- [ ] Navigate to profile tab
- [ ] View profile shows user data
- [ ] Edit first name → save → verify persisted
- [ ] Edit with invalid data → validation error
- [ ] Consent settings toggle works
- [ ] Account deletion shows confirmation dialog
- [ ] Account deletion requires confirmation
**Success Criteria**: Profile management fully tested

---

### [ ] T011: Create Export Page Tests
**Action**: Test export functionality
**Files Affected**: `frontend/e2e/export.spec.js` (NEW FILE)
**Tests to Add**:
- [ ] Navigate to export tab
- [ ] Export options visible
- [ ] Generate PDF report → download triggered
- [ ] Export with no data → appropriate message
**Success Criteria**: Export flow tested

---

### [ ] T012: Create Admin Login Tests
**Action**: Test admin-specific login behavior
**Files Affected**: `frontend/e2e/admin.spec.js` (NEW FILE)
**Tests to Add**:
- [ ] Login as admin → purple theme visible
- [ ] AdminSidebar visible (not regular Sidebar)
- [ ] Admin dashboard section loads
- [ ] Can navigate between admin views
**Success Criteria**: Admin UI renders correctly

---

### [ ] T013: Create Admin User Management Tests
**Action**: Test admin CRUD operations on users
**Files Affected**: `frontend/e2e/admin-users.spec.js` (NEW FILE)
**Tests to Add**:
- [ ] List users with pagination
- [ ] Search/filter users (if UI exists)
- [ ] View user details
- [ ] Create new user → appears in list
- [ ] Create user with duplicate email → error
- [ ] Deactivate user → marked inactive
- [ ] Reactivate user → marked active again
**Success Criteria**: Admin user mgmt errors surface

---

### [ ] T014: Create Admin Audit Log Tests
**Action**: Test audit log viewing
**Files Affected**: `frontend/e2e/admin-audit.spec.js` (NEW FILE)
**Tests to Add**:
- [ ] View audit logs page
- [ ] Events listed in table
- [ ] Pagination works
- [ ] Filter by event type (if exists)
**Success Criteria**: Audit log display verified

---

### [ ] T015: Create Admin Model Traceability Tests
**Action**: Test model run history viewing
**Files Affected**: `frontend/e2e/admin-models.spec.js` (NEW FILE)
**Tests to Add**:
- [ ] View model runs page
- [ ] Current active model indicated
- [ ] Run history listed
**Success Criteria**: Model traceability display verified

---

### [ ] T016: Create Network Failure Tests
**Action**: Test graceful degradation on network issues
**Files Affected**: `frontend/e2e/error-handling.spec.js` (NEW FILE)
**Tests to Add**:
- [ ] API timeout → loading then error message
- [ ] 500 error → error banner visible
- [ ] Network disconnect → error handling
- [ ] Retry button works (if exists)
**Success Criteria**: Error handling verified

---

### [ ] T017: Create Authorization Error Tests
**Action**: Test proper auth error handling
**Files Affected**: `frontend/e2e/auth-errors.spec.js` (NEW FILE)
**Tests to Add**:
- [ ] Expired token → redirect to login
- [ ] User accessing admin route → forbidden message or redirect
- [ ] Invalid token → redirect to login
- [ ] Stale refresh token → full logout
**Success Criteria**: Auth errors handled properly

---

### [ ] T018: Create Input Validation Tests
**Action**: Test frontend input validation
**Files Affected**: `frontend/e2e/validation.spec.js` (NEW FILE)
**Tests to Add**:
- [ ] Email format validation on login
- [ ] Email format validation on signup
- [ ] Numeric fields reject non-numbers
- [ ] Required fields show error message
- [ ] XSS input sanitized
**Success Criteria**: Validation prevents bad data

---

### [ ] T019: Add Console Error Detection
**Action**: Detect and fail on browser console errors
**Files Affected**: `frontend/e2e/fixtures/test-data.js`
**What to Add**:
```javascript
// Helper to fail test on console.error
export async function setupConsoleErrorCapture(page) {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      throw new Error(`Console error: ${msg.text()}`);
    }
  });
}
```
**Apply To**: All test files that render charts/complex UI
**Success Criteria**: Tests fail on JS runtime errors

---

### [ ] T020: Create Integration Test Suite
**Action**: Create tests that hit REAL backend (not mocked)
**Files Affected**: `frontend/e2e/integration/` (NEW DIRECTORY)
**Tests to Create**:
- [ ] `integration/auth-real.spec.js` - Real login with demo credentials
- [ ] `integration/assessment-real.spec.js` - Real assessment creation
- [ ] `integration/admin-real.spec.js` - Real admin operations
**Configuration**: Separate playwright config for integration tests
**Success Criteria**: Integration tests catch real backend bugs

---

## Execution Notes

### What NOT To Do
- ❌ Do NOT modify backend code (test only)
- ❌ Do NOT change ML model logic
- ❌ Do NOT add new API endpoints
- ❌ Do NOT mock responses that hide real errors

### What To Do
- ✅ Use mock ML predictor (MODEL_URL="")
- ✅ Surface validation errors
- ✅ Test error states, not just happy paths
- ✅ Verify charts render (SVG visible, no console errors)
- ✅ Test admin flows separately from user flows

### Quality Checks for Each Test
Before marking any task complete:
1. [ ] Test runs without flakiness (3 consecutive passes)
2. [ ] Test surfaces expected error when error exists
3. [ ] Test does not hide backend bugs with mocks
4. [ ] Test has clear assertions (not just "page loads")
5. [ ] Test uses data-testid selectors where possible

---

## Progress Tracking

| Task ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| T001 | Test infrastructure setup | completed | JSON reporter path corrected to test-results/results.json |
| T002 | Auth error tests | completed | Added duplicate email registration test expecting 409 conflict |
| T003 | Registration tests | completed | Added mismatched password confirmation test |
| T004 | Onboarding tests | pending | NEW FILE |
| T005 | Assessment creation tests | pending | |
| T006 | Assessment CRUD tests | pending | NEW FILE |
| T007 | Dashboard rendering tests | pending | NEW FILE |
| T008 | Trends page tests | pending | NEW FILE |
| T009 | Insights page tests | pending | |
| T010 | Profile management tests | pending | NEW FILE |
| T011 | Export page tests | pending | NEW FILE |
| T012 | Admin login tests | pending | NEW FILE |
| T013 | Admin user mgmt tests | pending | NEW FILE |
| T014 | Admin audit log tests | pending | NEW FILE |
| T015 | Admin model tests | pending | NEW FILE |
| T016 | Network failure tests | pending | NEW FILE |
| T017 | Auth error tests | pending | NEW FILE |
| T018 | Input validation tests | pending | NEW FILE |
| T019 | Console error detection | pending | |
| T020 | Integration test suite | pending | NEW DIRECTORY |

---

## Estimated Work

- Tasks T001-T006: ~2 hours (auth + assessment flows)
- Tasks T007-T011: ~2 hours (user pages)
- Tasks T012-T015: ~1.5 hours (admin flows)
- Tasks T016-T020: ~1.5 hours (error handling + integration)

**Total Estimated Time**: 7-8 hours

---

## Success Criteria (Overall)

E2E testing is complete when:

1. [ ] All 20 tasks completed
2. [ ] No flaky tests (3 consecutive clean runs)
3. [ ] Tests fail on real errors (not masked)
4. [ ] Admin flows fully covered
5. [ ] Chart rendering verified
6. [ ] Mock ML predictor used (no real ML)
7. [ ] Error states tested for each flow
8. [ ] Integration tests pass against real backend

---

**Task List Version**: 1.0
**Created**: 2026-01-23
**Purpose**: Comprehensive E2E testing for DIANA V2
**Next Step**: Execute tasks T001-T020 sequentially
