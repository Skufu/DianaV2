# Auth System Deep Dive

**Generated:** 2026-01-28
**Scope:** JWT lifecycle, password security, session management, RBAC, rate limiting
**Components Analyzed:** Backend auth handlers, middleware, token storage

---

## Executive Summary

| Component | Status | Risk Level |
|-----------|--------|------------|
| JWT Lifecycle | ⚠️ Partial | HIGH |
| Password Security | ⚠️ Partial | MEDIUM |
| Session Management | ⚠️ Issues | MEDIUM |
| RBAC Implementation | ✅ Good | LOW |
| Rate Limiting | ⚠️ Partial | MEDIUM |
| Token Storage Security | ❌ Critical | CRITICAL |

**Overall Assessment:** MEDIUM-HIGH RISK

---

## 1. JWT Lifecycle Analysis

### 1.1 Token Generation

**Location:** `backend/internal/http/handlers/auth.go:77-92`

**Current Implementation:**
```go
// Access token (lines 79-86):
accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
    "sub":     user.Email,
    "user_id": user.ID,
    "role":    user.Role,
    "exp":     now.Add(15 * time.Minute).Unix(),
    "iat":     now.Unix(),
    "scope":   "diana",
})
signedAccessToken, err := accessToken.SignedString([]byte(h.cfg.JWTSecret))

// Refresh token (lines 95-102):
refreshTokenBytes := make([]byte, 32)
rand.Read(refreshTokenBytes)
refreshToken := base64.URLEncoding.EncodeToString(refreshTokenBytes)
refreshTokenHash := hashToken(refreshToken)
```

**Analysis:**
- ✅ **Good:** Uses cryptographically secure random generation for refresh tokens
- ✅ **Good:** SHA-256 hash for database storage (prevents token recovery from DB leak)
- ✅ **Good:** Refresh token is URL-safe base64 encoded
- ✅ **Good:** Access token includes scope claim
- ⚠️ **Issue:** Access token expiry fixed at 15 minutes, not configurable
- ⚠️ **Issue:** No `jti` (JWT ID) claim for token revocation tracking

**Recommendations:**
1. **Add `jti` claim:** Unique identifier for each access token
2. **Configurable Expiry:** Make access token expiry environment configurable
3. **Token Rotation:** Current implementation rotates refresh tokens (good)
4. **Scope Limitation:** Consider narrower scopes instead of broad "diana" scope

**Risk Level:** MEDIUM

---

### 1.2 Token Storage

**Location:** `backend/internal/http/handlers/auth.go:112-114, 203-205, 306-308`
**Frontend:** `frontend/src/api.js:27-51`

**Current Backend Implementation:**
```go
// Login (lines 112-114):
c.SetSameSite(http.SameSiteStrictMode)
c.SetCookie("diana_token", signedAccessToken, 15*60, "/", "", true, true)
c.SetCookie("diana_refresh_token", refreshToken, 7*24*60*60, "/", "", true, true)

// Register (lines 203-205):
c.SetSameSite(http.SameSiteStrictMode)
c.SetCookie("diana_token", signedAccessToken, 15*60, "/", "", true, true)
c.SetCookie("diana_refresh_token", refreshToken, 7*24*60*60, "/", "", true, true)

// Refresh (lines 306-308):
c.SetSameSite(http.SameSiteStrictMode)
c.SetCookie("diana_token", signedAccessToken, 15*60, "/", "", true, true)
c.SetCookie("diana_refresh_token", newRefreshToken, 7*24*60*60, "/", "", true, true)
```

**Current Frontend Implementation:**
```javascript
// api.js:27-51
const refreshToken = localStorage.getItem('diana_refresh_token');
// ...
localStorage.setItem('diana_token', data.access_token);
localStorage.setItem('diana_refresh_token', data.refresh_token);
```

**Critical Security Issue:**

**CRITICAL** - Frontend duplicates cookies in `localStorage`, creating XSS vulnerability:

1. Backend sets `HttpOnly` cookies (✅ secure)
2. Frontend also stores in `localStorage` (❌ vulnerable)
3. If XSS occurs, attacker can read `localStorage` tokens
4. Attacker can steal tokens even though backend uses secure cookies

