# E2E Testing PRD
## Product Requirements Document for Comprehensive End-to-End Testing

**Date**: 2026-01-23
**Purpose**: Create a comprehensive E2E test suite that simulates real user behavior and surfaces errors
**Scope**: Frontend flows, backend API transactions, error handling, and edge cases
**Tool**: Playwright

---

## Executive Summary

The DIANA V2 application needs comprehensive E2E testing that:
1. **Simulates real user behavior** - Not just happy paths
2. **Surfaces errors** - Tests should fail when things break
3. **Uses mock ML model** - Avoid ML dependency during testing
4. **Tests full transaction flows** - Login → Action → Verify Result
5. **Covers both user and admin roles**

**Key Principle**: Tests should NOT always succeed. We want to catch real errors when they occur, not mask them with mocks that always return success.

---

## Phase 0: Fix-on-Fail Workflow (CRITICAL)

### The Core Loop

When an E2E test fails, Ralph does NOT just log it and move on. Ralph **fixes the bug immediately**.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FIX-ON-FAIL WORKFLOW                            │
├─────────────────────────────────────────────────────────────────────┤
│  1. RUN TEST    │  Execute Playwright test                         │
│        ↓        │                                                   │
│  2. TEST FAILS  │  Screenshot + console log + network trace        │
│        ↓        │                                                   │
│  3. LOG ERROR   │  Write to ralph/error_log.txt with full context  │
│        ↓        │                                                   │
│  4. INVESTIGATE │  Read relevant code files, trace the bug         │
│        ↓        │                                                   │
│  5. FIX BUG     │  Edit frontend/backend code to resolve issue     │
│        ↓        │                                                   │
│  6. RE-RUN TEST │  Verify the fix works                            │
│        ↓        │                                                   │
│  7. CONTINUE    │  Move to next test                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Error Logging Format

When a test fails, log to `ralph/error_log.txt`:

```
=== E2E TEST FAILURE ===
Timestamp: 2026-01-23T23:00:00+08:00
Test: "User can navigate to assessment page"
File: frontend/e2e/dashboard.spec.js:45

ERROR: Element not found: [data-testid="assessment-link"]

CONTEXT:
- User logged in successfully
- Dashboard loaded
- Clicked "New Assessment" button
- Expected: Navigate to assessment form
- Actual: Nothing happened, button click had no effect

SCREENSHOT: ralph/screenshots/dashboard-failure-001.png

INVESTIGATION:
- Button exists in DOM: YES
- Button has onClick handler: CHECKING...
- Network requests made: NONE after click

ROOT CAUSE: [TO BE FILLED BY RALPH]
FIX APPLIED: [TO BE FILLED BY RALPH]
VERIFICATION: [PASS/FAIL]
===
```

### What Ralph Must Do When Test Fails

1. **Capture Evidence**:
   - Take screenshot (`page.screenshot()`)
   - Capture console logs (`page.on('console')`)
   - Log network requests/responses
   - Save to `ralph/screenshots/` and `ralph/error_log.txt`

2. **Investigate the Cause**:
   - Read the failing test code
   - Read the component code being tested
   - Check API endpoint handlers if API call involved
   - Trace the data flow

3. **Fix the Bug**:
   - If frontend issue → Edit component/page file
   - If backend issue → Edit handler/router file
   - If API contract mismatch → Fix either side to match

4. **Verify the Fix**:
   - Re-run the same test
   - If still fails → Investigate further
   - If passes → Log success and continue

### Example Scenario

**Test**: "User can create new assessment"
**Failure**: Button click does nothing

**Investigation Log**:
```
Reading: frontend/src/components/user/Dashboard_user.jsx
Line 45: <button onClick={handleStartAssessment}>New Assessment</button>
Line 12: const handleStartAssessment = () => setActiveTab('profile');

FINDING: setActiveTab is called, but parent App.jsx 'profile' tab 
         renders UserProfile, not AssessmentForm.

Reading: frontend/src/App.jsx
Line 163: case 'profile': return <UserProfile />;

ROOT CAUSE: Assessment creation should have its own route/tab or
            be part of UserProfile component.
```

**Fix Applied**:
```
Modified: frontend/src/App.jsx
- case 'profile': return <UserProfile />;
+ case 'profile': return <UserProfile userId={userId} setActiveTab={setActiveTab} showAssessmentForm={true} />;
```

**Verification**: Re-run test → PASS

### Files for Fix-on-Fail Infrastructure

| File | Purpose |
|------|---------|
| `ralph/error_log.txt` | Running log of all failures and fixes |
| `ralph/screenshots/` | Failure screenshots for debugging |
| `ralph/fix_history.md` | Summary of all bugs found and fixed |

---

## Phase 1: Test Infrastructure Setup

### 1.1 Mock ML Server Configuration

**Problem**: Real ML server introduces flakiness and unpredictable results.

**Solution**: Configure tests to use backend's built-in mock predictor.

