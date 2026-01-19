# Diana V2 - Comprehensive Code Review Analysis

**Review Date**: January 19, 2026  
**Review Type**: 5-Iteration Comprehensive Code Review  
**Reviewer**: AI Code Review (Ralph Loop)  
**Project**: Diana V2 - Diabetes Risk Assessment Application  

---

## Executive Summary

### Overall Code Health: ⚠️ MODERATE

The Diana V2 codebase demonstrates **strong architectural foundations** with clear separation of concerns across frontend (React), backend (Go), and ML (Python) layers. However, the codebase contains **critical issues** that impact functionality, security, and maintainability.

**Key Strengths:**
- Clean multi-tier architecture with clear boundaries
- JWT authentication with refresh token rotation
- ML predictor abstraction with mock fallback
- Comprehensive error handling patterns in middleware layer
- Rate limiting implementation with token bucket algorithm
- Security headers implemented (CSP, XSS protection)

**Critical Issues Requiring Immediate Action:**
1. **Silent audit logging failures** (Backend: Go) - Security/compliance risk
2. **Missing transaction handling** (Backend: assessments.go) - Data integrity risk
3. **No password complexity requirements** (Backend: auth.go) - Security vulnerability
4. **ML server default age substitution** (Python: predict.py) - Prediction accuracy issue
5. **Fire-and-forget goroutines** (Backend: audit.go) - Silent data loss risk
6. **Missing RBAC checks** (Backend: users.go) - Authorization bypass potential
7. **No token refresh mechanism** (Frontend: api.js) - UX degradation

**Code Quality Score**: 7/10
- Architecture: Strong separation of concerns
- Error Handling: Good in middleware, weak in handlers
- Security: Headers present, authentication gaps exist
- Testing: Unit tests exist but coverage unclear
- Documentation: Good inline comments, AGENTS.md comprehensive

---

## Iteration Logs

### Iteration 1: Logic & Control Flow ✅

**Entry Points Identified:**
1. **Frontend**: `frontend/src/main.jsx` - React root with routing and auth state
2. **Backend**: `backend/cmd/server/main.go` - Gin HTTP server entry
3. **ML Server**: `ml/server.py` - Flask API with health, predict, and metrics endpoints

**Execution Paths Traced:**
- **Login Flow**: `Login.jsx` → `api.js:loginApi()` → `auth.go:login()` → JWT generation → Frontend stores token → `App.jsx` updates auth state
- **Assessment Creation**: `UserProfile.jsx` form → `assessments.go:Create()` → `http_predictor.go:Predict()` → `server.py:/predict` → `predict.py:DianaPredictor/ClinicalPredictor` → Database storage
- **Profile Loading**: `App.jsx` effect → `users.go:GetUserProfile()` → Database → JSON response → Frontend state

**Conditional Branches Verified:**
✅ **Auth Middleware** (`auth.go:18-83`):
- Proper token format checking (Bearer prefix)
- HMAC signature validation
- Claims extraction with type assertions
- All error paths handled with appropriate HTTP codes

✅ **Assessment Handler** (`assessments.go:131-199`):
- Ownership checks before operations (Get/Update/Delete)
- ML fallback with graceful degradation to mock predictor
- Risk level calculation based on score thresholds

⚠️ **Issues Found:**
1. **Unreachable Code Risk** (`assessments.go:52-128`):
   - Lines 85-91: HDL threshold logic has commented confusion about test expectations
   - The code explicitly calls out test failures in comments but doesn't handle the edge case

2. **Missing Default Case** (`auth.go:refresh`):
   - If `models.RefreshTokens().FindRefreshToken()` fails with non-404 error, generic "invalid refresh token" is returned
   - Missing explicit handling for database errors vs token validation errors

3. **Infinite Loop Prevention Missing** (`ratelimit.go:81-119`):
   - Token bucket cleanup runs in background goroutine without stop mechanism
   - If rate limiter is recreated, multiple cleanup goroutines could run concurrently

**Loops and Edge Cases Verified:**
✅ **Rate Limiter** (`ratelimit.go`):
   - Token bucket algorithm with proper token addition based on elapsed time
   - Heap-based eviction of oldest visitors when max entries reached
   - Background cleanup goroutine prevents unbounded memory growth

✅ **Frontend State Management**:
   - React state updates using useState hooks
   - Proper dependency arrays in useEffect
   - No infinite render loops detected

⚠️ **Issues Found:**
1. **Race Condition** (`users.go:23-66`):
   ```go
   assessment, err := h.store.Users().GetLatestAssessmentByUser(c.Request.Context(), userClaims.UserID)
   if err != nil {
       // Log error but don't fail profile load
       // log.Printf("failed to fetch latest assessment: %v", err)  // Commented out
   }
   ```
   - Error is swallowed, profile loads but `LatestAssessment` remains nil
   - User sees partial data without indication something failed

2. **Edge Case: Assessment List Empty** (`Dashboard_user.jsx:17-18`):
   ```javascript
   setLatestAssessment(data && data.length > 0 ? data[0] : null);
   ```
   - If `data` is `undefined` or `null`, condition still evaluates first operand causing potential TypeError

3. **Loop Without Exit Condition** (`assessments.go:52-128`):
   - `validationStatus` function iterates through thresholds with manual string concatenation
   - While functionally correct, it's error-prone and doesn't use string.Join

---

### Iteration 2: Deep Logic & Control Flow ✅

**Unreachable Code Identified:**
1. **`assessments.go:85-91`** - Commented test expectations suggest code was written to pass tests rather than handle business logic properly

**Complex Branching Found:**
1. **`assessments.go:268-304`** (Update handler):
   - Multiple conditional checks for nil values in Update logic
   - Duplicate ownership verification code (lines 269-278 and 235-242)
   - Risk: If assessment is modified by another user between Get and Update, race condition exists

2. **`auth.go:198-288`** (refresh handler):
   - Complex nested error handling without clear error type differentiation
   - Token rotation logic mixes database operations with JWT generation

**Infinite Loop Prevention Verified:**
✅ No infinite loops detected
- All loops have clear exit conditions
- Background goroutines have ticker-based cleanup

---

### Iteration 1: User Experience Flow ✅

**User Journey Mapped:**
1. **Signup/Login Flow**:
   - `Login.jsx` → User enters credentials → API call → Success → Token storage → Redirect to Dashboard/Onboarding

2. **Onboarding Flow** (if needed):
   - `Onboarding.jsx` → Enter personal info → Submit → `users.go:CompleteOnboarding()` → Redirect to Profile

3. **Dashboard Flow**:
   - `Dashboard_user.jsx` → Load assessments → Display summary → Navigate to Profile/Insights/Trends

4. **Assessment Flow**:
   - `UserProfile.jsx` → Enter biomarkers → Submit → `assessments.go:Create()` → Display results with RiskIndicator

5. **Admin Flow**:
   - `AdminDashboard.jsx` → View users/audit/models → RBAC checks → CRUD operations

**User Actions Validated:**
✅ Login successfully navigates to dashboard
✅ Onboarding completion redirects to profile
✅ Assessment creation updates state and shows results

⚠️ **Broken/Incomplete User Flows:**
1. **No Clear Error Recovery** (`api.js:9-31`):
   ```javascript
   const apiFetch = async (endpoint, options = {}) => {
     const response = await fetch(`${API_BASE}${endpoint}`, { method, headers, body });
     if (!response.ok) {
       const error = await response.json();
       throw new Error(error.error || 'Request failed');
     }
     return response.json();
   };
   ```
   - **Issue**: No token refresh mechanism - when access token expires, user sees 401 error and must manually logout/login
   - Expected: Automatic refresh on 401 using refresh token (already stored in localStorage)

2. **Dead End: ML Server Down** (`http_predictor.go:34-80`):
   ```go
   if p.url == "" {
       log.Printf("[ML] URL not configured, returning unknown")
       return "unknown", 0
   }
   ```
   - If ML server is unreachable, user receives "unknown" cluster with score 0
   - **UX Issue**: No user-facing error message explaining why prediction failed
   - User may think their assessment is valid when it's actually a system error

3. **Incomplete Onboarding** (`App.jsx:143-164`):
   ```javascript
   setShowOnboarding(!profile || !profile.name || !profile.email);
   ```
   - Shows onboarding even if user has partial profile (e.g., name but no email)
   - **Confusion**: User may not know what information is required

4. **Missing Loading States** (`Dashboard_user.jsx:86-93`):
   - Risk display shows "No data yet" instead of loading state during initial data fetch
   - Transition from loading → loaded → empty state causes visual flicker

5. **No Progress Indication** (`UserProfile.jsx:38-68`):
   - Form submission has `saving` state, but during API call no visual feedback
   - User may click "Save Changes" multiple times thinking it didn't register

**Friction Points Identified:**
1. **Profile Form UX** (`UserProfile.jsx:44-47`):
   - Name field is combined (Full Name) but backend expects separate `first_name` and `last_name`
   - Line 46: `first_name: formData.name, last_name: formData.name`
   - **Issue**: Both fields get same value, truncating user's full name

2. **Password Complexity Not Enforced** (`Login.jsx:26-30`):
   ```javascript
   const checkPasswordStrength = (password) => {
     if (password.length < 8) return { valid: false, text: 'Too short' };
     if (password.length < 12) return { valid: true, text: 'Good' };
     return { valid: true, text: 'Strong' };
   };
   ```
   - Only checks length, no complexity requirements (numbers, special chars, uppercase)
   - **Security Risk**: "password123" is considered "Strong"

3. **Assessment Frequency Mapping** (`UserProfile.jsx:57`):
   ```javascript
   assessment_frequency_months: formData.assessmentFrequency === 'weekly' ? 1 : 
                               formData.assessmentFrequency === 'monthly' ? 3 : 
                               formData.assessmentFrequency === 'quarterly' ? 12 : null,
   ```
   - Nested ternary operator is hard to read and maintain
   - Should be extracted to a mapping object or switch statement

4. **No Confirmation for Destructive Actions** (`UserProfile.jsx:70-82`):
   - Account deletion has confirmation modal but only after button click
   - **UX Issue**: User must read modal, then click "Delete Account" - two confirmation steps
   - Should use single confirmation dialog with clear consequences

**Error Feedback Analysis:**
✅ **Good**: Error messages are generally user-friendly
✅ **Good**: Most forms have visual error indicators (red borders, error text)
✅ **Good**: Loading states prevent multiple submissions

⚠️ **Issues Found:**
1. **Generic Error Messages** (`api.js:27`):
   ```javascript
   throw new Error(error.error || 'Request failed');
   ```
   - Backend returns `gin.H{"error": "..."}` in many places
   - Frontend shows backend error directly without user-friendly translation

2. **Silent Failures** (`users.go:51-55`):
   ```go
   assessment, err := h.store.Users().GetLatestAssessmentByUser(c.Request.Context(), userClaims.UserID)
   if err != nil {
       // Log error but don't fail profile load
       // log.Printf("failed to fetch latest assessment: %v", err)
   }
   ```
   - Profile loads without latest assessment data
   - User sees "No Assessment" status even if they have data that failed to load
   - **Data Loss**: Assessment count shows wrong total