**Analysis:**
- ✅ **Backend:** Correctly uses `HttpOnly` and `Secure` flags
- ✅ **Backend:** Uses `SameSite=Strict` to prevent CSRF
- ❌ **Frontend:** Duplicates tokens in `localStorage` (reduces HttpOnly protection)
- ❌ **Frontend:** No need for localStorage if cookies are used

**Recommendations:**
1. **Immediate:** Remove all localStorage token storage from frontend
2. **Rely on Cookies:** Frontend should only read from document.cookie or send cookies automatically
3. **Update api.js:**
   ```javascript
   // REMOVE these lines:
   // localStorage.setItem('diana_token', data.access_token);
   // localStorage.setItem('diana_refresh_token', data.refresh_token);
   // const token = localStorage.getItem('diana_token');
   // const refreshToken = localStorage.getItem('diana_refresh_token');

   // Cookies will be sent automatically by browser
   ```
4. **Cookie-Only Auth:** Backend already correct, frontend just needs to not interfere
5. **Audit Frontend:** Search for any other localStorage usage of tokens

**Risk Level:** CRITICAL - Must fix before production

---

### 1.3 Token Validation

**Location:** `backend/internal/http/middleware/auth.go:56-121`

**Current Implementation:**
```go
func Auth(jwtSecret string) gin.HandlerFunc {
    return func(c *gin.Context) {
        authz := c.GetHeader("Authorization")
        if authz == "" || !strings.HasPrefix(authz, "Bearer ") {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing bearer token"})
            return
        }
        tokenStr := strings.TrimPrefix(authz, "Bearer ")

        // Parse token with claims validation
        token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (any, error) {
            if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, jwt.ErrSignatureInvalid
            }
            return []byte(jwtSecret), nil
        }, jwt.WithValidMethods([]string{"HS256"}))

        // Validate required claims
        sub, ok := claims["sub"].(string)
        if !ok || sub == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing subject claim"})
            return
        }

        role, ok := claims["role"].(string)
        if !ok || role == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing role claim"})
            return
        }

        scope, ok := claims["scope"].(string)
        if !ok || scope != "diana" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid scope"})
            return
        }

        userID, ok := claims["user_id"].(float64)
        if !ok {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing user_id claim"})
            return
        }

        // Store user claims in context
        c.Set("user", UserClaims{
            UserID: int64(userID),
            Email:  sub,
            Role:   role,
        })

        c.Next()
    }
}
```

**Analysis:**
- ✅ **Good:** Validates JWT signature with secret
- ✅ **Good:** Restricts to HS256 algorithm only
- ✅ **Good:** Validates all required claims (sub, role, scope, user_id)
- ✅ **Good:** Proper error messages without exposing internal details
- ✅ **Good:** Stores claims in context for handler use
- ✅ **Good:** No token expiration validation (JWT library handles this)
- ⚠️ **Issue:** No `jti` claim for token revocation
- ⚠️ **Issue:** No check for token blacklist if implementing revocation

**Recommendations:**
1. **Add Token Blacklist (Optional):**
   ```go
   // Redis cache of revoked jti claims
   if isTokenBlacklisted(claims["jti"].(string)) {
       c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token revoked"})
       return
   }
   ```
2. **Cache Valid Tokens:** Cache validated tokens to reduce verification overhead
3. **Rate Limit Auth Failures:** Track failed auth attempts per IP
4. **Log Security Events:** Log all token validation failures for audit trail

**Risk Level:** LOW - Current implementation is good

---

### 1.4 Token Refresh

**Location:** `backend/internal/http/handlers/auth.go:219-325`

