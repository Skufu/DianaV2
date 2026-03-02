# E2E TESTING KNOWLEDGE BASE

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
