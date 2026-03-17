# DIANA V2 - Authentication, Security and User Management System

**Document Version:** 1.0  
**Last Updated:** 2026-01-29  
**System:** DIANA V2 - Diabetes Risk Assessment Platform  
**Architecture:** Go/Gin Backend + React Frontend + PostgreSQL

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Authentication Architecture](#2-authentication-architecture)
3. [Registration and Verification](#3-registration-and-verification)
4. [Login and Logout Flow](#4-login-and-logout-flow)
5. [Profile Management](#5-profile-management)
6. [Security Basics](#6-security-basics)
7. [Admin User Management](#7-admin-user-management)
8. [Audit Logging System](#8-audit-logging-system)
9. [Real-Time Auth Events](#9-real-time-auth-events)
10. [Reports and Analytics](#10-reports-and-analytics)
11. [API Reference](#11-api-reference)
12. [Frontend Integration](#12-frontend-integration)
13. [Security Considerations](#13-security-considerations)
14. [File Locations](#14-file-locations)

---

## 1. System Overview

DIANA V2 implements a comprehensive authentication and security system designed for a medical AI platform handling sensitive health data.

### Key Features

- Dual-Token JWT Architecture (Access + Refresh tokens)
- Role-Based Access Control (RBAC)
- Comprehensive Audit Logging
- Real-time Security Monitoring
- Rate Limiting and DDoS Protection
- Secure Password Management

### Key Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Backend API | Go 1.21+ / Gin | Authentication handlers, middleware |
| Frontend | React 18 / Vite | User interface, auth state management |
| Database | PostgreSQL 14+ | User data, sessions, audit logs |
| Token Storage | localStorage + HttpOnly Cookies | Client-side token management |
| Password Hashing | bcrypt (DefaultCost) | Secure password storage |
| JWT Library | golang-jwt/jwt/v5 | Token generation and validation |

---

## 2. Authentication Architecture

### 2.1 Dual-Token Strategy

The system uses a dual-token approach for enhanced security:

- **Access Token**: Short-lived (15 minutes), used for API authentication
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens
- **Token Rotation**: Refresh tokens are rotated on every use

### 2.2 JWT Claims Structure

```go
type UserClaims struct {
    UserID int64  // User database ID
    Email  string // User email (subject)
    Role   string // "admin" or "user"
}
```

**JWT Payload:**
```json
{
  "sub": "user@example.com",
  "user_id": 123,
  "role": "user",
  "exp": 1706510400,
  "iat": 1706509500,
  "scope": "diana"
}
```

### 2.3 Token Storage Strategy

| Token | Storage | Security |
|-------|---------|----------|
| Access Token | localStorage + HttpOnly Cookie | XSS vulnerable, CSRF protected |
| Refresh Token | HttpOnly Cookie + Database | Secure against XSS, rotated on use |

---

## 3. Registration and Verification

### 3.1 Registration Flow

**Endpoint:** `POST /api/v1/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Validation Rules:**
- Email: Required, valid format, max 255 chars
- Password: Required, min 8 chars, max 128 chars
- Email uniqueness: Checked against database

**Response (201 Created):**
```json
{
  "message": "registration successful",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2g...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "role": "user"
  }
}
```

### 3.2 Password Security

Passwords are hashed using bcrypt with default cost (10):

```go
hashedPassword, err := bcrypt.GenerateFromPassword(
    []byte(password), 
    bcrypt.DefaultCost
)
```

**Security Features:**
- bcrypt algorithm: Industry standard, adaptive hashing
- Salt automatically generated: Prevents rainbow table attacks
- Cost factor 10: ~100ms per hash
- Password never stored: Only hash stored in database

### 3.3 Email Verification Status

**Status:** STUBBED - Not Fully Implemented

The email verification system exists as infrastructure but is not active:
- notification_service.go contains stub methods
- notification_queue table exists in database
- Currently logs to console instead of sending emails

**Implementation needed:**
1. Configure SMTP/SendGrid credentials
2. Implement email templates
3. Add verification token generation
4. Create verification endpoint

---

## 4. Login and Logout Flow

### 4.1 Login Endpoint

**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "message": "login successful",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2g...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "role": "user"
  }
}
```

**Error Responses:**
- 401 Unauthorized: Invalid credentials
- 400 Bad Request: Missing/invalid fields
- 429 Too Many Requests: Rate limit exceeded

### 4.2 Token Refresh

**Endpoint:** `POST /api/v1/auth/refresh`

**Security Features:**
- Token Rotation: Old refresh token revoked, new one issued
- One-time use: Refresh tokens become invalid after use
- Database validation: Token hash checked against database
- Expiry check: Tokens expire after 7 days

**Refresh Flow:**
1. Receive refresh_token from client
2. Hash token (SHA-256)
3. Lookup in database
4. Check not revoked
5. Check not expired
6. Revoke old token
7. Generate new access + refresh tokens
8. Store new refresh token hash
9. Return new tokens

### 4.3 Logout Process

**Endpoint:** `POST /api/v1/auth/logout`

**Actions:**
1. Revoke refresh token in database
2. Clear HttpOnly cookies
3. Publish logout event to SSE
4. Return success response

---

## 5. Profile Management

### 5.1 User Profile Structure

```go
type UserProfile struct {
    User             User           // Basic user info
    LatestAssessment *Assessment    // Most recent assessment
    AssessmentCount  int           // Total assessments
    LastAssessmentAt *time.Time    // Last assessment date
    CurrentCluster   string        // Risk cluster
    CurrentRiskLevel string        // low/medium/high
}
```

### 5.2 Profile Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| /users/me/profile | GET | Get full profile | Yes |
| /users/me/profile | PUT | Update profile | Yes |
| /users/me/consent | GET | Get consent settings | Yes |
| /users/me/consent | PUT | Update consent | Yes |
| /users/me/trends | GET | Get biomarker trends | Yes |
| /users/me/account | DELETE | Delete account | Yes |

### 5.3 Profile Update

**Endpoint:** `PUT /api/v1/users/me/profile`

**Request:**
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "date_of_birth": "1970-05-15",
  "menopause_status": "post",
  "hypertension": false,
  "heart_disease": false,
  "family_history_diabetes": true,
  "smoking_status": "never"
}
```

**Security:**
- User can only update their own profile (enforced by JWT claims)
- ID from JWT, not from request body
- Sensitive fields validated

### 5.4 Onboarding Flow

**Endpoint:** `POST /api/v1/users/me/onboarding`

**Steps:**
1. Personal Info: Name, DOB
2. Health Status: Menopause status, type, years
3. Medical History: Hypertension, heart disease, family history
4. Settings: Assessment frequency, reminders
5. Consent: Data usage agreements

**Note:** Updates are done in three phases (not wrapped in DB transaction):
1. Update user profile fields
2. Update consent settings
3. Mark onboarding_completed = true

### 5.5 Consent Management

Users have granular control over data usage:

```go
type ConsentSettings struct {
    ConsentPersonalData          bool // Store personal health data
    ConsentResearchParticipation bool // Use data for research
    ConsentEmailUpdates          bool // Send health updates
    ConsentAnalytics             bool // Use data for analytics
}
```

**GDPR Compliance:**
- Explicit consent required
- Consent can be withdrawn
- Separate consent for different purposes
- Audit trail of consent changes

---

## 7. Admin User Management

### 7.1 Admin Endpoints

All admin endpoints require JWT + admin role.

| Endpoint | Method | Description |
|----------|--------|-------------|
| /admin/users | GET | List users (paginated) |
| /admin/users | POST | Create user |
| /admin/users/:id | GET | Get user by ID |
| /admin/users/:id | PUT | Update user |
| /admin/users/:id | DELETE | Deactivate user |
| /admin/users/:id/activate | POST | Activate user |

### 7.2 User CRUD Operations

**List Users:**
- Pagination: page, page_size parameters
- Filters: search (email), role, is_active
- Returns: Paginated user list (password_hash excluded)

**Create User:**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePass123!",
  "role": "user"
}
```

**Update User:**
```json
{
  "email": "updated@example.com",
  "role": "admin"
}
```

**Deactivate/Activate:**
- Soft delete: Sets is_active = false
- Can be reactivated via POST /activate
- Prevents self-deactivation

### 7.3 RBAC Implementation

**Role Derivation:**
```go
// Role is derived from is_admin boolean
if user.IsAdmin {
    user.Role = "admin"
} else {
    user.Role = "user"
}
```

**Middleware:**
```go
// Admin-only routes
admin.Use(middleware.RoleRequired("admin"))

// Or multiple roles
routes.Use(middleware.RoleRequired("admin", "manager"))
```

---

## 8. Audit Logging System

### 8.1 Overview

Every administrative action is logged for compliance and security:

- **Actor**: Who performed the action (email from JWT)
- **Action**: What was done (e.g., "user.create")
- **Target**: What was affected (type and ID)
- **Details**: Request metadata (method, path, IP, user agent)
- **Timestamp**: When it occurred

### 8.2 Audit Event Structure

```go
type AuditEvent struct {
    ID         int       // Event ID
    Actor      string    // User email
    Action     string    // Action type
    TargetType string    // Entity type
    TargetID   int       // Entity ID
    Details    JSON      // Request details
    CreatedAt  time.Time // Timestamp
}
```

### 8.3 Automatic Audit Logging

Audit logging is implemented via middleware:

```go
// Routes with automatic audit logging
users.POST("", middleware.CaptureRequestBody(), 
    auditLogger.LogAction("user.create", "user"), h.createUser)
users.PUT("/:id", middleware.CaptureRequestBody(), 
    auditLogger.LogAction("user.update", "user"), h.updateUser)
users.DELETE("/:id", 
    auditLogger.LogAction("user.deactivate", "user"), h.deactivateUser)
```

### 8.4 Sensitive Data Redaction

The system automatically redacts sensitive fields from audit logs:

**Redacted Fields:**
- password, password_hash
- token, refresh_token
- first_name, last_name, email
- phone, address, date_of_birth
- All biomarker values (hba1c, fbs, cholesterol, etc.)

### 8.5 Audit Log Querying

**Endpoint:** `GET /api/v1/admin/audit`

**Query Parameters:**
- page, page_size: Pagination
- actor: Filter by user email
- action: Filter by action type
- start_date, end_date: Date range (ISO 8601)

### 8.6 Async Logging

Audit logging is performed asynchronously to not block responses:

```go
// Fire-and-forget goroutine
go func() {
    ctx := context.WithoutCancel(c.Request.Context())
    if err := a.store.AuditEvents().Create(ctx, event); err != nil {
        log.Printf("[AUDIT FAILURE] Failed to log: %v", err)
    }
}()
```

---

## 9. Real-Time Auth Events

### 9.1 Overview

The system provides real-time authentication event streaming via Server-Sent Events (SSE) for security monitoring.

### 9.2 SSE Implementation

**Endpoint:** `GET /api/v1/admin/events/stream?token={jwt_token}`

**Features:**
- Admin-only access (validates JWT from query param)
- Real-time event delivery
- Automatic reconnection with 30s keep-alive
- Event types: login, logout, refresh, failed_login

### 9.3 Auth Event Types

| Event Type | Description | Metadata |
|------------|-------------|----------|
| login | Successful login | email, ip, user_agent |
| logout | User logout | email, ip |
| refresh | Token refresh | email |
| failed_login | Failed authentication | email, ip, reason |

### 9.4 Broker Pattern

The SSE broker uses a publish-subscribe pattern:

```go
type Broker struct {
    clients   map[chan Event]bool
    mu        sync.RWMutex
    buffer    []Event
    batchSize int
}
```

---

## 10. Reports and Analytics

### 10.1 Admin Dashboard Stats

**Endpoint:** `GET /api/v1/admin/dashboard`

Returns system statistics:
- Total users
- Active users (last 30 days)
- Total assessments
- Risk distribution
- Recent activity

### 10.2 Cluster Distribution

**Endpoint:** `GET /api/v1/insights/cluster-distribution`

Returns distribution of users across diabetes risk clusters:
- SIDD-like (Severe Insulin-Deficient Proxy)
- SIRD-like (Severe Insulin-Resistant Proxy)
- MOD-like (Mild Obesity-Related Proxy)
- MARD-like (Mild Age-Related Proxy)

**Note**: "-like" suffix indicates heuristic proxy classifications derived from clustering analysis. True Ahlqvist subtyping requires HOMA2-B and C-peptide biomarkers unavailable in NHANES.

### 10.3 Biomarker Trends

**Endpoint:** `GET /api/v1/users/me/trends`

Returns user's biomarker trends over time:
- HbA1c
- Fasting Blood Sugar
- Cholesterol
- BMI
- Blood Pressure

---

## 11. API Reference

### Authentication Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /api/v1/auth/register | POST | No | User registration |
| /api/v1/auth/login | POST | No | User login |
| /api/v1/auth/refresh | POST | No | Token refresh |
| /api/v1/auth/logout | POST | Yes | User logout |

### User Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /api/v1/users/me/profile | GET | Yes | Get profile |
| /api/v1/users/me/profile | PUT | Yes | Update profile |
| /api/v1/users/me/consent | GET | Yes | Get consent |
| /api/v1/users/me/consent | PUT | Yes | Update consent |
| /api/v1/users/me/trends | GET | Yes | Get trends |
| /api/v1/users/me/account | DELETE | Yes | Delete account |

### Admin Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /api/v1/admin/users | GET | Admin | List users |
| /api/v1/admin/users | POST | Admin | Create user |
| /api/v1/admin/users/:id | GET | Admin | Get user |
| /api/v1/admin/users/:id | PUT | Admin | Update user |
| /api/v1/admin/users/:id | DELETE | Admin | Deactivate user |
| /api/v1/admin/audit | GET | Admin | View audit logs |
| /api/v1/admin/events/stream | GET | Admin | SSE auth events |
| /api/v1/admin/dashboard | GET | Admin | System stats |

---

## 12. Frontend Integration

### 12.1 React Hooks

**useLogin Hook:**
```javascript
const useLogin = () => {
  const login = async (email, password) => {
    const response = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    }
    throw new Error('Login failed');
  };
  
  return { login };
};
```

**useLogout Hook:**
```javascript
const useLogout = () => {
  const logout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' });
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };
  
  return { logout };
};
```

### 12.2 API Client

**apiFetch Function:**
```javascript
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
      return apiFetch(endpoint, options); // Retry
    }
  }
  
  return response;
};
```

### 12.3 Token Management

Tokens are stored in localStorage:
- `token`: Access token (15 min expiry)
- `refreshToken`: Refresh token (7 day expiry)
- `user`: User object (id, email, role)

---

## 13. Security Considerations

### 13.1 Current Vulnerabilities

1. **XSS Risk**: Access tokens stored in localStorage are vulnerable to XSS attacks
2. **No CSRF Protection**: API relies on JWT but doesn't implement CSRF tokens
3. **Email Verification**: Not implemented (stubbed)
4. **Password Policy**: Basic validation (8-128 chars), no complexity requirements

### 13.2 Recommended Improvements

1. **Use HttpOnly Cookies**: Store access tokens in HttpOnly cookies instead of localStorage
2. **Implement CSRF Tokens**: Add CSRF protection for state-changing operations
3. **Add Rate Limiting per User**: Currently only per-IP, should also limit per user account
4. **Password Complexity**: Enforce stronger password requirements
5. **Email Verification**: Complete the email verification implementation
6. **Session Management**: Add session timeout warnings and forced logout
7. **2FA**: Implement two-factor authentication for admin accounts

### 13.3 Security Headers

The system implements:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000
- Content-Security-Policy: default-src 'self'

---

## 14. File Locations

### Backend Files

| Component | File Path |
|-----------|-----------|
| Auth Handler | backend/internal/http/handlers/auth.go |
| Users Handler | backend/internal/http/handlers/users.go |
| Admin Users Handler | backend/internal/http/handlers/admin_users.go |
| Admin Audit Handler | backend/internal/http/handlers/admin_audit.go |
| Auth Events Handler | backend/internal/http/handlers/auth_events.go |
| JWT Middleware | backend/internal/http/middleware/auth.go |
| RBAC Middleware | backend/internal/http/middleware/rbac.go |
| Audit Middleware | backend/internal/http/middleware/audit.go |
| Rate Limit Middleware | backend/internal/http/middleware/ratelimit.go |
| Security Headers | backend/internal/http/middleware/security.go |
| SSE Broker | backend/internal/http/sse/broker.go |
| Router | backend/internal/http/router/router.go |

### Frontend Files

| Component | File Path |
|-----------|-----------|
| API Client | frontend/src/api.js |
| Login Component | frontend/src/components/auth/Login.jsx |
| Signup Component | frontend/src/components/auth/Signup.jsx |
| User Profile | frontend/src/components/user/UserProfile.jsx |
| Onboarding | frontend/src/components/user/Onboarding.jsx |
| Admin Dashboard | frontend/src/components/admin/AdminDashboard.jsx |
| User Management | frontend/src/components/admin/UserManagement.jsx |
| Audit Log Viewer | frontend/src/components/admin/AuditLogViewer.jsx |
| Auth Event Viewer | frontend/src/components/admin/AuthEventLogViewer.jsx |

---

## Summary

DIANA V2 implements a robust authentication and security system with:

- **Dual-token JWT** architecture for secure API access
- **bcrypt password hashing** for secure credential storage
- **RBAC** for role-based access control
- **Comprehensive audit logging** for compliance
- **Real-time SSE** for security monitoring
- **Rate limiting** for DDoS protection
- **Security headers** for XSS/clickjacking protection