---

### Iteration 1: Data Flow ✅

**Data Transformations Traced:**

1. **Frontend → Backend** (`UserProfile.jsx:43-59`):
   ```javascript
   const snakeCasePayload = {
     first_name: formData.name,
     last_name: formData.name, // BUG: Same value
     menopause_status: formData.menopauseStatus,
     years_menopause: formData.yearsMenopause,
     // ... more mappings
   };
   ```
   - **Issue**: Name field mapping is broken (both get same value)

2. **Backend → ML Server** (`http_predictor.go:34-80`):
   - `models.Assessment` is marshaled to JSON with `json.Marshal()`
   - POST to `/predict?model_type=ada`
   - ML server receives JSON and converts to DataFrame

3. **ML Feature Scaling** (`predict.py:86`):
   ```python
   X_scaled = self.scaler.transform(X)
   ```
   - Data is scaled using fitted StandardScaler before prediction
   - **Critical**: If scaler was trained with different data distribution than production data, predictions are biased

4. **Cluster Assignment** (`predict.py:89-93`):
   - K-means model returns cluster ID (0, 1, 2)
   - Cluster ID maps to risk label via `cluster_labels` dictionary
   - Mapping is hardcoded: `{"0": {"label": "HIGH", "risk_level": "HIGH"}}`

**Validation Layers Verified:**

1. **Frontend Validation** (`Login.jsx:21-24`):
   ```javascript
   const validateEmail = (email) => {
     const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     return re.test(email);
   };
   ```
   - ✅ Email regex validation present
   - ⚠️ No real-time validation feedback on form submission

2. **Backend Validation** (`assessments.go:146-149`):
   ```go
   if req.FBS == nil && req.HbA1c == nil {
       c.JSON(http.StatusBadRequest, gin.H{"error": "At least FBS or HbA1c must be provided"})
       return
   }
   ```
   - ✅ Ensures at least one core biomarker is provided
   - ⚠️ No range validation (e.g., FBS must be between 20-600)

3. **ML Validation** (`predict.py:37-59`):
   ```python
   ranges = {
       'hba1c': (2.0, 20.0),
       'fbs': (20, 600),
       'bmi': (10, 80),
       'triglycerides': (20, 1500),
       'ldl': (10, 400),
       'hdl': (10, 150),
   }
   ```
   - ✅ Physiological range checks implemented
   - ⚠️ Clinical model doesn't validate HbA1c or FBS (as expected for non-circular model)

**Output Formatting Consistency:**
✅ **Timezone Handling**: PostgreSQL uses `TIMESTAMPTZ`, Go uses `pgtype.Timestamptz` - Consistent UTC handling
⚠️ **Type Inconsistency**: Project refactoring from int64 `patient_id` to int32/int64 `user_id`
- `postgres_admin.go` shows manual conversions
- Risk: `userID` could exceed int32 limits in large deployments

**Data Integrity Issues Identified:**

1. **CRITICAL: Silent Audit Data Loss** (`audit.go:64-75`):
   ```go
   go func() {
       event := models.AuditEvent{...}
       _ = a.store.AuditEvents().Create(c.Request.Context(), event)  // ❌ Error ignored
   }()
   ```
   - **Impact**: If database is under load or connection fails, ALL audit logs are lost silently
   - **Compliance Risk**: Regulatory requirements may require audit trails
   - **Detection Issue**: No way to know when audit logging fails

2. **CRITICAL: No Transaction Wrapping** (`assessments.go:183-196`):
   ```go
   // Create assessment in database
   created, err := h.store.Assessments().Create(c.Request.Context(), assessment)
   // ... ML prediction stored
   // Reset last assessment reminder
   _ = h.store.Users().UpdateLastLogin(c.Request.Context(), int32(userID))  // ❌ Separate DB call
   ```
   - **Issue**: Two separate DB operations without transaction
   - **Failure Scenario**: If `UpdateLastLogin` fails but `Create` succeeded, user metadata is out of sync
   - **Rollback Issue**: No way to undo the assessment if user update fails

3. **CRITICAL: ML Age Default Substitution** (`server.py:63, 263, 325`):
   ```python
   patient_data = {
       "bmi": data.get("bmi"),
       "triglycerides": data.get("triglycerides"),
       "ldl": data.get("ldl"),
       "hdl": data.get("hdl"),
       "age": data.get("age", 54)  # ❌ Default age hardcoded
   }
   ```
   - **Issue**: If `age` field is missing, defaults to 54
   - **Impact**: Risk predictions for a 30-year-old woman use wrong age calculation
   - **Root Cause**: Clinical model requires age for feature scaling, but backend doesn't always provide it

4. **Potential Orphaned Data**:
   - Database schema has foreign key constraints
   - **Question**: Verify `ON DELETE CASCADE` behavior for assessments when user is deleted
   - If assessments aren't cascade deleted, they become orphaned and take up space

**ML Data Flow Integrity:**
✅ **Model Version Tracking**: Backend sends `X-Model-Version` header
✅ **Dataset Hash Verification**: `predict.py:41-65` verifies model file integrity
⚠️ **Inconsistent Validation Ranges**:
- Clinical model validates age: (18, 120) in predict.py
- Backend doesn't enforce age requirement
- Frontend doesn't collect age in onboarding form

---

### Iteration 1: Error Handling ✅

**Failure Scenarios Verified:**

1. **Network Errors** (`api.js:19-23`):
   ```javascript
   const response = await fetch(`${API_BASE}${endpoint}`, { method, headers, body });
   if (!response.ok) {
       const error = await response.json();
       throw new Error(error.error || 'Request failed');
   }
   ```
   - ✅ Network failures caught via `!response.ok`
   - ⚠️ No retry mechanism for transient failures
   - ⚠️ Timeout not configured - uses browser default

2. **Database Errors** (`assessments.go:183-188`):
   ```go
   created, err := h.store.Assessments().Create(c.Request.Context(), assessment)
   if err != nil {
       log.Printf("Failed to create assessment: %v", err)
       c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create assessment"})
       return
   }
   ```
   - ✅ Error logged
   - ✅ User-facing error returned
   - ⚠️ Logs to standard `log.Printf` - no structured logging context
   - ⚠️ Error message is generic - doesn't help user understand what went wrong

3. **ML Server Errors** (`http_predictor.go:57-68`):
   ```go
   resp, err := p.client.Do(req)
   if err != nil {
       log.Printf("[ML] Request failed: %v", err)
       return "error", 0
   }
   defer resp.Body.Close()
   if resp.StatusCode != http.StatusOK {
       respBody, _ := io.ReadAll(resp.Body)
       log.Printf("[ML] Non-OK status %d: %s", resp.StatusCode, string(respBody))
       return "error", 0
   }
   ```
   - ✅ Network errors logged
   - ✅ Non-OK responses logged
   - ⚠️ **CRITICAL**: Returns generic "error" cluster with score 0
   - User sees "error" instead of actionable message like "ML server unavailable"

4. **Validation Errors** (`assessments.go:139-143`):
   ```go
   if err := c.ShouldBindJSON(&req); err != nil {
       log.Printf("Assessment validation failed: %v", err)
       c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
       return
   }
   ```
   - ✅ Validation errors returned
   - ⚠️ `err.Error()` may expose technical implementation details to frontend

**Error Messages Analysis:**
✅ **User-Friendly Examples**:
- "At least FBS or HbA1c must be provided"
- "failed to create assessment"

⚠️ **Technical/Confusing Messages**:
- "invalid credentials" (auth.go:53, 58, 62) - Doesn't specify which credential is wrong
- "token error" (auth.go:79, 86, 169, 170, 171) - Completely unhelpful
- "server error" (http_predictor.go:67) - Vague, doesn't indicate what went wrong

⚠️ **Stack Trace Exposure Risk**:
- `auth.go:115` returns `err.Error()` from `ShouldBindJSON`
- Could expose: "invalid payload: json: unknown field \"x\"" with field names
- **Fix**: Return specific validation messages instead of raw error

**Logging Review:**
✅ **Good**: Middleware has structured logging in `logger.go`
✅ **Good**: ML server uses Python logging module
✅ **Good**: Audit events capture request details

⚠️ **CRITICAL: Silent Audit Failures** (`audit.go:73`):
   ```go
   go func() {
       event := models.AuditEvent{...}
       _ = a.store.AuditEvents().Create(c.Request.Context(), event)  // ❌
   }()
   ```
   - No logging when `Create()` fails
   - No way to detect when audit trail is broken
   - **Compliance Issue**: Audit regulations may require 100% capture rate

⚠️ **Log Inconsistency**:
- Backend uses `log.Printf()` in many places
- No consistent structured logging format
- Makes debugging production issues difficult

**Graceful Degradation Analysis:**
✅ **Good**: ML predictor falls back to mock mode if `MODEL_URL` is empty
✅ **Good**: Frontend has `ErrorBoundary` component wrapping main app
✅ **Good**: Rate limiting prevents API overload

⚠️ **Missing Degradation**:
- **ML Server Unreachable**: User gets "error" cluster instead of degraded "ML unavailable, using cached prediction" message
- **No Retry Logic**: Transient network failures result in immediate error display
- **No Offline Mode**: App doesn't work without backend connection

---

### Iteration 1: Code Quality ✅

**Naming Conventions:**
✅ **Good Practices**:
- Go files: `package handlers`, `type AuthHandler struct` (PascalCase for exported, camelCase for internal)
- Python: `class DianaPredictor` (PascalCase for classes)
- React: `const UserProfile = ({ token, userId }) => {` (PascalCase for components, camelCase for internal)

⚠️ **Inconsistencies**:
1. **File Naming**:
   - `frontend/src/App.jsx` vs `frontend/src/api.js` (inconsistent case for similar files)
   - `backend/internal/http/handlers/assessments.go` vs `backend/internal/ml/http_predictor.go` (snake_case vs camelCase)

2. **Variable Naming**:
   - `Dashboard_user.jsx` vs `UserProfile.jsx` (inconsistent use of underscore)
   - `assessments.go:152` uses `coalesceFloat64()` but calls `coalesceInt()` - inconsistent naming for similar functions

3. **Function Naming**:
   - `assessments.go:52-128` - `validationStatus()` describes what it returns, not what it does
   - Better: `calculateValidationWarnings()` or `getBiomarkerWarnings()`

**Redundant Logic Identified:**

1. **Duplicate Ownership Verification** (`assessments.go:235-242`, `269-278`):
   ```go
   // In Get handler:
   if assessment.UserID != userID {
       c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
       return
   }
   // In Update handler:
   if assessment.UserID != userID {
       c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
       return
   }
   ```
   - Same ownership check code repeated in 4 handlers (Get, Update, Delete)
   - **Refactor**: Extract to `verifyOwnership(assessment, userID, c)` helper function

