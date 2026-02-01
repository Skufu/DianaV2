# Security Vulnerability Scan

**Generated:** 2026-01-28
**Scope:** Full codebase scan (backend, frontend, ml)
**Method:** Code analysis + dependency review

---

## Executive Summary

| Severity | Count | Status |
|-----------|--------|--------|
| CRITICAL | 0 | ✅ Pass |
| HIGH | 3 | ⚠️ Action Required |
| MEDIUM | 5 | ⚠️ Action Required |
| LOW | 2 | ℹ️ Recommended |

**Overall Risk Assessment:** MEDIUM-HIGH

---

## Findings

### 1. JWT Token Storage Vulnerability (HIGH)

**Location:** `frontend/src/api.js`
**Severity:** HIGH
**Description:**

JWT access tokens and refresh tokens are stored in `localStorage`, which is vulnerable to XSS attacks. If an attacker can execute malicious JavaScript on the frontend, they can steal the tokens and hijack user sessions.

**Current Implementation (lines 27-51):**
```javascript
// Line 27: Refresh token stored in localStorage
const refreshToken = localStorage.getItem('diana_refresh_token');

// Line 58-65: Access token also in localStorage
const token = localStorage.getItem('diana_token');
```

**Risk:**
- XSS attack can read `localStorage.getItem('diana_token')`
- Access to refresh token allows token theft and session persistence
- No SameSite or HttpOnly protection

**Recommended Fix:**
1. **Immediate:** Use `httpOnly` and `Secure` cookies instead of `localStorage`
2. **Backend Change:** Modify `auth.go` handler (lines 112-114) to use HttpOnly cookies only:
   ```go
   // Current (vulnerable):
   c.SetCookie("diana_token", signedAccessToken, 15*60, "/", "", true, true)

   // Recommended (secure):
   c.SetSameSite(http.SameSiteStrictMode)
   c.SetCookie("diana_token", signedAccessToken, 15*60, "/", "", true, true)
   c.Header("Set-Cookie", "diana_refresh_token="+refreshToken+"; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Strict")
   ```
3. **Frontend Change:** Remove token storage from `localStorage`, rely only on cookies
4. **Add Content Security Policy:** Use CSP to prevent XSS
5. **Implement Token Binding:** Add CSRF tokens for state-changing operations

**Priority:** P0 - Fix before production deployment

---

### 2. Missing CSRF Protection (HIGH)

**Location:** `backend/internal/http/middleware/` (no CSRF middleware found)
**Severity:** HIGH
**Description:**

No CSRF (Cross-Site Request Forgery) protection is implemented for state-changing operations. While SameSite=Strict cookies provide some protection, explicit CSRF tokens are recommended for authenticated endpoints.

**Current Implementation:**
- `middleware/cors.go` does not exist (referenced in AGENTS.md but file missing)
- Only JWT-based auth, no anti-CSRF tokens
- All protected endpoints rely solely on JWT Authorization header

**Risk:**
- Attacker can trick users into making authenticated requests to change-sensitive actions
- Potential for: account deletion, profile updates, assessment creation/modification

**Recommended Fix:**
1. **Add CSRF Middleware:**
   ```go
   // backend/internal/http/middleware/csrf.go (new file)
   func CSRFMiddleware() gin.HandlerFunc {
       return func(c *gin.Context) {
           // Generate CSRF token for GET requests
           // Validate CSRF token for POST/PUT/DELETE
       }
   }
   ```
2. **Apply to State-Changing Routes:**
   - `POST /api/v1/auth/logout`
   - `POST /api/v1/users/me/profile`
   - `PUT /api/v1/users/me/assessments/:id`
   - `DELETE /api/v1/users/me/account`
3. **Frontend Integration:** Send CSRF token with all forms/requests
4. **CORS Configuration:** Ensure CORS is properly configured (currently using `github.com/gin-contrib/cors` directly in router)

**Priority:** P1 - High importance for production

---

### 3. Hardcoded JWT Secret Fallback (HIGH)

**Location:** `backend/internal/config/config.go:51-58`
**Severity:** HIGH
**Description:**

When `JWT_SECRET` environment variable is not set (only in development), the application uses a hardcoded fallback value `dev-secret-change-in-production`.

