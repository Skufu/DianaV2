# Known Issues & Technical Debt

> **Last Updated**: January 19, 2026  
> **Review Source**: [code-review-analysis.md](../code-review-analysis.md)

This document tracks known issues, technical debt, and planned improvements identified during code review.

---

## Critical Issues (P0) 🔴

### 1. Silent Audit Logging Failures
- **File**: `backend/internal/http/middleware/audit.go:73`
- **Impact**: Security/compliance risk - audit events may be lost without detection
- **Issue**: Error from `Create()` is ignored in fire-and-forget goroutine
- **Status**: ⏳ Pending fix

### 2. Missing Transaction Wrapping
- **File**: `backend/internal/http/handlers/assessments.go:183-196`
- **Impact**: Data integrity - assessment creation and user update are separate operations
- **Issue**: If one succeeds and the other fails, data becomes inconsistent
- **Status**: ⏳ Pending fix

### 3. No Password Complexity Requirements
- **File**: `backend/internal/http/handlers/auth.go:32-37`
- **Impact**: Security vulnerability - weak passwords allowed
- **Issue**: Only minimum 8 characters required; no uppercase, digits, or special chars
- **Status**: ⏳ Pending fix

### 4. No Token Refresh Mechanism (Frontend)
- **File**: `frontend/src/api.js:9-31`
- **Impact**: UX degradation - users must re-login when access token expires
- **Issue**: No automatic token refresh on 401 errors
- **Status**: ⏳ Pending fix

---

## High Priority Issues (P1) 🟠

### 5. ML Server Default Age Substitution
- **Files**: `Ian_ML/server.py:63, 263, 325`
- **Impact**: Prediction accuracy - wrong age used if field missing
- **Issue**: Defaults to age 54 instead of returning validation error
- **Status**: ⏳ Pending fix

### 6. Token Revocation Error Ignored
- **File**: `backend/internal/http/handlers/auth.go:259`
- **Impact**: Security - old refresh tokens may remain valid
- **Issue**: `RevokeRefreshToken` error is silently ignored
- **Status**: ⏳ Pending fix

### 7. Duplicate Ownership Verification Code
- **File**: `backend/internal/http/handlers/assessments.go` (4 occurrences)
- **Impact**: Maintainability - same ownership check repeated
- **Issue**: Should be extracted to helper function
- **Status**: ⏳ Pending refactor

### 8. No Rate Limiting on Authentication
- **File**: `backend/internal/http/router/router.go`
- **Impact**: Security - brute force attacks not mitigated on auth endpoints
- **Status**: ⏳ Pending fix

---

## Medium Priority Issues (P2) 🟡

| Issue | File | Impact |
|-------|------|--------|
| Inconsistent risk thresholds | `assessments.go`, `Dashboard_user.jsx` | User confusion |
| Manual string concatenation | `assessments.go:120-127` | Maintainability |
| Nested ternary operators | `UserProfile.jsx:57` | Code readability |
| Magic numbers (thresholds) | `assessments.go:43-49` | Maintainability |
| Generic error messages | Multiple handlers | Poor UX |
| Rate limiter memory leak | `ratelimit.go:94-98` | Resource usage |

---

## Low Priority Issues (P3) 🟢

| Issue | Impact |
|-------|--------|
| Console error logging in production | Performance/noise |
| `interface{}` instead of `any` | Go 1.18+ style |
| TODO/FIXME comments | Technical debt |
| Inconsistent file naming | Code organization |
| No graceful ML degradation | UX during outages |

---

## Improvement Roadmap

### Short-term (Sprint 1-2)
- [ ] Add error handling to audit logging
- [ ] Implement password complexity validation
- [ ] Wrap assessment creation in transaction
- [ ] Add 401 interceptor with token refresh

### Medium-term (Sprint 3-4)
- [ ] Implement structured logging (zap/zerolog)
- [ ] Add comprehensive unit test coverage
- [ ] Centralize error handling
- [ ] Add auth endpoint rate limiting

### Long-term
- [ ] Add E2E test suite
- [ ] Implement offline mode
- [ ] Add dependency vulnerability scanning
- [ ] Document architecture decisions (ADRs)

---

## OWASP Compliance Status

| Category | Status | Notes |
|----------|--------|-------|
| A01: Broken Access Control | ⚠️ Partial | Missing password complexity, no account lockout |
| A02: Cryptographic Failures | ⚠️ Partial | Default JWT secret in docs |
| A03: Injection | ✅ Good | SQLC parameterized queries |
| A05: Security Misconfiguration | ⚠️ Partial | Debug mode handling |
| A07: Auth Failures | ⚠️ Partial | Generic error messages enable enumeration |
| A09: Logging Failures | ❌ Issue | Silent audit failures |

---

## See Also

- [Full Code Review Analysis](../code-review-analysis.md)
- [Security Improvements](./SECURITY.md)
- [Architecture Overview](./ARCHITECTURE.md)
