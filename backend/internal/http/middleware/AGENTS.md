# MIDDLEWARE KNOWLEDGE BASE

**Directory**: `backend/internal/http/middleware`
**Generated:** 2026-01-28
**Updated:** 2026-05-17

## OVERVIEW
Security, observability, and request validation layer using Gin middleware.

## WHERE TO LOOK
| Middleware | File | Description |
|------------|------|-------------|
| Authentication | `auth.go` | JWT validation, user extraction to context |
| Rate Limiting | `ratelimit.go` | Token bucket limiting, body size limits |
| Audit Logging | `audit.go` | Async action logging |
| Request ID | `logger.go` | Unique ID generation per request |
| RBAC | `rbac.go` | Role-based access control (AdminOnly, etc.) |
| Security | `security.go` | HSTS, CSP, and other security headers |
| CSRF | `csrf.go` | CSRF token extraction/validation helpers |
| Tracing | `tracing.go` | Distributed tracing middleware |

Note: CORS is configured in `backend/internal/http/router/router.go` using `github.com/gin-contrib/cors`; there is no local CORS middleware file.

## CONVENTIONS
- **State Propagation**: Use `c.Set()` with standard keys:
  - `user`: `UserClaims` struct (set by `Auth`)
  - `request_id`: `string` (set by `RequestID`)
  - `audit_body`: `map[string]any` (set by `CaptureRequestBody`)
- **Error Handling**: Use `c.AbortWithStatusJSON()` to stop the chain and return errors.
- **Post-Processing**: Audit logging and request logging run *after* `c.Next()` to capture response status codes.
- **Redaction**: Sensitive fields (passwords, PII, biomarkers) MUST be redacted in `CaptureRequestBody`.

## ANTI-PATTERNS
- **CRITICAL**: Fire-and-forget goroutines (`go func()`) in `audit.go` - errors are logged but don't block response.
- **Audit reliability**: Async audit writes are logged on failure but do not block the user request.
- **CORS location**: Keep CORS guidance in router docs, not as a separate middleware file.