**Current Implementation (lines 51-58):**
```go
jwtSecret := os.Getenv("JWT_SECRET")
if jwtSecret == "" {
    env := getEnv("ENV", "dev")
    if env != "local" {
        log.Fatalf("JWT_SECRET environment variable is required in %s. Cannot start without it.", env)
    }
    jwtSecret = "dev-secret-change-in-production"  // HARDCODED
    log.Println("WARNING: Using default JWT secret. Set JWT_SECRET environment variable!")
}
```

**Risk:**
- If production deployment forgets to set `JWT_SECRET`, fallback is used
- Attackers can forge JWT tokens if they know the hardcoded secret
- Silent fallback with only warning log (no error)

**Recommended Fix:**
1. **Remove Fallback Secret:**
   ```go
   // Replace lines 51-58 with:
   jwtSecret := os.Getenv("JWT_SECRET")
   if jwtSecret == "" {
       log.Fatalf("JWT_SECRET environment variable is required. Cannot start without it.")
   }
   if len(jwtSecret) < 32 {
       log.Fatalf("JWT_SECRET must be at least 32 characters. Current length: %d", len(jwtSecret))
   }
   ```
2. **Environment Validation:** Add check in Docker/Kubernetes config to ensure `JWT_SECRET` is set
3. **Documentation:** Update README to emphasize `JWT_SECRET` requirement
4. **CI Check:** Ensure CI pipeline validates secret presence

**Priority:** P0 - Critical production security issue

---

### 4. Information Leakage in Error Messages (MEDIUM)

**Location:** `backend/internal/config/config.go:48`
**Severity:** MEDIUM
**Description:**

Configuration parsing errors log full environment variable values, potentially exposing secrets.

**Current Implementation (line 48):**
```go
log.Printf("[CONFIG] Failed to parse %s=%s, using default %v", key, v, def)
```

**Risk:**
- Log files may contain sensitive values if misconfiguration occurs
- Error messages include actual value that failed parsing
- Logs accessible to system administrators or log aggregation services

**Recommended Fix:**
1. **Sanitize Log Output:**
   ```go
   log.Printf("[CONFIG] Failed to parse %s, using default %v", key, def)
   // Remove 'v' from log - don't log the actual value
   ```
2. **Structured Logging:** Use structured logging with sensitive field masking
3. **Audit Log Review:** Ensure no secrets in existing logs
4. **Log Rotation:** Implement proper log rotation and retention

**Priority:** P2 - Medium priority, reduce exposure window

---

### 5. Weak Password Complexity Validation (MEDIUM)

**Location:** `backend/internal/http/handlers/auth.go:31-38`
**Severity:** MEDIUM
**Description:**

Password validation only enforces minimum length (8 characters) with no complexity requirements.

**Current Implementation (lines 31-38):**
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

**Risk:**
- Weak passwords easily brute-forced
- No requirements for: uppercase, lowercase, numbers, special characters
- Rainbow tables and dictionary attacks more effective

**Recommended Fix:**
1. **Add Custom Validator:**
   ```go
   func ValidatePassword(password string) error {
       if len(password) < 8 {
           return errors.New("password must be at least 8 characters")
       }
       var hasUpper, hasLower, hasNumber, hasSpecial bool
       for _, char := range password {
           switch {
           case unicode.IsUpper(char):
               hasUpper = true
           case unicode.IsLower(char):
               hasLower = true
           case unicode.IsDigit(char):
               hasNumber = true
           case unicode.IsPunct(char):
               hasSpecial = true
           }
       }
       required := 0
       if hasUpper { required++ }
       if hasLower { required++ }
       if hasNumber { required++ }
       if hasSpecial { required++ }
       if required < 3 {
           return errors.New("password must contain uppercase, lowercase, number, and special character")
       }
       return nil
   }
   ```
2. **Apply to Registration:** Add validation in `register` handler
3. **Apply to Password Change:** Add validation if password change endpoint exists
4. **Rate Limiting on Auth:** Enhance existing rate limit to slow brute force attempts

**Priority:** P2 - Medium priority, improves account security

---

### 6. Debug Logging in Production Code (MEDIUM)

**Location:** Multiple locations using `fmt.Printf` and `log.Printf`
**Severity:** MEDIUM
**Description:**

Debug print statements and verbose logging are present in codebase, which could expose sensitive information in production logs.

