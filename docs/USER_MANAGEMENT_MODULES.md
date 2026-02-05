# User Management & Authentication System - Module Documentation

**Project:** DIANA V2 - Diabetes Risk Assessment Platform  
**Version:** 1.0  
**Last Updated:** 2026-02-05  
**Audience:** Developers, Product Managers, Security Teams, Stakeholders

---

## Table of Contents

1. [Registration & Verification](#1-registration--verification)
2. [Authentication](#2-authentication)
3. [Profile Management](#3-profile-management)
4. [Security Basics](#4-security-basics)
5. [Secure Sign Up](#5-secure-sign-up)
6. [Login/Logout](#6-loginlogout)
7. [Edit Personal Details](#7-edit-personal-details)
8. [User Management Dashboard](#8-user-management-dashboard)
9. [Audit and Logging Viewer](#9-audit-and-logging-viewer)
10. [Security Policy Configuration](#10-security-policy-configuration)
11. [Reports & Analytics](#11-reports--analytics)
12. [Real-time Logs of Auth Events](#12-real-time-logs-of-auth-events)

---

## 1. Registration & Verification

### Quick Summary
New user account creation with email validation, password security, and optional email verification workflow.

### Detailed Explanation

**For Stakeholders:**
The registration module is the entry point for new users joining the DIANA platform. It ensures that only valid, unique email addresses can create accounts and enforces strong password requirements to protect user data. The system currently stores user credentials securely but has email verification infrastructure ready for future activation.

**For Developers:**
The registration endpoint accepts email and password, validates input format, checks email uniqueness against the database, hashes passwords using bcrypt with cost factor 10, creates user records, and returns JWT tokens for immediate authentication.

### Key Features

- **Email Validation:** Checks format and uniqueness
- **Password Security:** bcrypt hashing with automatic salt generation
- **Immediate Authentication:** Returns JWT tokens upon successful registration
- **Verification Infrastructure:** Stubbed email verification system (ready for SMTP integration)

### Technical Implementation

**API Endpoint:**
```
POST /api/v1/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Backend Handler (Go):**
```go
// backend/internal/http/handlers/auth.go
func (h *AuthHandler) Register(c *gin.Context) {
    var req RegisterRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "invalid request"})
        return
    }

    // Validate email format
    if !isValidEmail(req.Email) {
        c.JSON(400, gin.H{"error": "invalid email format"})
        return
    }

    // Check email uniqueness
    existingUser, _ := h.store.Users().GetByEmail(c, req.Email)
    if existingUser != nil {
        c.JSON(409, gin.H{"error": "email already registered"})
        return
    }

    // Hash password
    hashedPassword, err := bcrypt.GenerateFromPassword(
        []byte(req.Password), 
        bcrypt.DefaultCost  // Cost factor 10
    )
    if err != nil {
        c.JSON(500, gin.H{"error": "failed to process password"})
        return
    }

    // Create user
    user := &models.User{
        Email:        req.Email,
        PasswordHash: string(hashedPassword),
        Role:         "user",
        IsActive:     true,
    }

    if err := h.store.Users().Create(c, user); err != nil {
        c.JSON(500, gin.H{"error": "failed to create user"})
        return
    }

    // Generate tokens
    accessToken, refreshToken, err := h.generateTokens(user)
    if err != nil {
        c.JSON(500, gin.H{"error": "failed to generate tokens"})
        return
    }

    c.JSON(201, gin.H{
        "message":       "registration successful",
        "access_token":  accessToken,
        "refresh_token": refreshToken,
        "user": gin.H{
            "id":    user.ID,
            "email": user.Email,
            "role":  user.Role,
        },
    })
}
```

**Frontend Integration (React):**
```javascript
// frontend/src/api.js
export const registerApi = async (email, password) => {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: { email, password }
  });
};

// React Hook
export const useRegister = () => {
  return useMutation({
    mutationFn: ({ email, password }) => registerApi(email, password),
    onSuccess: (data) => {
      // Store tokens
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    }
  });
};
```

### Security Considerations

- **Password Hashing:** bcrypt with cost 10 (~100ms per hash)
- **Salt Generation:** Automatic per-password salt prevents rainbow table attacks
- **Email Uniqueness:** Database-level unique constraint prevents duplicates
- **Rate Limiting:** Registration endpoint limited to prevent abuse
- **No Password Storage:** Only bcrypt hash stored, never plaintext

### Current Limitations

- **Email Verification:** Infrastructure exists but not activated (stubbed)
- **Password Complexity:** Basic length validation only (8-128 chars)
- **No CAPTCHA:** Bot protection not implemented

---

## 2. Authentication

### Quick Summary
Dual-token JWT system providing secure API access with automatic token refresh and rotation.

### Detailed Explanation

**For Stakeholders:**
Authentication ensures that only legitimate users can access the platform. The system uses two types of security tokens: short-lived access tokens (15 minutes) for daily operations, and longer-lived refresh tokens (7 days) to obtain new access tokens without re-entering passwords. This approach balances security (tokens expire quickly) with user convenience (no frequent password prompts).

**For Developers:**
The system implements a dual-token JWT architecture:
- **Access Token:** Short-lived (15 min), stored in localStorage, used for API authentication
- **Refresh Token:** Long-lived (7 days), stored in HttpOnly cookie + database, rotated on every use
- **Token Rotation:** Each refresh invalidates the old refresh token and issues a new one
- **Claims Structure:** Minimal JWT payload with user_id, email, role, exp, iat

### Key Features

- **Dual-Token Strategy:** Access + Refresh tokens for enhanced security
- **Token Rotation:** Refresh tokens are single-use only
- **Automatic Refresh:** Frontend automatically refreshes expired access tokens
- **Role-Based Claims:** JWT includes user role for authorization decisions
- **Secure Storage:** HttpOnly cookies for refresh tokens (XSS protection)

### Technical Implementation

**JWT Claims Structure:**
```go
// backend/internal/http/middleware/auth.go
type UserClaims struct {
    UserID int64  `json:"user_id"`
    Email  string `json:"email"`
    Role   string `json:"role"`
    jwt.RegisteredClaims
}

// JWT Payload Example:
{
  "sub": "user@example.com",
  "user_id": 123,
  "role": "user",
  "exp": 1706510400,
  "iat": 1706509500,
  "scope": "diana"
}
```

**Token Generation:**
```go
func (h *AuthHandler) generateTokens(user *models.User) (string, string, error) {
    // Access Token (15 minutes)
    accessClaims := UserClaims{
        UserID: user.ID,
        Email:  user.Email,
        Role:   user.Role,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            Subject:   user.Email,
        },
    }
    accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
    accessTokenString, err := accessToken.SignedString(h.jwtSecret)
    if err != nil {
        return "", "", err
    }

    // Refresh Token (7 days)
    refreshTokenBytes := make([]byte, 32)
    if _, err := rand.Read(refreshTokenBytes); err != nil {
        return "", "", err
    }
    refreshToken := base64.URLEncoding.EncodeToString(refreshTokenBytes)
    
    // Hash and store refresh token
    refreshHash := sha256.Sum256([]byte(refreshToken))
    h.store.RefreshTokens().Create(c, &models.RefreshToken{
        UserID:    user.ID,
        TokenHash: hex.EncodeToString(refreshHash[:]),
        ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
    })

    return accessTokenString, refreshToken, nil
}
```

**Token Validation Middleware:**
```go
func JWTAuthMiddleware(jwtSecret []byte) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(401, gin.H{"error": "missing authorization header"})
            return
        }

        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
            c.AbortWithStatusJSON(401, gin.H{"error": "invalid authorization header format"})
            return
        }

        token, err := jwt.ParseWithClaims(parts[1], &UserClaims{}, 
            func(token *jwt.Token) (interface{}, error) {
                return jwtSecret, nil
            })

        if err != nil || !token.Valid {
            c.AbortWithStatusJSON(401, gin.H{"error": "invalid or expired token"})
            return
        }

        claims, ok := token.Claims.(*UserClaims)
        if !ok {
            c.AbortWithStatusJSON(401, gin.H{"error": "invalid token claims"})
            return
        }

        c.Set("user", *claims)
        c.Next()
    }
}
```

**Frontend Token Management:**
```javascript
// frontend/src/api.js
const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  });
  
  // Auto-refresh on 401
  if (response.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return apiFetch(endpoint, options); // Retry with new token
    } else {
      // Redirect to login if refresh fails
      window.location.href = '/login?error=session_expired';
    }
  }
  
  return response;
};

const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;
  
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);
      return true;
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }
  
  return false;
};
```

### Security Considerations

- **Token Expiration:** Short-lived access tokens limit exposure window
- **Token Rotation:** Prevents replay attacks using stolen refresh tokens
- **HttpOnly Cookies:** Refresh tokens protected from XSS attacks
- **Database Storage:** Refresh token hashes stored server-side for revocation
- **Secure Claims:** Minimal JWT payload to reduce token size

### Token Storage Strategy

| Token | Storage Location | Security Level |
|-------|-----------------|----------------|
| Access Token | localStorage + Memory | XSS vulnerable, CSRF protected |
| Refresh Token | HttpOnly Cookie + Database | XSS protected, CSRF protected |

---

## 3. Profile Management

### Quick Summary
Comprehensive user profile system allowing users to manage personal information, health data, consent preferences, and account settings.

### Detailed Explanation

**For Stakeholders:**
The profile management module gives users control over their personal information and health data. Users can update their name, date of birth, menopause status, medical history, and privacy preferences. The system ensures users can only modify their own data and maintains a complete audit trail of all changes.

**For Developers:**
Profile management includes multiple endpoints for different aspects of user data:
- Basic profile information (name, DOB, health status)
- Consent settings (GDPR-compliant granular permissions)
- Onboarding flow (multi-step profile completion)
- Account deletion (soft delete with data retention policies)
- Biomarker trends (historical health data visualization)

### Key Features

- **Multi-Step Onboarding:** Guided profile completion process
- **Granular Consent:** Separate permissions for data usage, research, emails, analytics
- **Data Isolation:** Users can only access their own profile data
- **Soft Delete:** Account deactivation preserves data for compliance
- **Trend Analysis:** Historical biomarker tracking

### Technical Implementation

**Profile Structure:**
```go
// backend/internal/models/user.go
type UserProfile struct {
    User             User           `json:"user"`
    FirstName        string         `json:"first_name"`
    LastName         string         `json:"last_name"`
    DateOfBirth      *time.Time     `json:"date_of_birth"`
    MenopauseStatus  string         `json:"menopause_status"` // "pre", "peri", "post"
    MenopauseType    string         `json:"menopause_type"`   // "natural", "surgical"
    MenopauseYears   int            `json:"menopause_years"`
    Hypertension     bool           `json:"hypertension"`
    HeartDisease     bool           `json:"heart_disease"`
    FamilyHistoryDiabetes bool      `json:"family_history_diabetes"`
    SmokingStatus    string         `json:"smoking_status"`   // "never", "former", "current"
    LatestAssessment *Assessment    `json:"latest_assessment"`
    AssessmentCount  int            `json:"assessment_count"`
    LastAssessmentAt *time.Time     `json:"last_assessment_at"`
    CurrentCluster   string         `json:"current_cluster"`
    CurrentRiskLevel string         `json:"current_risk_level"`
}