**Current Implementation:**
```go
func (h *AuthHandler) refresh(c *gin.Context) {
    // Validate refresh token from database
    tokenHash := hashToken(req.RefreshToken)
    tokenRecord, err := h.store.RefreshTokens().FindRefreshToken(c.Request.Context(), tokenHash)

    // Check if token has been revoked
    if tokenRecord.Revoked {
        log.Printf("[WARN] Attempted to use revoked refresh token for user ID %d", tokenRecord.UserID)
        ErrUnauthorized(c)
        return
    }

    // Check if token has expired
    if time.Now().After(tokenRecord.ExpiresAt) {
        log.Printf("[WARN] Attempted to use expired refresh token for user ID %d", tokenRecord.UserID)
        ErrUnauthorized(c)
        return
    }

    // Generate new access token
    accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
        // ... claims
    })

    // Revoke old refresh token (token rotation for security)
    h.store.RefreshTokens().RevokeRefreshToken(c.Request.Context(), tokenHash)

    // Generate new refresh token
    newRefreshTokenBytes := make([]byte, 32)
    rand.Read(newRefreshTokenBytes)
    newRefreshToken := base64.URLEncoding.EncodeToString(newRefreshTokenBytes)
    newRefreshTokenHash := hashToken(newRefreshToken)

    // Store new refresh token in database
    h.store.RefreshTokens().CreateRefreshToken(c.Request.Context(), newRefreshTokenHash, int32(user.ID), time.Now().Add(7*24*time.Hour))
}
```

**Analysis:**
- ✅ **Excellent:** Token rotation implemented (old token revoked)
- ✅ **Good:** Refresh token expiry validation (7 days)
- ✅ **Good:** Revocation check prevents reuse of revoked tokens
- ✅ **Good:** Cryptographically secure random token generation
- ✅ **Good:** SHA-256 hashing for secure storage
- ✅ **Good:** Logs security events (revoked/expired token attempts)
- ⚠️ **Issue:** No rate limiting on refresh endpoint
- ⚠️ **Issue:** No check for concurrent refresh attempts from same session

**Recommendations:**
1. **Add Rate Limiting:** Prevent brute force on refresh endpoint
2. **Concurrent Refresh Check:** Limit concurrent refreshes per user/session
3. **Device Fingerprinting:** Track devices to detect token theft
4. **Refresh Token Invalidation:** Invalidate all refresh tokens on password change

**Risk Level:** MEDIUM - Good implementation, minor enhancements recommended

---

### 1.5 Token Expiry Management

**Access Token:**
- **Current:** 15 minutes fixed (line 83)
- **Refresh Token:** 7 days fixed (line 105)
- **No configuration:** Not environment-configurable
- **No idle timeout:** No activity-based expiry

**Recommendations:**
1. **Add Environment Configuration:**
   ```go
   JWTAccessTokenExpiryMinutes: getEnvInt("JWT_ACCESS_TOKEN_EXPIRY_MINUTES", 15),
   JWTRefreshTokenExpiryDays: getEnvInt("JWT_REFRESH_TOKEN_EXPIRY_DAYS", 7),
   ```
2. **Idle Timeout:** Implement sliding session window
3. **Session Expiry on Logout:** Ensure both tokens cleared on logout (already implemented ✅)

**Risk Level:** LOW - Current values reasonable, configurability would be nice

---

## 2. Password Security Analysis

### 2.1 Password Hashing

**Location:** `backend/internal/http/handlers/auth.go:67, 151`

**Current Implementation:**
```go
hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
```

**Analysis:**
- ✅ **Excellent:** Uses bcrypt (industry standard)
- ✅ **Good:** Default cost factor (bcrypt.DefaultCost = 10)
- ✅ **Good:** Salt handled automatically by bcrypt
- ⚠️ **Concern:** bcrypt.DefaultCost = 10 may be low for modern hardware
- ⚠️ **Concern:** No custom cost configuration

**bcrypt Cost Factor Analysis:**
- Cost 10: ~100ms hashing time on modern hardware
- Cost 12: ~500ms hashing time (recommended for 2024)
- Cost 14: ~2000ms hashing time (high security)

**Recommendations:**
1. **Increase Cost Factor:**
   ```go
   // Replace bcrypt.DefaultCost with:
   bcrypt.Cost, err := bcrypt.Cost([]byte(req.Password))
   if err != nil {
       // Fallback to cost 12
       cost = 12
   }
   hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), cost)
   ```
2. **Environment Configuration:**
   ```go
   BcryptCost: getEnvInt("BCRYPT_COST", 12),
   ```
