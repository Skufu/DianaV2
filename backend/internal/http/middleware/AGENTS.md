# MIDDLEWARE KNOWLEDGE BASE

**Directory**: `internal/http/middleware`

## OVERVIEW
Security, observability, and request validation layer using Gin middleware.

## WHERE TO LOOK
| Middleware | File | Description |
|------------|------|-------------|
| Authentication | `auth.go` | JWT validation, user extraction to context |
| Rate Limiting | `ratelimit.go` | Token bucket limiting, body size limits |
| Audit Logging | `audit.go` | Async action logging (Success only) |
| Request ID | `logger.go` | Unique ID generation per request |
| RBAC | `rbac.go` | Role-based access control (AdminOnly, etc.) |
| Security | `security.go` | HSTS, CSP, and other security headers |
| Structured Log | `logger.go` | Zerolog integration with request stats |

## CONVENTIONS
- **State Propagation**: Use `c.Set()` with standard keys:
  - `user`: `UserClaims` struct (set by `Auth`)
  - `request_id`: `string` (set by `RequestID`)
  - `audit_body`: `map[string]any` (set by `CaptureRequestBody`)
- **Error Handling**: Use `c.AbortWithStatusJSON()` to stop the chain and return errors.
- **Post-Processing**: Audit logging and request logging run *after* `c.Next()` to capture response status codes.
- **Redaction**: Sensitive fields (passwords, PII, biomarkers) MUST be redacted in `CaptureRequestBody`.

## ANTI-PATTERNS
- **CRITICAL**: Silenced audit errors (`_ = a.store...`) - data loss is silent.
- **CRITICAL**: Fire-and-forget goroutines (`go func()`) in `audit.go` without error recovery or logging.
- **Drift**: `UserClaims` struct in `auth.go` is missing `Scope` field, causing compilation errors in `audit_test.go`.
- **Legacy**: Use of `interface{}` instead of `any` (Go 1.18+).
- **Inconsistency**: `cors.go` is referenced in root docs but implementation uses `github.com/gin-contrib/cors` directly in router.
- **Refactoring**: `MaxBodySize` and `AuthRateLimit` in `ratelimit.go` may show as "undefined" due to internal build state drift.
