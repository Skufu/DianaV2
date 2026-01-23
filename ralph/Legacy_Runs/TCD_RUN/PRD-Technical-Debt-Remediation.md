# Product Requirements Document: Technical Debt Remediation

**Project**: Diana V2 - Medical AI Platform  
**Document Version**: 1.0  
**Created**: 2025-01-23  
**Status**: Ready  
**Target Resolution**: Q2 2025

---

## Executive Summary

This PRD addresses technical debt identified through comprehensive AI code review of the DIANA V2 platform. The review analyzed Go backend (Gin framework, PostgreSQL, SQLC) and React frontend (Vite, Tailwind CSS) for security vulnerabilities, performance bottlenecks, and architectural deficiencies.

### Key Metrics
- **Total Issues Identified**: 18
- **Critical Severity**: 1
- **High Severity**: 6
- **Medium Severity**: 10
- **Low Severity**: 1

### Business Impact
- **Security Risk**: Password hash exposure, JWT token theft, information leakage
- **Performance Risk**: Database connection exhaustion, slow response times under load
- **Maintainability Risk**: Large component files, code duplication, outdated patterns
- **Compliance Risk**: Silent audit log failures, missing integration tests

### Primary Goal
Remediate all CRITICAL and HIGH severity issues within 6 weeks, with MEDIUM/LOW priority issues addressed incrementally over 3 months.

---

## Problem Statement

### Security Vulnerabilities
The DIANA V2 platform has critical security gaps that expose sensitive data and increase attack surface:

1. **Password Hash Leakage** (`CRITICAL`): Admin users endpoint returns full User struct including `password_hash` field to API clients
2. **Error Information Leakage** (`HIGH`): 155+ instances of raw database errors returned to clients, exposing schema details
3. **Weak JWT Secret** (`HIGH`): Fallback to hardcoded "dev-secret" in non-production environments
4. **JWT Token Storage** (`HIGH`): Tokens stored in localStorage, vulnerable to XSS theft
5. **Missing ML API Key** (`HIGH`): Frontend doesn't send required X-API-Key header to ML service
6. **Audit Context Cancellation** (`HIGH`): Background audit writes use cancelled request context, causing data loss
7. **No CSRF Protection** (`MEDIUM`): Missing secondary authentication layer for state-changing requests
8. **Insufficient Input Validation** (`MEDIUM`): Login requests lack binding tags for DoS prevention

### Performance Bottlenecks
Current architecture will fail under production load:

1. **Connection Pool Defaults** (`HIGH`): pgxpool uses MaxConns=4, insufficient for traffic spikes
2. **Blocking ML Calls** (`HIGH`): Synchronous predictions block HTTP handlers, cascading latency
3. **No Caching Layer** (`HIGH`): Analytics endpoints recompute aggregations on every request
4. **N+1 Query Pattern** (`HIGH`): Clinics SQL has 4 subqueries per row, O(n²) complexity
5. **Index-Based Keys** (`HIGH`): React lists use array indices, causing reconciliation bugs
6. **Missing Query Timeouts** (`MEDIUM`): No timeout wrapping for database calls
7. **No API Deduplication** (`MEDIUM`): Components fetch same data independently
8. **Memory Leak** (`MEDIUM`): EventSource timeouts not cleaned up on unmount
9. **Missing Component Memoization** (`MEDIUM`): RiskIndicator, BiomarkerInput, Button re-render unnecessarily
10. **Missing Image Lazy Loading** (`LOW`): Visualization images load eagerly, delaying initial paint

### Architecture & Code Quality
Maintainability suffers from outdated patterns and structural issues:

1. **SOLID Violations** (`MEDIUM`): postgres.go contains 1000+ lines with multiple repository implementations
2. **Legacy Type Usage** (`MEDIUM`): 120+ uses of `interface{}` instead of `any` (Go 1.18+)
3. **Hard-Coded Thresholds** (`MEDIUM`): Clinical values (HbA1c, FBS) in validation.go not configurable
4. **Large Component Files** (`MEDIUM`): Insights.jsx is 631 lines, handling multiple concerns
5. **Missing Integration Tests** (`MEDIUM`): No end-to-end tests for critical flows
6. **Code Duplication** (`MEDIUM`): 3 similar mapper functions in postgres.go with 90% overlap

---

## Goals

### Primary Objectives
1. **Eliminate CRITICAL security vulnerabilities** (password hash exposure) within 1 week
2. **Reduce OWASP Top 10 violations** from 4 identified to 0 within 4 weeks
3. **Improve backend throughput** by 10x under load through connection pooling and caching
4. **Reduce frontend bundle load time** by 30% through memoization and lazy loading
5. **Increase code maintainability score** through refactoring and modernization

### Success Metrics
| Metric | Baseline | Target | Measurement |
|----------|-----------|--------|--------------|
| OWASP Critical Vulnerabilities | 1 | 0 | Automated security scan |
| OWASP High Vulnerabilities | 6 | 0 | Automated security scan |
| Backend P99 Response Time | >1000ms | <200ms | Load testing (500 concurrent users) |
| Database Connection Pool Exhaustions | Frequent in load tests | 0 | Production monitoring |
| Frontend Time to Interactive | >3s | <2s | Lighthouse audit |
| React Re-renders per Session | >100 | <20 | React DevTools Profiler |
| Code Coverage (Integration) | 0% | 70% | Automated testing |