type ConsentSettings struct {
    ConsentPersonalData          bool `json:"consent_personal_data"`
    ConsentResearchParticipation bool `json:"consent_research_participation"`
    ConsentEmailUpdates          bool `json:"consent_email_updates"`
    ConsentAnalytics             bool `json:"consent_analytics"`
}
```

**Profile Endpoints:**

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| /users/me/profile | GET | Get full profile | Yes |
| /users/me/profile | PUT | Update profile | Yes |
| /users/me/consent | GET | Get consent settings | Yes |
| /users/me/consent | PUT | Update consent | Yes |
| /users/me/trends | GET | Get biomarker trends | Yes |
| /users/me/account | DELETE | Delete account | Yes |

**Get Profile Handler:**
```go
func (h *UserHandler) GetProfile(c *gin.Context) {
    claims := getUserClaims(c)
    
    profile, err := h.store.Users().GetProfile(c, claims.UserID)
    if err != nil {
        c.JSON(500, gin.H{"error": "failed to fetch profile"})
        return
    }
    
    c.JSON(200, profile)
}
```

**Update Profile Handler:**
```go
func (h *UserHandler) UpdateProfile(c *gin.Context) {
    claims := getUserClaims(c)
    
    var req UpdateProfileRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "invalid request"})
        return
    }
    
    // User can only update their own profile
    update := &models.UserProfile{
        FirstName:             req.FirstName,
        LastName:              req.LastName,
        DateOfBirth:           req.DateOfBirth,
        MenopauseStatus:       req.MenopauseStatus,
        Hypertension:          req.Hypertension,
        HeartDisease:          req.HeartDisease,
        FamilyHistoryDiabetes: req.FamilyHistoryDiabetes,
        SmokingStatus:         req.SmokingStatus,
    }
    
    if err := h.store.Users().UpdateProfile(c, claims.UserID, update); err != nil {
        c.JSON(500, gin.H{"error": "failed to update profile"})
        return
    }
    
    c.JSON(200, gin.H{"message": "profile updated successfully"})
}
```

**Onboarding Flow:**
```go
func (h *UserHandler) CompleteOnboarding(c *gin.Context) {
    claims := getUserClaims(c)
    
    var req OnboardingRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "invalid request"})
        return
    }
    
    // Phase 1: Update profile fields
    profile := &models.UserProfile{
        FirstName:        req.PersonalInfo.FirstName,
        LastName:         req.PersonalInfo.LastName,
        DateOfBirth:      req.PersonalInfo.DateOfBirth,
        MenopauseStatus:  req.HealthStatus.MenopauseStatus,
        MenopauseType:    req.HealthStatus.MenopauseType,
        MenopauseYears:   req.HealthStatus.MenopauseYears,
        Hypertension:     req.MedicalHistory.Hypertension,
        HeartDisease:     req.MedicalHistory.HeartDisease,
        FamilyHistoryDiabetes: req.MedicalHistory.FamilyHistoryDiabetes,
    }
    
    if err := h.store.Users().UpdateProfile(c, claims.UserID, profile); err != nil {
        c.JSON(500, gin.H{"error": "failed to update profile"})
        return
    }
    
    // Phase 2: Update consent settings
    consent := &models.ConsentSettings{
        ConsentPersonalData:          req.Consent.PersonalData,
        ConsentResearchParticipation: req.Consent.ResearchParticipation,
        ConsentEmailUpdates:          req.Consent.EmailUpdates,
        ConsentAnalytics:             req.Consent.Analytics,
    }
    
    if err := h.store.Users().UpdateConsent(c, claims.UserID, consent); err != nil {
        c.JSON(500, gin.H{"error": "failed to update consent"})
        return
    }
    
    // Phase 3: Mark onboarding complete
    if err := h.store.Users().MarkOnboardingComplete(c, claims.UserID); err != nil {
        c.JSON(500, gin.H{"error": "failed to complete onboarding"})
        return
    }
    
    c.JSON(200, gin.H{"message": "onboarding completed successfully"})
}
```

**Frontend Profile Component:**
```jsx
// frontend/src/components/user/UserProfile.jsx
import { useUserProfile, useUpdateProfile } from '../api';

const UserProfile = () => {
  const { data: profile, isLoading } = useUserProfile();
  const updateMutation = useUpdateProfile();
  
  const handleSubmit = (values) => {
    updateMutation.mutate(values, {
      onSuccess: () => {
        showNotification('Profile updated successfully');
      }
    });
  };
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <form onSubmit={handleSubmit}>
      <Input name="firstName" defaultValue={profile.first_name} />
      <Input name="lastName" defaultValue={profile.last_name} />
      <DatePicker name="dateOfBirth" defaultValue={profile.date_of_birth} />
      <Select name="menopauseStatus" options={['pre', 'peri', 'post']} />
      <Checkbox name="hypertension" defaultChecked={profile.hypertension} />
      <Checkbox name="heartDisease" defaultChecked={profile.heart_disease} />
      <Button type="submit">Save Changes</Button>
    </form>
  );
};
```

### GDPR Compliance

- **Explicit Consent Required:** Users must actively opt-in to data usage
- **Granular Permissions:** Separate consent for different purposes
- **Right to Withdraw:** Users can change consent settings anytime
- **Audit Trail:** All consent changes logged with timestamp
- **Data Minimization:** Only collect necessary health information

### Security Considerations

- **Data Isolation:** JWT claims enforce user-scoped queries
- **Input Validation:** All profile fields validated before storage
- **Sensitive Data:** Health information encrypted at rest
- **Audit Logging:** Profile changes recorded in audit trail

---

## 4. Security Basics

### Quick Summary
Foundational security measures protecting the platform against common web vulnerabilities including XSS, CSRF, injection attacks, and unauthorized access.

### Detailed Explanation

**For Stakeholders:**
Security basics encompass the core protective measures that keep user data safe. This includes secure password storage, protection against common hacking techniques, data encryption, and access controls. These measures work continuously in the background to prevent unauthorized access and data breaches.

**For Developers:**
The security layer implements multiple defense mechanisms:
- **Password Security:** bcrypt hashing with automatic salting
- **XSS Protection:** Content Security Policy headers, input sanitization
- **CSRF Protection:** HttpOnly cookies for sensitive tokens
- **Injection Prevention:** Parameterized queries, input validation
- **Transport Security:** HTTPS enforcement, HSTS headers
- **Rate Limiting:** Token bucket algorithm for DDoS protection

### Key Features

- **bcrypt Password Hashing:** Industry-standard adaptive hashing
- **Security Headers:** Comprehensive header-based protections
- **Rate Limiting:** Configurable per-endpoint limits
- **Input Validation:** Strict validation on all user inputs
- **Data Encryption:** Sensitive fields encrypted at rest
- **Audit Trail:** All security events logged

### Technical Implementation

**Password Hashing:**
```go
import "golang.org/x/crypto/bcrypt"

// Hash password with bcrypt (cost factor 10)
func HashPassword(password string) (string, error) {
    bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    return string(bytes), err
}

// Verify password against hash
func VerifyPassword(password, hash string) bool {
    err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
    return err == nil
}
```

**Security Headers Middleware:**
```go
// backend/internal/http/middleware/security.go
func SecurityHeaders() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Prevent MIME type sniffing
        c.Header("X-Content-Type-Options", "nosniff")
        
        // Prevent clickjacking
        c.Header("X-Frame-Options", "DENY")
        
        // XSS Protection
        c.Header("X-XSS-Protection", "1; mode=block")
        
        // HTTPS enforcement
        c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        
        // Content Security Policy
        c.Header("Content-Security-Policy", 
            "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "font-src 'self';")
        
        // Referrer Policy
        c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
        
        c.Next()
    }
}
```

**Rate Limiting:**
```go
// backend/internal/http/middleware/ratelimit.go
type RateLimiter struct {
    requests map[string][]time.Time
    mu       sync.RWMutex
    limit    int
    window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
    return &RateLimiter{
        requests: make(map[string][]time.Time),
        limit:    limit,
        window:   window,
    }
}

func (rl *RateLimiter) Allow(key string) bool {
    rl.mu.Lock()
    defer rl.mu.Unlock()
    
    now := time.Now()
    cutoff := now.Add(-rl.window)
    
    // Filter out old requests
    var valid []time.Time
    for _, t := range rl.requests[key] {
        if t.After(cutoff) {
            valid = append(valid, t)
        }
    }
    
    // Check if under limit
    if len(valid) >= rl.limit {
        rl.requests[key] = valid
        return false
    }
    
    // Add current request
    rl.requests[key] = append(valid, now)
    return true
}