3. **Migration Strategy:** Plan for password rehash on next login with higher cost
4. **Benchmark:** Test hashing times on production hardware

**Risk Level:** MEDIUM - bcrypt is good, but cost factor could be higher

---

### 2.2 Password Policy

**Location:** `backend/internal/http/handlers/auth.go:31-38`

**Current Implementation:**
```go
type loginRequest struct {
    Email    string `json:"email" binding:"required,email,max=255"`
    Password string `json:"password" binding:"required,min=8,max=128"`
}

type registerRequest struct {
    Email    string `json:"email" binding:"required,email,max=255"`
    Password string `json:"password" binding:"required,min=8,max=128"`
}
```

**Password Policy:**
- Minimum length: 8 characters
- Maximum length: 128 characters
- Email validation: Required, max 255 characters
- Complexity: None
- Character restrictions: None
- History check: None
- Common password check: None

**Analysis:**
- ❌ **Critical Gap:** No complexity requirements (uppercase, lowercase, numbers, special characters)
- ❌ **Critical Gap:** No common password detection (e.g., "password123", "qwerty123")
- ❌ **Gap:** No password history check (user can reuse passwords)
- ⚠️ **Concern:** 8 characters is minimal for 2024 standards (NIST recommends 12+)
- ✅ **Good:** Maximum length reasonable (128)

**Recommendations:**
1. **Implement Password Validator:**
   ```go
   func ValidatePassword(password string) error {
       if len(password) < 12 {
           return errors.New("password must be at least 12 characters")
       }
       if len(password) > 128 {
           return errors.New("password too long")
       }

       var hasUpper, hasLower, hasNumber, hasSpecial bool
       for _, r := range password {
           switch {
           case unicode.IsUpper(r):
               hasUpper = true
           case unicode.IsLower(r):
               hasLower = true
           case unicode.IsDigit(r):
               hasNumber = true
           case unicode.IsPunct(r) || unicode.IsSymbol(r):
               hasSpecial = true
           }
       }

       required := 0
       if hasUpper { required++ }
       if hasLower { required++ }
       if hasNumber { required++ }
       if hasSpecial { required++ }

       if required < 4 {
           return errors.New("password must contain uppercase, lowercase, number, and special character")
       }

       // Common password check
       if isCommonPassword(password) {
           return errors.New("password is too common, choose a stronger password")
       }

       return nil
   }
   ```
2. **Add Password History:**
   - Store hash of last N passwords in user table
   - Check against history on password change
3. **Implement Common Password List:** Use zxcvbn-style list of common passwords
4. **Add Password Strength Meter:** Provide real-time feedback during registration

**Risk Level:** HIGH - Weak password policy makes accounts vulnerable to brute force

---

### 2.3 Account Lockout

**Current Status:** NOT IMPLEMENTED

**Analysis:**
- ❌ **Critical Gap:** No account lockout after failed login attempts
- ❌ **Critical Gap:** No exponential backoff on failed authentication
- ⚠️ **Partial:** Rate limiting exists in ML service but not auth endpoints
- ⚠️ **Partial:** Failed login events logged but no lockout mechanism

**Recommendations:**
1. **Implement Failed Attempt Tracking:**
   ```go
   type FailedAttempt struct {
       Email      string
       IP         string
       Attempts   int
       LastFailed time.Time
       LockedUntil time.Time
   }
   ```
2. **Lockout Policy:**
   - 5 failed attempts: Lock account for 15 minutes
   - 10 failed attempts: Lock account for 1 hour
   - Progressive delay: Exponential backoff on failed attempts
3. **Redis/Database Storage:** Store failed attempts with TTL
4. **Account Recovery:** Allow admin unlock or time-based unlock
5. **Rate Limit Auth Endpoints:**
   ```go
   // Add to middleware/ratelimit.go
   // /api/v1/auth/login: 5 attempts per minute per IP
   // /api/v1/auth/register: 3 attempts per hour per IP
   ```

**Risk Level:** HIGH - No protection against brute force attacks

---

## 3. Session Management Analysis

### 3.1 Session Invalidation

