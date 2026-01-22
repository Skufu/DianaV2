# Backend Transaction and Logic Refactoring - PRD

**Document Version**: 1.0
**Date**: 2025-01-22
**Status**: Draft
**Priority**: HIGH

---

## Executive Summary

The DianaV2 backend demonstrates solid architectural foundations with a clean layered design, type-safe SQLC queries, and comprehensive middleware. However, **critical gaps** exist around **transaction management**, **audit logging reliability**, and **error handling consistency** that pose production risks.

**Key Findings:**
- ✅ Well-designed layered architecture (HTTP → Services/ML → Store → DB)
- ✅ Type-safe SQLC queries with proper pgtype handling
- ✅ Comprehensive middleware stack (auth, RBAC, rate limiting, security)
- ⚠️ **NO transaction support** - multi-step operations are non-atomic
- ⚠️ **Silent audit failures** - fire-and-forget goroutines lose audit trails
- ⚠️ **Inconsistent error handling** - mix of structured/unstructured responses
- ⚠️ **Stubbed services** - PDF export and notifications not functional

**Impact**: Data consistency risks, compliance/traceability issues, poor debugging experience, missing core functionality.

---

## Current State Analysis

### 1. HTTP Layer & Routing

**Status**: ✅ **Well-Designed**

**Middleware Stack** (executed in order):
1. `gin.Recovery()` - Panic recovery
2. `RequestID()` - Unique request tracking
3. `Logger()` - Structured logging
4. `SecurityHeaders()` - HSTS, CSP headers
5. `CORS` - Cross-origin handling
6. `RateLimit` - Token bucket (100 req/min)
7. `MaxBodySize` - 1MB limit (DoS protection)
8. `Auth()` - JWT validation (protected routes)
9. `RoleRequired("admin")` - RBAC for admin routes

**Route Organization**:
| Group | Middleware | Purpose |
|--------|------------|---------|
| `/api/v1/healthz` | None | Health checks |
| `/api/v1/auth` | AuthRateLimit(10) | Login, refresh, logout |
| `/api/v1/users/me` | Auth | User self-service |
| `/api/v1/users/me/assessments` | Auth | Assessment CRUD |
| `/api/v1/insights` | Auth | Analytics/cohort data |
| `/api/v1/clinics` | Auth | Clinic members |
| `/api/v1/admin/*` | Auth + RoleRequired("admin") | Admin dashboard, user management, audit, models |

**Issues Identified**:
- ⚠️ **Inconsistent error responses**: Handlers use both `gin.H{"error": "..."}` and `utils.go` helpers

---

### 2. Data Layer (Store)

**Status**: ✅ **Well-Implemented, Missing Transactions**

**Architecture**:
```
Store Interface (store.go)
  ├── UserRepository
  ├── PatientRepository
  ├── AssessmentRepository
  ├── RefreshTokenRepository
  ├── CohortRepository
  ├── ClinicRepository
  ├── AuditEventRepository
  └── ModelRunRepository
```

**Implementation Pattern**:
```go
type PostgresStore struct {
    pool *pgxpool.Pool  // For raw SQL queries
    q    *sqlcgen.Queries  // For type-safe SQLC queries
}
```

**SQL Query Patterns** (assessments.sql, users.sql, etc.):
- All queries use SQLC's typed parameters with `$1`, `$2`, etc.
- Proper RETURNING clauses for atomic ID generation
- Consistent GROUP BY, ORDER BY, LIMIT patterns
- Soft delete patterns for users (sets `deleted_at`, `is_active=false`)

**Issues Identified**:
- ❌ **NO TRANSACTIONS**: Zero occurrences of `pool.Begin(ctx)`, `defer tx.Rollback()`, `tx.Commit()` in entire codebase
- ⚠️ **Non-atomic multi-step operations**: Multiple UPDATEs without transaction wrapper
- ⚠️ **Comment acknowledges issue**: `users.go:169` has `// Transaction-like updates (best effort or use actual transaction if store supports it)`

---

### 3. Transaction Consistency (CRITICAL ISSUE)

**Status**: ❌ **Non-Transactional Operations**

**Evidence**:
- Zero transaction-related code patterns found
- Multiple at-risk operations identified

**At-Risk Operations**:

#### Operation 1: User Onboarding (`users.go:CompleteOnboarding`, lines 170-184)
```go
// 3 separate UPDATEs, no transaction
UpdateUser(ctx, userUpdate)       // Step 1: Updates user profile
UpdateUserConsent(ctx, consent)     // Step 2: Updates consent
UpdateUserOnboarding(ctx, true)     // Step 3: Marks onboarding complete
```