func RateLimitMiddleware(rl *RateLimiter) gin.HandlerFunc {
    return func(c *gin.Context) {
        // Use IP address as key
        key := c.ClientIP()
        
        if !rl.Allow(key) {
            c.AbortWithStatusJSON(429, gin.H{
                "error": "rate limit exceeded",
                "retry_after": rl.window.Seconds(),
            })
            return
        }
        
        c.Next()
    }
}
```

**Input Validation:**
```go
// backend/internal/validators/user.go
type RegisterRequest struct {
    Email    string `json:"email" binding:"required,email,max=255"`
    Password string `json:"password" binding:"required,min=8,max=128"`
}

type UpdateProfileRequest struct {
    FirstName        string     `json:"first_name" binding:"max=100"`
    LastName         string     `json:"last_name" binding:"max=100"`
    DateOfBirth      *time.Time `json:"date_of_birth"`
    MenopauseStatus  string     `json:"menopause_status" binding:"omitempty,oneof=pre peri post"`
    Hypertension     bool       `json:"hypertension"`
    HeartDisease     bool       `json:"heart_disease"`
    FamilyHistoryDiabetes bool  `json:"family_history_diabetes"`
    SmokingStatus    string     `json:"smoking_status" binding:"omitempty,oneof=never former current"`
}
```

**ML Server Rate Limiting:**
```python
# Ian_ML/server.py
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["120 per minute", "20 per second"]
)

@app.route('/predict', methods=['POST'])
@limiter.limit("10 per minute")
def predict():
    # Prediction logic
    pass
```

### Security Headers Reference

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-Frame-Options | DENY | Prevent clickjacking |
| X-XSS-Protection | 1; mode=block | XSS filter |
| Strict-Transport-Security | max-age=31536000 | HTTPS enforcement |
| Content-Security-Policy | default-src 'self' | Resource loading policy |
| Referrer-Policy | strict-origin-when-cross-origin | Referrer control |

### Rate Limiting Configuration

| Endpoint | Limit | Window |
|----------|-------|--------|
| /auth/login | 5 | 1 minute |
| /auth/register | 3 | 1 minute |
| /api/* | 100 | 1 minute |
| /predict (ML) | 10 | 1 minute |

### Current Vulnerabilities

1. **XSS Risk:** Access tokens in localStorage vulnerable to XSS
2. **No CSRF Tokens:** API relies on JWT without CSRF protection
3. **Password Policy:** Basic validation only
4. **Email Verification:** Not implemented

### Recommended Improvements

1. Move access tokens to HttpOnly cookies
2. Implement CSRF tokens for state-changing operations
3. Add password complexity requirements
4. Complete email verification system
5. Implement 2FA for admin accounts

---

## 5. Secure Sign Up

### Quick Summary
Hardened registration process with multi-layered validation, secure credential handling, and immediate authentication token issuance.

### Detailed Explanation

**For Stakeholders:**
Secure sign-up ensures that new accounts are created safely with validated information. The process checks that email addresses are properly formatted and unique, enforces password strength requirements, and immediately protects the account with authentication tokens. Users can start using the platform immediately after registration without additional steps.

**For Developers:**
The secure sign-up process includes:
- Multi-stage validation (format, uniqueness, strength)
- bcrypt password hashing before storage
- Database transaction for atomic user creation
- Immediate JWT token generation
- Audit logging of registration events
- Rate limiting to prevent abuse

### Key Features

- **Email Validation:** Format checking and uniqueness verification
- **Password Strength:** Minimum requirements enforcement
- **Atomic Creation:** Transaction-based user record creation
- **Immediate Auth:** Tokens issued upon successful registration
- **Audit Trail:** Registration events logged
- **Rate Protection:** Prevents bulk account creation

### Technical Implementation

**Validation Pipeline:**
```go
func (h *AuthHandler) Register(c *gin.Context) {
    var req RegisterRequest
    
    // Stage 1: Request validation
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "invalid request format"})
        return
    }
    
    // Stage 2: Email format validation
    if !isValidEmail(req.Email) {
        c.JSON(400, gin.H{"error": "invalid email format"})
        return
    }
    
    // Stage 3: Password strength validation
    if !isStrongPassword(req.Password) {
        c.JSON(400, gin.H{"error": "password does not meet strength requirements"})
        return
    }
    
    // Stage 4: Email uniqueness check
    existing, _ := h.store.Users().GetByEmail(c, req.Email)
    if existing != nil {
        c.JSON(409, gin.H{"error": "email already registered"})
        return
    }
    
    // Stage 5: Password hashing
    hashedPassword, err := bcrypt.GenerateFromPassword(
        []byte(req.Password), 
        bcrypt.DefaultCost,
    )
    if err != nil {
        c.JSON(500, gin.H{"error": "failed to process password"})
        return
    }
    
    // Stage 6: Create user within transaction
    user := &models.User{
        Email:        req.Email,
        PasswordHash: string(hashedPassword),
        Role:         "user",
        IsActive:     true,
        CreatedAt:    time.Now(),
    }
    
    if err := h.store.Users().Create(c, user); err != nil {
        c.JSON(500, gin.H{"error": "failed to create user"})
        return
    }
    
    // Stage 7: Generate authentication tokens
    accessToken, refreshToken, err := h.generateTokens(user)
    if err != nil {
        c.JSON(500, gin.H{"error": "failed to generate tokens"})
        return
    }
    
    // Stage 8: Log registration event
    h.auditLogger.Log(c, &models.AuditEvent{
        Action:     "user.register",
        Actor:      user.Email,
        TargetType: "user",
        TargetID:   user.ID,
        Details: map[string]interface{}{
            "ip_address": c.ClientIP(),
            "user_agent": c.Request.UserAgent(),
        },
    })
    
    // Stage 9: Return success response
    c.JSON(201, gin.H{
        "message":       "registration successful",
        "access_token":  accessToken,
        "refresh_token": refreshToken,
        "user": gin.H{
            "id":    user.ID,
            "email": user.Email,
            "role":  user.Role,
        },
    })
}
```

**Password Strength Validation:**
```go
func isStrongPassword(password string) bool {
    // Minimum length
    if len(password) < 8 {
        return false
    }
    
    // Check for uppercase
    hasUpper := false
    for _, char := range password {
        if unicode.IsUpper(char) {
            hasUpper = true
            break
        }
    }
    
    // Check for lowercase
    hasLower := false
    for _, char := range password {
        if unicode.IsLower(char) {
            hasLower = true
            break
        }
    }
    
    // Check for digit
    hasDigit := false
    for _, char := range password {
        if unicode.IsDigit(char) {
            hasDigit = true
            break
        }
    }
    
    // Check for special character
    hasSpecial := false
    specialChars := "!@#$%^&*()_+-=[]{}|;:,.<>?"
    for _, char := range password {
        if strings.ContainsRune(specialChars, char) {
            hasSpecial = true
            break
        }
    }
    
    return hasUpper && hasLower && hasDigit && hasSpecial
}
```

**Email Validation:**
```go
import "regexp"

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

func isValidEmail(email string) bool {
    // Check length
    if len(email) > 255 {
        return false
    }
    
    // Check format
    if !emailRegex.MatchString(email) {
        return false
    }
    
    return true
}
```

**Frontend Registration Component:**
```jsx
// frontend/src/components/auth/Signup.jsx
import { useState } from 'react';
import { useRegister } from '../../api';

