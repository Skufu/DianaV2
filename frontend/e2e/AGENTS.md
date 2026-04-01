# E2E TESTING KNOWLEDGE BASE

## ⚠️ ARCHIVAL NOTICE (2026-04-01)

**Status: ARCHIVED - Not actively maintained**

These E2E tests are **NOT in the CI pipeline** and are considered stale. They remain in the repository for reference purposes only.

### Why they were archived:
1. **Not in CI**: The CI workflow (`ci.yml`) only runs `npm run build` and `npm run lint` for frontend - Playwright tests were never added to CI.
2. **Browser dependencies missing**: Playwright browsers are not installed by default, requiring `npx playwright install` to run locally.
3. **Maintenance overhead**: Tests were becoming flaky due to UI changes and mock data drift.
4. **Component tests preferred**: Vitest + React Testing Library component tests (`src/**/*.test.jsx`) are the primary frontend testing strategy.

### Current frontend testing strategy:
- **Unit/Component tests**: Vitest with React Testing Library (run via `npm test`)
- **Contract tests**: Backend-frontend API contract tests (`backend/internal/http/handlers/contract_test.go`)
- **Load tests**: k6 load tests for performance validation

### To restore E2E tests (if needed):
1. Install Playwright browsers: `npx playwright install`
2. Add E2E job to `.github/workflows/ci.yml`
3. Update test fixtures to match current UI selectors
4. Fix failing tests by updating mock data and selectors

---

## OVERVIEW
Playwright-based end-to-end testing suite for DIANA, featuring mocked API tests and real backend integration tests.

## STRUCTURE
```
frontend/e2e/
├── fixtures/             # Test data and shared utilities
│   └── test-data.js      # Centralized selectors, mock users, and wait helpers
├── integration/          # "Real" tests hitting actual backend endpoints
│   ├── auth-real.spec.js # E2E auth flow (requires backend/DB)
│   └── *-real.spec.js    # Unmocked feature verification
├── screenshots/          # CI/local visual regression artifacts
└── *.spec.js             # Mocked feature tests (auth, admin, assessment, insights)
```

### Test Categories
- **Auth**: `auth.spec.js`, `auth-errors.spec.js` - Login, signup, token refresh, rate limiting.
- **Admin**: `admin-*.spec.js` - User management, audit logs, model traceability.
- **Assessment**: `assessment-*.spec.js`, `onboarding.spec.js` - Multi-step biomarker entry, results.
- **Insights**: `insights.spec.js`, `trends.spec.js` - Charts, correlations, SHAP explanations.
- **Security/Perf**: `security-xss.spec.js`, `performance.spec.js`, `visual-regression.spec.js`.

## CONVENTIONS

### Selectors & Data
- **Use SELECTORS**: Import from `fixtures/test-data.js`. Use `data-testid` where available, fallback to CSS/text.
- **Fixture Objects**: Use `TEST_USER`, `ADMIN_USER`, and `MOCK_ASSESSMENT` for consistent test data.

### Mocking vs. Real
- **Standard Tests**: Use `page.route()` to intercept API calls. Prefer this for edge cases (errors, timeouts).
- **Integration Tests**: Place in `integration/`. Use for validating frontend-backend contract.

### Utilities
- `waitForAnimations(page)`: Wait for Framer Motion transitions before interacting.
- `waitForNetworkIdle(page)`: Ensure API calls finish before assertions.
- `takeScreenshot(page, name)`: Capture visual state for debugging.

## ANTI-PATTERNS
- **Hardcoded Selectors**: Do not use raw CSS strings in `.spec.js` files; update `test-data.js` instead.
- **Global state reliance**: Tests must `localStorage.clear()` in `afterEach` to ensure isolation.
- **Raw page.waitForTimeout**: Avoid arbitrary sleeps; use `waitForAnimations` or `waitForNetworkIdle`.
- **Missing CORS**: Mocked responses MUST include `access-control-allow-*` headers for fetch to succeed.
- **Mocking Integration**: Do not mock API responses in `integration/` folder; those must hit real services.