2. **Duplicate Error Handling** (`users.go:33-44`, `83-88`):
   ```go
   // In GetUserProfile:
   user, err := h.store.Users().GetUserByID(c.Request.Context(), int32(userClaims.UserID))
   if err != nil {
       c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user profile"})
       return
   }
   if user == nil {
       c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
       return
   }
   
   // In GetConsentSettings:
   user, err := h.store.Users().GetUserByID(c.Request.Context(), int32(userClaims.UserID))
   if err != nil {
       c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
       return
   }
   if err != nil || user == nil {
       c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user"})
       return
   }
   ```
   - Same user fetch + error handling pattern repeated
   - **Refactor**: Extract to `getUserSafely(c, userID)` helper

3. **Duplicate Validation Logic** (`assessments.go:52-128`):
   ```go
   // FBS validation
   if a.FBS >= 126 {
       statuses = append(statuses, "fbs_diabetic_range")
   } else if a.FBS >= 100 {
       statuses = append(statuses, "fbs_prediabetic_range")
   }
   // Cholesterol validation
   if a.Cholesterol >= 240 {
       statuses = append(statuses, "chol_high")
   } else if a.Cholesterol >= 200 {
       statuses = append(statuses, "chol_borderline")
   }
   ```
   - Same pattern repeated 8 times for different biomarkers
   - **Refactor**: Create validation config array and iterate: `validateBiomarker(value, thresholds, statuses)`

**Refactoring Opportunities:**

1. **Complex Assessment Frequency Mapping** (`UserProfile.jsx:57`):
   ```javascript
   assessment_frequency_months: formData.assessmentFrequency === 'weekly' ? 1 :
                               formData.assessmentFrequency === 'monthly' ? 3 :
                               formData.assessmentFrequency === 'quarterly' ? 12 : null,
   ```
   - Nested ternary operators are hard to read and maintain
   - **Refactor**:
     ```javascript
     const FREQUENCY_TO_MONTHS = {
       'weekly': 1,
       'monthly': 3,
       'quarterly': 12,
       'none': null,
     };
     assessment_frequency_months: FREQUENCY_TO_MONTHS[formData.assessmentFrequency] || null,
     ```

2. **Manual String Concatenation** (`assessments.go:120-127`):
   ```go
   res := "warning:"
   for i, s := range statuses {
       if i > 0 {
           res += ","
       }
       res += s
   }
   return res
   ```
   - Error-prone manual string building
   - **Refactor**: Use `strings.Join(statuses, ",")` or `fmt.Sprintf("warning:%s", strings.Join(statuses, ","))`

3. **Hardcoded Risk Thresholds** (`assessments.go:42-50`, `users.go:69-75`):
   ```go
   func calculateRiskLevel(score int) string {
       if score < 30 {
           return "low"
       } else if score < 70 {
           return "medium"
       } else {
           return "high"
       }
   }
   ```
   - Same threshold logic in two different files
   - **Refactor**: Extract to shared package: `internal/utils/risk_calculator.go`

4. **Missing Transaction Wrapper** (`assessments.go:183-196`):
   ```go
   created, err := h.store.Assessments().Create(c.Request.Context(), assessment)
   // ... 
   _ = h.store.Users().UpdateLastLogin(c.Request.Context(), int32(userID))
   ```
   - Two separate operations that should be atomic
   - **Refactor**: Create transaction wrapper function:
     ```go
     func withTx(ctx context.Context, store store, fn func(tx *sql.Tx) error) error {
         tx, err := store.BeginTx(ctx)
         if err != nil { return err }
         defer tx.Rollback()
         return fn(tx)
     }
     ```

**Code Smells:**

1. **Long Parameter List** (multiple handlers):
   - Handler functions pass 5+ parameters
   - Consider grouping into request/response structs

2. **Deep Nesting** (`assessments.go:Update`):
   - Multiple nested if/else blocks for field updates
   - Consider extracting field update logic to helper function

3. **Magic Numbers** (assessment.go:43-49):
   - Risk thresholds: 30, 70 hard-coded
   - Biomarker ranges: 126, 100, 6.5, 5.7 hard-coded
   - **Refactor**: Define as package constants:
     ```go
     const (
         RiskLevelLow = 30
         RiskLevelMedium = 70
         HbA1cDiabeticThreshold = 6.5
         // ...
     )
     ```

**TODO/FIXME Debt:**
- `notification_service.go:104, 112` - Email sending not implemented
- `export.go:108, 119` - CSV export feature incomplete

---

### Iteration 2: Deep Error Handling ✅

**Unhandled Exceptions Found:**