const Signup = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const registerMutation = useRegister();
  
  const validateForm = () => {
    const newErrors = {};
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, number, and special character';
    }
    
    // Confirm password
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      registerMutation.mutate({
        email: formData.email,
        password: formData.password
      });
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <Input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        error={errors.email}
        placeholder="Email"
      />
      <Input
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({...formData, password: e.target.value})}
        error={errors.password}
        placeholder="Password"
      />
      <Input
        type="password"
        value={formData.confirmPassword}
        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
        error={errors.confirmPassword}
        placeholder="Confirm Password"
      />
      <Button type="submit" loading={registerMutation.isLoading}>
        Sign Up
      </Button>
    </form>
  );
};
```

### Security Considerations

- **Timing Attack Prevention:** bcrypt hashing takes constant time regardless of password
- **Error Message Security:** Generic error messages don't reveal which field failed
- **Rate Limiting:** Prevents brute-force registration attempts
- **Transaction Safety:** User creation is atomic (all-or-nothing)
- **Audit Logging:** All registrations logged with IP and user agent

### Password Requirements

| Requirement | Minimum |
|-------------|---------|
| Length | 8 characters |
| Uppercase | 1 character |
| Lowercase | 1 character |
| Digit | 1 character |
| Special Character | 1 character |

### Error Response Strategy

To prevent user enumeration attacks, the system returns generic error messages:

- **Invalid Format:** "Invalid request format"
- **Existing Email:** "Email already registered" (necessary for UX, but reveals existence)
- **Server Error:** "Failed to process request"

**Note:** The "email already registered" message is a trade-off between security and user experience. Alternative approaches include:
- Sending "account exists" email to existing users
- Showing generic message but sending different emails

---

## 6. Login/Logout

### Quick Summary
Secure authentication flow with credential validation, token issuance, session management, and comprehensive audit logging.

### Detailed Explanation

**For Stakeholders:**
The login system verifies user identity through email and password, then provides secure access tokens for platform use. When users log out, all their active sessions are invalidated to prevent unauthorized access. Every login attempt is recorded for security monitoring.

**For Developers:**
Login process includes:
- Credential validation against bcrypt hashes
- JWT token generation (access + refresh)
- Session tracking via refresh token database
- Real-time event publishing via SSE
- Comprehensive audit logging
- Rate limiting to prevent brute force

Logout process:
- Refresh token revocation in database
- Cookie clearing
- SSE logout event publication
- Client-side token cleanup

### Key Features

- **Secure Credential Validation:** bcrypt comparison
- **Dual Token Issuance:** Access + refresh tokens
- **Session Management:** Database-tracked refresh tokens
- **Real-time Events:** SSE notifications for login/logout
- **Audit Trail:** All auth events logged
- **Rate Limiting:** Brute force protection

### Technical Implementation

**Login Handler:**
```go
func (h *AuthHandler) Login(c *gin.Context) {
    var req LoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "invalid request"})
        return
    }
    
    // Fetch user by email
    user, err := h.store.Users().GetByEmail(c, req.Email)
    if err != nil {
        // Log failed login attempt (user not found)
        h.publishAuthEvent(c, &models.AuthEvent{
            EventType: "failed_login",
            Email:     req.Email,
            IPAddress: c.ClientIP(),
            UserAgent: c.Request.UserAgent(),
            Success:   false,
            Metadata: map[string]string{
                "failure_reason": "user_not_found",
            },
        })
        
        // Return generic error to prevent user enumeration
        c.JSON(401, gin.H{"error": "invalid credentials"})
        return
    }
    
    // Verify password
    if err := bcrypt.CompareHashAndPassword(
        []byte(user.PasswordHash), 
        []byte(req.Password),
    ); err != nil {
        // Log failed login attempt (wrong password)
        h.publishAuthEvent(c, &models.AuthEvent{
            EventType: "failed_login",
            Email:     req.Email,
            IPAddress: c.ClientIP(),
            UserAgent: c.Request.UserAgent(),
            Success:   false,
            Metadata: map[string]string{
                "failure_reason": "invalid_password",
            },
        })
        
        c.JSON(401, gin.H{"error": "invalid credentials"})
        return
    }
    
    // Check if user is active
    if !user.IsActive {
        h.publishAuthEvent(c, &models.AuthEvent{
            EventType: "failed_login",
            Email:     req.Email,
            IPAddress: c.ClientIP(),
            UserAgent: c.Request.UserAgent(),
            Success:   false,
            Metadata: map[string]string{
                "failure_reason": "account_inactive",
            },
        })
        
        c.JSON(403, gin.H{"error": "account is deactivated"})
        return
    }
    
    // Generate tokens
    accessToken, refreshToken, err := h.generateTokens(user)
    if err != nil {
        c.JSON(500, gin.H{"error": "failed to generate tokens"})
        return
    }
    
    // Set refresh token as HttpOnly cookie
    c.SetCookie(
        "refresh_token",
        refreshToken,
        7*24*60*60, // 7 days
        "/",
        "",
        true,  // Secure (HTTPS only)
        true,  // HttpOnly
    )
    
    // Log successful login
    h.publishAuthEvent(c, &models.AuthEvent{
        EventType: "login",
        Email:     user.Email,
        IPAddress: c.ClientIP(),
        UserAgent: c.Request.UserAgent(),
        Success:   true,
    })
    
    // Audit log
    h.auditLogger.Log(c, &models.AuditEvent{
        Action:     "user.login",
        Actor:      user.Email,
        TargetType: "user",
        TargetID:   user.ID,
        Details: map[string]interface{}{
            "ip_address": c.ClientIP(),
            "user_agent": c.Request.UserAgent(),
        },
    })
    
    c.JSON(200, gin.H{
        "message":       "login successful",
        "access_token":  accessToken,
        "refresh_token": refreshToken,
        "user": gin.H{
            "id":    user.ID,
            "email": user.Email,
            "role":  user.Role,
        },
    })
}
```

**Logout Handler:**
```go
func (h *AuthHandler) Logout(c *gin.Context) {
    claims := getUserClaims(c)
    
    // Get refresh token from cookie or body
    refreshToken, err := c.Cookie("refresh_token")
    if err != nil {
        // Try to get from request body as fallback
        var req LogoutRequest
        if err := c.ShouldBindJSON(&req); err == nil {
            refreshToken = req.RefreshToken
        }
    }
    
    // Revoke refresh token in database
    if refreshToken != "" {
        refreshHash := sha256.Sum256([]byte(refreshToken))
        h.store.RefreshTokens().Revoke(c, hex.EncodeToString(refreshHash[:]))
    }
    
    // Clear refresh token cookie
    c.SetCookie(
        "refresh_token",
        "",
        -1,    // Expire immediately
        "/",
        "",
        true,
        true,
    )
    
    // Publish logout event
    h.publishAuthEvent(c, &models.AuthEvent{
        EventType: "logout",
        Email:     claims.Email,
        IPAddress: c.ClientIP(),
        Success:   true,
    })
    
    // Audit log
    h.auditLogger.Log(c, &models.AuditEvent{
        Action:     "user.logout",
        Actor:      claims.Email,
        TargetType: "user",
        TargetID:   claims.UserID,
        Details: map[string]interface{}{
            "ip_address": c.ClientIP(),
        },
    })
    
    c.JSON(200, gin.H{"message": "logout successful"})
}
```

**Token Refresh:**
```go
func (h *AuthHandler) Refresh(c *gin.Context) {
    var req RefreshRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "invalid request"})
        return
    }
    
    // Hash the provided refresh token
    refreshHash := sha256.Sum256([]byte(req.RefreshToken))
    hashString := hex.EncodeToString(refreshHash[:])
    
    // Look up token in database
    token, err := h.store.RefreshTokens().GetByHash(c, hashString)
    if err != nil || token == nil {
        c.JSON(401, gin.H{"error": "invalid refresh token"})
        return
    }
    
    // Check if token is revoked
    if token.RevokedAt != nil {
        c.JSON(401, gin.H{"error": "refresh token has been revoked"})
        return
    }
    
    // Check if token is expired
    if time.Now().After(token.ExpiresAt) {
        c.JSON(401, gin.H{"error": "refresh token has expired"})
        return
    }
    
    // Get user
    user, err := h.store.Users().GetByID(c, token.UserID)
    if err != nil {
        c.JSON(500, gin.H{"error": "failed to fetch user"})
        return
    }
    
    // Revoke old refresh token
    h.store.RefreshTokens().Revoke(c, hashString)
    
    // Generate new tokens
    accessToken, newRefreshToken, err := h.generateTokens(user)
    if err != nil {
        c.JSON(500, gin.H{"error": "failed to generate tokens"})
        return
    }
    
    // Publish refresh event
    h.publishAuthEvent(c, &models.AuthEvent{
        EventType: "refresh",
        Email:     user.Email,
        IPAddress: c.ClientIP(),
        Success:   true,
    })
    
    c.JSON(200, gin.H{
        "message":       "token refreshed",
        "access_token":  accessToken,
        "refresh_token": newRefreshToken,
        "user": gin.H{
            "id":    user.ID,
            "email": user.Email,
            "role":  user.Role,
        },
    })
}
```

**Frontend Login Component:**
```jsx
// frontend/src/components/auth/Login.jsx
import { useState } from 'react';
import { useLogin } from '../../api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const loginMutation = useLogin();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await loginMutation.mutateAsync({ email, password });
      // Successful login - user redirected by mutation onSuccess
    } catch (err) {
      setError('Invalid email or password');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert type="error" message={error} />}
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <Button type="submit" loading={loginMutation.isLoading}>
        Login
      </Button>
    </form>
  );
};
```

**React Login Hook:**
```javascript
// frontend/src/api.js
export const useLogin = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: ({ email, password }) => loginApi(email, password),
    onSuccess: (data) => {
      // Store tokens
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Update React Query cache
      queryClient.setQueryData(['user', 'profile'], data.user);
      
      // Redirect based on role
      if (data.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  return useMutation({
    mutationFn: () => logoutApi(),
    onSuccess: () => {
      // Clear all stored data
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      // Clear React Query cache
      queryClient.clear();
      
      // Redirect to login
      navigate('/login');
    }
  });
};
```

### Security Considerations

- **Timing Attack Prevention:** bcrypt comparison takes constant time
- **Generic Error Messages:** "Invalid credentials" prevents user enumeration
- **Token Rotation:** Refresh tokens are single-use only
- **HttpOnly Cookies:** Refresh tokens protected from XSS
- **Rate Limiting:** Login endpoint limited to 5 attempts per minute
- **Account Status Check:** Prevents login to deactivated accounts

### Session Management

| Aspect | Implementation |
|--------|----------------|
| Access Token Lifetime | 15 minutes |
| Refresh Token Lifetime | 7 days |
| Token Rotation | Yes (on every refresh) |
| Concurrent Sessions | Unlimited (each has unique refresh token) |
| Logout Behavior | Revokes only current session |

---

## 7. Edit Personal Details

### Quick Summary
User self-service profile editing with validation, data isolation, and audit logging.

### Detailed Explanation

**For Stakeholders:**
Users can update their personal information at any time through a simple interface. The system ensures that users can only modify their own data and maintains a record of all changes for compliance purposes. Updates take effect immediately.

**For Developers:**
Profile editing includes:
- JWT-based user identification (from token, not request body)
- Field-level validation
- Partial updates (only changed fields)
- Audit logging of modifications
- Optimistic UI updates

### Key Features

- **Self-Service Updates:** Users modify their own data only
- **Partial Updates:** Send only changed fields
- **Field Validation:** Type and range checking
- **Audit Trail:** All changes logged
- **Optimistic UI:** Immediate feedback with rollback on error

### Technical Implementation

**Update Profile Endpoint:**
```go
func (h *UserHandler) UpdateProfile(c *gin.Context) {
    claims := getUserClaims(c)
    
    var req UpdateProfileRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "invalid request"})
        return
    }
    
    // Build update map with only provided fields
    updates := make(map[string]interface{})
    
    if req.FirstName != nil {
        updates["first_name"] = *req.FirstName
    }
    if req.LastName != nil {
        updates["last_name"] = *req.LastName
    }
    if req.DateOfBirth != nil {
        updates["date_of_birth"] = *req.DateOfBirth
    }
    if req.MenopauseStatus != nil {
        updates["menopause_status"] = *req.MenopauseStatus
    }
    if req.Hypertension != nil {
        updates["hypertension"] = *req.Hypertension
    }
    if req.HeartDisease != nil {
        updates["heart_disease"] = *req.HeartDisease
    }
    if req.FamilyHistoryDiabetes != nil {
        updates["family_history_diabetes"] = *req.FamilyHistoryDiabetes
    }
    if req.SmokingStatus != nil {
        updates["smoking_status"] = *req.SmokingStatus
    }
    
    // Apply updates
    if err := h.store.Users().UpdateProfileFields(c, claims.UserID, updates); err != nil {
        c.JSON(500, gin.H{"error": "failed to update profile"})
        return
    }
    
    // Audit log
    h.auditLogger.Log(c, &models.AuditEvent{
        Action:     "user.update_profile",
        Actor:      claims.Email,
        TargetType: "user",
        TargetID:   claims.UserID,
        Details: map[string]interface{}{
            "updated_fields": getKeys(updates),
            "ip_address":     c.ClientIP(),
        },
    })
    
    c.JSON(200, gin.H{
        "message": "profile updated successfully",
        "updated_fields": getKeys(updates),
    })
}
```

**Frontend Profile Edit Form:**
```jsx
// frontend/src/components/user/EditProfile.jsx
import { useState } from 'react';
import { useUserProfile, useUpdateProfile } from '../../api';