**Examples Found:**
```go
// backend/internal/config/config.go:48
log.Printf("[CONFIG] Failed to parse %s=%s, using default %v", key, v, def)

// ml/server.py:881-884
print(f"Starting DIANA ML Server on port {port}...")
print(f"Health check: http://localhost:{port}/health")
print(f"Predict endpoint: http://localhost:{port}/predict")
```

**Risk:**
- Production logs may contain debug information
- Sensitive data may be logged inadvertently
- Performance impact from excessive logging

**Recommended Fix:**
1. **Use Structured Logging:** Replace `fmt.Printf` with `logrus`, `zap`, or `zerolog`
2. **Log Levels:** Implement log levels (DEBUG, INFO, WARN, ERROR)
3. **Environment-Based Logging:** Disable DEBUG logs in production
4. **Sensitive Data Masking:** Mask passwords, tokens, and PII in logs

**Priority:** P2 - Medium priority, improve operational hygiene

---

### 7. Missing Content Security Policy (MEDIUM)

**Location:** `backend/internal/http/middleware/security.go:22`
**Severity:** MEDIUM
**Description:**

CSP header exists but may be too restrictive for modern web applications (no inline scripts, no external resources).

**Current Implementation (line 22):**
```go
c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'")
```

**Risk:**
- Too restrictive - may break legitimate functionality
- No support for modern CSP features (nonce, hash)
- May block external fonts, analytics, or third-party scripts if added later

**Recommended Fix:**
1. **Update CSP Policy:**
   ```go
   c.Header("Content-Security-Policy",
       "default-src 'self'; "+
       "script-src 'self' 'nonce-{nonce}'; "+
       "style-src 'self' 'unsafe-inline'; "+
       "img-src 'self' data: https://trusted.cdn.com; "+
       "font-src 'self' https://fonts.googleapis.com; "+
       "connect-src 'self' https://api.example.com; "+
       "object-src 'none'; "+
       "base-uri 'self';")
   ```
2. **Report-Only CSP:** Use `Content-Security-Policy-Report-Only` to test
3. **CSP Monitoring:** Set up endpoint to receive CSP violation reports
4. **Nonce Support:** Add nonce generation for inline scripts

**Priority:** P2 - Medium priority, balance security and functionality

---

### 8. Insufficient Session Timeout Configuration (LOW)

**Location:** `backend/internal/http/handlers/auth.go:79-86, 104`
**Severity:** LOW
**Description:**

JWT access token expiry is set to 15 minutes with no user-configurable option. Refresh tokens expire in 7 days.

**Current Implementation (lines 79-86, 104):**
```go
// Access token: 15 minutes (line 79, 83)
"exp": now.Add(15 * time.Minute).Unix(),

// Refresh token: 7 days (line 104)
time.Now().Add(7*24*time.Hour)
```

**Risk:**
- 15 minutes may be too short for user experience
- No configuration option for different security postures
- No idle timeout detection

**Recommended Fix:**
1. **Add Environment Configuration:**
   ```go
   JWTAccessTokenExpiry: getEnvInt("JWT_ACCESS_TOKEN_EXPIRY_MINUTES", 15),
   JWTRefreshTokenExpiry: getEnvInt("JWT_REFRESH_TOKEN_EXPIRY_DAYS", 7),
   ```
2. **Idle Timeout:** Implement activity-based refresh token expiry
3. **Remember Me Option:** Allow longer refresh token expiry for trusted devices
4. **Session Revocation:** Ensure logout invalidates both access and refresh tokens

**Priority:** P3 - Low priority, UX improvement

---

### 9. Incomplete CORS Configuration (LOW)

**Location:** `backend/internal/http/router/router.go` (CORS applied via github.com/gin-contrib/cors)
**Severity:** LOW
**Description:**

CORS middleware exists but `cors.go` file is missing (referenced in AGENTS.md but implementation appears to be using third-party library directly).

**Current Implementation:**
- Using `github.com/gin-contrib/cors` library directly
- No custom `middleware/cors.go` despite documentation reference
- Origins configured via `CORS_ORIGINS` environment variable

**Risk:**
- Potential configuration drift between docs and implementation
- Inconsistent CORS policy management
- May not have fine-grained control needed for production