**Risk**: If Step 2 fails, Step 1 persists → user partially onboarded with wrong consent state.

#### Operation 2: Admin User Creation (`admin_users.go:createUser`, lines 36-62)
```go
Create(ctx, user)                    // Creates user record
AuditEvents().Create(ctx, event)     // Logs audit trail
```

**Risk**: User created but audit log lost → no trace of who created the account (compliance issue).

#### Operation 3: Admin User Updates (`admin_users.go:updateUser/deactivateUser/activateUser`)
```go
Update(ctx, user)                    // Updates user
AuditEvents().Create(ctx, event)     // Logs audit trail
```

**Risk**: Same as above - audit trail loss.

#### Operation 4: Assessment Creation (`assessments.go:Create`, lines 186-203)
```go
predictor.Predict(...)                  // Calls ML service
ValidateBiomarkers(...)               // Validates biomarkers
store.Assessments().Create(...)        // Creates assessment
store.Users().UpdateLastLogin(...)    // Updates user (non-critical, silently fails)
```

**Risk**: Assessment created but user metadata not updated.

---

### 4. Services Layer

**Status**: ⚠️ **Partially Implemented / Stubbed**

| Service | File | Status | Issue |
|---------|-------|--------|-------|
| PDF Export | `internal/services/pdf_export_service.go` | ❌ STUB | Disabled due to library version conflict; returns placeholder |
| Notifications | `internal/services/notification_service.go` | ❌ STUB | Only `log.Printf()`; no DB/email integration |
| Validation | `internal/services/validation_service.go` | ⚠️ DORMANT | Near-identical to `ml/validation.go`; unused in production |

**Risks**:
- Users cannot download professional health reports (PDF export disabled)
- Assessment reminders and risk alerts not delivered (notification queue not processed)
- Maintenance burden (duplicate validation code)

---

### 5. ML Integration

**Status**: ✅ **Well-Implemented**

**Flow**:
```
Handler (assessments.go)
  ↓
ValidateBiomarkers(input)              // Clinical safety check
  ↓
Predictor.Predict(ctx, input)        // ML inference
  ├─ HTTPPredictor (if MODEL_URL set)
  └─ MockPredictor (if MODEL_URL empty)
  ↓
Store assessment with cluster + risk_score
```

**HTTPPredictor** (`http_predictor.go`):
- POSTs to `${MODEL_URL}?model_type=ada`
- Headers: `Content-Type: application/json`, `X-Model-Version` (if set)
- Timeout: `MODEL_TIMEOUT_MS` (default 2000ms)
- Error handling: Returns `"error"`, 0 on any failure (timeout, decode error, non-200)

**MockPredictor** (`mock.go`):
- Deterministic rules based on BMI, HbA1c, PatientID parity
- Returns: cluster string, risk score (0-100)

**Validation Logic** (`validation.go`):
- Hardcoded biomarker ranges per clinical research
- Validation result formatted as `"warning:fbs_prediabetic_range,hdl_low,..."`

**Issues Identified**:
- ⚠️ **ML failures handled gracefully** (returns cluster="error", risk=0) but may mask real issues
- ⚠️ **Validation redundancy** between `ml/validation.go` and `services/validation_service.go`

---

### 6. Authentication & Authorization

**Status**: ✅ **Well-Implemented**

**Login Flow**:
```go
1. Validate credentials (bcrypt.CompareHashAndPassword)
2. Generate access token (15 min expiry)
3. Generate refresh token (32 random bytes)
4. Hash refresh token (SHA-256)
5. Store in refresh_tokens table (7 day expiry)
6. Return both tokens
```

**Refresh Flow**:
```go
1. Hash provided refresh token
2. Find in DB, check revoked/expired
3. Generate NEW access token
4. Revoke OLD refresh token (token rotation)
5. Generate NEW refresh token
6. Store new token
7. Return both tokens
```

**Middleware**:
- JWT extraction and validation
- Claims stored in context: `c.Set("user", claims)`
- Role-based access control checks