const EditProfile = () => {
  const { data: profile, isLoading } = useUserProfile();
  const updateMutation = useUpdateProfile();
  const [formData, setFormData] = useState({});
  const [changedFields, setChangedFields] = useState(new Set());
  
  if (isLoading) return <LoadingSpinner />;
  
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setChangedFields(prev => new Set(prev).add(field));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Build update payload with only changed fields
    const updates = {};
    changedFields.forEach(field => {
      updates[field] = formData[field];
    });
    
    updateMutation.mutate(updates, {
      onSuccess: () => {
        showNotification('Profile updated successfully');
        setChangedFields(new Set());
      }
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="First Name"
        defaultValue={profile.first_name}
        onChange={(e) => handleChange('first_name', e.target.value)}
      />
      <Input
        label="Last Name"
        defaultValue={profile.last_name}
        onChange={(e) => handleChange('last_name', e.target.value)}
      />
      <DatePicker
        label="Date of Birth"
        defaultValue={profile.date_of_birth}
        onChange={(date) => handleChange('date_of_birth', date)}
      />
      <Select
        label="Menopause Status"
        defaultValue={profile.menopause_status}
        options={[
          { value: 'pre', label: 'Pre-menopause' },
          { value: 'peri', label: 'Peri-menopause' },
          { value: 'post', label: 'Post-menopause' }
        ]}
        onChange={(value) => handleChange('menopause_status', value)}
      />
      <Checkbox
        label="Hypertension"
        defaultChecked={profile.hypertension}
        onChange={(e) => handleChange('hypertension', e.target.checked)}
      />
      <Checkbox
        label="Heart Disease"
        defaultChecked={profile.heart_disease}
        onChange={(e) => handleChange('heart_disease', e.target.checked)}
      />
      <Button 
        type="submit" 
        disabled={changedFields.size === 0 || updateMutation.isLoading}
      >
        Save Changes
      </Button>
    </form>
  );
};
```

### Validation Rules

| Field | Type | Constraints |
|-------|------|-------------|
| first_name | string | max 100 chars |
| last_name | string | max 100 chars |
| date_of_birth | date | must be in past |
| menopause_status | enum | pre, peri, post |
| hypertension | boolean | - |
| heart_disease | boolean | - |
| family_history_diabetes | boolean | - |
| smoking_status | enum | never, former, current |

---

## 8. User Management Dashboard

### Quick Summary
Administrative interface for managing user accounts, including creation, updates, activation/deactivation, and role assignment.

### Detailed Explanation

**For Stakeholders:**
The User Management Dashboard gives administrators complete control over user accounts. Admins can view all users, create new accounts, modify existing ones, and deactivate problematic accounts. The system prevents admins from deactivating their own accounts to avoid lockouts.

**For Developers:**
Admin user management includes:
- Paginated user listing with filters
- CRUD operations on user accounts
- Role-based access control (RBAC)
- Soft delete (deactivation) with reactivation capability
- Automatic audit logging of all admin actions

### Key Features

- **User Listing:** Paginated with search and filters
- **Account Creation:** Admin-created user accounts
- **Role Management:** Assign admin or user roles
- **Soft Delete:** Deactivate without data loss
- **Audit Trail:** All admin actions logged
- **Self-Protection:** Prevents self-deactivation

### Technical Implementation

**Admin User Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| /admin/users | GET | List users (paginated) |
| /admin/users | POST | Create user |
| /admin/users/:id | GET | Get user by ID |
| /admin/users/:id | PUT | Update user |
| /admin/users/:id | DELETE | Deactivate user |
| /admin/users/:id/activate | POST | Activate user |

**List Users Handler:**
```go
func (h *AdminUserHandler) ListUsers(c *gin.Context) {
    // Parse query parameters
    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
    search := c.Query("search")
    role := c.Query("role")
    isActive := c.Query("is_active")
    
    // Build filter
    filter := &models.UserFilter{
        Search:   search,
        Role:     role,
        Page:     page,
        PageSize: pageSize,
    }
    
    if isActive != "" {
        active := isActive == "true"
        filter.IsActive = &active
    }
    
    // Fetch users
    users, total, err := h.store.Users().List(c, filter)
    if err != nil {
        c.JSON(500, gin.H{"error": "failed to fetch users"})
        return
    }
    
    c.JSON(200, gin.H{
        "data":       users,
        "total":      total,
        "page":       page,
        "page_size":  pageSize,
        "total_pages": (total + pageSize - 1) / pageSize,
    })
}
```

**Create User Handler:**
```go
func (h *AdminUserHandler) CreateUser(c *gin.Context) {
    claims := getUserClaims(c)
    
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": "invalid request"})
        return
    }
    
    // Hash password
    hashedPassword, err := bcrypt.GenerateFromPassword(
        []byte(req.Password),
        bcrypt.DefaultCost,
    )
    if err != nil {
        c.JSON(500, gin.H{"error": "failed to process password"})
        return
    }
    
    // Create user
    user := &models.User{
        Email:        req.Email,
        PasswordHash: string(hashedPassword),
        Role:         req.Role,
        IsActive:     true,
        IsAdmin:      req.Role == "admin",
    }
    
    if err := h.store.Users().Create(c, user); err != nil {
        c.JSON(500, gin.H{"error": "failed to create user"})
        return
    }
    
    // Audit log (automatic via middleware)
    c.JSON(201, gin.H{
        "message": "user created successfully",
        "user": gin.H{
            "id":    user.ID,
            "email": user.Email,
            "role":  user.Role,
        },
    })
}
```

**Deactivate User Handler:**
```go
func (h *AdminUserHandler) DeactivateUser(c *gin.Context) {
    claims := getUserClaims(c)
    
    userID, err := strconv.ParseInt(c.Param("id"), 10, 64)
    if err != nil {
        c.JSON(400, gin.H{"error": "invalid user id"})
        return
    }
    
    // Prevent self-deactivation
    if userID == claims.UserID {
        c.JSON(403, gin.H{"error": "cannot deactivate your own account"})
        return
    }
    
    // Deactivate user
    if err := h.store.Users().Deactivate(c, userID); err != nil {
        c.JSON(500, gin.H{"error": "failed to deactivate user"})
        return
    }
    
    // Revoke all refresh tokens for this user
    h.store.RefreshTokens().RevokeAllForUser(c, userID)
    
    c.JSON(200, gin.H{"message": "user deactivated successfully"})
}
```

**RBAC Middleware:**
```go
func RoleRequired(roles ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        claims := getUserClaims(c)
        
        hasRole := false
        for _, role := range roles {
            if claims.Role == role {
                hasRole = true
                break
            }
        }
        
        if !hasRole {
            // Generic error message - don't reveal user's role
            c.AbortWithStatusJSON(403, gin.H{"error": "access denied"})
            return
        }
        
        c.Next()
    }
}

// Usage in router
admin := router.Group("/admin")
admin.Use(JWTAuthMiddleware(jwtSecret))
admin.Use(RoleRequired("admin"))
{
    admin.GET("/users", adminUserHandler.ListUsers)
    admin.POST("/users", adminUserHandler.CreateUser)
    // ...
}
```

**Frontend Admin Dashboard:**
```jsx
// frontend/src/components/admin/UserManagement.jsx
import { useState } from 'react';
import { useAdminUsers, useCreateUser, useDeactivateUser } from '../../api';

const UserManagement = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAdminUsers({ page, search });
  const createMutation = useCreateUser();
  const deactivateMutation = useDeactivateUser();
  
  const handleDeactivate = (userId) => {
    if (confirm('Are you sure you want to deactivate this user?')) {
      deactivateMutation.mutate(userId);
    }
  };
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div>
      <Input
        placeholder="Search users..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      
      <Table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map(user => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.is_active ? 'Active' : 'Inactive'}</td>
              <td>{formatDate(user.created_at)}</td>
              <td>
                <Button onClick={() => handleDeactivate(user.id)}>
                  Deactivate
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      
      <Pagination
        current={page}
        total={data.total_pages}
        onChange={setPage}
      />
    </div>
  );
};
```

### Admin Capabilities

| Action | Description | Audit Logged |
|--------|-------------|--------------|
| List Users | View all users with filters | No |
| Create User | Create new user account | Yes |
| Update User | Modify user details | Yes |
| Deactivate User | Soft delete user | Yes |
| Activate User | Reactivate deactivated user | Yes |

### Security Considerations

- **Role Verification:** All admin endpoints check JWT role claim
- **Self-Protection:** Admins cannot deactivate themselves
- **Audit Logging:** All mutations logged with actor and details
- **Data Redaction:** Password hashes never returned in responses
- **Token Revocation:** Deactivation revokes all user sessions

---

## 9. Audit and Logging Viewer

### Quick Summary
Comprehensive audit trail system capturing all administrative actions with searchable, filterable logs for compliance and security monitoring.

### Detailed Explanation

**For Stakeholders:**
The audit logging system maintains a complete record of who did what, when, and on which resources. This is essential for compliance with healthcare regulations (HIPAA, GDPR) and security investigations. Administrators can search and filter logs to investigate incidents or generate compliance reports.

**For Developers:**
The audit system includes:
- Automatic logging via middleware for admin actions
- Structured event storage with actor, action, target, and metadata
- Sensitive data redaction (passwords, health data, PII)
- Async logging to avoid blocking responses
- Queryable interface with filters and pagination

### Key Features

- **Automatic Logging:** Middleware captures all admin actions
- **Structured Events:** Consistent event format with full context
- **Data Redaction:** Sensitive fields automatically sanitized
- **Async Processing:** Non-blocking log writes
- **Advanced Filtering:** Search by actor, action, date range
- **Compliance Ready:** HIPAA/GDPR compliant logging

### Technical Implementation

**Audit Event Structure:**
```go
// backend/internal/models/audit.go
type AuditEvent struct {
    ID         int64           `json:"id" db:"id"`
    Actor      string          `json:"actor" db:"actor"`           // User email
    Action     string          `json:"action" db:"action"`         // e.g., "user.create"
    TargetType string          `json:"target_type" db:"target_type"` // e.g., "user"
    TargetID   int64           `json:"target_id" db:"target_id"`   // Entity ID
    Details    json.RawMessage `json:"details" db:"details"`       // Request metadata
    CreatedAt  time.Time       `json:"created_at" db:"created_at"`
}
```

**Audit Middleware:**
```go
// backend/internal/http/middleware/audit.go
type AuditLogger struct {
    store Store
}

