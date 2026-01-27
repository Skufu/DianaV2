# Task List: UX Flow Fixes

> **Format**: Each task is a single `- [ ]` line. Mark `[x]` when verified.

---

## Prerequisites

> **Start services**: `./scripts/dev/start-all.sh` (from project root)

- [X] Backend running at localhost:8080
- [X] Frontend running at localhost:4000  
- [X] Database seeded with demo users

---

## Phase 1: Critical Auth & API Fixes (CRITICAL)

- [x] Fix App.jsx:196-202 - Add token persistence in handleSignupSuccess (store access_token and refresh_token like handleLogin does)
- [x] Fix Export.jsx:173,198 - Remove `/api/v1` prefix from CSV paths (API_BASE already includes it)
- [x] Fix Export.jsx:23-26 - Replace window.open with fetch+blob download that includes Authorization header
- [ ] Fix api.js:645-647 - Change `/admin/stats` to `/admin/dashboard` to match backend endpoint

---

## Phase 2: Code Bug Fixes (HIGH)

- [ ] Fix UserProfile.jsx:17-22 - Replace useState callback with useEffect to sync formData with profileData
- [ ] Fix UserProfile.jsx:7 - Pass token to useUserProfile hook OR make hook check localStorage internally
- [ ] Delete dashboard/Dashboard_user.jsx - Remove legacy file with syntax errors (unused, hazardous)
- [ ] Fix api.js:649-652 - Remove or disable adminExportResearchDataApi (endpoint not registered)

---

## Phase 3: UX Improvements (MEDIUM)

- [ ] Fix App.jsx:204,256-265 - Keep sidebar visible on profile tab (remove isAssessmentOpen condition)
- [ ] Fix App.jsx:146-151 - Add skip option for onboarding OR allow partial dashboard access
- [ ] Fix Sidebar.jsx:40 + App.jsx:163-165 - Make "Log Assessment" CTA open assessment form directly (modal or inline)
- [ ] Consolidate PDFExport.jsx - Make it use exportPDFApi from api.js instead of direct fetch

---

## Phase 4: Backend Alignment (MEDIUM)

- [ ] Fix export.go:31 - Uncomment or properly register `/research` endpoint if needed
- [ ] Verify admin dashboard routes match frontend calls
- [ ] Remove or deprecate CSV export buttons until backend implements them

---

## Final Verification

- [ ] Test signup flow - new user can sign up AND make authenticated API calls
- [ ] Test export page - PDF export works, CSV buttons hidden or working
- [ ] Test admin dashboard - stats and charts load without 404
- [ ] Test profile page - sidebar visible, form syncs on data load
- [ ] Run lint: `npm run lint` in frontend dir
- [ ] Run E2E tests: `npx playwright test` (if available)

---

## Reference

```javascript
// Credentials
const DEMO = { email: 'demo@diana.health', password: 'demo123' };
const ADMIN = { email: 'admin@diana.health', password: 'admin123' };

// API Base (already includes /api/v1)
const API_BASE = 'http://localhost:8080/api/v1';

// Key files to modify
const FILES = [
  'frontend/src/App.jsx',
  'frontend/src/api.js',
  'frontend/src/components/user/UserProfile.jsx',
  'frontend/src/components/export/Export.jsx',
  'frontend/src/components/layout/Sidebar.jsx',
];
```

---

> **Task Format Rules**:
> 1. Each task starts with `- [ ]`
> 2. Include file:line for precise targeting
> 3. Keep descriptions under 80 chars
> 4. Use `[x]` for complete, `[BLOCKED]` for blocked