**Implementation**:
- Backend already has `ml.NewMockPredictor()` when `MODEL_URL` is empty
- E2E tests should target a backend instance with `MODEL_URL=""` (mock mode)
- Mock predictor returns deterministic results based on biomarker values

**Files Affected**:
- `frontend/playwright.config.js` - Configure test environment
- `frontend/e2e/fixtures/test-data.js` - Add mock predictor test data

### 1.2 Real Backend Testing Mode

**Current Problem**: All existing E2E tests mock API responses with `page.route()`.

**New Approach**: Create tests that hit the REAL backend to catch integration issues.

**Test Categories**:
1. **Mocked Tests** (existing) - Fast, isolated, for frontend logic
2. **Integration Tests** (new) - Real backend, real DB, catch real bugs

---

## Phase 2: User Flow Test Scenarios

### 2.1 Authentication Flows (Existing + Enhancements)

**Existing Coverage**: ✅
- Login form display
- Invalid credentials error
- Successful login
- Session persistence
- Logout

**Missing Tests** (to add):
- [ ] Registration with weak password (validation error)
- [ ] Registration with duplicate email (conflict error)
- [ ] Token refresh when access token expires
- [ ] Rate limiting on login attempts (should get 429)
- [ ] Session timeout handling

### 2.2 User Onboarding Flow

**Purpose**: New users must complete onboarding before accessing dashboard.

**Test Scenarios**:
| Test | Expected Behavior |
|------|-------------------|
| New user login → Onboarding appears | Redirect to onboarding form |
| Skip required fields → Validation error | Show field-level errors |
| Complete onboarding → Dashboard access | Redirect to dashboard |
| Partially complete → Resume on next login | Preserve progress |

**API Endpoints Tested**:
- `POST /api/v1/users/me/onboarding`
- `GET /api/v1/users/me/profile` (check `onboarding_completed`)

### 2.3 Assessment Creation Flow

**Purpose**: User creates a health assessment with biomarker data.

**Test Scenarios**:
| Test | Expected Behavior |
|------|-------------------|
| Submit valid biomarkers | Assessment created, risk score returned |
| Submit out-of-range HbA1c (> 15) | Validation error |
| Submit negative BMI | Validation error |
| Submit empty form | Required field errors |
| ML prediction fails | Graceful error message |
| Duplicate assessment in same day | Warning or success |

**API Endpoints Tested**:
- `POST /api/v1/users/me/assessments`
- `GET /api/v1/users/me/assessments`
- `GET /api/v1/users/me/assessments/:id`

### 2.4 Dashboard Display Flow

**Purpose**: Verify dashboard shows correct data and charts render.

**Test Scenarios**:
| Test | Expected Behavior |
|------|-------------------|
| No assessments → Empty state | "No assessments yet" message |
| Has assessments → Show summary | Risk score, last assessment date |
| Charts render without errors | No JS exceptions, SVG visible |
| Data fetching fails → Error state | Error banner, retry option |

**UI Elements to Verify**:
- Risk score display
- Assessment count
- Latest assessment summary card
- Chart components (Recharts SVG elements)

### 2.5 Insights Page Flow

**Purpose**: Verify ML visualizations and cluster data display.

**Test Scenarios**:
| Test | Expected Behavior |
|------|-------------------|
| Navigate to insights → Data loads | Charts visible |
| ML server unavailable → Banner | "ML server unavailable" message |
| Empty cluster data → Empty state | Appropriate message |
| Feature importance chart | Bars/chart elements visible |

**API Endpoints Tested**:
- `GET /api/v1/insights/cluster-distribution`
- `GET /api/v1/analytics/summary`

### 2.6 Profile Management Flow

**Purpose**: User can view and edit their profile.

**Test Scenarios**:
| Test | Expected Behavior |
|------|-------------------|
| View profile | Name, email displayed |
| Update name → Save | Success message, data persisted |
| Update consent settings | Save and verify on reload |
| Delete account → Confirmation | Show warning, require confirmation |

**API Endpoints Tested**:
- `GET /api/v1/users/me/profile`
- `PUT /api/v1/users/me/profile`
- `GET /api/v1/users/me/consent`
- `PUT /api/v1/users/me/consent`
- `DELETE /api/v1/users/me/account`

### 2.7 Export Flow

**Purpose**: User can export their assessment data.

**Test Scenarios**:
| Test | Expected Behavior |
|------|-------------------|
| Navigate to export | Export options visible |
| Download PDF | PDF file downloaded |
| No data to export → Message | "No data to export" |

---

## Phase 3: Admin Flow Test Scenarios

### 3.1 Admin Login Flow

**Purpose**: Admin users see different UI (purple theme, AdminSidebar).

**Test Scenarios**:
| Test | Expected Behavior |
|------|-------------------|
| Login as admin | Purple theme, AdminSidebar visible |
| Admin dashboard loads | System stats displayed |
| Navigate admin sections | All views render |

### 3.2 Admin User Management

**Purpose**: Admins can list, create, update, deactivate users.