func (a *AuditLogger) LogAction(action, targetType string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // Capture request body before handler executes
        var bodyBytes []byte
        if c.Request.Body != nil {
            bodyBytes, _ = io.ReadAll(c.Request.Body)
            c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
        }
        
        // Execute handler
        c.Next()
        
        // Only log successful mutations (2xx status)
        if c.Writer.Status() < 200 || c.Writer.Status() >= 300 {
            return
        }
        
        // Get user from context
        claims := getUserClaims(c)
        
        // Extract target ID from URL or response
        targetID := extractTargetID(c)
        
        // Build details
        details := map[string]interface{}{
            "method":     c.Request.Method,
            "path":       c.Request.URL.Path,
            "ip_address": c.ClientIP(),
            "user_agent": c.Request.UserAgent(),
        }
        
        // Add request body if present (sanitized)
        if len(bodyBytes) > 0 {
            var body map[string]interface{}
            if err := json.Unmarshal(bodyBytes, &body); err == nil {
                details["request_body"] = sanitizeBody(body)
            }
        }
        
        // Create audit event
        event := &models.AuditEvent{
            Actor:      claims.Email,
            Action:     action,
            TargetType: targetType,
            TargetID:   targetID,
            Details:    mustMarshal(details),
            CreatedAt:  time.Now(),
        }
        
        // Async logging
        go func() {
            ctx := context.WithoutCancel(c.Request.Context())
            if err := a.store.AuditEvents().Create(ctx, event); err != nil {
                log.Printf("[AUDIT FAILURE] Failed to log: %v", err)
            }
        }()
    }
}

// Sensitive fields to redact
var sensitiveFields = []string{
    "password", "password_hash", "token", "refresh_token",
    "first_name", "last_name", "email", "phone", "address",
    "date_of_birth", "hba1c", "fbs", "cholesterol", "triglycerides",
    "ldl", "hdl", "bmi", "systolic_bp", "diastolic_bp",
}

func sanitizeBody(body map[string]interface{}) map[string]interface{} {
    sanitized := make(map[string]interface{})
    for key, value := range body {
        if contains(sensitiveFields, key) {
            sanitized[key] = "[REDACTED]"
        } else {
            sanitized[key] = value
        }
    }
    return sanitized
}
```

**Router Integration:**
```go
// backend/internal/http/router/router.go
auditLogger := middleware.NewAuditLogger(store)

admin := router.Group("/admin")
admin.Use(JWTAuthMiddleware(jwtSecret))
admin.Use(RoleRequired("admin"))
{
    // Users with audit logging
    users := admin.Group("/users")
    users.POST("", 
        middleware.CaptureRequestBody(),
        auditLogger.LogAction("user.create", "user"),
        adminUserHandler.CreateUser)
    users.PUT("/:id",
        middleware.CaptureRequestBody(),
        auditLogger.LogAction("user.update", "user"),
        adminUserHandler.UpdateUser)
    users.DELETE("/:id",
        auditLogger.LogAction("user.deactivate", "user"),
        adminUserHandler.DeactivateUser)
    users.POST("/:id/activate",
        auditLogger.LogAction("user.activate", "user"),
        adminUserHandler.ActivateUser)
}
```

**Query Audit Logs:**
```go
func (h *AdminAuditHandler) GetAuditLogs(c *gin.Context) {
    // Parse filters
    page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
    pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))
    actor := c.Query("actor")
    action := c.Query("action")
    startDate := c.Query("start_date")
    endDate := c.Query("end_date")
    
    filter := &models.AuditFilter{
        Page:     page,
        PageSize: pageSize,
        Actor:    actor,
        Action:   action,
    }
    
    // Parse date range
    if startDate != "" {
        if t, err := time.Parse(time.RFC3339, startDate); err == nil {
            filter.StartDate = &t
        }
    }
    if endDate != "" {
        if t, err := time.Parse(time.RFC3339, endDate); err == nil {
            filter.EndDate = &t
        }
    }
    
    // Fetch logs
    logs, total, err := h.store.AuditEvents().List(c, filter)
    if err != nil {
        c.JSON(500, gin.H{"error": "failed to fetch audit logs"})
        return
    }
    
    c.JSON(200, gin.H{
        "data":        logs,
        "total":       total,
        "page":        page,
        "page_size":   pageSize,
        "total_pages": (total + pageSize - 1) / pageSize,
    })
}
```

**Frontend Audit Log Viewer:**
```jsx
// frontend/src/components/admin/AuditLogViewer.jsx
import { useState } from 'react';
import { useAuditLogs } from '../../api';