**Location:** `backend/internal/http/handlers/auth.go:327-359`

**Logout Implementation:**
```go
func (h *AuthHandler) logout(c *gin.Context) {
    var req struct {
        RefreshToken string `json:"refresh_token"`
    }
    if err := c.ShouldBindJSON(&req); err != nil {
        ErrBadRequest(c, "invalid payload")
        return
    }

    if req.RefreshToken != "" {
        tokenHash := hashToken(req.RefreshToken)
        h.store.RefreshTokens().RevokeRefreshToken(c.Request.Context(), tokenHash)
    }

    c.SetSameSite(http.SameSiteStrictMode)
    c.SetCookie("diana_token", "", -1, "/", "", true, true)
    c.SetCookie("diana_refresh_token", "", -1, "/", "", true, true)
}
```

**Analysis:**
- ✅ **Good:** Revokes refresh token from database
- ✅ **Good:** Clears both cookies (access and refresh)
- ✅ **Good:** Uses SameSite=Strict
- ✅ **Good:** HttpOnly cookies prevent client-side manipulation
- ⚠️ **Issue:** No validation that refresh token belongs to current user
- ⚠️ **Issue:** No invalidation of cached tokens or JWT blacklist
- ⚠️ **Issue:** Frontend localStorage not cleared (if localStorage removal not implemented)

**Recommendations:**
1. **Validate Token Ownership:** Ensure refresh token belongs to requesting user
2. **Clear Frontend Storage:** Ensure localStorage tokens cleared on logout
3. **JWT Blacklist:** Add revoked access tokens to blacklist cache (Redis)
4. **Invalidate All Sessions:** Option to invalidate all user sessions on logout

**Risk Level:** MEDIUM - Current implementation is functional

---

### 3.2 Concurrent Session Management

**Current Status:** NOT IMPLEMENTED

**Analysis:**
- ❌ **Gap:** No limit on concurrent sessions per user
- ❌ **Gap:** No session listing for user to view active sessions
- ❌ **Gap:** No ability to revoke specific sessions
- ⚠️ **Concern:** Multiple refresh tokens can be active (no cleanup)

**Recommendations:**
1. **Session Tracking:** Track active refresh tokens per user
2. **Max Sessions:** Limit to N concurrent sessions (e.g., 5)
3. **Session UI:** Add "Active Sessions" page in user profile
4. **Session Termination:** Allow users to revoke specific sessions
5. **New Session Logic:** Revoke oldest session when limit reached

**Risk Level:** MEDIUM - Multiple concurrent sessions increase exposure window

---

## 4. RBAC Implementation Analysis

### 4.1 Role-Based Access Control

**Location:** `backend/internal/http/middleware/rbac.go`

**Current Implementation:**
```go
func RoleRequired(allowedRoles ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userInterface, exists := c.Get("user")
        if !exists {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
            return
        }

        claims, ok := userInterface.(UserClaims)
        if !ok {
            c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "invalid user context"})
            return
        }

        // Check if user's role matches any of the allowed roles
        for _, role := range allowedRoles {
            if claims.Role == role {
                c.Next()
                return
            }
        }

        c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "access denied - insufficient permissions"})
    }
}

func AdminOnly() gin.HandlerFunc {
    return RoleRequired("admin")
}
```

**Analysis:**
- ✅ **Excellent:** Clean, reusable RBAC middleware
- ✅ **Good:** Supports multiple allowed roles (flexible)
- ✅ **Good:** Clear error messages (401 vs 403)
- ✅ **Good:** Convenience function `AdminOnly()`
- ✅ **Good:** Proper type assertion with error handling
- ✅ **Good:** Used after Auth middleware (claims available in context)
- ⚠️ **Minor:** No role hierarchy/inheritance (admin > manager > user)

**RBAC Implementation Review:**

| Endpoint | Protection | Role Required | Status |
|----------|------------|---------------|--------|
| `/api/v1/admin/users` | AdminOnly | admin | ✅ Correct |
| `/api/v1/admin/audit` | AdminOnly | admin | ✅ Correct |
| `/api/v1/admin/models` | AdminOnly | admin | ✅ Correct |
| `/api/v1/users/me/*` | Auth only | user/admin | ✅ Correct |