**Test Scenarios**:
| Test | Expected Behavior |
|------|-------------------|
| List users → Paginated table | 10 users per page, pagination controls |
| Create user → Success | New user in list |
| Create user with existing email → Error | Conflict message |
| Deactivate user → Confirm | User marked inactive |
| Activate user → Success | User marked active |

**API Endpoints Tested**:
- `GET /api/v1/admin/users?page=1&limit=10`
- `POST /api/v1/admin/users`
- `PUT /api/v1/admin/users/:id`
- `DELETE /api/v1/admin/users/:id`

### 3.3 Audit Log Viewing

**Purpose**: Admins can view audit trail of actions.

**Test Scenarios**:
| Test | Expected Behavior |
|------|-------------------|
| View audit logs | Table with events |
| Filter by action type | Filtered results |
| Pagination works | Navigate pages |

**API Endpoints Tested**:
- `GET /api/v1/admin/audit?page=1&limit=20`

### 3.4 Model Traceability

**Purpose**: Admins can view ML model run history.

**Test Scenarios**:
| Test | Expected Behavior |
|------|-------------------|
| View model runs | Table with run history |
| See active model | Current model highlighted |

**API Endpoints Tested**:
- `GET /api/v1/admin/models`

---

## Phase 4: Error Surfacing Tests

### 4.1 Network Failure Tests

**Purpose**: Test graceful degradation when network fails.

**Test Scenarios**:
| Test | Expected Behavior |
|------|-------------------|
| API timeout | Loading spinner, then error message |
| 500 Internal Server Error | Error banner with retry option |
| Network disconnect mid-request | Error handling, state preserved |

### 4.2 Validation Error Tests

**Purpose**: Test frontend validation matches backend.

**Test Scenarios**:
| Test | Expected Behavior |
|------|-------------------|
| Invalid email format | Frontend rejects before submit |
| Short password | Frontend validation error |
| XSS in input fields | Sanitized, no script execution |

### 4.3 Authorization Error Tests

**Purpose**: Test proper handling of auth failures.

**Test Scenarios**:
| Test | Expected Behavior |
|------|-------------------|
| Expired token used | Redirect to login |
| User tries admin route | 403 Forbidden |
| Invalid token format | 401 Unauthorized |

---

## Phase 5: Test Configuration

### 5.1 Playwright Configuration

**File**: `frontend/playwright.config.js`

**Requirements**:
- Base URL pointing to test backend
- Timeout settings (30s for slow CI)
- Retry policy (0 retries to surface real errors)
- Screenshot/video on failure
- Parallel execution (isolated tests)

### 5.2 Test Data Fixtures

**File**: `frontend/e2e/fixtures/test-data.js`

**Required Test Data**:
```javascript
// Existing
export const TEST_USER = { email: 'demo@diana.app', password: 'demopassword123' };
export const ADMIN_USER = { email: 'admin@diana.app', password: 'admin123' };

// New
export const NEW_USER = { email: 'e2e-test@diana.app', password: 'TestPass123!' };
export const MOCK_ASSESSMENT = {
  hba1c: 5.8,
  fbs: 100,
  bmi: 25.0,
  cholesterol: 200,
  ldl: 130,
  hdl: 50,
  triglycerides: 150,
  systolic_bp: 120,
  diastolic_bp: 80
};
```

### 5.3 Mock ML Configuration

For tests that don't need ML, configure backend with `MODEL_URL=""`:
- Mock predictor assigns cluster based on HbA1c:
  - HbA1c < 5.7 → Low Risk
  - HbA1c 5.7-6.4 → MARD (Moderate)
  - HbA1c >= 6.5 → SIDD (High Risk)

---

## Success Criteria

E2E testing is complete when:

1. [ ] All user flows have at least 1 happy path test
2. [ ] All user flows have at least 1 error case test
3. [ ] Admin flows are covered (login, user mgmt, audit logs)
4. [ ] Tests run against real backend (not just mocks)
5. [ ] Tests surface real errors (not masked by mocks)
6. [ ] Charts/graphs render without JS exceptions
7. [ ] Mock ML predictor is used (no real ML dependency)
8. [ ] Tests can run in CI (GitHub Actions compatible)

---

## Implementation Priority

| Priority | Test Category | Effort | Impact |
|----------|---------------|--------|--------|
| **P0** | Auth flows + error cases | Low | High |
| **P0** | Assessment creation (mock ML) | Medium | High |
| **P1** | Dashboard rendering + charts | Medium | High |
| **P1** | Admin user management | Medium | Medium |
| **P2** | Profile + consent management | Low | Medium |
| **P2** | Export functionality | Low | Low |
| **P3** | Audit log viewing | Low | Low |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Tests too flaky | Use deterministic mock responses, avoid timing-based assertions |
| Real backend adds complexity | Create dedicated test DB, seed known data |
| ML dependency | Use mock predictor (MODEL_URL="") |
| CI timeout | Set appropriate timeouts, parallelize tests |

---

**Document Version**: 1.0
**Last Updated**: 2026-01-23
**Author**: AI Agent
**Status**: Ready for Task List Creation
