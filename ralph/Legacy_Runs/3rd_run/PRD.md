# 📄 PRD — Admin Auth 401 Fix + SSE Path Mismatch

## 1) Problem Statement

Admin API calls (`/api/v1/admin/*`) consistently return **401 Unauthorized** even after a successful login. The frontend logs show `Error: missing bearer token` and there is no `diana_token` in localStorage.

Additionally, the frontend attempts to open an SSE stream at:
```
/api/v1/admin/auth/events/stream
```
but the backend exposes:
```
/api/v1/admin/events/stream
```
resulting in **404 Not Found**.

---

## 2) Root Cause

### 2.1 Token Not Returned in JSON
Backend `/auth/login` sets JWT **only in HttpOnly cookies**, but does **not** return `access_token` or `refresh_token` in the JSON response.

Frontend expects JSON tokens and writes them to `localStorage`, so it never stores any token.

### 2.2 SSE Path Mismatch
Frontend points to `/admin/auth/events/stream` while backend route is `/admin/events/stream`.

---

## 3) Goals

- Ensure frontend receives JWT token after login.
- Ensure admin API calls include Bearer token.
- Fix SSE route mismatch.
- Stop 401 errors on admin endpoints.
- Stop 404 for auth event stream.

---

## 4) Non-Goals

- No migration to cookie-based auth in this scope.
- No token refresh or security hardening changes.
- No changes to RBAC or role logic.

---

## 5) Requirements (Functional)

### Authentication
- Login response must include:
  - `access_token`
  - `refresh_token`
  - `user` object (already present)
- Frontend must store token in `localStorage` as `diana_token`.

### Admin API
- All admin requests must attach `Authorization: Bearer <token>` via `apiFetch`.

### SSE
- Frontend must connect to correct SSE endpoint:
  - `/api/v1/admin/events/stream`

---

## 6) Acceptance Criteria

✅ Login response JSON includes both tokens
✅ LocalStorage contains `diana_token` after login
✅ Admin endpoints return 200 for admin user
✅ SSE stream connects without 404
✅ No `missing bearer token` errors in console

---

## 7) Risks / Notes

- Tokens stored in localStorage (XSS risk) — acceptable for current scope.
- Cookies still set by backend (redundant) — not harmful.

---

## 8) Implementation Notes (High-Level)

- Backend: Add `access_token` and `refresh_token` fields to login/register/refresh JSON response.
- Frontend: Update SSE endpoint path in `AuthEventLogViewer.jsx` (or equivalent).
- No refactor of auth middleware.