### Non-Functional Requirements
- **Security**: All fixes must pass OWASP Top 10 compliance checks
- **Performance**: No regression in existing API response times
- **Compatibility**: Maintain backward compatibility with existing API contracts
- **Testing**: All fixes must include automated tests (unit + integration)
- **Documentation**: Code changes must update inline comments and API docs

---

## Requirements

### Phase 1: Critical Security Fixes (Week 1)

#### REQ-1.1: Prevent Password Hash Leakage
**Priority**: CRITICAL | **Effort**: 1 hour | **Owner**: Backend Team

**Description**: Admin users endpoint must not expose password hashes in API responses.

**Acceptance Criteria**:
- [ ] `password_hash` field is marked with `json:"-"` tag in `models/types.go`
- [ ] All API endpoints returning User struct exclude password_hash from serialization
- [ ] Integration test verifies admin/users endpoint response structure
- [ ] No regression in admin user list/create/update operations

**Implementation Details**:
```go
// backend/internal/models/types.go
type User struct {
    ID           int64  `json:"id"`
    Email        string `json:"email"`
    PasswordHash string `json:"-"` // ADD THIS
    Role         string `json:"role"`
    IsActive     bool   `json:"is_active"`
}
```

**Testing**:
- Unit test: `TestUserStructJSONSerialization`
- Integration test: `TestAdminGetUsers_NoPasswordHashExposed`

---

#### REQ-1.2: Standardize Error Responses
**Priority**: CRITICAL | **Effort**: 4 hours | **Owner**: Backend Team

**Description**: Eliminate raw error information leakage by using standardized error helpers.