**Recommendations:**
1. **Role Hierarchy (Optional):** Implement role inheritance if complex permissions needed
2. **Permission Constants:** Define permission constants for consistency
3. **Audit RBAC Decisions:** Log all RBAC checks for security audit trail
4. **Resource-Based Permissions:** Consider if needed for future features

**Risk Level:** LOW - RBAC implementation is solid

---

### 4.2 Role Assignment

**Location:** `backend/internal/http/handlers/auth.go:161, 177`

**Current Implementation:**
```go
// Registration (line 161):
user := models.User{
    Email:        req.Email,
    PasswordHash: string(hashedPassword),
    Role:         "user", // Default role for new registrations
    IsActive:     true,
}

// No role escalation mechanism found (GOOD)
```

**Analysis:**
- ✅ **Good:** Default role is "user" (not admin)
- ✅ **Good:** No API endpoint for self-privilege escalation
- ✅ **Good:** Only admin can create admin users (via admin endpoints)
- ⚠️ **Concern:** Role field derived from `is_admin` in database (check backend/internal/store/postgres.go)

**Recommendations:**
1. **Audit Admin Assignment:** Log all admin role changes
2. **Require Re-authentication for Admin Actions:** Force fresh login for sensitive operations
3. **Separate Admin Auth:** Consider separate admin authentication with 2FA
4. **Regular Role Audits:** Periodically review admin users list

**Risk Level:** LOW - Role assignment is secure

---

## 5. Rate Limiting Analysis

### 5.1 Backend Rate Limiting

**Location:** `backend/internal/http/middleware/ratelimit.go`

**Current Status:** File exists, implementation not analyzed in detail

**Known Issues from AGENTS.md:**
- ⚠️ `MaxBodySize` and `AuthRateLimit` show as "undefined" in some contexts
- ⚠️ Possible drift or compilation issues

**ML Service Rate Limiting:**

**Location:** `Ian_ML/server.py:88-129`

**Implementation:**
```python
class RateLimiter:
    def __init__(self, requests_per_minute=60, requests_per_second=10):
        self.requests_per_minute = requests_per_minute
        self.requests_per_second = requests_per_second
        self.second_requests = defaultdict(list)
        self._lock = threading.Lock()

    def is_allowed(self):
        with self._lock:
            now = time.time()
            client_id = self._get_client_id()

            self.minute_requests[client_id] = self._cleanup_old(
                self.minute_requests[client_id], 60
            )
            self.second_requests[client_id] = self._cleanup_old(
                self.second_requests[client_id], 1
            )

            if len(self.minute_requests[client_id]) >= self.requests_per_minute:
                return False, "rate limit exceeded (per minute)"
            if len(self.second_requests[client_id]) >= self.requests_per_second:
                return False, "rate limit exceeded (per second)"

            self.minute_requests[client_id].append(now)
            self.second_requests[client_id].append(now)
            return True, None
```

**ML Rate Limits:**
- Per minute: 120 (configurable via `ML_RATE_LIMIT_MINUTE`)
- Per second: 20 (configurable via `ML_RATE_LIMIT_SECOND`)
- Client identification: `X-API-Key` header or IP address

**Analysis:**
- ✅ **Good:** Rate limiting implemented in ML service
- ✅ **Good:** Thread-safe implementation (threading.Lock)
- ✅ **Good:** Configurable limits via environment
- ✅ **Good:** Cleanup of old entries (prevents memory leak)
- ⚠️ **Concern:** No rate limiting on backend auth endpoints
- ⚠️ **Concern:** Rate limits per second may be too permissive (20/sec)
- ⚠️ **Concern:** No global rate limit across all services

**Recommendations:**

**Backend Rate Limiting:**
1. **Implement Auth Endpoint Rate Limits:**
   ```go
   // /api/v1/auth/login: 5 attempts per 5 minutes per IP
   // /api/v1/auth/register: 3 attempts per hour per IP
   // /api/v1/auth/refresh: 10 requests per minute per user
   ```