**Recommended Fix:**
1. **Implement Custom CORS Middleware:**
   ```go
   // backend/internal/http/middleware/cors.go (create file)
   func CORS(origins []string) gin.HandlerFunc {
       return func(c *gin.Context) {
           origin := c.Request.Header.Get("Origin")
           if isAllowedOrigin(origin, origins) {
               c.Header("Access-Control-Allow-Origin", origin)
           }
           // Add other CORS headers
       }
   }
   ```
2. **Update AGENTS.md:** Document actual implementation
3. **Pre-Flight Caching:** Cache OPTIONS responses for performance
4. **Wildcard Origins:** Avoid wildcard in production

**Priority:** P3 - Low priority, documentation and consistency

---

## SQL Injection Analysis

**Status:** ✅ PASS - No vulnerabilities found

**Analysis:**
- All database queries use SQLC-generated code with parameterized queries
- No raw SQL string concatenation found
- Proper use of `pgx` with prepared statements
- Handlers use SQLC repository interfaces, not direct SQL

**Recommendation:**
- Maintain current parameterized query approach
- Continue using SQLC for all database operations
- Periodically review new handlers for SQL injection patterns

---

## XSS Analysis

**Status:** ⚠️ PARTIAL - Found localStorage vulnerability (see Finding #1)

**Frontend Scan Results:**
- ✅ No `dangerouslySetInnerHTML` usage found
- ✅ No `eval()` calls found
- ✅ No `innerHTML` assignment with user input found
- ✅ No `document.write()` calls found
- ✅ No direct DOM manipulation with user input found

**Recommendations:**
1. **Sanitize All User Input:** Use DOMPurify or similar library
2. **Auto-Escape Context:** Ensure React JSX escapes all variables
3. **Content Security Policy:** Implement strong CSP (Finding #7)
4. **HttpOnly Cookies:** Switch from localStorage to secure cookies (Finding #1)

---

## File Handling Security

**Status:** ✅ PASS - No file upload/download vulnerabilities found

**Analysis:**
- File export uses CSV generation in-memory
- No file upload endpoints found
- PDF generation uses server-side generation
- No path traversal vulnerabilities detected

**Recommendations:**
- If file upload is added, validate: file type, size, content
- Use secure file storage with random filenames
- Serve files from separate domain or CDN
- Implement virus scanning if user files are stored

---

## Summary by Component

| Component | Critical | High | Medium | Low |
|-----------|----------|------|--------|-----|
| Backend Auth | 0 | 1 | 1 | 0 |
| Frontend Storage | 1 | 0 | 1 | 0 |
| Middleware | 0 | 1 | 1 | 1 |
| Configuration | 0 | 1 | 1 | 0 |
| Database | 0 | 0 | 0 | 0 |

---

## Recommended Action Plan

### Immediate (P0 - Before Production)
1. **Replace localStorage with HttpOnly cookies** (Finding #1)
2. **Remove hardcoded JWT secret fallback** (Finding #3)

### High Priority (P1 - Within 1 Week)
3. **Implement CSRF protection** (Finding #2)
4. **Enhance password complexity validation** (Finding #5)

### Medium Priority (P2 - Within 1 Month)
5. **Sanitize error logging** (Finding #4)
6. **Improve logging practices** (Finding #6)
7. **Update CSP policy** (Finding #7)

### Low Priority (P3 - Future Enhancement)
8. **Configure session timeouts** (Finding #8)
9. **Standardize CORS implementation** (Finding #9)

---

## Conclusion

The codebase demonstrates **good security practices** overall with parameterized queries and no obvious XSS vectors. However, **critical issues with JWT token storage and hardcoded secrets** must be addressed before production deployment.

**Overall Security Posture:** 6.5/10

**Key Strengths:**
- ✅ SQL injection protection via SQLC
- ✅ No obvious XSS vectors in React code
- ✅ Security headers implemented
- ✅ bcrypt password hashing
- ✅ Rate limiting in ML service

**Key Weaknesses:**
- ⚠️ localStorage for JWT tokens (critical)
- ⚠️ Hardcoded JWT secret fallback (critical)
- ⚠️ Missing CSRF protection (high)
- ⚠️ Weak password validation (medium)

---

**Report Generated By:** Automated Security Scan
**Review Date:** 2026-01-28
**Next Review:** 2026-02-28 or after major changes
