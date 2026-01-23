# Task List (Derived from PRD)

**Status**: Ready ✅  
**Last Verified**: 2026-01-23

---

## P0 / Critical

- [BLOCKED] **1. Fix PDF export flow** - Use binary-friendly fetch (avoid JSON parsing)
  - Location: `frontend/src/api.js:420-428`
  - Issue: `apiFetch` returns parsed JSON; code then checks `response.ok` and calls `response.blob()` on JSON object
  - Fix: Create a separate `blobFetch` or add `responseType` param to bypass JSON parsing

- [x] **2a. Add signupApi export to frontend** ✅ COMPLETED
  - Location: `frontend/src/api.js:524`
  - Status: `signupApi` is correctly exported
  - Note: Verification failed due to using `require()` on ES module. Export exists at line 524

 - [x] **2b. Add /register endpoint to backend** ✅ COMPLETED
   - Location: `backend/internal/http/handlers/auth.go` + router
   - Issue: No `/api/v1/auth/register` route exists
   - Fix: Add Register handler with email/password validation, user creation, and JWT response
   - Done: Added `register` handler, registered route, validated email uniqueness, auto-login after registration

---

## P1 / High

- [BLOCKED] **3. Update `apiFetch` to handle empty responses (204) safely**
  - Location: `frontend/src/api.js:34`
  - Issue: Always calls `response.json()`, throws on empty body
  - Fix: Check `response.status === 204 || response.headers.get('content-length') === '0'` before parsing

- [x] **4. Relax auth state reset logic on transient profile fetch failures**
  - Location: `frontend/src/App.jsx`
  - Issue: Any profile fetch error flips `isAuthenticated` to false
  - Fix: Only reset on 401/403, not on network errors or 5xx

 - [x] **5. Improve ML predictor error propagation** ✅ COMPLETED
   - Location: `backend/internal/ml/http_predictor.go:34-79`
   - Issue: Returns `cluster="error"` with `risk_score=0` without surfacing error to callers
   - Fix: Return actual error to caller, let handler decide fallback behavior
   - Done: Updated Predictor interface, MockPredictor, HTTPPredictor, all tests, and handler error handling

---

## P2 / Medium

 - [x] **6. Align trend data contract between backend and frontend** ✅ COMPLETED
   - Location: Backend `user_repo.go` vs Frontend `PersonalTrends.jsx`
   - Issue: Schema mismatch between `TrendData` and expected `biomarkerHistory`
   - Direction: **Frontend should adapt** to match backend's `TrendData` schema (it's the source of truth)
   - Fix: Updated `useTrends` hook in `api.js` to transform `TrendData` arrays into the expected format
   - Done: Added transformation in `useTrends` to map backend's parallel arrays to frontend's array-of-objects structure
   - Note: Frontend build passes successfully

- [ ] **7. Make audit logging reliable**
  - Location: `backend/internal/http/middleware/audit.go`
  - Issue: Goroutine not tracked; uses `context.WithoutCancel` (Go 1.23+)
  - Fix: Check Go version in go.mod first. If <1.23, use `context.Background()` instead

- [ ] **8. Standardize pagination via helper across handlers**
  - Location: `backend/internal/http/handlers/admin_models.go`
  - Issue: Manual page/page_size parsing vs standard helper
  - Fix: Use existing pagination helper from utils or create one if missing

---

## P3 / Low (Consider deferring - these are features, not bugs)

- [ ] **9. Implement notification queue persistence and processing**
  - Location: `backend/internal/services/notification_service.go`
  - Issue: Logs only; no persistence or delivery
  - ⚠️ **Complexity Warning**: This is a new feature, not a bug fix. May require database migrations.
  - Fix: Add notification table, queue processing, and delivery mechanism (email/push)

- [ ] **10. Implement anonymized research CSV export**
  - Location: `backend/internal/http/handlers/export.go`
  - Issue: Placeholder response instead of anonymized CSV
  - Fix: Query assessments, strip PII, generate CSV with anonymized patient IDs