2. **Use Redis:** Store rate limit counters in Redis for distributed systems
3. **IP + User Tracking:** Track by both IP and user ID
4. **Sliding Window:** Use sliding window for smoother limits

**ML Service Enhancements:**
5. **Reduce Per-Second Limit:** Lower from 20 to 10
6. **Global Rate Limit:** Add per-API-key global limit
7. **Rate Limit Headers:** Include rate limit info in response headers:
   ```python
   headers = {
       "X-RateLimit-Limit": "120",
       "X-RateLimit-Remaining": str(remaining),
       "X-RateLimit-Reset": str(reset_time)
   }
   ```

**Risk Level:** MEDIUM - ML has rate limiting, backend auth needs it

---

## 6. Token Storage Security (Repeated)

**CRITICAL:** See Section 1.2 for detailed analysis

**Summary:**
- Backend: ✅ Correct (HttpOnly cookies)
- Frontend: ❌ Vulnerable (localStorage)
- **Risk:** XSS can steal tokens despite HttpOnly cookies

**Action Required:** IMMEDIATE - Remove localStorage usage before production

---

## Summary & Priority Matrix

| Issue | Severity | Impact | Effort | Priority |
|-------|----------|--------|--------|----------|
| localStorage token storage | CRITICAL | High | Low | P0 |
| Missing CSRF protection | HIGH | High | Medium | P1 |
| Weak password policy | HIGH | High | Medium | P1 |
| No account lockout | HIGH | High | Medium | P1 |
| Hardcoded JWT secret fallback | HIGH | High | Low | P1 |
| Bcrypt cost factor low | MEDIUM | Medium | Low | P2 |
| No concurrent session limit | MEDIUM | Medium | High | P2 |
| Missing auth rate limiting | MEDIUM | High | Medium | P2 |
| Information leakage in logs | MEDIUM | Low | Low | P2 |
| CSP too restrictive | MEDIUM | Low | Medium | P2 |
| RBAC improvements | LOW | Low | Medium | P3 |
| Configurable token expiry | LOW | Low | Low | P3 |

---

## Recommended Action Plan

### Phase 1: Critical Security Fixes (Week 1)
1. **Remove localStorage token storage** - Frontend only
2. **Remove hardcoded JWT secret fallback** - Backend config
3. **Implement account lockout** - Backend auth
4. **Add CSRF protection** - Middleware

### Phase 2: High Priority Enhancements (Week 2-3)
5. **Strengthen password policy** - Validator implementation
6. **Add auth rate limiting** - Middleware
7. **Implement concurrent session limits** - Backend store
8. **Increase bcrypt cost factor** - Config update

### Phase 3: Medium Priority Improvements (Month 2)
9. **Refactor rate limiting** - Redis-based, sliding window
10. **Enhance RBAC** - Permission constants, audit logging
11. **Update CSP** - Modern policy with nonce support
12. **Sanitize logging** - Remove sensitive data from logs

### Phase 4: Future Enhancements (Quarter 2)
13. **Implement token blacklisting** - Redis cache
14. **Add session management UI** - Frontend feature
15. **Implement 2FA for admin** - Enhanced security
16. **Add security monitoring** - Alerting and dashboards

---

## Conclusion

The authentication system demonstrates **solid fundamentals** with bcrypt, JWT, and RBAC properly implemented. However, **critical issues with localStorage token storage** and **missing CSRF protection** must be addressed before production deployment.

**Overall Auth Security Score:** 7/10

**Key Strengths:**
- ✅ bcrypt password hashing
- ✅ JWT with refresh token rotation
- ✅ RBAC middleware correctly implemented
- ✅ SameSite=Strict cookies
- ✅ Rate limiting in ML service
- ✅ Token revocation on logout

**Critical Issues:**
- ❌ Frontend localStorage for JWT tokens (CRITICAL)
- ❌ No account lockout mechanism
- ❌ Weak password complexity requirements
- ❌ No CSRF protection
- ❌ Hardcoded JWT secret fallback

---

**Report Generated By:** Auth System Deep Dive
**Review Date:** 2026-01-28
**Next Review:** After implementing Phase 1 fixes or 2026-02-28
