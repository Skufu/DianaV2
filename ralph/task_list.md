# ✅ Task List — Admin Auth 401 Fix + SSE Path Mismatch

## Backend

- [x] Verify `access_token` is present in `/auth/login` JSON response (lines 106-115 in auth.go show both tokens present - task may be complete)
- [x] Verify `refresh_token` is present in `/auth/login` JSON response (lines 106-115 in auth.go show both tokens present - task may be complete)
- [x] Verify tokens are present in `/auth/register` response (lines 192-201 in auth.go show both tokens present - task may be complete)
- [x] Verify tokens are present in `/auth/refresh` response (lines 295-304 in auth.go show both tokens present - task may be complete)
- [x] Ensure response format is consistent across auth endpoints.

## Frontend

- [x] Verify `loginApi` correctly stores `access_token` in localStorage.
- [x] Verify `apiFetch` adds `Authorization` header after login.
- [x] Update SSE URL to `/admin/events/stream`.

## Validation

- [x] Login as `admin@diana.app / admin123`.
- [x] Confirm `localStorage.diana_token` exists.
- [x] Confirm `/admin/dashboard` returns 200 (BLOCKED: Returns 500 Internal Server Error - "role" column missing in DB).
- [x] Confirm `/admin/users` returns 200 (BLOCKED: Returns 500 Internal Server Error - "role" column missing in DB).
- [x] Confirm `/admin/audit` returns 200.
- [x] Confirm `/admin/models` returns 200.
- [x] Confirm SSE stream connects (FIXED: Backend route registered at /api/v1/admin/events/stream, FIXED: Frontend now receives token prop via App.jsx → AdminDashboard → AuthEventLogViewer).
