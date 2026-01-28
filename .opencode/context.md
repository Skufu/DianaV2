# Project Context

## Environment
- Language: Go 1.21+, React 18, Python 3.10+
- Runtime: Backend (Gin), Frontend (Vite), ML (Flask)
- Build: make (backend), npm (frontend), pip (ML)
- Test: make test (Go), npm run test (Playwright E2E)
- Package Manager: go.mod, package.json, requirements.txt

## Project Type
- [x] Library/Package
- [ ] Application (CLI/Web/Mobile/Desktop)
- [x] Microservice
- [ ] Monorepo
- [x] Other: Multi-tier full-stack web application

## Infrastructure
- Container: None (Dockerfile exists but not actively used)
- Orchestration: None
- CI/CD: GitHub Actions (.github/workflows/ci.yml)
- Cloud: None (self-hosted)

## Structure
- Source: backend/, frontend/, ml/, scripts/
- Tests: backend/*_test.go, frontend/e2e/*.spec.js
- Docs: docs/, README.md, AGENTS.md files
- Entry: backend/cmd/server/main.go, frontend/src/main.jsx

## Conventions (OBSERVE from existing code)
- Naming: Go (PascalCase for types, camelCase for vars), React (camelCase), Python (snake_case)
- Imports: Go (stdlib -> third-party -> internal), React (absolute), Python (PEP8)
- Error handling: Go (handlers/utils.go helpers), React (throw Error), Python (raise Exception)
- Testing: Go (table-driven tests), Frontend (Playwright E2E), ML (pytest - 0% coverage)

## Security Fixes Implemented (2026-01-28)

### 1. localStorage XSS Vulnerability - FIXED (CRITICAL)
**Problem:** JWT tokens stored in localStorage, vulnerable to XSS attacks
**Solution:** Removed all localStorage token storage, rely on HttpOnly cookies
**Files Modified:**
- frontend/src/api.js (removed all localStorage.getItem/setItem/removeItem for tokens)
- frontend/src/App.jsx (removed localStorage usage from login, logout, signup handlers)
**Backend:** Already correctly sets HttpOnly, Secure, SameSite cookies (auth.go lines 113-114)

### 2. Hardcoded JWT Secret Fallback - FIXED (HIGH)
**Problem:** Fallback to "dev-secret-change-in-production" if JWT_SECRET not set
**Solution:** Made JWT_SECRET mandatory for ALL environments
**Files Modified:**
- backend/internal/config/config.go (removed fallback, added fatal error on missing JWT_SECRET)
- env.example (updated JWT_SECRET comment)
- README.md (updated JWT_SECRET requirement documentation)

### 3. React XSS Vulnerability (CVE-2025-7788) - DEFERRED
**Problem:** React 18.3.1 has HTML comment sanitization bypass vulnerability
**Target:** React 19.2.4 (contains fix)
**Status:** Deferred due to major version upgrade risk
**Mitigation:** XSS risk reduced after localStorage fix

### 4. CSRF Protection - DEFERRED
**Problem:** No CSRF protection on state-changing endpoints
**Status:** Deferred - SameSite=Strict cookies provide partial protection
**Recommendation:** Implement CSRF middleware in future

## Notes
- Backend uses SQLC for type-safe database queries (never bypass)
- Frontend uses custom tab-based routing (no React Router)
- ML service has 0% test coverage (critical gap)
- Frontend uses deviceCapabilities.js for performance-tiered rendering
- Audit logging uses fire-and-forget goroutines (silenced errors)
- Backend has .golangci.yml for linting with continue-on-error:true