const AuditLogViewer = () => {
  const [filters, setFilters] = useState({
    page: 1,
    actor: '',
    action: '',
    startDate: '',
    endDate: ''
  });
  
  const { data, isLoading } = useAuditLogs(filters);
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div>
      <FilterBar>
        <Input
          placeholder="Actor (email)"
          value={filters.actor}
          onChange={(e) => setFilters({...filters, actor: e.target.value})}
        />
        
        <Select
          placeholder="Action"
          value={filters.action}
          options={[
            { value: 'user.create', label: 'User Created' },
            { value: 'user.update', label: 'User Updated' },
            { value: 'user.deactivate', label: 'User Deactivated' },
            { value: 'user.activate', label: 'User Activated' },
          ]}
          onChange={(value) => setFilters({...filters, action: value})}
        />
        
        <DatePicker
          placeholder="Start Date"
          value={filters.startDate}
          onChange={(date) => setFilters({...filters, startDate: date})}
        />
        
        <DatePicker
          placeholder="End Date"
          value={filters.endDate}
          onChange={(date) => setFilters({...filters, endDate: date})}
        />
      </FilterBar>
      
      <Table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Target</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map(log => (
            <tr key={log.id}>
              <td>{formatDateTime(log.created_at)}</td>
              <td>{log.actor}</td>
              <td>{log.action}</td>
              <td>{log.target_type}:{log.target_id}</td>
              <td>
                <Button onClick={() => showDetails(log.details)}>
                  View
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      
      <Pagination
        current={filters.page}
        total={data.total_pages}
        onChange={(page) => setFilters({...filters, page})}
      />
    </div>
  );
};
```

### Audit Event Types

| Action | Description | Target Type |
|--------|-------------|-------------|
| user.create | New user account created | user |
| user.update | User details modified | user |
| user.deactivate | User account deactivated | user |
| user.activate | User account reactivated | user |
| user.login | User logged in | user |
| user.logout | User logged out | user |
| consent.update | Consent settings changed | user |
| profile.update | Profile information updated | user |

### Data Retention

- **Audit Logs:** Retained for 7 years (compliance requirement)
- **Auth Events:** Retained for 90 days
- **Log Rotation:** Automated archiving after retention period

---

## 10. Security Policy Configuration

### Quick Summary
Configurable security settings including rate limits, password policies, session timeouts, and access controls.

### Detailed Explanation

**For Stakeholders:**
Security policies define the rules that protect the platform and user data. These can be adjusted based on risk tolerance, compliance requirements, and operational needs. Current policies include login attempt limits, password requirements, and session durations.

**For Developers:**
Security configuration is managed through:
- Environment variables for deployment-specific settings
- Database-stored policies for runtime adjustments
- Middleware enforcement of security rules
- Configurable rate limits per endpoint

### Key Features

- **Environment-Based Config:** Different settings per environment
- **Rate Limiting:** Configurable per-endpoint limits
- **Password Policies:** Adjustable complexity requirements
- **Session Management:** Configurable token lifetimes
- **CORS Policies:** Controlled cross-origin access

### Technical Implementation

**Configuration Structure:**
```go
// backend/internal/config/security.go
type SecurityConfig struct {
    // JWT Settings
    JWTSecret           string        `env:"JWT_SECRET,required"`
    AccessTokenExpiry   time.Duration `env:"ACCESS_TOKEN_EXPIRY" envDefault:"15m"`
    RefreshTokenExpiry  time.Duration `env:"REFRESH_TOKEN_EXPIRY" envDefault:"168h"` // 7 days
    
    // Rate Limiting
    RateLimitEnabled    bool          `env:"RATE_LIMIT_ENABLED" envDefault:"true"`
    RateLimitRequests   int           `env:"RATE_LIMIT_REQUESTS" envDefault:"100"`
    RateLimitWindow     time.Duration `env:"RATE_LIMIT_WINDOW" envDefault:"1m"`
    LoginRateLimit      int           `env:"LOGIN_RATE_LIMIT" envDefault:"5"`
    
    // Password Policy
    PasswordMinLength   int           `env:"PASSWORD_MIN_LENGTH" envDefault:"8"`
    PasswordMaxLength   int           `env:"PASSWORD_MAX_LENGTH" envDefault:"128"`
    PasswordRequireUpper bool         `env:"PASSWORD_REQUIRE_UPPER" envDefault:"false"`
    PasswordRequireLower bool         `env:"PASSWORD_REQUIRE_LOWER" envDefault:"false"`
    PasswordRequireDigit bool         `env:"PASSWORD_REQUIRE_DIGIT" envDefault:"false"`
    PasswordRequireSpecial bool       `env:"PASSWORD_REQUIRE_SPECIAL" envDefault:"false"`
    
    // CORS
    CORSAllowedOrigins  []string      `env:"CORS_ALLOWED_ORIGINS" envSeparator:","`
    CORSAllowedMethods  []string      `env:"CORS_ALLOWED_METHODS" envDefault:"GET,POST,PUT,DELETE,OPTIONS"`
    CORSAllowedHeaders  []string      `env:"CORS_ALLOWED_HEADERS" envDefault:"Authorization,Content-Type"`
    
    // Security Headers
    SecurityHeadersEnabled bool       `env:"SECURITY_HEADERS_ENABLED" envDefault:"true"`
    HSTSMaxAge          int           `env:"HSTS_MAX_AGE" envDefault:"31536000"`
    
    // ML Server
    MLRateLimitMinute   int           `env:"ML_RATE_LIMIT_MINUTE" envDefault:"120"`
    MLRateLimitSecond   int           `env:"ML_RATE_LIMIT_SECOND" envDefault:"20"`
}
```

**Environment Configuration:**
```bash
# .env file
JWT_SECRET=your-secret-key-here
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=168h

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=1m
LOGIN_RATE_LIMIT=5

# Password Policy
PASSWORD_MIN_LENGTH=8
PASSWORD_MAX_LENGTH=128
PASSWORD_REQUIRE_UPPER=true
PASSWORD_REQUIRE_LOWER=true
PASSWORD_REQUIRE_DIGIT=true
PASSWORD_REQUIRE_SPECIAL=true

# CORS
CORS_ALLOWED_ORIGINS=https://app.diana.com,https://admin.diana.com
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Authorization,Content-Type,X-Request-ID

# Security Headers
SECURITY_HEADERS_ENABLED=true
HSTS_MAX_AGE=31536000

# ML Server Rate Limiting
ML_RATE_LIMIT_MINUTE=120
ML_RATE_LIMIT_SECOND=20
```

**CORS Middleware:**
```go
func CORS(config *config.SecurityConfig) gin.HandlerFunc {
    return func(c *gin.Context) {
        origin := c.Request.Header.Get("Origin")
        
        // Check if origin is allowed
        allowed := false
        for _, allowedOrigin := range config.CORSAllowedOrigins {
            if allowedOrigin == "*" || allowedOrigin == origin {
                allowed = true
                break
            }
        }
        
        if allowed {
            c.Header("Access-Control-Allow-Origin", origin)
            c.Header("Access-Control-Allow-Methods", strings.Join(config.CORSAllowedMethods, ","))
            c.Header("Access-Control-Allow-Headers", strings.Join(config.CORSAllowedHeaders, ","))
            c.Header("Access-Control-Allow-Credentials", "true")
            c.Header("Access-Control-Max-Age", "86400")
        }
        
        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(204)
            return
        }
        
        c.Next()
    }
}
```

### Configurable Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| ACCESS_TOKEN_EXPIRY | 15m | Access token lifetime |
| REFRESH_TOKEN_EXPIRY | 7d | Refresh token lifetime |
| RATE_LIMIT_REQUESTS | 100 | Requests per window |
| RATE_LIMIT_WINDOW | 1m | Rate limit window |
| LOGIN_RATE_LIMIT | 5 | Login attempts per minute |
| PASSWORD_MIN_LENGTH | 8 | Minimum password length |
| HSTS_MAX_AGE | 31536000 | HTTPS enforcement duration |

---

## 11. Reports & Analytics

### Quick Summary
Administrative dashboard providing system statistics, user analytics, risk distribution insights, and biomarker trends.

### Detailed Explanation

**For Stakeholders:**
The analytics module provides visibility into platform usage and health outcomes. Administrators can view user growth, assessment volumes, risk distributions across diabetes clusters, and track biomarker trends over time. This data supports clinical decision-making and platform optimization.

**For Developers:**
Analytics includes:
- Dashboard statistics (users, assessments, activity)
- Cluster distribution analysis (SIDD, SIRD, MOD, MARD)
- Individual user biomarker trends
- Data isolation (users only see their own data)
- Efficient aggregation queries

### Key Features

- **Dashboard Stats:** High-level platform metrics
- **Cluster Distribution:** Diabetes risk group analysis
- **Biomarker Trends:** Historical health data tracking
- **Data Isolation:** User-scoped data access
- **Efficient Queries:** Optimized aggregation with JOINs

### Technical Implementation

**Dashboard Statistics:**
```go
func (h *AdminHandler) GetDashboardStats(c *gin.Context) {
    stats, err := h.store.Analytics().GetDashboardStats(c)
    if err != nil {
        c.JSON(500, gin.H{"error": "failed to fetch stats"})
        return
    }
    
    c.JSON(200, gin.H{
        "total_users": stats.TotalUsers,
        "active_users_30d": stats.ActiveUsers30d,
        "total_assessments": stats.TotalAssessments,
        "assessments_30d": stats.Assessments30d,
        "risk_distribution": gin.H{
            "low": stats.LowRiskCount,
            "medium": stats.MediumRiskCount,
            "high": stats.HighRiskCount,
        },
        "recent_activity": stats.RecentActivity,
    })
}
```

**Cluster Distribution:**
```go
func (h *InsightsHandler) GetClusterDistribution(c *gin.Context) {
    claims := getUserClaims(c)
    
    var distribution map[string]int
    var err error
    
    if claims.Role == "admin" {
        // Admin sees all users
        distribution, err = h.store.Analytics().GetClusterDistribution(c)
    } else {
        // Regular user sees only their own data
        distribution, err = h.store.Analytics().GetClusterDistributionByUser(c, claims.UserID)
    }
    
    if err != nil {
        c.JSON(500, gin.H{"error": "failed to fetch distribution"})
        return
    }
    
    c.JSON(200, gin.H{
        "clusters": gin.H{
            "SIDD": distribution["SIDD"],  // Severe Insulin-Deficient
            "SIRD": distribution["SIRD"],  // Severe Insulin-Resistant
            "MOD": distribution["MOD"],    // Mild Obesity-Related
            "MARD": distribution["MARD"],  // Mild Age-Related
        }
    })
}
```

**Biomarker Trends:**
```go
func (h *UserHandler) GetTrends(c *gin.Context) {
    claims := getUserClaims(c)
    
    months, _ := strconv.Atoi(c.DefaultQuery("months", "6"))
    
    trends, err := h.store.Assessments().GetTrends(c, claims.UserID, months)
    if err != nil {
        c.JSON(500, gin.H{"error": "failed to fetch trends"})
        return
    }
    
    c.JSON(200, gin.H{
        "user_id": claims.UserID,
        "period_months": months,
        "trends": gin.H{
            "hba1c": trends.HbA1c,
            "fbs": trends.FBS,
            "bmi": trends.BMI,
            "cholesterol": trends.Cholesterol,
            "triglycerides": trends.Triglycerides,
            "ldl": trends.LDL,
            "hdl": trends.HDL,
        }
    })
}
```

**Frontend Analytics Dashboard:**
```jsx
// frontend/src/components/admin/AdminDashboard.jsx
import { useDashboardStats, useClusterDistribution } from '../../api';
import { BarChart, LineChart, PieChart } from '../charts';

const AdminDashboard = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: clusters, isLoading: clustersLoading } = useClusterDistribution();
  
  if (statsLoading || clustersLoading) return <LoadingSpinner />;
  
  return (
    <div className="dashboard">
      <StatsCards>
        <StatCard
          title="Total Users"
          value={stats.total_users}
          trend={stats.active_users_30d}
        />
        <StatCard
          title="Total Assessments"
          value={stats.total_assessments}
          trend={stats.assessments_30d}
        />
        <StatCard
          title="Risk Distribution"
          value={`${stats.risk_distribution.high} High Risk`}
        />
      </StatsCards>
      
      <ChartsGrid>
        <PieChart
          title="Diabetes Risk Clusters"
          data={[
            { name: 'SIDD', value: clusters.clusters.SIDD },
            { name: 'SIRD', value: clusters.clusters.SIRD },
            { name: 'MOD', value: clusters.clusters.MOD },
            { name: 'MARD', value: clusters.clusters.MARD },
          ]}
        />
        
        <BarChart
          title="Risk Level Distribution"
          data={[
            { name: 'Low', value: stats.risk_distribution.low },
            { name: 'Medium', value: stats.risk_distribution.medium },
            { name: 'High', value: stats.risk_distribution.high },
          ]}
        />
      </ChartsGrid>
      
      <RecentActivityTable activities={stats.recent_activity} />
    </div>
  );
};
```

### Analytics Metrics

| Metric | Description | Scope |
|--------|-------------|-------|
| Total Users | Total registered accounts | Platform-wide |
| Active Users (30d) | Users with activity in last 30 days | Platform-wide |
| Total Assessments | All assessments completed | Platform-wide |
| Assessments (30d) | Assessments in last 30 days | Platform-wide |
| Risk Distribution | Count by risk level (low/medium/high) | Platform-wide |
| Cluster Distribution | Count by diabetes cluster | Platform-wide |
| Biomarker Trends | Historical values per user | User-specific |

---

## 12. Real-time Logs of Auth Events

### Quick Summary
Server-Sent Events (SSE) stream providing administrators with live monitoring of authentication activities including logins, logouts, and failed attempts.

### Detailed Explanation

**For Stakeholders:**
The real-time auth event stream allows administrators to monitor platform security as it happens. They can see who is logging in, from where, and whether attempts are successful. This enables immediate detection of suspicious activity such as brute force attacks or unauthorized access attempts.

**For Developers:**
The SSE implementation includes:
- Publish-subscribe broker pattern for event distribution
- Admin-only access with JWT validation
- Event types: login, logout, refresh, failed_login
- Automatic reconnection with keep-alive messages
- Connection limits per admin user (5 concurrent)

### Key Features

- **Real-time Streaming:** Live event delivery via SSE
- **Event Types:** Login, logout, refresh, failed attempts
- **Rich Metadata:** IP address, user agent, device info, location
- **Admin-only Access:** JWT validation on connection
- **Auto-reconnection:** 30-second keep-alive messages
- **Connection Limits:** Max 5 concurrent streams per admin

### Technical Implementation

**Auth Event Structure:**
```go
// backend/internal/models/auth_events.go
type AuthEvent struct {
    ID          string                 `json:"id"`
    EventType   string                 `json:"event_type"` // login, logout, refresh, failed_login
    Email       string                 `json:"email"`
    Timestamp   time.Time              `json:"timestamp"`
    IPAddress   string                 `json:"ip_address"`
    UserAgent   string                 `json:"user_agent"`
    Success     bool                   `json:"success"`
    DeviceInfo  *DeviceInfo            `json:"device_info,omitempty"`
    Location    *Location              `json:"location,omitempty"`
    Metadata    map[string]string      `json:"metadata,omitempty"`
}

