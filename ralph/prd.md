# Bug Check PRD: Frontend + Backend Risk Review

**Status**: Ready ✅  
**Last Verified**: 2026-01-23

## Goal
Identify and document potential bugs, reliability gaps, and security risks in the frontend and backend. Provide a prioritized remediation plan without implementing fixes.

## Scope
- **Frontend**: `frontend/src` (React 18, TanStack Query, API wrapper)
- **Backend**: `backend/internal` (Gin handlers, middleware, store, ML predictor, services)

## Out of Scope
- Implementing fixes
- Refactors unrelated to the identified risks
- UI/UX redesigns

## Findings (Prioritized)

### P0 / Critical
1. **PDF export breaks at runtime**
   - **Location**: `frontend/src/api.js` (exportPDFApi)
   - **Issue**: `apiFetch` returns parsed JSON; code then checks `response.ok` and calls `response.blob()` on a JSON object → runtime error.
   - **Impact**: PDF export feature fails for all users.
2. **Signup flow is non-functional**
   - **Location**: `frontend/src/components/auth/Signup.jsx` + `frontend/src/api.js`
   - **Issue**: Signup imports `signupApi`, but no export exists; backend registration route is missing per docs.
   - **Impact**: New user registration fails.

### P1 / High
3. **JSON parsing on 204/empty responses**
   - **Location**: `frontend/src/api.js` (`apiFetch`)
   - **Issue**: Always `response.json()`. For 204 or empty body responses, throws `Unexpected end of JSON input`.
   - **Impact**: Logout/delete flows can fail unexpectedly.
4. **Auth state can be cleared on transient errors**
   - **Location**: `frontend/src/App.jsx`
   - **Issue**: Any profile fetch error flips `isAuthenticated` to `false`.
   - **Impact**: Temporary outages cause forced logout.
5. **ML predictor returns ambiguous values on failure**
   - **Location**: `backend/internal/ml/http_predictor.go`
   - **Issue**: Returns `cluster="error"` with `risk_score=0` without surfacing error to callers.
   - **Impact**: Downstream may store invalid predictions without differentiation.

### P2 / Medium
6. **Inconsistent trend schema between backend and frontend**
   - **Location**: Backend `backend/internal/store/user_repo.go` vs. frontend `frontend/src/components/user/PersonalTrends.jsx`
   - **Issue**: Backend returns `TrendData` (arrays by metric) while frontend expects `biomarkerHistory` and `riskScore` per entry.
   - **Impact**: Trend charts may render empty or show incorrect data.
7. **Audit logging is fire-and-forget without shutdown safety**
   - **Location**: `backend/internal/http/middleware/audit.go`
   - **Issue**: Goroutine not tracked; potential loss on shutdown. Uses `context.WithoutCancel`, which requires Go 1.23+.
   - **Impact**: Missing audit events, potential build incompatibility.
8. **Pagination helper not consistently used**
   - **Location**: `backend/internal/http/handlers/admin_models.go`
   - **Issue**: Manual page/page_size parsing vs standard helper.
   - **Impact**: Inconsistent behavior and duplicated logic.

### P3 / Low
9. **Notification service is stubbed**
   - **Location**: `backend/internal/services/notification_service.go`
   - **Issue**: Logs only; no persistence or delivery.
   - **Impact**: Scheduled notifications never delivered.
10. **Research export is TODO**
   - **Location**: `backend/internal/http/handlers/export.go`
   - **Issue**: Placeholder response instead of anonymized CSV.
   - **Impact**: Admin export feature incomplete.

## Risks & Constraints
- **Security**: JWT stored in `localStorage` (XSS exposure). Consider server-managed HttpOnly cookies.
- **Reliability**: No retry/circuit-breaker for ML calls; silent fallback to "error" cluster.
- **Consistency**: Frontend/backend schema mismatch in trends data.

## Success Criteria
- PDF export works end-to-end.
- Signup path exists and is functional.
- `apiFetch` handles JSON and non-JSON responses safely.
- Trend charts render consistent data from backend.
- Audit logs are reliable and safe across shutdowns.

## Non-Functional Requirements
- No breaking changes to public endpoints without migration plan.
- Errors are observable (clear logging + client-safe error messages).
- Backward compatible with Go 1.21+ unless upgrade is intentional.

## Assumptions
- Backend and frontend code reflect current deployment.
- No immediate schema changes for trends unless planned.