**Issues Identified**:
- ⚠️ **No token versioning** (can't invalidate all user tokens)
- ⚠️ **No device/session binding** (refresh tokens can be reused across devices)

---

### 7. Error Handling

**Status**: ⚠️ **Inconsistent**

**Patterns Identified**:

| Handler | Pattern | Example |
|----------|----------|----------|
| `auth.go` | `gin.H{"error": "..."}` | `c.JSON(401, gin.H{"error": "invalid credentials"})` |
| `assessments.go` | Mixed | Uses `gin.H{...}` and logs separately |
| `admin_users.go` | Mixed | Manual error messages + duplicate key check |
| `utils.go` helpers | Structured | `ErrUnauthorized(c)`, `ErrNotFound(c, "...")` |

**APIError struct** (`utils.go:14-18`):
```go
type APIError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Details any    `json:"details,omitempty"`
}
```

**Helper functions**:
- `ErrUnauthorized(c)` → 401, code="UNAUTHORIZED"
- `ErrForbidden(c)` → 403, code="FORBIDDEN"
- `ErrNotFound(c, resource)` → 404, code="NOT_FOUND"
- `ErrBadRequest(c, message)` → 400, code="BAD_REQUEST"
- `ErrInternal(c, message)` → 500, code="INTERNAL_ERROR"

**Critical Issues**:

#### Issue 1: Silent Audit Errors (`audit.go:73`)
```go
go func() {
    event := models.AuditEvent{...}
    _ = a.store.AuditEvents().Create(c.Request.Context(), event)
}()
```
**Risk**: Audit trail silently lost on DB errors → no compliance traceability.

#### Issue 2: Internal Detail Leakage (`assessments.go:190`)
```go
c.JSON(500, gin.H{"error": err.Error()})
```
**Risk**: Exposes SQL constraints, table names to clients (security risk).

#### Issue 3: No Server-Side Logging
Most handlers send errors to clients without logging server-side:
```go
if err != nil {
    c.JSON(500, gin.H{"error": "failed to update profile"})
    return  // No log.Printf of what actually failed
}
```
**Risk**: Production debugging impossible without server logs.

#### Issue 4: Discarded Errors (`users.go:54`)
```go
assessment, err := h.store.Users().GetLatestAssessmentByUser(...)
if err != nil {
    h.store.Users().GetAssessmentCountByUser(...)  // Result discarded!
}
```
**Risk**: Error swallowed silently.

---

## Requirements

### Functional Requirements

#### FR-1: Transaction Support (P0 - Critical)
**Description**: Implement atomic transaction support for multi-step operations.

**User Stories**:
- As a user, when I complete onboarding, either all updates succeed or none do.
- As an admin, when I create a user, the audit trail is guaranteed.
- As a developer, I can wrap multiple operations in a transaction.

**Acceptance Criteria**:
- [ ] `WithTx` helper implemented in `postgres.go`
- [ ] `CompleteOnboarding` wrapped in transaction
- [ ] `createUser` (admin) wrapped in transaction
- [ ] `updateUser` (admin) wrapped in transaction
- [ ] `deactivateUser`/`activateUser` (admin) wrapped in transaction
- [ ] All transaction-wrapped operations tested for rollback behavior

#### FR-2: Audit Logging Reliability (P0 - Critical)
**Description**: Ensure audit trails are reliably recorded.

**User Stories**:
- As a compliance officer, I can trust that all admin actions are logged.
- As a developer, audit failures are visible in logs.
- As a system, audit failures trigger retry or monitoring alerts.

**Acceptance Criteria**:
- [ ] Audit logging goroutines have error handling
- [ ] Audit failures logged to server with `[AUDIT]` prefix
- [ ] Audit failures trigger monitoring alert (or documented as TODO)
- [ ] No discarded errors (`_ =`) in audit-related code

#### FR-3: Standardized Error Handling (P1 - High)
**Description**: Use consistent, structured error responses across all handlers.

**User Stories**:
- As a client developer, all errors have consistent structure.
- As a client, I can programmatically handle error codes.
- As a developer, I use existing helpers instead of manual JSON.

**Acceptance Criteria**:
- [ ] All handlers use `utils.go` helpers exclusively
- [ ] No `gin.H{"error": "..."}` in production code
- [ ] No `err.Error()` exposed to clients
- [ ] Server-side logging before returning errors
- [ ] Error tests verify response structure

#### FR-4: Data Consistency Guarantees (P1 - High)
**Description**: Ensure related operations are atomic.

**User Stories**:
- As a user, my onboarding can't be partially complete.
- As an admin, user creation and audit logging succeed or fail together.

**Acceptance Criteria**:
- [ ] All multi-step operations use transactions
- [ ] Rollback behavior tested for each operation
- [ ] No partial state scenarios possible

#### FR-5: Service Implementation (P2 - Medium)
**Description**: Complete stubbed services for production readiness.

**User Stories**:
- As a user, I can download PDF health reports.
- As a user, I receive assessment reminder emails.
- As a system, notifications are queued and processed.

**Acceptance Criteria**:
- [ ] PDF export service generates actual reports
- [ ] Notification service writes to `notification_queue` table
- [ ] Background worker processes notification queue
- [ ] SMTP/SES integration for email delivery
- [ ] Validation service redundancy removed (keep only `ml/validation.go`)

### Non-Functional Requirements

#### NFR-1: Performance
- Transaction overhead < 5ms for typical operations
- Audit logging does not block HTTP response (async required)
- Error logging does not impact request latency

#### NFR-2: Reliability
- Audit trail success rate > 99.9% in production
- Transaction rollback success rate > 99.9%
- Error logs capture all failures

#### NFR-3: Maintainability
- Transaction helper is reusable across all repositories
- Error helpers are centralized in `utils.go`
- Code comments explain transaction patterns

#### NFR-4: Security
- No internal errors exposed to clients
- Audit trails are tamper-evident (can't be silently deleted)
- Refresh tokens have proper device binding (future enhancement)

#### NFR-5: Compliance
- All admin actions are auditable
- Audit failures are logged and monitored
- User data operations are atomic (consistent state)

---

## Implementation Plan

### Phase 1: Foundation (Week 1)

#### Task 1.1: Implement Transaction Helper
**File**: `backend/internal/store/postgres.go`

**Description**: Add `WithTx` method for transaction management.

**Implementation**:
```go
func (s *PostgresStore) WithTx(ctx context.Context, fn func(pgx.Tx) error) error {
    tx, err := s.pool.Begin(ctx)
    if err != nil {
        return fmt.Errorf("failed to begin transaction: %w", err)
    }
    defer func() {
        if p := recover(); p != nil {
            _ = tx.Rollback(ctx)
            panic(p) // re-throw
        }
    }()

    if err := fn(tx); err != nil {
        if rbErr := tx.Rollback(ctx); rbErr != nil {
            return fmt.Errorf("tx failed: %v, rollback failed: %v", err, rbErr)
        }
        return err
    }

    return tx.Commit(ctx)
}
```

**Acceptance**:
- [ ] Helper implemented and tested
- [ ] Panic recovery works correctly
- [ ] Rollback on error works correctly
- [ ] Commit on success works correctly

**Estimated Effort**: 4 hours

---

#### Task 1.2: Update Store Interface for Transactions
**File**: `backend/internal/store/store.go`

**Description**: Add transaction method to `Store` interface.

**Implementation**:
```go
type Store interface {
    // Existing methods...
    WithTx(ctx context.Context, fn func(pgx.Tx) error) error
    Close()
}
```

**Acceptance**:
- [ ] Interface updated
- [ ] All implementations satisfy interface

**Estimated Effort**: 1 hour

---

### Phase 2: Transaction Integration (Week 1-2)

#### Task 2.1: Refactor User Onboarding
**File**: `backend/internal/http/handlers/users.go`

**Description**: Wrap all 3 UPDATEs in transaction.

**Implementation**:
```go
if err := h.store.WithTx(c.Request.Context(), func(tx pgx.Tx) error {
    // Use tx instead of pool for these operations
    // Implementation detail: Create tx-aware repo methods or pass tx to queries
    return nil
}); err != nil {
    c.JSON(500, gin.H{"error": "failed to complete onboarding"})
    return
}
```

**Acceptance**:
- [ ] All 3 operations wrapped in transaction
- [ ] Rollback tested (simulate step 2 failure)
- [ ] Manual testing confirms atomicity

**Estimated Effort**: 6 hours

---

#### Task 2.2: Refactor Admin User Creation
**File**: `backend/internal/http/handlers/admin_users.go`

**Description**: Wrap Create + Audit log in transaction.

**Implementation**:
```go
if err := h.store.WithTx(c.Request.Context(), func(tx pgx.Tx) error {
    // 1. Create user using tx
    // 2. Create audit event using tx
    return nil
}); err != nil {
    if isDuplicateKeyError(err) {
        c.JSON(409, gin.H{"error": "email already exists"})
    } else {
        c.JSON(500, gin.H{"error": "failed to create user"})
    }
    return
}
```

**Acceptance**:
- [ ] Create and audit wrapped in transaction
- [ ] Duplicate key still returns 409 (not 500)
- [ ] Rollback tested (simulate audit failure)

**Estimated Effort**: 4 hours

---

#### Task 2.3: Refactor Admin User Updates
**File**: `backend/internal/http/handlers/admin_users.go`

**Description**: Wrap Update + Audit log in transaction.

**Scope**: `updateUser`, `deactivateUser`, `activateUser`

**Acceptance**:
- [ ] All 3 handlers refactored
- [ ] Transactions tested for rollback
- [ ] Audit logs guaranteed

**Estimated Effort**: 6 hours (2 hours per handler)

---

#### Task 2.4: Refactor Assessment Creation
**File**: `backend/internal/http/handlers/assessments.go`

**Description**: Wrap Create + UpdateLastLogin in transaction.

**Note**: UpdateLastLogin is marked as non-critical, but should be included for consistency.

**Acceptance**:
- [ ] Create and user update wrapped in transaction
- [ ] Assessment creation tested with rollback scenarios

**Estimated Effort**: 4 hours

---

### Phase 3: Audit Logging Fixes (Week 2)

#### Task 3.1: Fix Audit Logging in Middleware
**File**: `backend/internal/http/middleware/audit.go`

**Description**: Add error handling to audit goroutines.

**Implementation**:
```go
go func() {
    if err := a.store.AuditEvents().Create(c.Request.Context(), event); err != nil {
        log.Printf("[AUDIT] Failed to log event: %v", err)
        // TODO: Implement retry queue or monitoring alert
    }
}()
```

**Acceptance**:
- [ ] No `_ = err` in audit code
- [ ] Audit failures logged with `[AUDIT]` prefix
- [ ] Monitoring alert documented (as TODO)

**Estimated Effort**: 2 hours

---

#### Task 3.2: Fix Audit Logging in Admin Handlers
**File**: `backend/internal/http/handlers/admin_users.go`

**Description**: Add error handling to synchronous audit calls.

**Scope**: Lines 147-160, 238-250, 290-298, 333-341

**Acceptance**:
- [ ] All audit calls have error handling
- [ ] Audit failures don't silently fail operations
- [ ] Consistent with Task 3.1 approach

**Estimated Effort**: 2 hours

---

### Phase 4: Error Handling Standardization (Week 3)

#### Task 4.1: Create Error Response Standards
**File**: `backend/internal/http/handlers/utils.go` (document only)

**Description**: Document error response conventions.

**Implementation**: Add godoc comments showing examples:
```go
// ErrBadRequest returns a 400 BAD_REQUEST error
// Use for all validation failures
//
// Example:
//   if err != nil {
//       ErrBadRequest(c, "Invalid email format")
//       return
//   }
//
// Response format:
//   {"code": "BAD_REQUEST", "message": "Invalid email format"}
```

**Acceptance**:
- [ ] All helpers have usage examples
- [ ] Documentation includes response format
- [ ] Do's and Don'ts listed

**Estimated Effort**: 2 hours

---

#### Task 4.2: Refactor Auth Handler
**File**: `backend/internal/http/handlers/auth.go`

**Description**: Replace all `gin.H{"error": "..."}` with `utils.go` helpers.

**Scope**: Lines 40-44, 48-50, 52-54, 68-70, 75-77, 84-86, 106-108, 120-122, 206-208, 211

**Acceptance**:
- [ ] All manual JSON errors replaced
- [ ] Server-side logging added where missing
- [ ] No `err.Error()` exposed to clients

**Estimated Effort**: 3 hours

---

#### Task 4.3: Refactor Assessments Handler
**File**: `backend/internal/http/handlers/assessments.go`

**Description**: Replace `gin.H{...}` with helpers, add logging.

**Scope**: Lines 40-42, 47-49, 140-142, 147-149, 188-192, 217-219, 234-236, 269-271, 276-278, 282-284, 313-316, 341-343, 351-353, 355-356

**Acceptance**:
- [ ] All manual errors replaced
- [ ] `err.Error()` removed from responses
- [ ] Server logs added before returns

**Estimated Effort**: 4 hours

---

#### Task 4.4: Refactor Users Handler
**File**: `backend/internal/http/handlers/users.go`

**Description**: Replace `gin.H{...}` with helpers, fix discarded errors.

**Scope**: Lines 36-37, 42-44, 47-48, 92-94, 117-120, 133-135, 198-201, 224-226, 247-249, 253-255, 268-270, 274-276

**Additional**: Fix line 54 (discarded assessment fetch error)

**Acceptance**:
- [ ] All manual errors replaced
- [ ] Line 54 error properly handled
- [ ] Server logs added

**Estimated Effort**: 3 hours

---

#### Task 4.5: Refactor Admin Users Handler
**File**: `backend/internal/http/handlers/admin_users.go`

**Description**: Replace `gin.H{...}` with helpers.

**Scope**: Lines 67-69, 80-82, 111-113, 117-120, 177-180, 184-186, 268-270, 274-276, 317-319, 329-331, 353-355, 362-364, 367-369, 379-381, 387-389

**Acceptance**:
- [ ] All manual errors replaced
- [ ] Consistent error structure across all admin handlers

**Estimated Effort**: 3 hours

---

#### Task 4.6: Refactor Admin Dashboard Handler
**File**: `backend/internal/http/handlers/admin_dashboard.go`

**Description**: Replace `gin.H{...}` with helpers.

**Scope**: Lines 41-42, 47-49, 77-78, 82-84, 103-104, 108-109

**Acceptance**:
- [ ] All manual errors replaced
- [ ] Consistent error structure

**Estimated Effort**: 2 hours

---

#### Task 4.7: Add Centralized Error Logging
**File**: `backend/internal/http/middleware/logger.go` (if exists) or create new

**Description**: Add helper for logging errors with request context.

**Implementation**:
```go
func LogError(c *gin.Context, err error, message string) {
    requestID, _ := c.Get("request_id")
    log.Printf("[ERROR] request_id=%s message=%s error=%v",
        requestID, message, err)
}
```

**Acceptance**:
- [ ] Helper created and documented
- [ ] Used in all error return paths
- [ ] Request ID included in logs

**Estimated Effort**: 2 hours

---

### Phase 5: Service Completion (Week 4)

#### Task 5.1: Complete PDF Export Service
**File**: `backend/internal/services/pdf_export_service.go`

**Description**: Implement actual PDF generation with assessment data.

**Implementation Steps**:
1. Resolve gopdf library version conflict
2. Implement report layout with user data, assessments, trends
3. Add model information and validation status
4. Return buffer with properly formatted PDF

**Acceptance**:
- [ ] PDF generates valid content (not placeholder)
- [ ] Includes user profile data
- [ ] Includes latest assessment with cluster/risk
- [ ] Includes trend visualization (charts or tables)
- [ ] Tested with real assessment data

**Estimated Effort**: 16 hours

---

#### Task 5.2: Implement Notification Queue Writer
**File**: `backend/internal/services/notification_service.go`

**Description**: Write notifications to database queue table.

**Implementation**:
```go
func (n *NotificationService) QueueAssessmentReminder(userID int64, assessmentID int64) error {
    // INSERT INTO notification_queue (user_id, type, assessment_id, created_at)
    // RETURN id
}
```

**Acceptance**:
- [ ] Queue method implemented for all notification types
- [ ] Writes to `notification_queue` table
- [ ] Error handling and logging

**Estimated Effort**: 4 hours

---

#### Task 5.3: Implement Notification Worker
**File**: Create `backend/cmd/worker/main.go`

**Description**: Background worker to process notification queue.

**Implementation**:
```go
func main() {
    for {
        notifications, err := store.NotificationQueue().FetchPending(ctx, 50)
        if err != nil {
            log.Printf("Failed to fetch notifications: %v", err)
            time.Sleep(5 * time.Second)
            continue
        }
        for _, notif := range notifications {
            // Send email via SMTP/SES
            if err := sendEmail(notif); err != nil {
                log.Printf("Failed to send: %v", err)
                continue
            }
            store.NotificationQueue().MarkSent(ctx, notif.ID)
        }
        time.Sleep(30 * time.Second)
    }
}
```

**Acceptance**:
- [ ] Worker fetches and processes pending notifications
- [ ] SMTP/SES integration working
- [ ] Failed sends retried or logged
- [ ] Worker can be deployed as separate service

**Estimated Effort**: 12 hours

---

#### Task 5.4: Remove Validation Redundancy
**File**: `backend/internal/services/validation_service.go`

**Description**: Delete unused validation service file.

**Acceptance**:
- [ ] File deleted
- [ ] No references remain in codebase
- [ ] Tests updated if they reference it
- [ ] `ml/validation.go` confirmed as single source of truth

**Estimated Effort**: 1 hour

---

### Phase 6: Testing & Validation (Week 5)

#### Task 6.1: Transaction Rollback Tests
**File**: Create `backend/internal/store/postgres_tx_test.go`

**Description**: Test transaction rollback behavior.

**Test Cases**:
- [ ] Test rollback when first operation fails
- [ ] Test rollback when middle operation fails
- [ ] Test rollback when last operation fails
- [ ] Test panic in transaction
- [ ] Test commit on success

**Acceptance**:
- [ ] All rollback scenarios covered
- [ ] Partial state verified as NOT persisted
- [ ] Commit scenarios work correctly

**Estimated Effort**: 8 hours

---

#### Task 6.2: Integration Tests for Refactored Handlers
**File**: Create `backend/internal/http/handlers/integration_test.go`

**Description**: End-to-end tests for refactored operations.

**Test Cases**:
- [ ] Onboarding with rollback scenario
- [ ] Admin user creation with duplicate email
- [ ] Admin user creation with audit failure
- [ ] Assessment creation with ML error
- [ ] Assessment creation with user update failure

**Acceptance**:
- [ ] All critical paths tested
- [ ] Transactions verified
- [ ] Audit logs verified
- [ ] Error responses verified

**Estimated Effort**: 12 hours

---

#### Task 6.3: Load Tests for Transactions
**File**: Create `backend/load_test/transactions.go`

**Description**: Verify transaction performance under load.

**Test Scenarios**:
- [ ] 100 concurrent onboarding requests
- [ ] 100 concurrent admin user creations
- [ ] 100 concurrent assessment creations

**Acceptance**:
- [ ] No deadlock scenarios
- [ ] No data corruption
- [ ] Response times within acceptable limits (<500ms p95)

**Estimated Effort**: 8 hours

---

#### Task 6.4: Security Testing
**File**: Existing test suite

**Description**: Verify no internal errors exposed.

**Test Cases**:
- [ ] SQL constraint errors return 409 (not 500 with details)
- [ ] All error responses have structured format
- [ ] Audit failures don't expose sensitive data

**Acceptance**:
- [ ] Security review complete
- [ ] No regressions introduced

**Estimated Effort**: 4 hours

---

## Success Metrics

### Phase Completion Criteria

**Phase 1 - Foundation**:
- [ ] Transaction helper implemented and passing tests
- [ ] Store interface updated
- [ ] Code reviewed and approved

**Phase 2 - Transaction Integration**:
- [ ] All identified operations wrapped in transactions
- [ ] Rollback behavior verified
- [ ] No regression in existing functionality

**Phase 3 - Audit Logging**:
- [ ] Audit failures visible in logs
- [ ] Monitoring integration documented
- [ ] Audit trail reliability > 99.9%

**Phase 4 - Error Handling**:
- [ ] All handlers use `utils.go` helpers
- [ ] Zero `gin.H{"error": "..."}` in production code
- [ ] Error coverage > 95%

**Phase 5 - Service Completion**:
- [ ] PDF export functional
- [ ] Notification worker processing queue
- [ ] Email delivery verified
- [ ] Validation redundancy removed

**Phase 6 - Testing**:
- [ ] All integration tests passing
- [ ] Load tests meet performance criteria
- [ ] Security review complete
- [ ] Zero high-severity issues

### Production Readiness Checklist

**Data Integrity**:
- [ ] No partial state scenarios possible
- [ ] Audit trails guaranteed
- [ ] Transaction rollback tested

**Error Handling**:
- [ ] Consistent error response structure
- [ ] Server-side logging for all errors
- [ ] No internal details leaked to clients

**Functionality**:
- [ ] PDF reports downloadable
- [ ] Notifications queued and delivered
- [ ] All core features functional

**Quality**:
- [ ] Code coverage > 80%
- [ ] Load tests passing
- [ ] Security review complete

---

## Risk Assessment

### High Risks

| Risk | Impact | Mitigation |
|------|---------|------------|
| Transaction deadlock under high concurrency | Data corruption | Comprehensive testing, connection pooling tuning |
| Audit queue overflow under high load | Lost audit trails | Monitoring, auto-scaling, batch processing |
| Email delivery failures (SMTP/SES issues) | Users miss notifications | Retry logic, fallback logging, monitoring alerts |

### Medium Risks

| Risk | Impact | Mitigation |
|------|---------|------------|
| Performance degradation from transaction overhead | Slower response times | Benchmarking, optimization of transaction scope |
| Breaking changes to existing API integrations | Client errors | Semantic versioning, deprecation period, migration guide |
| Incomplete service implementation (SMTP/SES) | Notification delays | Phased rollout, monitoring, manual override capability |

### Low Risks

| Risk | Impact | Mitigation |
|------|---------|------------|
| Library version conflicts (gopdf) | PDF generation fails | Alternative libraries, containerized dependencies |
| Worker deployment complexity | Delayed notification rollout | Docker support, monitoring, gradual rollout |

---

## Timeline

| Week | Phase | Deliverables |
|-------|--------|--------------|
| Week 1 | Phase 1-2 | Transaction helper, onboarding refactor, user creation refactor |
| Week 2 | Phase 2-3 | Admin updates refactor, audit logging fixes |
| Week 3 | Phase 4 | Error handling standardization (all handlers) |
| Week 4 | Phase 5 | PDF export, notification queue, notification worker |
| Week 5 | Phase 6 | Testing, validation, load tests, security review |

**Total Estimated Effort**: 102 hours (2.5 FTE weeks)

---

## Dependencies

### External
- None (pure backend refactoring)

### Internal
- PostgreSQL schema: `notification_queue` table already exists (migration 0011)
- ML service: No changes required
- Frontend: No breaking changes (error response format may need update)

### Blocking
- None identified

---

## Open Questions

1. **SMTP Provider**: Should we use AWS SES, SendGrid, or self-hosted Postfix?
   - Default assumption: AWS SES for scalability
   - Decision point: Cost vs control tradeoff

2. **PDF Library**: Should we resolve gopdf version conflict or switch to alternative?
   - Alternative: `github.com/jung-kurt/gofpdf` or `unidoc/unioffice`
   - Decision point: Library maturity vs API design

3. **Notification Worker Deployment**: Should worker be separate service or integrated into main server?
   - Recommendation: Separate service for scalability and isolation
   - Decision point: Operational complexity vs deployment simplicity

4. **Monitoring Integration**: What observability platform for audit failures?
   - Options: Datadog, New Relic, CloudWatch, self-hosted
   - Decision point: Cost vs feature requirements

5. **Error Response Migration**: Should we maintain backwards compatibility for old clients?
   - Options: Semantic versioning, parallel API, deprecation period
   - Decision point: Client control vs operational overhead

---

## Appendices

### Appendix A: Transaction Pattern Reference

**Recommended Pattern**:
```go
// Handler
if err := h.store.WithTx(c.Request.Context(), func(tx pgx.Tx) error {
    // Step 1: Use tx for all DB operations
    if err := repo.CreateUserTx(tx, user); err != nil {
        return err // Triggers rollback
    }

    // Step 2: Audit in same transaction
    if err := repo.CreateAuditTx(tx, event); err != nil {
        return err // Triggers rollback
    }

    // Step 3: Additional updates
    return repo.UpdateUserTx(tx, updates)
}); err != nil {
    ErrInternal(c, "operation failed")
    return
}
c.JSON(200, response)
```

**Repository Pattern** (requires SQLC modification or raw SQL):
```go
func (r *pgUserRepo) CreateUserTx(tx pgx.Tx, user models.User) error {
    // Use tx instead of r.pool for queries
    // Option A: Use raw SQL with tx
    // Option B: Modify SQLC to accept pgx.Tx
    return r.q.WithTx(tx).CreateUser(ctx, user)
}
```

### Appendix B: Error Response Format

**New Format** (all handlers):
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Invalid request payload",
  "details": {
    "email": "Invalid email format"
  }
}
```

**Old Format** (to be removed):
```json
{
  "error": "Invalid email format"
}
```

### Appendix C: Service Dependencies

**PDF Export**:
- Current: `github.com/signintech/gopdf` (version conflict)
- Alternatives:
  - `github.com/jung-kurt/gofpdf` (active, well-maintained)
  - `github.com/go-pdf/fpdf` (stable, simple API)
  - `github.com/unidoc/unioffice` (powerful, complex)

**Email Delivery**:
- Recommended: AWS SES (scalable, pay-per-use)
- Alternatives:
  - SendGrid (good analytics, higher cost)
  - Mailgun (good API, pricing complexity)
  - Self-hosted Postfix (free but operational overhead)

---

**Document Status**: Ready for Review
**Next Steps**: Stakeholder review, timeline approval, resource allocation