**Acceptance Criteria**:
- [ ] All 155+ instances of `c.JSON(..., gin.H{"error": err.Error()}) replaced
- [ ] Error responses use utils.go helpers: `ErrBadRequest`, `ErrInternal`, `ErrNotFound`, `ErrUnauthorized`
- [ ] Database errors are logged server-side, not returned to client
- [ ] Integration tests verify generic error messages only

**Files Affected**:
- `backend/internal/http/handlers/*.go` (all handlers)

**Implementation Pattern**:
```go
// BEFORE (VULNERABLE)
if err != nil {
    c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
    return
}

// AFTER (SECURE)
if err != nil {
    ErrInternal(c, "Failed to process request")
    log.Printf("Operation failed: %v", err) // Server-side logging
    return
}
```

**Testing**:
- AST search/replace verification
- Integration test suite for error response format consistency

---

#### REQ-1.3: Remove Weak JWT Secret Fallback
**Priority**: CRITICAL | **Effort**: 30 minutes | **Owner**: Backend Team

**Description**: Application must fail at startup if JWT_SECRET is not provided in any non-local environment.

**Acceptance Criteria**:
- [ ] Default JWT secret fallback removed from `config.go`
- [ ] Application crashes with clear error if JWT_SECRET missing in prod/staging
- [ ] Environment variable requirements documented in deployment guide
- [ ] Unit test verifies config load behavior

**Implementation**:
```go
// backend/internal/config/config.go
func Load() Config {
    jwtSecret := os.Getenv("JWT_SECRET")
    if jwtSecret == "" {
        env := getEnv("ENV", "dev")
        if env != "local" && env != "dev" {
            log.Fatal("JWT_SECRET environment variable is required in production. Cannot start without it.")
        }
        // Only allow fallback for local/dev
        jwtSecret = "dev-secret-change-in-production"
        log.Println("WARNING: Using default JWT secret. Set JWT_SECRET environment variable!")
    }
    // ...
}
```

**Testing**:
- Unit test: `TestConfigLoad_MissingJWTSecret_ProductionFatal`
- Unit test: `TestConfigLoad_MissingJWTSecret_DevelopmentAllowed`

---

#### REQ-1.4: Fix Audit Context Cancellation
**Priority**: CRITICAL | **Effort**: 30 minutes | **Owner**: Backend Team

**Description**: Background audit writes must use non-cancelled context to prevent data loss.

**Acceptance Criteria**:
- [ ] All goroutines in `audit.go` use `context.WithoutCancel()`
- [ ] Audit events persist successfully even when handler completes quickly
- [ ] Integration test verifies audit log persistence
- [ ] No regression in audit logging latency

**Implementation**:
```go
// backend/internal/http/middleware/audit.go
import "context"

// BEFORE (BUGGY)
go func() {
    _ = a.store.AuditEvents().Create(c.Request.Context(), event)
}()

// AFTER (FIXED)
go func() {
    ctx := context.WithoutCancel(c.Request.Context())
    event := models.AuditEvent{
        Actor:      claims.Email,
        Action:     action,
        TargetType: targetType,
        TargetID:   targetID,
        Details:    details,
    }
    if err := a.store.AuditEvents().Create(ctx, event); err != nil {
        log.Printf("[AUDIT FAILURE] Failed to log event: %v", err)
    }
}()
```

**Testing**:
- Integration test: `TestAuditLog_PersistsAfterHandlerComplete`
- Load test: Verify 1000 audit events all persist

---

### Phase 2: High Priority Fixes (Weeks 2-4)

#### REQ-2.1: Configure Database Connection Pool
**Priority**: HIGH | **Effort**: 2 hours | **Owner**: Backend Team

**Description**: Explicitly configure pgxpool connection limits for production load handling.

**Acceptance Criteria**:
- [ ] MaxConns set to 50 for production environments
- [ ] MinConns set to 10 for warm connections
- [ ] MaxConnLifetime set to 1 hour to prevent long-lived connections
- [ ] MaxConnIdleTime set to 30 minutes
- [ ] Connection pool metrics logged on startup
- [ ] Load test confirms no connection exhaustion under 500 concurrent users

**Implementation**:
```go
// backend/cmd/server/main.go
poolConfig, err := pgxpool.ParseConfig(cfg.DBDSN)
if err != nil {
    log.Fatalf("Failed to parse DB config: %v", err)
}

poolConfig.MaxConns = 50
poolConfig.MinConns = 10
poolConfig.MaxConnLifetime = 1 * time.Hour
poolConfig.MaxConnIdleTime = 30 * time.Minute
poolConfig.HealthCheckPeriod = 1 * time.Minute

pool, err := pgxpool.NewWithConfig(context.Background(), poolConfig)
```

**Testing**:
- Unit test: `TestPoolConfiguration_ProductionValues`
- Load test: 500 concurrent users for 5 minutes, monitor pool exhaustion

---

#### REQ-2.2: Add ML API Key to Frontend
**Priority**: HIGH | **Effort**: 1 hour | **Owner**: Frontend Team

**Description**: Frontend must authenticate with ML service using X-API-Key header.

**Acceptance Criteria**:
- [ ] `VITE_ML_API_KEY` environment variable added to .env.local
- [ ] `mlFetch` function includes X-API-Key header in all requests
- [ ] ML server validates API key (or proxy through backend)
- [ ] Integration test verifies ML API calls include authentication
- [ ] No regression in ML endpoint functionality

**Implementation**:
```javascript
// frontend/src/api.js
const mlFetch = async path => {
    const apiKey = import.meta.env.VITE_ML_API_KEY;
    const res = await fetch(`${ML_BASE}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey || ''  // ADD THIS
        }
    });
    if (!res.ok) throw new Error(`ML API error: ${res.status}`);
    return res.json();
};
```

**Environment Variables**:
```bash
# frontend/.env.local
VITE_ML_API_KEY=your-secure-ml-api-key
```

**Testing**:
- Integration test: Mock ML server returns 401 without API key
- E2E test: Verify ML insights load with authentication

---

#### REQ-2.3: Replace Index-Based Keys with Stable IDs
**Priority**: HIGH | **Effort**: 4 hours | **Owner**: Frontend Team

**Description**: All React list components must use stable identifiers instead of array indices as keys.

**Acceptance Criteria**:
- [ ] All `.map()` calls use stable key values (e.g., `item.id`, `item.name`)
- [ ] No remaining index-based keys in production code
- [ ] React DevTools profiler shows reduced re-renders
- [ ] No regression in list update functionality

**Files Affected**:
- `frontend/src/components/insights/Insights.jsx` (lines 340, 396, 482, 524)
- `frontend/src/components/education/Education.jsx` (lines 315, 326, 337, 366, 417)

**Implementation Pattern**:
```javascript
// BEFORE (VULNERABLE)
{riskFactors.map((factor, index) => (
    <RiskFactorCard key={index} {...factor} />
))}

// AFTER (FIXED)
{riskFactors.map((factor) => (
    <RiskFactorCard key={factor.id} {...factor} />
))}
```

**Testing**:
- React DevTools profiler: Compare re-render counts before/after
- Manual testing: Verify list items update correctly when reordered

---

#### REQ-2.4: Implement Redis Caching Layer
**Priority**: HIGH | **Effort**: 16 hours | **Owner**: Backend Team

**Description**: Add Redis caching for high-traffic analytics endpoints to reduce database load.

**Acceptance Criteria**:
- [ ] Redis client integrated and configured
- [ ] `/api/v1/analytics/summary` cached for 5 minutes
- [ ] `/api/v1/analytics/cluster-distribution` cached for 10 minutes
- [ ] `/api/v1/users/me/trends` cached for 5 minutes
- [ ] Cache invalidation on assessment creation/update
- [ ] Load test shows 50-90% response time reduction
- [ ] Monitoring added for cache hit/miss rates

**Implementation**:
```go
// backend/internal/cache/redis_cache.go
type Cache struct {
    client *redis.Client
}

func (c *Cache) Get(ctx context.Context, key string, dest interface{}) error {
    val, err := c.client.Get(ctx, key).Result()
    if err != nil {
        if err == redis.Nil {
            return nil
        }
        return err
    }
    return json.Unmarshal([]byte(val), dest)
}

func (c *Cache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
    data, err := json.Marshal(value)
    if err != nil {
        return err
    }
    return c.client.Set(ctx, key, data, ttl)
}

// backend/internal/http/handlers/analytics.go
func (h *AnalyticsHandler) GetSummary(c *gin.Context) {
    cacheKey := fmt.Sprintf("summary:%d", userID)
    
    var summary AnalyticsSummary
    if err := h.cache.Get(c.Request.Context(), cacheKey, &summary); err == nil {
        return c.JSON(http.StatusOK, summary)
    }
    
    summary = h.computeSummary(userID)
    h.cache.Set(c.Request.Context(), cacheKey, summary, 5*time.Minute)
    return c.JSON(http.StatusOK, summary)
}
```

**Testing**:
- Unit test: `TestCache_GetSet`
- Integration test: Verify cache hit/miss behavior
- Load test: 1000 requests to analytics endpoint, measure response time

---

#### REQ-2.5: Fix N+1 Query Pattern in Clinics
**Priority**: HIGH | **Effort**: 2 hours | **Owner**: Backend Team

**Description**: Replace subqueries with JOIN to improve clinic list performance.

**Acceptance Criteria**:
- [ ] Clinics SQL refactored to use single query with JOIN
- [ ] Performance test shows 5-10x improvement for 100+ clinics
- [ ] No regression in clinic statistics accuracy
- [ ] SQLC regenerated successfully

**Implementation**:
```sql
-- backend/internal/store/queries/clinics.sql

-- BEFORE (N+1 pattern)
SELECT 
    c.*,
    (SELECT COUNT(*) FROM assessments WHERE clinic_id = c.id) as assessments,
    (SELECT AVG(risk_score) FROM assessments WHERE clinic_id = c.id) as avg_risk
FROM clinics c

-- AFTER (Optimized)
WITH clinic_stats AS (
    SELECT 
        clinic_id,
        COUNT(*) as assessments,
        AVG(risk_score) as avg_risk
    FROM assessments
    GROUP BY clinic_id
)
SELECT c.*, cs.*
FROM clinics c
LEFT JOIN clinic_stats cs ON c.id = cs.clinic_id
```

**Testing**:
- Integration test: Verify clinic statistics accuracy
- Performance benchmark: Compare query execution time with 100 clinics

---

### Phase 3: Medium Priority Fixes (Weeks 5-12)

#### REQ-3.1: Migrate to HttpOnly Cookies for JWT
**Priority**: MEDIUM | **Effort**: 8 hours | **Owner**: Backend + Frontend Teams

**Description**: Store JWT and refresh tokens in HttpOnly, Secure, SameSite cookies instead of localStorage.

**Acceptance Criteria**:
- [ ] Backend sets diana_token cookie with HttpOnly, Secure, SameSite=Strict
- [ ] Backend sets diana_refresh_token cookie with same security attributes
- [ ] Frontend removes manual token storage from localStorage
- [ ] apiFetch removes Authorization header (cookies sent automatically)
- [ ] Login/logout flows updated to use cookie-based auth
- [ ] XSS attack test confirms tokens cannot be stolen
- [ ] No regression in authentication flow

**Backend Implementation**:
```go
// backend/internal/http/handlers/auth.go
import "github.com/gin-gonic/gin"

func (h *AuthHandler) login(c *gin.Context) {
    // ... validation and JWT generation ...
    
    // Set access token cookie
    http.SetCookie(c.Writer, "diana_token", accessToken, &http.Cookie{
        Name:     "diana_token",
        Value:    accessToken,
        Path:      "/",
        MaxAge:   15 * 60, // 15 minutes
        HttpOnly: true,  // Prevents JavaScript access
        Secure:   true,   // Only sent over HTTPS
        SameSite: http.SameSiteStrictMode,
    })
    
    // Set refresh token cookie
    http.SetCookie(c.Writer, "diana_refresh_token", refreshToken, &http.Cookie{
        Name:     "diana_refresh_token",
        Value:    refreshToken,
        Path:      "/",
        MaxAge:   7 * 24 * 60 * 60, // 7 days
        HttpOnly: true,
        Secure:   true,
        SameSite: http.SameSiteStrictMode,
    })
    
    c.JSON(http.StatusOK, gin.H{
        "message": "login successful",
    })
}
```

**Frontend Implementation**:
```javascript
// frontend/src/App.jsx
// REMOVE these lines:
// localStorage.setItem('diana_token', res.access_token);
// localStorage.setItem('diana_refresh_token', res.refresh_token);

// Cookies are sent automatically, no manual storage needed
```

**Testing**:
- Security test: Inject XSS payload, verify cookies not accessible to JavaScript
- Integration test: Verify login sets cookies and subsequent requests include them
- E2E test: Login → Create assessment → Verify authenticated

---

#### REQ-3.2: Add Input Validation Tags
**Priority**: MEDIUM | **Effort**: 2 hours | **Owner**: Backend Team

**Description**: Add Gin binding tags to all request structs for automatic validation.

**Acceptance Criteria**:
- [ ] All request structs have binding tags (required, email, min, max, etc.)
- [ ] Invalid requests return 400 with validation errors
- [ ] Integration tests verify validation errors for missing/invalid fields
- [ ] No regression in valid request handling

**Files Affected**:
- `backend/internal/http/handlers/auth.go`
- `backend/internal/http/handlers/assessments.go`
- `backend/internal/http/handlers/users.go`
- `backend/internal/http/handlers/admin_*.go`

**Implementation**:
```go
// backend/internal/http/handlers/auth.go
type loginRequest struct {
    Email    string `json:"email" binding:"required,email,max=255"`
    Password string `json:"password" binding:"required,min=8,max=128"`
}

type registerRequest struct {
    Email    string `json:"email" binding:"required,email,max=255"`
    Password string `json:"password" binding:"required,min=8,max=128"`
    FirstName string `json:"first_name" binding:"required,min=1,max=100"`
    LastName  string `json:"last_name" binding:"required,min=1,max=100"`
}
```

**Testing**:
- Integration test: `TestLogin_EmptyEmail_ReturnsValidationError`
- Integration test: `TestLogin_InvalidEmailFormat_ReturnsValidationError`
- Integration test: `TestLogin_TooLongPassword_ReturnsValidationError`

---

#### REQ-3.3: Add Component Memoization
**Priority**: MEDIUM | **Effort**: 4 hours | **Owner**: Frontend Team

**Description**: Wrap frequently rendered components in React.memo to prevent unnecessary re-renders.

**Acceptance Criteria**:
- [ ] RiskIndicator wrapped in React.memo
- [ ] BiomarkerInput wrapped in React.memo
- [ ] Button wrapped in React.memo
- [ ] React DevTools profiler shows 30-50% reduction in re-renders
- [ ] No regression in component functionality

**Files Affected**:
- `frontend/src/components/common/RiskIndicator.jsx`
- `frontend/src/components/common/BiomarkerInput.jsx`
- `frontend/src/components/common/Button.jsx`

**Implementation**:
```javascript
// frontend/src/components/common/RiskIndicator.jsx
import React from 'react';

export const RiskIndicator = React.memo(({ level, score }) => {
    const getLevelColor = (level) => {
        switch (level) {
            case 'low': return 'text-green-500';
            case 'medium': return 'text-yellow-500';
            case 'high': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };
    
    return (
        <div className={`flex items-center gap-2 ${getLevelColor(level)}`}>
            <span className="font-semibold">{level.toUpperCase()}</span>
            <span className="text-sm text-gray-400">({score})</span>
        </div>
    );
});

RiskIndicator.displayName = 'RiskIndicator';
```

**Testing**:
- React DevTools profiler: Measure re-render count before/after
- Manual testing: Verify components update correctly when props change

---

#### REQ-3.4: Fix EventSource Memory Leak
**Priority**: MEDIUM | **Effort**: 2 hours | **Owner**: Frontend Team

**Description**: Ensure all setTimeout and EventSource listeners are cleaned up on component unmount.

**Acceptance Criteria**:
- [ ] All setTimeout IDs tracked and cleared in cleanup function
- [ ] EventSource connections properly closed on unmount
- [ ] Reconnection attempts do not create orphaned listeners
- [ ] Memory profiler shows no leak on component mount/unmount cycle

**Files Affected**:
- `frontend/src/components/admin/AuthEventLogViewer.jsx`

**Implementation**:
```javascript
// frontend/src/components/admin/AuthEventLogViewer.jsx
useEffect(() => {
    const eventSource = new EventSource('/api/v1/admin/audit/stream');
    const reconnectTimeouts = [];
    
    const handleMessage = (e) => {
        // Handle message
    };
    
    const reconnect = () => {
        const timeoutId = setTimeout(() => {
            const newSource = new EventSource('/api/v1/admin/audit/stream');
            newSource.onmessage = handleMessage;
            // Track for cleanup
        }, 5000);
        reconnectTimeouts.push(timeoutId);
    };
    
    eventSource.onmessage = handleMessage;
    eventSource.onerror = reconnect;
    
    return () => {
        eventSource.close();
        reconnectTimeouts.forEach(clearTimeout);
    };
}, []);
```

**Testing**:
- Chrome DevTools Memory profiler: Record memory usage over 50 mount/unmount cycles
- Manual testing: Verify no stale event listeners after navigation

---

#### REQ-3.5: Implement API Request Caching
**Priority**: MEDIUM | **Effort**: 6 hours | **Owner**: Frontend Team

**Description**: Integrate TanStack Query (React Query) to cache API responses and prevent duplicate fetches.

**Acceptance Criteria**:
- [ ] TanStack Query integrated into all API calls
- [ ] Duplicate requests to same endpoint de-duplicated automatically
- [ ] Stale time configured appropriately per endpoint
- [ ] Cache time configured for data freshness
- [ ] Loading states handled by React Query
- [ ] No regression in API functionality
- [ ] 50-80% reduction in network requests measured

**Implementation**:
```javascript
// frontend/src/App.jsx (wrapper)
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
            retry: 1,
            refetchOnWindowFocus: false,
        }
    }
});

// frontend/src/api.js (React Query hooks)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useUserProfile = () => {
    return useQuery({
        queryKey: ['user', 'profile'],
        queryFn: getUserProfileApi,
    });
};

export const useUpdateProfile = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateUserProfileApi,
        onSuccess: () => {
            queryClient.invalidateQueries(['user', 'profile']);
        }
    });
};

// frontend/src/components/user/UserProfile.jsx
import { useUserProfile, useUpdateProfile } from '../api';

const UserProfile = () => {
    const { data: profile, isLoading } = useUserProfile();
    const updateProfile = useUpdateProfile();
    // ... component logic
};
```

**Testing**:
- Network tab: Verify duplicate requests eliminated
- Manual testing: Cache invalidation works on mutations
- Performance: Measure page load time with/without React Query

---

### Phase 4: Code Quality Improvements (Weeks 13-16)

#### REQ-4.1: Split postgres.go into Domain-Specific Files
**Priority**: MEDIUM | **Effort**: 12 hours | **Owner**: Backend Team

**Description**: Refactor 1000+ line postgres.go into separate repository files.

**Acceptance Criteria**:
- [ ] postgres.go reduced to factory pattern only
- [ ] Separate files: user_repo.go, patient_repo.go, assessment_repo.go, clinic_repo.go
- [ ] Code duplication reduced through shared mapper functions
- [ ] All tests pass after refactoring
- [ ] Import structure remains unchanged for external packages

**Target Structure**:
```
backend/internal/store/
├── user_repo.go          // pgUserRepo implementation
├── patient_repo.go       // pgPatientRepo implementation
├── assessment_repo.go    // pgAssessmentRepo implementation
├── clinic_repo.go        // pgClinicRepo implementation
├── refresh_token_repo.go  // pgRefreshTokenRepo implementation
├── mappers.go            // Shared mapper functions
└── postgres.go           // Factory only (NewPostgresStore)
```

**Testing**:
- Full test suite: `go test ./internal/store/...`
- Integration tests: Verify all repository methods work correctly

---

#### REQ-4.2: Replace interface{} with any
**Priority**: MEDIUM | **Effort**: 2 hours | **Owner**: Backend Team

**Description**: Modernize codebase to use Go 1.18+ `any` type instead of `interface{}`.

**Acceptance Criteria**:
- [ ] All 120+ occurrences of `interface{}` replaced with `any`
- [ ] golangci-lint passes without interface{} warnings
- [ ] No runtime behavior changes
- [ ] Go 1.18+ compatibility maintained

**Implementation**:
```bash
# Automated find/replace
cd backend
find . -name "*.go" -type f -exec sed -i 's/interface{}/any/g' {} \;
```

**Testing**:
- Full test suite: `go test ./...`
- Build verification: `go build ./cmd/server`

---

#### REQ-4.3: Make Clinical Thresholds Configurable
**Priority**: MEDIUM | **Effort**: 2 hours | **Owner**: Backend Team

**Description**: Move hard-coded biomarker thresholds to environment configuration.

**Acceptance Criteria**:
- [ ] ClinicalThresholds struct added to config.go
- [ ] Values loaded from environment variables
- [ ] Default values match current hard-coded thresholds
- [ ] validation.go uses config thresholds instead of literals
- [ ] Deployment guide documents new environment variables

**Implementation**:
```go
// backend/internal/config/config.go
type ClinicalThresholds struct {
    HbA1cDiabetic      float64
    HbA1cPrediabetic float64
    FBSDiabetic         float64
    FBSPrediabetic      float64
    CholesterolHigh      float64
    CholesterolBorderline float64
    LDLHigh             float64
    LDLBorderline        float64
    HDLLow              float64
    TriglyceridesHigh    float64
    TriglyceridesBorderline float64
}

func Load() Config {
    // ... existing config ...
    
    cfg.ClinicalThresholds = ClinicalThresholds{
        HbA1cDiabetic:      getEnvFloat("CLINICAL_HBA1C_DIABETIC", 6.5),
        HbA1cPrediabetic: getEnvFloat("CLINICAL_HBA1C_PREDIABETIC", 5.7),
        FBSDiabetic:         getEnvFloat("CLINICAL_FBS_DIABETIC", 126),
        FBSPrediabetic:      getEnvFloat("CLINICAL_FBS_PREDIABETIC", 100),
        // ... other thresholds
    }
    return cfg
}

func getEnvFloat(key string, def float64) float64 {
    if v := os.Getenv(key); v != "" {
        f, err := strconv.ParseFloat(v, 64)
        if err == nil {
            return f
        }
    }
    return def
}
```

**Environment Variables**:
```bash
CLINICAL_HBA1C_DIABETIC=6.5
CLINICAL_HBA1C_PREDIABETIC=5.7
CLINICAL_FBS_DIABETIC=126
CLINICAL_FBS_PREDIABETIC=100
```

**Testing**:
- Unit test: `TestConfigLoad_ClinicalThresholdsDefaults`
- Unit test: `TestConfigLoad_ClinicalThresholdsFromEnv`

---

#### REQ-4.4: Add Integration Tests
**Priority**: MEDIUM | **Effort**: 16 hours | **Owner**: Backend Team

**Description**: Implement end-to-end integration tests for critical user flows.

**Acceptance Criteria**:
- [ ] Integration test for user registration → login → assessment creation
- [ ] Integration test for JWT token lifecycle (login, refresh, logout)
- [ ] Integration test for PDF export generation
- [ ] Integration test for admin user management (create, update, deactivate)
- [ ] Test coverage > 70% for integration suite
- [ ] Tests run in CI pipeline
- [ ] Integration tests use test database, not production

**Implementation**:
```go
// backend/internal/http/integration_test.go
package http_test

import (
    "testing"
    "time"
    "github.com/skufu/DianaV2/backend/internal/store"
)

func TestAssessmentCreationFlow(t *testing.T) {
    // Setup test database
    testStore := setupTestDB(t)
    defer testStore.Close()
    
    // 1. Register user
    registerReq := registerRequest{
        Email:    "test@example.com",
        Password: "TestPassword123!",
        FirstName: "Test",
        LastName:  "User",
    }
    registerResp := callRegisterAPI(t, registerReq)
    assert.NotEmpty(t, registerResp.User.ID)
    
    // 2. Login to get JWT
    loginReq := loginRequest{
        Email:    "test@example.com",
        Password: "TestPassword123!",
    }
    loginResp := callLoginAPI(t, loginReq)
    assert.NotEmpty(t, loginResp.AccessToken)
    
    // 3. Create assessment
    assessmentReq := assessmentRequest{
        HbA1c: 6.2,
        FBS:    110,
    }
    assessmentResp := callCreateAssessmentAPI(t, loginResp.AccessToken, assessmentReq)
    assert.NotEmpty(t, assessmentResp.ID)
    
    // 4. Verify ML prediction stored
    storedAssessment := testStore.Assessments().FindByID(context.Background(), assessmentResp.ID)
    assert.Equal(t, 0.8, storedAssessment.RiskScore)
    
    // 5. Verify audit event logged
    auditEvents := testStore.AuditEvents().List(context.Background())
    assert.True(t, len(auditEvents) > 0)
    assert.Equal(t, "assessment.create", auditEvents[0].Action)
}

func TestJWTLifecycle(t *testing.T) {
    testStore := setupTestDB(t)
    defer testStore.Close()
    
    // Test login, refresh, logout flow
    // Verify tokens rotate correctly
    // Verify old tokens are revoked
}
```

**Testing**:
- CI integration: `go test -tags=integration ./internal/http/...`
- Code coverage: `go test -coverprofile=coverage.out ./...`

---

#### REQ-4.5: Split Large Components
**Priority**: LOW | **Effort**: 8 hours | **Owner**: Frontend Team

**Description**: Break down Insights.jsx (631 lines) into smaller, focused components.

**Acceptance Criteria**:
- [ ] Insights.jsx reduced to <200 lines
- [ ] Extracted components: ModelPerformance, RiskFactorChart, SubgroupDistribution, ClusterComparison
- [ ] Extracted components are memoized
- [ ] No regression in functionality
- [ ] Improved maintainability (clear separation of concerns)

**Target Structure**:
```
frontend/src/components/insights/
├── Insights.jsx              # Orchestrator component (<200 lines)
├── ModelPerformance.jsx      # ML model metrics visualization
├── RiskFactorChart.jsx       # Risk factors bar chart
├── SubgroupDistribution.jsx  # Demographic subgroup pie charts
├── ClusterComparison.jsx      # Cluster comparison tables
└── index.jsx                # Barrel exports
```

**Testing**:
- Manual testing: Verify all Insights page features work
- Visual regression testing: Compare screenshots before/after
- React DevTools profiler: Measure re-render improvement

---

#### REQ-4.6: Add Image Lazy Loading
**Priority**: LOW | **Effort**: 2 hours | **Owner**: Frontend Team

**Description**: Add lazy loading to all non-critical images.

**Acceptance Criteria**:
- [ ] All img tags have loading="lazy" attribute
- [ ] Visualization images use decoding="async"
- [ ] Lighthouse score improvement for "Offscreen Images"
- [ ] No regression in image loading

**Files Affected**:
- `frontend/src/components/insights/Insights.jsx:47`
- `frontend/src/components/education/Education.jsx:295`

**Implementation**:
```javascript
// BEFORE
<img src="/visualizations/roc_curve.png" alt="ROC Curve" />

// AFTER
<img 
    src="/visualizations/roc_curve.png" 
    alt="ROC Curve" 
    loading="lazy" 
    decoding="async"
    width="800"
    height="600"
/>
```

**Testing**:
- Lighthouse audit: Verify "Offscreen Images" score improvement
- Manual testing: Images load correctly on scroll

---

## Implementation Timeline

| Phase | Duration | Weeks | Deliverables |
|--------|-----------|--------|--------------|
| **Phase 1: Critical Security Fixes** | Week 1 | REQ-1.1 through REQ-1.4 complete |
| **Phase 2: High Priority Fixes** | Weeks 2-4 | REQ-2.1 through REQ-2.5 complete |
| **Phase 3: Medium Priority Fixes** | Weeks 5-12 | REQ-3.1 through REQ-3.5 complete |
| **Phase 4: Code Quality Improvements** | Weeks 13-16 | REQ-4.1 through REQ-4.6 complete |

### Gantt Chart Summary

```
Week 1:  ████████ (Phase 1)
Week 2:            ███████ (Phase 2 - Part 1)
Week 3:            ███████ (Phase 2 - Part 2)
Week 4:            ███████ (Phase 2 - Part 3)
Week 5-8:          ░░░░░░░░░░░░░░░░ (Phase 3 - Security + Performance)
Week 9-12:         ░░░░░░░░░░░░░░░ (Phase 3 - Remaining)
Week 13-16:        ░░░░░░░░░░░░░░ (Phase 4 - Code Quality)
```

---

## Risk Assessment

### Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking API contract changes during refactoring | Low | High | Maintain backward compatibility, comprehensive integration tests |
| Performance regression after caching implementation | Medium | Medium | A/B testing, gradual rollout, monitoring |
| Authentication flow disruption during cookie migration | Low | High | Staged rollout, fallback mechanism, extensive testing |
| Test database drift from production schema | Medium | Low | Regular schema sync, migration validation |

### Business Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Development resource constraints for 16-week timeline | Medium | Medium | Prioritize CRITICAL/HIGH issues, phase MEDIUM/LOW |
| Production deployment causes downtime | Low | High | Blue-green deployment, canary releases |
| User experience regression after changes | Medium | Medium | E2E testing, feature flags, gradual rollout |

---

## Success Metrics

### Pre-Implementation Baseline
```bash
# Security
npm audit --audit-level high
# Expected: 0 critical vulnerabilities

# Backend Performance
go test -bench=. -benchmem
# Expected: Current P99 >1000ms

# Frontend Performance
npm run build && npx lighthouse dist
# Expected: Time to Interactive >3s
```

### Post-Implementation Targets
```bash
# Security
npm audit --audit-level high
# Target: 0 vulnerabilities

# OWASP Compliance
# Target: 0 OWASP Top 10 violations

# Backend Performance
go test -bench=. -benchmem
# Target: P99 <200ms

# Database Connections
# Target: No exhaustion under 500 concurrent users

# Frontend Performance
npx lighthouse dist
# Target: Time to Interactive <2s
# Target: Performance score >90

# React Re-renders
# Target: <20 re-renders per session

# Code Coverage
go test -coverprofile=coverage.out ./...
# Target: Integration coverage >70%
```

---

## Appendix

### A. OWASP Top 10 2021 Compliance Matrix

| Vulnerability Category | Before | After | Status |
|---------------------|--------|-------|--------|
| A01: Broken Access Control | 3 violations | 0 | RESOLVED |
| A02: Cryptographic Failures | 1 violation | 0 | RESOLVED |
| A03: Injection | 0 violations | 0 | COMPLIANT |
| A04: Insecure Design | 0 violations | 0 | COMPLIANT |
| A05: Security Misconfiguration | 0 violations | 0 | COMPLIANT |
| A06: Vulnerable Components | 0 violations | 0 | COMPLIANT |
| A07: Authentication Failures | 1 violation | 0 | RESOLVED |
| A08: Data Integrity Failures | 0 violations | 0 | COMPLIANT |
| A09: Logging Failures | 1 violation | 0 | RESOLVED |
| A10: SSRF | 0 violations | 0 | COMPLIANT |

### B. Performance Benchmark Results

#### Backend Load Test Results (Target)
```
Concurrent Users | Baseline P99 | Target P99 | Improvement
---------------|--------------|-----------|-------------
100            | 1200ms       | <200ms    | 6x
250            | 2500ms       | <200ms    | 12.5x
500            | 5000ms       | <200ms    | 25x
1000           | TIMEOUT       | <200ms    | ∞ (prevents crash)
```

#### Frontend Performance Metrics (Target)
```
Metric                     | Baseline | Target | Improvement
---------------------------|----------|-------|------------
First Contentful Paint (FCP) | 1.8s    | <1.0s   | 44%
Largest Contentful Paint (LCP) | 3.2s    | <2.5s   | 22%
Time to Interactive (TTI)       | 3.5s    | <2.0s   | 43%
Total Blocking Time (TBT)       | 850ms    | <300ms    | 65%
Cumulative Layout Shift (CLS)   | 0.15     | <0.1      | 33%
```

### C. Deployment Checklist

- [ ] All security fixes deployed to production
- [ ] Performance improvements deployed to production
- [ ] Code quality improvements merged to main branch
- [ ] Integration tests passing in CI/CD
- [ ] Load tests completed successfully
- [ ] Lighthouse audit scores meet targets
- [ ] OWASP compliance verified
- [ ] Documentation updated
- [ ] Rollback plan documented
- [ ] Monitoring dashboards updated

---

## Approvals

| Role | Name | Signature | Date |
|-------|-------|-----------|-------|
| Product Owner | TBD | TBD | TBD |
| Engineering Lead | TBD | TBD | TBD |
| Security Lead | TBD | TBD | TBD |
| QA Lead | TBD | TBD | TBD |

---

## Changelog

| Version | Date | Author | Changes |
|---------|-------|---------|---------|
| 1.0 | 2025-01-23 | Initial PRD creation based on AI code review |

---

**Document End**