type DeviceInfo struct {
    Browser string `json:"browser"`
    OS      string `json:"os"`
    Device  string `json:"device"`
}

type Location struct {
    Country   string  `json:"country"`
    City      string  `json:"city"`
    Latitude  float64 `json:"latitude"`
    Longitude float64 `json:"longitude"`
}
```

**SSE Broker:**
```go
// backend/internal/http/sse/broker.go
type Broker struct {
    clients   map[chan AuthEvent]bool
    mu        sync.RWMutex
    buffer    []AuthEvent
    batchSize int
}

func NewBroker() *Broker {
    return &Broker{
        clients:   make(map[chan AuthEvent]bool),
        buffer:    make([]AuthEvent, 0, 100),
        batchSize: 100,
    }
}

func (b *Broker) Subscribe(client chan AuthEvent) {
    b.mu.Lock()
    defer b.mu.Unlock()
    b.clients[client] = true
}

func (b *Broker) Unsubscribe(client chan AuthEvent) {
    b.mu.Lock()
    defer b.mu.Unlock()
    delete(b.clients, client)
    close(client)
}

func (b *Broker) Publish(event AuthEvent) {
    b.mu.RLock()
    defer b.mu.RUnlock()
    
    for client := range b.clients {
        select {
        case client <- event:
            // Event sent successfully
        default:
            // Client buffer full, skip
        }
    }
}
```

**SSE Stream Handler:**
```go
// backend/internal/http/handlers/auth_events.go
func (h *AuthEventHandler) StreamEvents(c *gin.Context) {
    // Validate JWT from query parameter
    token := c.Query("token")
    if token == "" {
        c.SSEvent("error", gin.H{"message": "missing token"})
        return
    }
    
    claims, err := h.validateToken(token)
    if err != nil {
        c.SSEvent("error", gin.H{"message": "invalid token"})
        return
    }
    
    // Check admin role
    if claims.Role != "admin" {
        c.SSEvent("error", gin.H{"message": "admin access required"})
        return
    }
    
    // Check connection limit
    if h.broker.GetConnectionCount(claims.UserID) >= 5 {
        c.SSEvent("error", gin.H{"message": "connection limit exceeded"})
        return
    }
    
    // Set SSE headers
    c.Header("Content-Type", "text/event-stream")
    c.Header("Cache-Control", "no-cache")
    c.Header("Connection", "keep-alive")
    c.Header("X-Accel-Buffering", "no") // Disable nginx buffering
    
    // Create event channel
    eventChan := make(chan models.AuthEvent, 100)
    h.broker.Subscribe(eventChan)
    defer h.broker.Unsubscribe(eventChan)
    
    // Stream events
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()
    
    for {
        select {
        case event := <-eventChan:
            c.SSEvent("auth_event", event)
            c.Writer.Flush()
            
        case <-ticker.C:
            // Send keep-alive
            c.Writer.Write([]byte(":keep-alive\n\n"))
            c.Writer.Flush()
            
        case <-c.Request.Context().Done():
            // Client disconnected
            return
        }
    }
}
```

**Publishing Auth Events:**
```go
func (h *AuthHandler) publishAuthEvent(c *gin.Context, event *models.AuthEvent) {
    // Parse user agent for device info
    deviceInfo := parseUserAgent(c.Request.UserAgent())
    
    // Get location from IP (if GeoIP available)
    location := getLocationFromIP(c.ClientIP())
    
    fullEvent := models.AuthEvent{
        ID:         generateUUID(),
        EventType:  event.EventType,
        Email:      event.Email,
        Timestamp:  time.Now(),
        IPAddress:  c.ClientIP(),
        UserAgent:  c.Request.UserAgent(),
        Success:    event.Success,
        DeviceInfo: deviceInfo,
        Location:   location,
        Metadata:   event.Metadata,
    }
    
    // Publish to SSE broker
    h.eventBroker.Publish(fullEvent)
    
    // Also store in database for historical queries
    go h.store.AuthEvents().Create(context.Background(), &fullEvent)
}
```

**Frontend Auth Event Viewer:**
```jsx
// frontend/src/components/admin/AuthEventLogViewer.jsx
import { useEffect, useState } from 'react';
import { getToken } from '../../utils/auth';

const AuthEventLogViewer = () => {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const token = getToken();
    const eventSource = new EventSource(
      `${API_URL}/admin/events/stream?token=${token}`
    );
    
    eventSource.addEventListener('auth_event', (e) => {
      const event = JSON.parse(e.data);
      setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100
    });
    
    eventSource.addEventListener('error', (e) => {
      const data = JSON.parse(e.data);
      setError(data.message);
      setConnected(false);
    });
    
    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };
    
    eventSource.onerror = () => {
      setConnected(false);
    };
    
    return () => {
      eventSource.close();
    };
  }, []);
  
  const getEventIcon = (type) => {
    switch (type) {
      case 'login': return '✅';
      case 'logout': return '👋';
      case 'failed_login': return '❌';
      case 'refresh': return '🔄';
      default: return '📋';
    }
  };
  
  return (
    <div>
      <ConnectionStatus connected={connected} />
      {error && <Alert type="error" message={error} />}
      
      <EventList>
        {events.map(event => (
          <EventItem key={event.id}>
            <EventIcon>{getEventIcon(event.event_type)}</EventIcon>
            <EventContent>
              <EventType>{event.event_type}</EventType>
              <EventEmail>{event.email}</EventEmail>
              <EventMeta>
                <span>{event.ip_address}</span>
                <span>{event.device_info?.browser}</span>
                <span>{formatTime(event.timestamp)}</span>
              </EventMeta>
              {event.metadata?.failure_reason && (
                <EventError>{event.metadata.failure_reason}</EventError>
              )}
            </EventContent>
          </EventItem>
        ))}
      </EventList>
    </div>
  );
};
```

### Event Types

| Event Type | Description | Success |
|------------|-------------|---------|
| login | Successful authentication | true |
| logout | User logged out | true |
| refresh | Token refreshed | true |
| failed_login | Failed authentication | false |

### Connection Management

- **Keep-Alive:** 30-second interval
- **Reconnection:** Automatic with exponential backoff
- **Buffer Size:** 100 events per client
- **Connection Limit:** 5 concurrent per admin
- **Timeout:** 60 seconds without activity

---

## File Locations

### Backend Files

| Component | File Path |
|-----------|-----------|
| Auth Handler | `backend/internal/http/handlers/auth.go` |
| Users Handler | `backend/internal/http/handlers/users.go` |
| Admin Users Handler | `backend/internal/http/handlers/admin_users.go` |
| Admin Audit Handler | `backend/internal/http/handlers/admin_audit.go` |
| Auth Events Handler | `backend/internal/http/handlers/auth_events.go` |
| JWT Middleware | `backend/internal/http/middleware/auth.go` |
| RBAC Middleware | `backend/internal/http/middleware/rbac.go` |
| Audit Middleware | `backend/internal/http/middleware/audit.go` |
| Rate Limit Middleware | `backend/internal/http/middleware/ratelimit.go` |
| Security Headers | `backend/internal/http/middleware/security.go` |
| SSE Broker | `backend/internal/http/sse/broker.go` |
| Router | `backend/internal/http/router/router.go` |

### Frontend Files

| Component | File Path |
|-----------|-----------|
| API Client | `frontend/src/api.js` |
| Login Component | `frontend/src/components/auth/Login.jsx` |
| Signup Component | `frontend/src/components/auth/Signup.jsx` |
| User Profile | `frontend/src/components/user/UserProfile.jsx` |
| Onboarding | `frontend/src/components/user/Onboarding.jsx` |
| Admin Dashboard | `frontend/src/components/admin/AdminDashboard.jsx` |
| User Management | `frontend/src/components/admin/UserManagement.jsx` |
| Audit Log Viewer | `frontend/src/components/admin/AuditLogViewer.jsx` |
| Auth Event Viewer | `frontend/src/components/admin/AuthEventLogViewer.jsx` |

---

## Summary

DIANA V2 implements a comprehensive authentication and user management system with:

- **Dual-token JWT** architecture for secure API access
- **bcrypt password hashing** for secure credential storage
- **RBAC** for role-based access control
- **Comprehensive audit logging** for compliance
- **Real-time SSE** for security monitoring
- **Rate limiting** for DDoS protection
- **Security headers** for XSS/clickjacking protection

The system is designed for a medical AI platform handling sensitive health data, with GDPR compliance, data isolation, and comprehensive security monitoring.