1. **ML Prediction Failure** (`http_predictor.go:42-44, 49-51, 58-61, 65-68, 71-74):
   ```go
   if err := json.Marshal(input); err != nil {
       log.Printf("[ML] Failed to marshal input: %v", err)
       return "error", 0
   }
   ```
   - ✅ Error handled and logged
   - ⚠️ All errors return same generic "error" cluster
   - No distinction between marshal error, network error, ML server error, decode error

2. **Authentication Failure** (`auth.go:120-124`):
   ```go
   createdUser, err := h.store.Users().UpdateUser(c.Request.Context(), *createdUser)
   if err != nil {
       // Log error but continue as user is created
       // In a real scenario we might want cleanup or transaction
   }
   ```
   - ❌ Error is logged but user is still created with incomplete profile
   - FirstName/LastName may not be set properly
   - **Partial State**: User account exists but profile is inconsistent

**Silent Failures:**

1. **Audit Event Creation** (`audit.go:73`):
   ```go
   _ = a.store.AuditEvents().Create(c.Request.Context(), event)
   ```
   - ❌ Error completely ignored
   - No indication audit logging is broken
   - Silent data loss

2. **Profile Load Error** (`users.go:51-55`):
   ```go
   assessment, err := h.store.Users().GetLatestAssessmentByUser(c.Request.Context(), userClaims.UserID)
   if err != nil {
       // Log error but don't fail profile load
       // log.Printf("failed to fetch latest assessment: %v", err)
   }
   ```
   - ❌ Error logged to console (commented out) but not actually logged
   - Silent failure - user sees incomplete profile

3. **Rate Limiter Cleanup** (`ratelimit.go:129-142`):
   ```go
   func (rl *RateLimiter) cleanup() {
       ticker := time.NewTicker(5 * time.Minute)
       defer ticker.Stop()
       for range ticker.C {
           // ... cleanup logic
       }
   }
   ```
   - ⚠️ Goroutine runs indefinitely
   - No mechanism to stop it when RateLimiter is garbage collected
   - Memory leak if RateLimiter is recreated multiple times

**Error Propagation Issues:**

1. **Context Loss** (`assessments.go:183-196`):
   ```go
   created, err := h.store.Assessments().Create(c.Request.Context(), assessment)
   if err != nil {
       log.Printf("Failed to create assessment: %v", err)
       c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create assessment"})
       return
   }
   ```
   - ✅ Error propagated to user
   - ⚠️ Context is `c.Request.Context()` - if request is canceled, context may already be expired

2. **Async Goroutine Panic Recovery** (`audit.go:64-75`):
   ```go
   go func() {
       event := models.AuditEvent{...}
       _ = a.store.AuditEvents().Create(c.Request.Context(), event)
   }()
   ```
   - ❌ No panic recovery
   - If `Create()` panics, goroutine crashes
   - No way to detect or recover from panics

---

### Iteration 3: Cross-Component Logic ✅

**Integration Issues:**

1. **RBAC Not Applied to User Routes** (`router.go`):
   - User routes (`/users/me/*`) don't use RBAC middleware
   - ✅ They use Auth middleware for authentication
   - ⚠️ No role-based access control even though routes should be protected for user vs admin

2. **ML Model Type Confusion** (`http_predictor.go:46`):
   ```go
   mlURL := p.url + "?model_type=ada"
   ```
   - Hardcoded to always use "ada" model type
   - Backend doesn't respect model type parameter from handler
   - **Issue**: Clinical model feature exists but can't be used

3. **Frontend-Backend Model Mismatch**:
   - Frontend assumes both "ada" and "clinical" models are available
   - Backend `assessments.go:174` always calls `h.predictor.Predict(assessment)` which defaults to ADA model
   - **Integration Gap**: No way to select clinical model from UI

**State Management:**

1. **Prop Drilling Without Context** (`App.jsx:43-269`):
   ```jsx
   const Dashboard_user = lazy(() => import('./components/user/Dashboard_user'));
   const UserProfile = lazy(() => import('./components/user/UserProfile'));
   // ... 15+ state variables at top level
   ```
   - ✅ Lazy loading prevents initial bundle size
   - ⚠️ 15+ useState hooks at root component level
   - **Risk**: State explosion, difficult to track which state is used where

2. **State Synchronization** (`UserProfile.jsx:5-12`):
   ```jsx
   const [profile, setProfile] = useState(null);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState(null);
   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
   const [formData, setFormData] = useState({});
   ```
   - `formData` is initialized empty, then populated from API response
   - `profile` and `formData` both hold user data
   - **Confusion**: Unclear which state is source of truth
   - **Better Pattern**: Use `formData` as only state, compute profile from it

**Async Operations:**

1. **No Loading State During Assessment Creation** (`UserProfile.jsx` - not found):
   - When creating assessment, user submits form
   - No immediate visual feedback that submission was received
   - Only shows loading after API call completes
   - **UX Issue**: Double-submissions possible if user clicks button multiple times

2. **Race Condition in Profile Update** (`users.go:99-106`):
   ```go
   var req models.User
   if err := c.ShouldBindJSON(&req); err != nil {
       c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
       return
   }
   // Ensure ID matches token
   req.ID = userClaims.UserID
   updatedUser, err := h.store.Users().UpdateUser(c.Request.Context(), req)
   ```
   - ❌ No check that user is updating their own profile
   - Could be exploited to update other users' profiles

3. **Concurrent ML Requests** (`ml/server.py:142-170`):
   ```python
   class PredictorManager:
       def __init__(self):
           self._predictor = None
           self._lock = threading.Lock()
       
       def get_predictor(self):
           if self._predictor is None:
               with self._lock:
                   if self._predictor is None:
                       self._predictor = DianaPredictor()
           return self._predictor
   ```
   - ✅ Thread-safe singleton pattern
   - ⚠️ Double-checked locking pattern is inefficient
   - Lock acquired twice unnecessarily

---

### Iteration 3: Cross-Component UX ✅

**Navigation Flows:**

1. **Broken Navigation After Assessment** (`UserProfile.jsx` - no redirect after assessment):
   - User fills out profile/assessment form
   - Submit saves data but doesn't navigate away
   - **Confusion**: User doesn't know assessment was successful

2. **Tab Navigation Without State Reset** (`App.jsx:190-205`):
   ```jsx
   switch (activeTab) {
       case 'dashboard':
         return <Dashboard_user token={token} userId={userId} />;
       case 'profile':
         return <UserProfile token={token} userId={userId} />;
       // ...
     }
   ```
   - ✅ Clear tab-based routing
   - ⚠️ All components remain mounted, no cleanup on tab change
   - **Memory Leak**: Components in inactive tabs hold state in memory

3. **No Breadcrumbs or Progress Indication**:
   - Complex flows like assessment creation have no step-by-step progress
   - **UX Issue**: User doesn't know where they are in multi-step process

**Data Visualization Issues:**

1. **Inconsistent Risk Display** (`Dashboard_user.jsx:72-76`, `RiskIndicator.jsx`):
   - Dashboard shows risk levels: "High Risk" (67+), "Moderate Risk" (34+), "Low Risk"
   - Backend `assessments.go:180` uses different thresholds: <30=low, <70=medium, >=70=high
   - **Inconsistency**: Moderate threshold differs between frontend (34) and backend (70)
   - **User Confusion**: Same assessment could show different risk levels depending on which component renders it

2. **Missing Units in Display** (`Dashboard_user.jsx:56-63`):
   ```jsx
   <div className="text-2xl font-bold text-white">
     {latestAssessment.fbs} mg/dL
   </div>
   ```
   - ✅ Units shown (mg/dL)
   - ⚠️ Not all biomarker displays have units (HbA1c%, Cholesterol mg/dL)
   - Inconsistency: Some values displayed without context

3. **No Data Context in Visualizations**:
   - Risk indicator shows score without explanation of what factors contributed to it
   - **UX Issue**: User sees "High Risk" but doesn't know why

**User Feedback Loops:**

1. **No Success Confirmation** (`UserProfile.jsx:60-68`):
   ```jsx
   try {
       await updateUserProfileApi(token, snakeCasePayload);
       setProfile({...formData, ...snakeCasePayload});
       alert('Profile updated successfully!');  // ❌ Native alert
   } catch (err) {
       setError(err.message || 'Failed to update profile');
   }
   ```
   - ❌ Uses `alert()` instead of toast notification
   - Blocks UI until dismissed
   - **Better Pattern**: Use toast notification library (react-hot-toast, etc.)

2. **No Loading State on API Calls** (`App.jsx:73-97`):
   ```jsx
   const handleLogin = async (res) => {
     if (!res?.access_token) throw new Error('login failed');
     setToken(res.access_token);
     setRefreshToken(res.refresh_token);
     // ... decode JWT and set role
     setIsAuthenticated(true);
   };
   ```
   - No loading state during login
   - User can't tell if request is in progress

3. **Form Reset After Error** (`UserProfile.jsx`):
   - When error occurs, `error` state is set
   - But `formData` state is not cleared
   - **UX Issue**: User's invalid input remains in form, may resubmit same error

**Edge Case UX:**

1. **Empty State Handling** (`Dashboard_user.jsx:17-18`):
   ```jsx
   setLatestAssessment(data && data.length > 0 ? data[0] : null);
   ```
   - If `data` is undefined, error will occur accessing `data.length`
   - Should be: `setLatestAssessment((data && data.length > 0) ? data[0] : null)`

2. **No Graceful Degradation**:
   - When ML server is down, user sees error screen
   - **Missing**: Fallback to "Enter biomarker manually for estimated risk" option
   - **Missing**: Show cached assessments when real-time prediction fails

3. **No Offline Mode**:
   - App requires backend connection to function
   - No indication when network is unavailable
   - **Better**: ServiceWorker for offline caching with "You're offline" banner

---

### Iteration 3: Cross-Component Data Flow ✅

**API Contract Issues:**

1. **Inconsistent Response Format**:
   - Some endpoints return `{ "data": [...] }`
   - Others return direct array `[...]`
   - Others return `{ "error": "..." }`
   - **Impact**: Frontend must handle multiple response formats
   - **Fix**: Standardize to wrapper format: `{ "data": ..., "error": ..., "meta": {...} }`

2. **Missing Validation Contracts**:
   - Frontend validation: Email regex, password length
   - Backend validation: Required fields, physiological ranges
   - No contract defining what validation each layer should do
   - **Issue**: Validation logic duplicated across frontend/backend/ML

**Validation Layers:**
1. **Frontend** (`Login.jsx`, `UserProfile.jsx`):
   - Basic validation (email format, password length)
   - No real-time validation feedback
   - No server-side validation confirmation

2. **Backend** (`assessments.go:146-149`, `auth.go:47-55`):
   - Gin binding tags handle required fields
   - Custom validation for required FBS or HbA1c
   - No validation of field ranges (e.g., BMI must be 10-80)

3. **ML** (`predict.py:37-59`):
   - Comprehensive range validation for all clinical biomarkers
   - **Gap**: Backend doesn't enforce same ranges
   - **Issue**: Malicious client could bypass backend validation and send out-of-range values

**Data Integrity:**

1. **No Foreign Key Enforcement Verification**:
   - Database schema has foreign keys
   - No verification in code that `ON DELETE CASCADE` is properly configured
   - **Risk**: Deleting user might leave orphaned assessments

2. **Duplicate Prevention**:
   - No unique constraints verified on sensitive data
   - User email has unique constraint
   - **Missing**: Refresh token uniqueness constraints (prevent replay attacks)

3. **No Idempotency Protection**:
   - POST `/users/me/assessments` can be called multiple times
   - No deduplication based on biomarker values + timestamp
   - **Issue**: User could accidentally create duplicate assessments

---

### Iteration 3: Cross-Component Error Handling ✅

**Error Boundaries:**

1. **React Error Boundary** (`ErrorBoundary.jsx`):
   ```jsx
   class ErrorBoundary extends React.Component {
       static getDerivedStateFromError(error) {
           return { hasError: true, error };
       }
       componentDidCatch(error, errorInfo) {
           console.error('[ErrorBoundary] Caught error:', error);
           console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
       }
       render() {
           if (this.state.hasError) {
               return <h1>Something went wrong.</h1>;
           }
           return this.props.children;
       }
   }
   ```
   - ✅ Error boundary implemented
   - ⚠️ Only wraps content in `App.jsx:258`
   - Doesn't wrap route handlers, API calls, or async operations
   - **Gap**: Errors in useEffect or event handlers won't be caught

2. **No Global Error Handler** (`api.js:9-31`):
   ```javascript
   const apiFetch = async (endpoint, options = {}) => {
       // ... fetch logic
       if (!response.ok) {
           const error = await response.json();
           throw new Error(error.error || 'Request failed');
       }
       return response.json();
   };
   ```
   - No global error handler for unhandled promise rejections
   - **Issue**: Unhandled rejections in useEffect could crash entire app

3. **No Network Error Recovery**:
   - Single network failure causes error state
   - No retry mechanism
   - No exponential backoff for retry attempts
   - **Fix**: Implement retry wrapper with exponential backoff

**Fallback Mechanisms:**

1. **ML Fallback** (`http_predictor.go:35-38`):
   ```go
   if p.url == "" {
       log.Printf("[ML] URL not configured, returning unknown")
       return "unknown", 0
   }
   ```
   - ✅ Fallback exists when ML server URL is not configured
   - ⚠️ Returns hardcoded "unknown" cluster - doesn't distinguish between "ML server down" vs "ML not configured"
   - **Better**: Return error that frontend can handle gracefully

2. **No Database Connection Retry**:
   - Single DB connection failure returns 500 error
   - No reconnection logic
   - No connection pool management verification
   - **Gap**: App doesn't recover from temporary DB issues

3. **No Token Refresh Fallback** (`api.js`):
   - No automatic token refresh on 401 errors
   - User must manually logout and login again
   - **Fix**: Implement interceptor pattern with automatic refresh

**Recovery Flows:**

1. **Assessment Creation Recovery** (`assessments.go:131-199`):
   ```go
   assessment, err := h.store.Assessments().Create(c.Request.Context(), assessment)
   if err != nil {
       log.Printf("Failed to create assessment: %v", err)
       c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create assessment"})
       return
   }
   cluster, riskScore := h.predictor.Predict(assessment)
   // ... use prediction
   ```
   - If `Create` succeeds but `Predict` fails, assessment is saved without prediction
   - **Partial State**: Assessment exists but has no risk score
   - **Recovery Gap**: No cleanup mechanism to delete orphaned assessments

2. **Onboarding Partial Failure** (`users.go:149-167`):
   ```go
   // Transaction-like updates (best effort or use actual transaction if store supports it)
   if _, err := h.store.Users().UpdateUser(c.Request.Context(), userUpdate); err != nil {
       c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user details"})
       return
   }
   if err := h.store.Users().UpdateUserConsent(c.Request.Context(), userClaims.UserID, consent); err != nil {
       c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update consent"})
       return
   }
   if err := h.store.Users().UpdateUserOnboarding(c.Request.Context(), userClaims.UserID, true); err != nil {
       c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to complete onboarding"})
       return
   }
   ```
   - ⚠️ Multiple DB operations without transaction
   - If first two succeed but third fails, partial state is committed
   - **Recovery Gap**: No rollback mechanism to undo partial changes

---

### Iteration 3: Cross-Component Code Quality ✅

**Architecture Patterns:**

✅ **Good:**
- Clear separation: `frontend/`, `backend/`, `ml/` directories
- Dependency injection via constructors: `NewAuthHandler`, `NewAssessmentsHandler`
- Interface-based design: `store.Store` interface
- Layered architecture: handlers → services → store

⚠️ **Issues:**
1. **God Object Usage** (`backend/AGENTS.md`):
   - Multiple instances of store interface created
   - Not using dependency injection consistently
   - **Example**: `auditLogger := middleware.NewAuditLogger(st)` vs store passed as parameter

2. **Tight Coupling**:
   - `assessments.go` directly uses `h.predictor.Predict()`
   - Predictor is injected at handler construction
   - ✅ Good pattern, but could be abstracted further

3. **No Repository Pattern**:
   - SQLC generates code directly in `store/sqlc/`
   - No repository abstraction layer
   - Makes testing difficult and code less maintainable

**Module Boundaries:**

1. **Business Logic in Handlers** (`assessments.go:52-128`):
   ```go
   func validationStatus(a models.Assessment) string {
       var statuses []string
       if a.FBS >= 126 {
           statuses = append(statuses, "fbs_diabetic_range")
       }
       // ... 8 more biomarker checks
       if len(statuses) == 0 {
           return "ok"
       }
       res := "warning:"
       for i, s := range statuses {
           if i > 0 {
               res += ","
           }
           res += s
       }
       return res
   }
   ```
   - Complex validation logic belongs in handler, not service layer
   - Should be in `internal/services/validation_service.go`

2. **ML Logic in API Server** (`server.py:230-285`):
   - Complex A/B testing, drift detection, MLflow integration
   - ✅ Good: Well-organized sections
   - ⚠️ Production features (MLflow, A/B testing) not behind feature flags
   - Could accidentally expose advanced features in dev environments

**Dependency Management:**

1. **Version Drift**:
   - Backend Go modules: Uses Go 1.21+ (per docs)
   - Frontend: No specific version requirements
   - ML Python: No version pinned
   - **Risk**: Dependency updates could introduce breaking changes

2. **Deprecated Patterns**:
   - `backend/AGENTS.md` mentions: `interface{}` should be `any` (Go 1.18+)
   - 120+ occurrences found
   - Should use modern Go syntax

3. **Unused Dependencies**:
   - `frontend/src/App.jsx` imports `CustomCursor` but may not be used
   - Many components import `lucide-react` icons but usage unclear

---

### Iteration 4: Security & Logic ✅

**Authentication Flow Issues:**

1. **CRITICAL: No Password Complexity Requirements** (`auth.go:112-116`):
   ```go
   type signupRequest struct {
       Email     string `json:"email" binding:"required,email"`
       Password  string `json:"password" binding:"required,min=8"`
       FirstName string `json:"first_name" binding:"required"`
       LastName  string `json:"last_name" binding:"required"`
   }
   ```
   - Only enforces minimum 8 characters
   - No complexity requirements (uppercase, number, special character)
   - **Security Risk**: "password123" is valid
   - **OWASP Violation**: L1 - Brute Force

2. **CRITICAL: No Account Lockout** (`auth.go`):
   - No failed login attempt tracking
   - No rate limiting on authentication endpoint specifically
   - **Security Risk**: Brute force attacks possible
   - **OWASP Violation**: L1 - Brute Force

3. **Weak JWT Configuration** (`.env` default):
   ```bash
   JWT_SECRET=your-secure-secret-min-32-chars
   ```
   - Default JWT secret is in documentation
   - If developer forgets to change it in production, all tokens are compromised
   - **Security Risk**: Any attacker who knows default secret can forge tokens
   - **Fix**: Require JWT_SECRET in production, fail to start if missing

4. **Token Refresh Without Verification** (`auth.go:198-288`):
   ```go
   // Revoke old refresh token (token rotation for security)
   _ = h.store.RefreshTokens().RevokeRefreshToken(c.Request.Context(), tokenHash)
   // Generate new refresh token
   _, err = h.store.RefreshTokens().CreateRefreshToken(c.Request.Context(), refreshTokenHash, int32(user.ID), time.Now().Add(7*24*time.Hour))
   ```
   - ❌ Error from `RevokeRefreshToken` is ignored
   - Old refresh token remains valid if revocation fails
   - **Security Risk**: Token replay attacks possible

**Authorization Checks:**

1. **RBAC Not Applied to Assessment Routes** (`assessments.go:131-199`):
   ```go
   r.POST("", h.Create)
   r.GET("", h.List)
   ```
   - Routes only use Auth middleware
   - No role checks (user vs admin)
   - ✅ Not a security issue since users can only access their own assessments
   - ⚠️ But inconsistent with admin routes that use RBAC

2. **Missing Ownership Verification on Profile Update** (`users.go:99-106`):
   ```go
   var req models.User
   if err := c.ShouldBindJSON(&req); err != nil {
       c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
       return
   }
   // Ensure ID matches token
   req.ID = userClaims.UserID
   updatedUser, err := h.store.Users().UpdateUser(c.Request.Context(), req)
   ```
   - Sets `req.ID` from token
   - But doesn't verify user owns the profile they're trying to update
   - **Security Risk**: ID substitution could allow privilege escalation if token contains different user_id

3. **Admin Actions Without Audit** (`admin_*.go`):
   - Some admin routes may skip audit logging
   - **Compliance Risk**: Unable to detect unauthorized admin actions

**Input Sanitization:**

1. **SQL Injection Protection**:
   - ✅ SQLC generates parameterized queries
   - ✅ No string concatenation in SQL
   - **Best Practice**: Good

2. **XSS Protection** (`middleware/security.go:31`):
   ```go
   c.Header("X-XSS-Protection", "1; mode=block")
   ```
   - ✅ XSS protection header set
   - **Gap**: No input sanitization for user-generated content displayed in HTML
   - **Risk**: Reflected XSS possible in profile display

3. **No Request Size Limiting on Login**:
   - `auth.go` doesn't use `MaxBodySize` middleware
   - **Security Risk**: Large payloads could cause DoS
   - **Fix**: Add `middleware.MaxBodySize(1024 * 1024)` to auth routes

4. **No Path Traversal Protection**:
   - File endpoints don't validate file paths
   - Export endpoint doesn't verify path is within allowed directory
   - **Risk**: Directory traversal attacks possible

---

### Iteration 4: Security & UX ✅

**Sensitive Data Handling:**

1. **PII in Console Logs** (20+ files):
   ```javascript
   console.error('Failed to load user profile:', err);
   ```
   - Full error objects logged to console
   - May contain PII (email, name, address)
   - **Privacy Risk**: Console logs visible to users in browser dev tools
   - **Fix**: Strip PII before logging, use structured logging

2. **Password Visible in Network Requests** (`api.js:19-23`):
   ```javascript
   const response = await fetch(`${API_BASE}${endpoint}`, {
       method: options.method || 'GET',
       headers,
       body: options.body ? JSON.stringify(options.body) : undefined,
   });
   ```
   - Password sent in request body
   - ✅ HTTPS protects in transit (assuming production)
   - ⚠️ Password visible in browser DevTools Network tab
   - **Fix**: Don't log request bodies

3. **Biomarker Data in Local Storage** (`App.jsx:95-96`):
   ```javascript
   localStorage.setItem('diana_token', res.access_token);
   localStorage.setItem('diana_refresh_token', res.refresh_token);
   ```
   - ✅ Tokens stored in localStorage
   - ⚠️ Assessments loaded and stored in state
   - **Privacy Risk**: Local storage accessible to any JavaScript code on same origin
   - **Gap**: No encryption for sensitive data

**Secure Error Messages:**

1. **Generic Error Messages Leak Info** (`http_predictor.go:67`):
   ```go
   return "error", 0
   ```
   - User sees "error" as cluster
   - Attacker can infer ML server exists from error message
   - **Fix**: Use "Service temporarily unavailable" for internal errors

2. **Detailed Validation Errors** (`auth.go:115`):
   ```go
   c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
   ```
   - `err.Error()` returns "json: unknown field \"x\""
   - **Information Leak**: Exposes field names and JSON parsing details
   - **Attacker Value**: Can probe API schema
   - **Fix**: Return "Invalid input" without field details

3. **Stack Traces in Development** (Backend Go code):
   - Production errors show generic messages
   - ✅ Good practice
   - **Gap**: Development mode could show stack traces for debugging
   - **Fix**: Ensure stack traces never shown in production

**User Privacy:**

1. **No Consent Verification** (`users.go:205-215`):
   ```go
   func UpdateConsentSettings(c *gin.Context) {
       // ... get user claims
       var req models.ConsentSettings
       if err := c.ShouldBindJSON(&req); err != nil {
           c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
           return
       }
       // Direct update - no consent change verification
       if err := h.store.Users().UpdateUserConsent(c.Request.Context(), userClaims.UserID, req); err != nil {
           c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update consent"})
           return
       }
   }
   ```
   - User can toggle consent settings
   - No record of consent history
   - **GDPR Risk**: Cannot prove user agreed to specific consent version

2. **No Data Deletion Verification** (`users.go:242-256`):
   ```go
   func DeleteAccount(c *gin.Context) {
       // ... get user claims
       if err := h.store.Users().SoftDeleteUser(c.Request.Context(), userClaims.UserID); err != nil {
           c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete account"})
           return
       }
       c.JSON(http.StatusOK, gin.H{"status": "account deleted"})
   }
   ```
   - Account deleted immediately
   - No grace period for data recovery
   - No verification email sent to confirm deletion

---

### Iteration 4: Security & Data Flow ✅

**Data Encryption:**

1. **Password Storage** (`auth.go:127`):
   ```go
   hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
   if err != nil {
       c.JSON(http.StatusInternalServerError, gin.H{"error": "server error"})
       return
   }
   ```
   - ✅ Bcrypt with DefaultCost (12 rounds)
   - ✅ Password hashing implemented correctly
   - ⚠️ Cost factor hardcoded, no way to increase without code change
   - **Recommendation**: Make cost configurable via environment variable

2. **No Data at Rest in Transit**:
   - HTTPS required for secure transmission
   - Not verified in code if TLS is enforced in production
   - **Gap**: No HSTS headers forcing HTTPS
   - **Fix**: Add `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` header

3. **Token Storage** (`App.jsx:95-96`):
   ```javascript
   localStorage.setItem('diana_token', res.access_token);
   localStorage.setItem('diana_refresh_token', res.refresh_token);
   ```
   - Tokens stored as plain text in localStorage
   - Accessible to XSS on same origin
   - **Fix**: Use encrypted storage or secure httpOnly cookies

**Secure Storage:**

1. **Database Connection Security**:
   - Connection string in `.env` environment variable
   - ✅ Not committed to repository
   - ✅ Separate `.env.example` template
   - ⚠️ No verification that SSL is enforced
   - **Fix**: Add `sslmode=require` to connection string validation

2. **API Key for ML Server** (`server.py:52`):
   ```python
   API_KEY = os.environ.get('ML_API_KEY')
   ```
   - ML server requires API key in production
   - ✅ Good security practice
   - ⚠️ No API key rotation mechanism
   - **Recommendation**: Add API key versioning and rotation support

**Data Leakage Prevention:**

1. **Audit Trail Issues** (`audit.go:64-75`):
   ```go
   go func() {
       event := models.AuditEvent{...}
       _ = a.store.AuditEvents().Create(c.Request.Context(), event)
   }()
   ```
   - Silent failures create data leakage in audit trail
   - **Compliance Risk**: Cannot prove actions weren't performed

2. **Error State Leakage** (`UserProfile.jsx:10-12`):
   ```jsx
   const [error, setError] = useState(null);
   ```
   - Error state could be leaked to other tabs via shared state (if using state management library)
   - **Minimal Risk**: Current implementation uses React useState (isolated)

3. **No Sensitive Data Masking in Logs**:
   - Audit redaction exists (`audit.go:148-153`):
     ```go
     sensitiveFields := []string{
         "password", "password_hash", "token", "refresh_token",
         "first_name", "last_name", "email", "phone", "address", "date_of_birth",
         "hba1c", "fbs", "cholesterol", "ldl", "hdl", "triglycerides",
         "systolic", "diastolic", "bmi",
     }
     redactSensitiveFields(bodyMap, sensitiveFields)
     ```
   - ✅ Comprehensive sensitive field list
   - ✅ Redaction logic implemented
   - ⚠️ Not consistently applied across all log points

---

### Iteration 4: Security & Error Handling ✅

**Secure Error Logging:**

1. **Silent Audit Failures** (`audit.go:73`):
   ```go
   _ = a.store.AuditEvents().Create(c.Request.Context(), event)
   ```
   - ❌ Error completely ignored
   - No logging when audit creation fails
   - **Detection Gap**: Cannot monitor audit system health

2. **Generic Error Messages in Production**:
   - Backend returns `gin.H{"error": "..."}` consistently
   - ✅ Generic messages don't leak implementation details
   - ⚠️ Also don't help users understand what went wrong

3. **No Error Rate Limiting**:
   - Rate limiting prevents DoS on API endpoints
   - ✅ Good security practice
   - ⚠️ No rate limiting on authentication endpoint
   - **Fix**: Implement stricter rate limiting for `/auth/login` and `/auth/register`

**Stack Trace Exposure:**

1. **Development vs Production** (`config/config.go`):
   ```go
   ENV string `mapstructure:"ENV"`
   ```
   - Environment variable controls debug mode
   - ✅ Allows enabling detailed logging in dev
   - ⚠️ No verification that stack traces are disabled in production
   - **Fix**: Add explicit check:
     ```go
     if cfg.ENV == "production" {
         // Use structured logging without stack traces
     } else {
         // Use verbose logging with stack traces
     }
     ```

2. **Error Information Leaks** (`auth.go:115`):
   ```go
   c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
   ```
   - `err.Error()` may include:
     - "json: invalid field \"user_id\""
     - "pq: relation \"users\" does not exist"
     - File paths, internal state
   - **Attacker Value**: Can map database schema
   - **Fix**: Always return sanitized, user-friendly error messages

**Audit Trails:**

1. **Incomplete Audit Coverage**:
   - Audit middleware used on admin routes
   - Not applied to all critical user actions:
     - Assessment creation/deletion
     - Profile updates
     - Consent changes
   - **Compliance Risk**: Cannot reconstruct user activity timeline

2. **No Audit Event Versioning**:
   - Audit events don't include schema version
   - If audit schema evolves, parsing old events breaks
   - **Recommendation**: Add `"version": "1.0"` to audit events

3. **No User-Agent Logging** (`audit.go:78-86`):
   ```go
   details := map[string]interface{}{
       "method":     c.Request.Method,
       "path":       c.Request.URL.Path,
       "status":     c.Writer.Status(),
       "ip":         c.ClientIP(),
       "user_agent": c.Request.UserAgent(),
   }
   ```
   - ✅ Good: Captures User-Agent
   - ⚠️ User-Agent not validated or logged separately
   - **Risk**: Can't detect automated vs legitimate requests

---

### Iteration 4: Security & Code Quality ✅

**OWASP Compliance:**

✅ **Implemented:**
- SQL injection protection via SQLC (parameterized queries)
- XSS protection headers
- Password hashing with bcrypt
- JWT authentication with expiration
- Rate limiting with token bucket

❌ **Violations:**

1. **A01:2021 - Broken Access Control**:
   - No password complexity requirements
   - No account lockout
   - No CSRF protection on state-changing operations

2. **A02:2021 - Cryptographic Failures**:
   - Default JWT secret in documentation
   - No key rotation mechanism
   - Bcrypt cost not configurable

3. **A03:2021 - Injection**:
   - ✅ Good SQLC implementation
   - ⚠️ No ORM-level protection on queries
   - Missing input validation on some endpoints

4. **A05:2021 - Security Misconfiguration**:
   - Debug mode not disabled by default
   - No security headers verification in production
   - CORS origins read from env but default may be too permissive

5. **A07:2021 - Identification and Authentication Failures**:
   - Login returns generic "invalid credentials"
   - Doesn't specify if email or password is wrong
   - Enables user enumeration attacks

6. **A09:2021 - Security Logging and Monitoring Failures**:
   - Silent audit logging failures
   - No centralized error monitoring
   - No alerting on suspicious activities

**Dependency Vulnerabilities:**

1. **Outdated Dependencies**:
   - Frontend: React 18.3.1 (check for CVEs)
   - Backend: Go 1.21+ (check for CVEs)
   - ML: Python with joblib, scikit-learn, flask
   - **Action Needed**: Run `npm audit` and `govulncheck` and `pip-audit`

2. **Dependency Scanning**:
   - No GitHub Actions or CI/CD scanning
   - No automated vulnerability scanning
   - **Recommendation**: Add Dependabot or Snyk integration

3. **Pinned Versions**:
   - No specific versions pinned in package files
   - Vulnerabilities could be introduced via dependency updates
   - **Fix**: Use exact version pinning in requirements

**Security Best Practices:**

✅ **Implemented:**
- Environment-based configuration
- Secret management via environment variables
- HTTP-only cookies for secure auth (not used, but available)
- Rate limiting on API endpoints

⚠️ **Missing:**
- No Content Security Policy (CSP) verification
- No Subresource Integrity (SRI) for script loading
- No referrer policy headers
- No Permissions-Policy header
- No security unit tests

---

### Iteration 5: Final Review ✅

**Critical Issues Prioritized:**

**P0 - Immediate Action Required:**

1. **Silent Audit Logging Failures** (Backend: Go)
   - **File**: `backend/internal/http/middleware/audit.go:73`
   - **Impact**: Security/compliance risk, data loss
   - **Fix**: Add error logging and monitoring for audit event creation
   ```go
   go func() {
       event := models.AuditEvent{...}
       if err := a.store.AuditEvents().Create(c.Request.Context(), event); err != nil {
           log.Printf("[AUDIT] Failed to log event: %v", err)
           // Consider: Send to dead letter queue, fire alert
       }
   }()
   ```

2. **Missing Transaction Wrapping** (Backend: Go)
   - **File**: `backend/internal/http/handlers/assessments.go:183-196`
   - **Impact**: Data integrity, partial state updates
   - **Fix**: Wrap assessment creation and user metadata update in transaction
   ```go
   func (h *AssessmentsHandler) Create(c *gin.Context) {
       // ... prediction logic
       err := h.store.Transaction(func(tx *sql.Tx) error {
           created, err := h.store.Assessments().CreateWithTx(tx, assessment)
           if err != nil {
               return err
           }
           _, err = h.store.Users().UpdateLastLoginWithTx(tx, int32(userID))
           return err
       })(c.Request.Context())
       if err != nil {
           c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create assessment"})
           return
       }
       c.JSON(http.StatusCreated, assessment)
   }
   ```

3. **No Password Complexity Requirements** (Backend: Go)
   - **File**: `backend/internal/http/handlers/auth.go:34-37`
   - **Impact**: Security vulnerability
   - **Fix**: Add password complexity validation
   ```go
   const (
       MinPasswordLength = 8
       MaxPasswordLength = 128
       MinUppercase = 1
       MinLowercase = 1
       MinNumber = 1
       MinSpecial = 1
   )
   
   type PasswordComplexity struct {
       HasMinLength      bool
       HasUppercase    bool
       HasLowercase    bool
       HasNumber       bool
       HasSpecial       bool
   }
   
   func validatePasswordComplexity(password string) PasswordComplexity {
       // ... validation logic
       return PasswordComplexity{
           HasMinLength: len(password) >= MinPasswordLength,
           // ... other checks
       }
   }
   
   // In signup handler:
   complexity := validatePasswordComplexity(req.Password)
   if !complexity.HasMinLength || !complexity.HasUppercase || !complexity.HasLowercase {
       c.JSON(http.StatusBadRequest, gin.H{"error": "Password must contain uppercase, lowercase, numbers, and be at least 8 characters"})
       return
   }
   ```

4. **No Token Refresh Mechanism** (Frontend: JavaScript)
   - **File**: `frontend/src/api.js:9-31`
   - **Impact**: UX degradation
   - **Fix**: Implement automatic token refresh on 401 errors
   ```javascript
   const apiFetch = async (endpoint, options = {}) => {
       const response = await fetch(`${API_BASE}${endpoint}`, {
           method: options.method || 'GET',
           headers,
           body: options.body ? JSON.stringify(options.body) : undefined,
       });
       if (!response.ok) {
           if (response.status === 401) {
               // Attempt token refresh
               const newToken = await attemptTokenRefresh();
               if (newToken) {
                   localStorage.setItem('diana_token', newToken.access_token);
                   // Retry original request
                   const retryResponse = await fetch(`${API_BASE}${endpoint}`, {...options});
                   if (retryResponse.ok) {
                       return retryResponse.json();
                   }
               }
           }
           const error = await response.json();
           throw new Error(error.error || 'Request failed');
       }
       return response.json();
   };
   
   async function attemptTokenRefresh() {
       const refreshToken = localStorage.getItem('diana_refresh_token');
       if (!refreshToken) {
           throw new Error('No refresh token available');
       }
       const response = await fetch(`${API_BASE}/auth/refresh`, {
           method: 'POST',
           headers: {
               'Content-Type': 'application/json',
           },
           body: JSON.stringify({ refresh_token: refreshToken }),
       });
       if (!response.ok) {
           throw new Error('Token refresh failed');
       }
       const data = await response.json();
       localStorage.setItem('diana_token', data.access_token);
       localStorage.setItem('diana_refresh_token', data.refresh_token);
       return data;
   }
   ```

**P1 - High Priority:**

1. **Name Field Mapping Bug** (Frontend: JavaScript)
   - **File**: `frontend/src/components/user/UserProfile.jsx:45-46`
   - **Impact**: User data corruption
   - **Fix**: Add separate first_name and last_name fields to form
   ```jsx
   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
     <div>
       <label className="block text-sm font-medium text-slate-300 mb-2">First Name</label>
       <input
         type="text"
         name="firstName"
         value={formData.firstName || ''}
         onChange={handleChange}
         required
         className="..."
       />
     </div>
     <div>
       <label className="block text-sm font-medium text-slate-300 mb-2">Last Name</label>
       <input
         type="text"
         name="lastName"
         value={formData.lastName || ''}
         onChange={handleChange}
         required
         className="..."
       />
     </div>
   </div>
   // Then in handleSubmit:
   const snakeCasePayload = {
     first_name: formData.firstName,
     last_name: formData.lastName,
     // ...
   };
   ```

2. **Silent Profile Load Failures** (Backend: Go)
   - **File**: `backend/internal/http/handlers/users.go:51-55`
   - **Impact**: Silent data loss
   - **Fix**: Remove comment suppression, add proper error handling
   ```go
   assessment, err := h.store.Users().GetLatestAssessmentByUser(c.Request.Context(), userClaims.UserID)
   if err != nil {
       log.Printf("Failed to fetch latest assessment: %v", err)  // ❌ Don't comment out
       // Return error or set profile with null latest assessment
       profile.LastAssessmentAt = nil
       profile.CurrentCluster = ""
       profile.CurrentRiskLevel = ""
   } else {
       profile.LastAssessmentAt = &assessment.CreatedAt
       profile.CurrentCluster = assessment.Cluster
       // Calculate risk level...
   }
   ```

3. **ML Server Default Age Substitution** (ML: Python)
   - **File**: `ml/server.py:63, 263, 325`
   - **Impact**: Prediction accuracy
   - **Fix**: Return error when required fields are missing
   ```python
   # In predict() functions:
   if 'age' not in data or data['age'] is None:
       return {
           "success": False,
           "error": "Age is required for clinical model prediction"
       }
   patient_data = {
       "bmi": data.get("bmi"),
       "triglycerides": data.get("triglycerides"),
       "ldl": data.get("ldl"),
       "hdl": data.get("hdl"),
       "age": data.get("age"),  # ❌ Don't default to 54
   }
   ```

4. **Duplicate Ownership Verification Code** (Backend: Go)
   - **Files**: `assessments.go` (4 occurrences)
   - **Impact**: Code maintainability
   - **Fix**: Extract to shared helper function
   ```go
   // In internal/http/handlers/utils.go:
   func verifyAssessmentOwnership(c *gin.Context, assessment models.Assessment, userID int32) bool {
       if assessment.UserID != userID {
           c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
           return false
       }
       return true
   }
   
   // Then in handlers:
   func (h *AssessmentsHandler) Get(c *gin.Context) {
       // ...
       if !verifyAssessmentOwnership(c, assessment, userID) {
           return
       }
       // ... rest of handler
   }
   ```

5. **No Rate Limiting on Authentication** (Backend: Go)
   - **File**: `backend/internal/http/router/router.go`
   - **Impact**: Security vulnerability
   - **Fix**: Add stricter rate limiting to auth endpoints
   ```go
   authGroup := router.Group("/auth")
   authGroup.Use(middleware.AuthRateLimit(5))  // 5 requests per minute
   authGroup.POST("/login", h.login)
   authGroup.POST("/signup", h.signup)
   ```

**P2 - Medium Priority:**

1. **Inconsistent Risk Level Thresholds** (Backend: Go, Frontend: JavaScript)
   - **Files**: `assessments.go:42-50`, `users.go:69-75`, `Dashboard_user.jsx:86-93`
   - **Impact**: User confusion
   - **Fix**: Centralize risk thresholds in shared constants
   ```go
   // In internal/utils/risk_calculator.go:
   const (
       RiskLevelLowThreshold = 30
       RiskLevelMediumThreshold = 70
   )
   func CalculateRiskLevel(score int) string {
       if score < RiskLevelLowThreshold {
           return "low"
       } else if score < RiskLevelMediumThreshold {
           return "medium"
       } else {
           return "high"
       }
   }
   ```

2. **Manual String Concatenation** (Backend: Go)
   - **File**: `assessments.go:120-127`
   - **Impact**: Code maintainability
   - **Fix**: Use strings.Join or fmt.Sprintf
   ```go
   func validationStatus(a models.Assessment) string {
       var statuses []string
       if a.FBS >= 126 {
           statuses = append(statuses, "fbs_diabetic_range")
       }
       // ... more checks
       if len(statuses) == 0 {
           return "ok"
       }
       return "warning:" + strings.Join(statuses, ",")
   }
   ```

3. **No Loading State During Assessment** (Frontend: JavaScript)
   - **File**: `UserProfile.jsx` - assessment submission
   - **Impact**: UX issue, possible double-submissions
   - **Fix**: Add loading state and disable submit button
   ```jsx
   const handleSubmit = async e => {
       e.preventDefault();
       setSaving(true);
       setError(null);
       try {
           await updateUserProfileApi(token, snakeCasePayload);
           setProfile({...formData, ...snakeCasePayload});
           alert('Profile updated successfully!');
       } catch (err) {
           setError(err.message || 'Failed to update profile');
       } finally {
           setSaving(false);
       }
   };
   
   // In JSX:
   <button
       type="submit"
       disabled={saving}
       className="..."
   >
       {saving ? 'Saving...' : 'Save Changes'}
   </button>
   ```

4. **Complex Assessment Frequency Mapping** (Frontend: JavaScript)
   - **File**: `frontend/src/components/user/UserProfile.jsx:57`
   - **Impact**: Code maintainability
   - **Fix**: Use mapping object instead of nested ternary
   ```jsx
   const ASSESSMENT_FREQUENCY_TO_MONTHS = {
     'weekly': 1,
     'monthly': 3,
     'quarterly': 12,
     'none': null,
   };
   
   assessment_frequency_months: ASSESSMENT_FREQUENCY_TO_MONTHS[formData.assessmentFrequency] || null,
   ```

5. **Generic Error Messages** (Backend: Go)
   - **Files**: Multiple handlers
   - **Impact**: Poor UX
   - **Fix**: Return user-friendly, actionable error messages
   ```go
   // Instead of:
   c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create assessment"})
   
   // Use:
   c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to save your assessment. Please try again or contact support if the problem persists."})
   ```

6. **Race Condition in Rate Limiter** (Backend: Go)
   - **File**: `backend/internal/http/middleware/ratelimit.go:94-98`
   - **Impact**: Memory leak
   - **Fix**: Add stop mechanism to cleanup goroutine
   ```go
   type RateLimiter struct {
       visitors   map[string]*visitor
       evictHeap  visitorHeap
       mu         sync.RWMutex
       rate       int
       duration   time.Duration
       maxEntries int
       stopChan   chan struct{}  // Add stop channel
   }
   
   func NewRateLimiterWithMax(rate int, duration time.Duration, maxEntries int) *RateLimiter {
       rl := &RateLimiter{..., stopChan: make(chan struct{})}
       // ... initialization
       go rl.cleanup()
       return rl
   }
   
   func (rl *RateLimiter) Stop() {
       close(rl.stopChan)  // Signal cleanup to stop
   }
   
   func (rl *RateLimiter) cleanup() {
       ticker := time.NewTicker(5 * time.Minute)
       defer ticker.Stop()
       for {
           select {
           case <-ticker.C:
               // ... cleanup logic
           case <-rl.stopChan:
                   return
           }
       }
   }
   ```

**P3 - Low Priority:**

1. **Redundant Console Error Logging** (Frontend: JavaScript)
   - **Files**: 20 files with console.error
   - **Impact**: Performance, noise in production
   - **Fix**: Replace with proper logging service or remove

2. **No Graceful Degradation for ML Server Unavailability** (Backend: Go, Frontend: JavaScript)
   - **Files**: `http_predictor.go:35-38`, frontend components
   - **Impact**: Poor UX
   - **Fix**: Implement fallback UI and cached data display
   ```javascript
   // In Dashboard_user.jsx:
   const [mlError, setMLError] = useState(null);
   
   useEffect(() => {
       const loadData = async () => {
           setLoading(true);
           try {
               const metrics = await fetchMLMetricsApi(token);
               setMlMetrics(metrics);
           } catch (err) {
               setMLError('ML server is currently unavailable. Showing cached data.');
               // Show warning banner
           } finally {
               setLoading(false);
           }
       };
       loadData();
   }, [token]);
   ```

3. **Interface{} Usage Instead of `any`** (Backend: Go)
   - **Files**: Multiple Go files
   - **Impact**: Code maintainability
   - **Fix**: Replace with `any` (Go 1.18+)
   ```go
   // Search and replace all occurrences of:
   interface{}
   // With:
   any
   ```

4. **TODO/FIXME Comments** (Multiple files)
   - **Files**: `notification_service.go`, `export.go`
   - **Impact**: Technical debt, incomplete features
   - **Fix**: Create GitHub issues to track TODOs or implement features

5. **Inconsistent Naming Conventions** (Multiple files)
   - **Impact**: Code readability
   - **Fix**: Establish and document naming conventions guide
   ```
   # Naming Conventions Guide
   
   ## Go
   - Packages: lowercase, single word: `package handlers`
   - Exports: PascalCase: `func NewAuthHandler()`, `type AuthHandler struct`
   - Unexported: camelCase: `userID`, `accessToken`
   - Constants: SCREAMING_SNAKE_CASE: `const MaxLoginAttempts = 5`
   - Interfaces: PascalCase: `type Store interface`
   
   ## JavaScript/React
   - Components: PascalCase: `const UserProfile = () => {}`
   - Functions/Variables: camelCase: `const handleSubmit = () => {}`, `const [loading, setLoading]`
   - Constants: SCREAMING_SNAKE_CASE: `const API_BASE = '...'`
   - Files: kebab-case: `user-profile.jsx`, `api.js`
   - CSS Classes: kebab-case: `className="bg-slate-800"`
   ```

---

## Code Snippets

### Issue 1: Silent Audit Logging Failure

**File**: `backend/internal/http/middleware/audit.go:64-75`

**Current Code (Problematic):**
```go
// Create audit event (fire and forget - don't block response)
go func() {
    event := models.AuditEvent{
        Actor:      claims.Email,
        Action:     action,
        TargetType: targetType,
        TargetID:   targetID,
        Details:    details,
    }
    _ = a.store.AuditEvents().Create(c.Request.Context(), event)  // ❌ Error ignored
}()
```

**Recommended Fix:**
```go
// Create audit event with error handling and monitoring
go func() {
    event := models.AuditEvent{
        Actor:      claims.Email,
        Action:     action,
        TargetType: targetType,
        TargetID:   targetID,
        Details:    details,
    }
    if err := a.store.AuditEvents().Create(c.Request.Context(), event); err != nil {
        // Log error for monitoring
        log.Printf("[AUDIT] Failed to log event %s for user %s: %v", action, claims.Email, err)
        // Consider sending to dead letter queue for later processing
        // Consider triggering alert if audit failures exceed threshold
    }
}()
```

---

### Issue 2: Missing Transaction Wrapping

**File**: `backend/internal/http/handlers/assessments.go:183-196`

**Current Code (Problematic):**
```go
// Create assessment in database
created, err := h.store.Assessments().Create(c.Request.Context(), assessment)
if err != nil {
    log.Printf("Failed to create assessment: %v", err)
    c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create assessment"})
    return
}

// Get full assessment with model info
assessment.ID = created.ID
assessment.ModelVersion = h.modelVer
assessment.DatasetHash = h.datasetHash

// Reset last assessment reminder (UpdateLastLogin as proxy, or ignore)
_ = h.store.Users().UpdateLastLogin(c.Request.Context(), int32(userID))

c.JSON(http.StatusCreated, assessment)
```

**Recommended Fix:**
```go
// Create assessment with transaction for atomicity
func (h *AssessmentsHandler) Create(c *gin.Context) {
    // ... validation and prediction logic
    
    assessment.Cluster = cluster
    assessment.RiskScore = riskScore
    assessment.RiskLevel = calculateRiskLevel(riskScore)
    
    // Wrap in transaction
    err := h.store.Transaction(func(tx *sql.Tx) error {
        created, err := h.store.Assessments().CreateWithTx(tx, assessment)
        if err != nil {
            return fmt.Errorf("failed to create assessment: %w", err)
        }
        
        assessment.ID = created.ID
        assessment.ModelVersion = h.modelVer
        assessment.DatasetHash = h.datasetHash
        
        // Update user metadata in same transaction
        _, err = h.store.Users().UpdateLastLoginWithTx(tx, int32(userID))
        if err != nil {
            return fmt.Errorf("failed to update user metadata: %w", err)
        }
        
        return nil
    })(c.Request.Context())
    
    if err != nil {
        log.Printf("Failed to create assessment with user update: %v", err)
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create assessment"})
        return
    }
    
    c.JSON(http.StatusCreated, assessment)
}
```

---

### Issue 3: No Token Refresh Mechanism

**File**: `frontend/src/api.js:9-31`

**Current Code (Problematic):**
```javascript
const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('diana_token');
  const headers = {
      'Content-Type': 'application/json',
  };
  
  if (token) {
      headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
  });
  
  if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');  // ❌ No refresh on 401
  }
  
  return response.json();
};
```

**Recommended Fix:**
```javascript
// Token refresh interceptor
let isRefreshing = false;
let refreshSubscribers = [];

// Subscribe to token refresh events
function subscribeToTokenRefresh(callback) {
    refreshSubscribers.push(callback);
}

function notifyTokenRefresh(newToken) {
    refreshSubscribers.forEach(cb => cb(newToken));
}

async function attemptTokenRefresh() {
    const refreshToken = localStorage.getItem('diana_refresh_token');
    if (!refreshToken || isRefreshing) {
        throw new Error('No refresh token available');
    }
    
    isRefreshing = true;
    try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
        
        if (!response.ok) {
            throw new Error('Token refresh failed');
        }
        
        const data = await response.json();
        localStorage.setItem('diana_token', data.access_token);
        localStorage.setItem('diana_refresh_token', data.refresh_token);
        
        notifyTokenRefresh(data.access_token);
        return data.access_token;
    } finally {
        isRefreshing = false;
    }
}

const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('diana_token');
  const headers = {
      'Content-Type': 'application/json',
  };
  
  if (token) {
      headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
  });
  
  if (!response.ok) {
      if (response.status === 401) {
          // Attempt token refresh
          try {
              const newToken = await attemptTokenRefresh();
              if (newToken) {
                  localStorage.setItem('diana_token', newToken);
                  // Retry original request
                  const retryHeaders = { ...headers };
                  retryHeaders['Authorization'] = `Bearer ${newToken}`;
                  const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
                      method: options.method || 'GET',
                      headers: retryHeaders,
                      body: options.body ? JSON.stringify(options.body) : undefined,
                  });
                  if (retryResponse.ok) {
                      return retryResponse.json();
                  }
              }
          } catch (refreshErr) {
              console.error('Token refresh failed:', refreshErr);
              // Continue with original error
          }
      }
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
  }
  
  return response.json();
};

// Component using ref for token updates
const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(() => localStorage.getItem('diana_token'));
    
    useEffect(() => {
        const handleTokenRefresh = (newToken) => {
            setToken(newToken);
        };
        
        subscribeToTokenRefresh(handleTokenRefresh);
        
        return () => {
            unsubscribeFromTokenRefresh(handleTokenRefresh);
        };
    }, []);
    
    return <AuthProvider value={{ token, apiFetch }}>{children}</AuthProvider>;
};
```

---

### Issue 4: No Password Complexity Requirements

**File**: `backend/internal/http/handlers/auth.go:34-37`

**Current Code (Problematic):**
```go
type signupRequest struct {
    Email     string `json:"email" binding:"required,email"`
    Password  string `json:"password" binding:"required,min=8"`  // ❌ Only checks length
    FirstName string `json:"first_name" binding:"required"`
    LastName  string `json:"last_name" binding:"required"`
}
```

**Recommended Fix:**
```go
// Password complexity constants
const (
    MinPasswordLength      = 8
    MaxPasswordLength      = 128
    MinUppercaseChars   = 1
    MinLowercaseChars   = 1
    MinDigitChars        = 1
    MinSpecialChars      = 1
)

// Password validation function
func validatePasswordComplexity(password string) (valid bool, errors []string) {
    var errors []string
    
    if len(password) < MinPasswordLength {
        errors = append(errors, fmt.Sprintf("Password must be at least %d characters", MinPasswordLength))
    }
    if len(password) > MaxPasswordLength {
        errors = append(errors, fmt.Sprintf("Password must not exceed %d characters", MaxPasswordLength))
    }
    
    hasUpper := false
    hasLower := false
    hasDigit := false
    hasSpecial := false
    
    for _, char := range password {
        if char >= 'A' && char <= 'Z' {
            hasUpper = true
        } else if char >= 'a' && char <= 'z' {
            hasLower = true
        } else if char >= '0' && char <= '9' {
            hasDigit = true
        } else if strings.ContainsAny(password, "!@#$%^&*()_+-=[]{}|\\|;:'\",.<>?/") {
            hasSpecial = true
        }
    }
    
    if !hasUpper {
        errors = append(errors, "Password must contain at least one uppercase letter")
    }
    if !hasLower {
        errors = append(errors, "Password must contain at least one lowercase letter")
    }
    if !hasDigit {
        errors = append(errors, "Password must contain at least one digit")
    }
    if !hasSpecial {
        errors = append(errors, "Password must contain at least one special character (!@#$%^&*)")
    }
    
    return len(errors) == 0, errors
}

// Update signup request type
type signupRequest struct {
    Email     string `json:"email" binding:"required,email"`
    Password  string `json:"password" binding:"required,min=8"`
    FirstName string `json:"first_name" binding:"required"`
    LastName  string `json:"last_name" binding:"required"`
}

// In signup handler
func (h *AuthHandler) signup(c *gin.Context) {
    var req signupRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    // Validate password complexity
    valid, errors := validatePasswordComplexity(req.Password)
    if !valid {
        c.JSON(http.StatusBadRequest, gin.H{"error": strings.Join(errors, ", ")})
        return
    }
    
    // ... rest of signup logic
}
```

---

### Issue 5: ML Server Default Age Substitution

**File**: `ml/server.py:63, 263, 325`

**Current Code (Problematic):**
```python
# In /predict endpoint
def predict():
    # ... data extraction
    if model_type == 'clinical':
        clin_predictor = get_clinical_predictor()
        if clin_predictor is None:
            return jsonify({"error": "Clinical model not trained. Run train_models_v2.py first."}), 503
        
        patient_data = {
            "bmi": data.get("bmi"),
            "triglycerides": data.get("triglycerides"),
            "ldl": data.get("ldl"),
            "hdl": data.get("hdl"),
            "age": data.get("age", 54),  # ❌ Default to 54
        }
        result = clin_predictor.predict(patient_data)
    # ...
```

**Recommended Fix:**
```python
def predict():
    # ... data extraction
    if model_type == 'clinical':
        clin_predictor = get_clinical_predictor()
        if clin_predictor is None:
            return jsonify({"error": "Clinical model not trained. Run train_models_v2.py first."}), 503
        
        # Validate required fields
        required_fields = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']
        missing_fields = [f for f in required_fields if f not in data or data.get(f) is None]
        if missing_fields:
            return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400
        
        patient_data = {
            "bmi": data.get("bmi"),
            "triglycerides": data.get("triglycerides"),
            "ldl": data.get("ldl"),
            "hdl": data.get("hdl"),
            "age": data.get("age")  # ❌ Don't default, let validation handle it
        }
        result = clin_predictor.predict(patient_data)
    # ...
```

---

## Improvement Suggestions

### High Priority

1. **Implement Centralized Error Handling**
   - Create `internal/utils/errors.go` with custom error types
   - Define standard error codes and user-friendly messages
   - Wrap all handler operations with error context
   - **Benefit**: Consistent error responses, better debugging

2. **Add Comprehensive Unit Tests**
   - Current test coverage is unclear
   - Add tests for critical paths: authentication, assessment creation, ML fallback
   - Add integration tests for API contracts
   - Target: 80%+ coverage for business logic

3. **Implement Transaction Support in Store Layer**
   - Add `BeginTx`, `CommitTx`, `RollbackTx` methods to store interface
   - Wrap multi-operation handlers in transactions
   - **Benefit**: Data integrity, ability to rollback partial failures

4. **Add Structured Logging**
   - Replace `log.Printf` with structured logging (e.g., zap, zerolog)
   - Add request IDs, trace IDs, user context to all logs
   - **Benefit**: Better debugging, production observability

5. **Implement Security Headers Middleware**
   - Add Content-Security-Policy, X-Content-Type-Options, Referrer-Policy
   - Validate CORS origins in production
   - Add HSTS header with max-age
   - **Benefit**: Browser security compliance

### Medium Priority

1. **Add API Versioning and Deprecation Strategy**
   - Version API endpoints: `/api/v1/`, `/api/v2/`
   - Support old versions for transition period
   - Document deprecation timelines
   - **Benefit**: Allows breaking changes without disrupting users

2. **Improve Error Messages with User-Friendly Copy**
   - Work with UX designer or copywriter
   - Replace technical messages with actionable guidance
   - Add links to documentation/help in error responses
   - **Benefit**: Better user experience, fewer support tickets

3. **Add Request/Response Validation Contracts**
   - Define JSON schemas for all request/response types
   - Implement schema validation middleware
   - Use OpenAPI/Swagger documentation generator
   - **Benefit**: Type safety, auto-generated docs, client code generation

4. **Add Performance Monitoring**
   - Implement APM (Application Performance Monitoring)
   - Track API response times, error rates, ML prediction latency
   - Monitor frontend performance metrics (Core Web Vitals)
   - **Benefit**: Proactive detection of issues, performance optimization

5. **Add Data Privacy Controls**
   - Implement consent management UI with granular permissions
   - Add data export functionality with anonymization
   - Implement right to be forgotten / data deletion workflows
   - **Benefit**: GDPR compliance, user trust

### Low Priority

1. **Replace React Context with State Management Library**
   - Consider using Zustand, Redux, or Jotai for complex state
   - Benefits: Better debugging, state persistence, time-travel debugging
   - **Note**: Current prop drilling is manageable, but state could be centralized

2. **Add E2E Tests for Critical User Journeys**
   - Assess login → dashboard → assessment → results flow
   - Test error scenarios: network failures, invalid data, ML server down
   - **Benefit**: Confidence in deployment, catch regressions

3. **Document Architecture Decisions**
   - Add ADR (Architecture Decision Record) for major choices
   - Document why specific patterns were chosen
   - Add trade-offs considered
   - **Benefit**: Onboarding, historical context for future maintainers

4. **Implement Code Quality Gates in CI/CD**
   - Run golangci-lint, eslint, flake8 on every PR
   - Require code coverage threshold
   - Add static analysis (bandit, semgrep)
   - **Benefit**: Maintain code quality, catch issues early

5. **Add Health Checks and Readiness Probes**
   - `/healthz` endpoint exists, consider `/readyz`
   - Check database connectivity, ML server availability
   - Check dependency service health
   - **Benefit**: Better orchestration, zero-downtime deployments

---

## Conclusion

The Diana V2 codebase demonstrates **strong architectural foundations** with clear separation of concerns and a well-organized project structure. The authentication system with JWT and refresh tokens is well-designed, and the ML predictor abstraction allows for graceful degradation.

However, there are **several critical issues** that must be addressed before production deployment:

1. **Silent audit logging failures** pose a significant compliance and security risk
2. **Missing transaction wrapping** can lead to data integrity issues
3. **No password complexity requirements** create a security vulnerability
4. **No token refresh mechanism** degrades user experience
5. **ML server default age substitution** impacts prediction accuracy

The codebase would benefit from:
- Centralized error handling and logging
- Comprehensive unit and integration tests
- Security hardening measures
- Improved user error messages and feedback loops
- Transaction support for multi-operation handlers

**Overall Recommendation**: Address P0 and P1 issues immediately before production deployment. Consider implementing P2 and P3 improvements as part of ongoing technical debt management and sprint planning.

---

**Report Generated**: January 19, 2026  
**Total Issues Identified**: 25 critical/high/medium priority  
**Files Analyzed**: 45+ files across 3 major components  
**Review Duration**: 5 iterations covering logic, UX, data flow, error handling, code quality, and security
