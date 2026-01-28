# PRD: UX Flow Fixes & Critical Bug Remediation

> **Purpose**: Define scope for fixing 12 verified UX/flow issues identified during frontend audit.

## Overview

Fix critical authentication bugs, broken API endpoints, and UX issues affecting user experience across signup flow, admin dashboard, data export, and profile management.

## Background

- **Context**: UX audit identified 12 issues affecting core functionality and user flows
- **Completed**: Issues verified with line-number evidence
- **Scope**: 12 issues across 5 critical, 3 high, 4 medium priority

## Goals

1. Fix all 5 critical issues that break core functionality (auth, API calls)
2. Fix 3 high-priority code bugs (useState misuse, disabled queries)
3. Improve UX for 4 medium-priority navigation/flow issues
4. All fixes verified by tests or manual QA

## Technical Context

### Stack
- **Frontend**: React 18, Vite, TanStack Query, TailwindCSS
- **Backend**: Go/Gin, PostgreSQL
- **Testing**: Playwright E2E

### Key Files
- `frontend/src/App.jsx` - Main app with auth flow
- `frontend/src/api.js` - API layer with hooks
- `frontend/src/components/user/UserProfile.jsx` - Profile page
- `frontend/src/components/export/Export.jsx` - Export page
- `backend/internal/http/handlers/` - API handlers

### Running Services
- Backend: `localhost:8080`
- Frontend: `localhost:4000`
- Database: `localhost:5432`

> **To start all services**: Run `./scripts/dev/start-all.sh` from project root

## Constraints

- [ ] Do not modify database schema
- [ ] All changes must pass existing lint rules
- [ ] Commit after each phase completion
- [ ] Backend API changes require corresponding frontend updates

## Success Criteria

- [ ] All tasks in task_list.md marked `[x]`
- [ ] Signup flow persists tokens and auth works
- [ ] Export page downloads work without 404/401
- [ ] Admin dashboard loads stats correctly
- [ ] No new lint errors introduced

## Reference

```javascript
// Credentials (from README)
const DEMO_USER = { email: 'demo@diana.health', password: 'demo123' };
const ADMIN_USER = { email: 'admin@diana.health', password: 'admin123' };
const API_BASE = 'http://localhost:8080/api/v1';
```

### Issue Summary Table

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | Signup no token persistence | 🔴 CRITICAL | App.jsx:196-202 |
| 2 | useState misused as useEffect | 🔴 HIGH | UserProfile.jsx:17-22 |
| 3 | useUserProfile disabled | 🟡 HIGH | UserProfile.jsx:7, api.js:202-208 |
| 4 | Sidebar hides on Profile | 🟡 MEDIUM | App.jsx:204, 256-265 |
| 5 | Onboarding gates navigation | 🟡 MEDIUM | App.jsx:146-151, 169-171 |
| 6 | Log Assessment misdirection | 🟡 MEDIUM | Sidebar.jsx:40, App.jsx:163-165 |
| 7 | CSV export double prefix | 🔴 CRITICAL | Export.jsx:173, 198 |
| 8 | window.open no auth | 🔴 CRITICAL | Export.jsx:23-26 |
| 9 | /admin/stats 404 | 🔴 CRITICAL | api.js:645-647 |
| 10 | research export not registered | 🟡 HIGH | api.js:649-652, export.go:31 |
| 11 | Duplicate PDF implementations | 🟡 MEDIUM | PDFExport.jsx:11-22 |
| 12 | Legacy dashboard syntax errors | 🟡 HIGH | dashboard/Dashboard_user.jsx |

---

> **Note to AI**: Read this file first. Then read `context_pin.md` and `task_list.md`. Complete tasks in order. Mark `[x]` when verified.
