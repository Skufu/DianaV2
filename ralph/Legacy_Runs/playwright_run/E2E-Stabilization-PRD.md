# PRD: E2E Test Suite Stabilization - Phase 2

## Overview
Stabilize the remaining 17 Playwright E2E test files to ensure they work correctly against the real backend (running at `localhost:8080`). Tests should validate frontend-backend integration without excessive mocking.Remember that we are making the test to find issues in the backend/and frontend. Carefully analyze if you think the backend is the problem or frontend. IF you think the backend is the problem, then let it be an error. IF you think the frontend is the problem, then let it be an error. All we are doing is to stabilize the e2e tests. 

Backend is currently running right now. 

## Background
- **Completed**: Admin tests (4 files) and integration tests (2 files) have been fixed
- **Remaining**: 17 test files covering auth, user features, assessments, exports, and more
- **Key Issue Pattern**: Invalid Playwright selectors (using `text=X, text=Y` syntax which is invalid)

## Success Criteria
1. All 17 test files pass when run against the real backend
2. Tests use valid Playwright selector syntax
3. Tests have proper timing (wait for elements/API responses before assertions)
4. No hardcoded mock data that conflicts with real backend responses

---

## Technical Requirements

### Backend Prerequisites
- Backend running at `http://localhost:8080`
- Database seeded with migration `0006_add_mock_data.sql`
- Test users available:
  - Admin: `admin@diana.app` / `admin123`
  - Demo: `demo@diana.app` / `demo123`

### Common Fix Patterns

#### 1. Invalid Selector Syntax
```javascript
// ❌ WRONG - Comma-separated text selectors
page.locator('text=Foo, text=Bar')
page.locator('h2:has-text("X"), text=Y')

// ✅ CORRECT - Use .or() for alternatives
page.locator('text=Foo').or(page.locator('text=Bar'))

// ✅ CORRECT - Use simple text selector
page.locator('text=Foo')
```

#### 2. Timing Issues
```javascript
// ❌ WRONG - API call immediately after login
await page.click('button:has-text("Sign In")');
const response = await page.evaluate(() => fetch('/api/...'));

// ✅ CORRECT - Wait for UI state before API calls
await page.click('button:has-text("Sign In")');
await waitForNetworkIdle(page);
await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 15000 });
await page.waitForTimeout(500); // Ensure token stored
```

#### 3. Flexible Assertions
```javascript
// ❌ WRONG - Exact match on dynamic data
expect(response.data.total).toBe(100);

// ✅ CORRECT - Check structure, not exact values
expect(response.data).toHaveProperty('total');
expect(Array.isArray(response.data.data)).toBe(true);
```

---

## Test Files by Priority

### Priority 1: Auth & Core (CRITICAL)
| File | Purpose | Key Issues to Check |
|------|---------|---------------------|
| `auth.spec.js` | Login/logout flow | Selector syntax, token storage |
| `auth-errors.spec.js` | Error handling | Error message matching |
| `dashboard.spec.js` | Main dashboard | Data loading, waiting |
| `navigation.spec.js` | Sidebar navigation | Click handlers, URL routing |
| `profile.spec.js` | User profile | Form interactions |

### Priority 2: Features (HIGH)
| File | Purpose | Key Issues to Check |
|------|---------|---------------------|
| `assessment.spec.js` | Assessment viewing | Data display |
| `assessment-creation.spec.js` | Creating assessments | Form submission, API calls |
| `assessment-crud.spec.js` | CRUD operations | Edit/delete flows |
| `onboarding.spec.js` | New user onboarding | Multi-step form |

### Priority 3: Analytics & Export (MEDIUM)
| File | Purpose | Key Issues to Check |
|------|---------|---------------------|
| `trends.spec.js` | Health trends charts | Chart rendering |
| `insights.spec.js` | AI insights | Async data loading |
| `export.spec.js` | Data export | File download handling |

### Priority 4: Quality & Edge Cases (LOW)
| File | Purpose | Key Issues to Check |
|------|---------|---------------------|
| `validation.spec.js` | Form validation | Error message display |
| `error-handling.spec.js` | Error states | Network error simulation |
| `security-xss.spec.js` | XSS prevention | Input sanitization |
| `performance.spec.js` | Load time testing | Timing assertions |
| `visual-regression.spec.js` | Screenshot comparison | Snapshot matching |

---

## Validation Process

For each test file:
1. Run: `npx playwright test <filename> --reporter=list`
2. Fix any selector syntax errors
3. Add proper waits/timeouts where needed
4. Re-run until passing
5. Commit with message: `fix(e2e): stabilize <test-name>`
