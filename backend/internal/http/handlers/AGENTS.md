# HANDLERS KNOWLEDGE BASE

## OVERVIEW
Gin request handlers implementing the REST API, connecting business logic and data access.

## WHERE TO LOOK
| File | Responsibility |
|------|----------------|
| `utils.go` | **CRITICAL**: Standardized error helpers, pagination, context extraction |
| `auth.go` | JWT authentication lifecycle (login, register, refresh, logout) |
| `assessments.go` | Core domain: risk assessment CRUD and ML predictor integration |
| `users.go` | User profile, onboarding, consent, and trend retrieval |
| `admin_*.go` | RBAC-protected endpoints (audit, user management, dashboard) |
| `export.go` | Report generation (PDF) and deprecated CSV exports |
| `insights.go` | Analytics distribution and user-specific data insights |

## CONVENTIONS
- **Structure**: Handlers are structs with a `Register(rg *gin.RouterGroup)` method for route wiring.
- **Dependency Injection**: Always use `New...Handler` constructors with explicit `store.Store` or specific interfaces.
- **Error Handling**: Use `utils.go` helpers (`ErrBadRequest`, `ErrInternal`, etc.) for consistent JSON error shapes.
- **Context Extraction**: Use `getUserID(c)` or `getUserClaims(c)` from `utils.go` to access authenticated user data.
- **Validation**: Use Gin's `binding` tags in request structs and `ShouldBindJSON`/`ShouldBindQuery`.
- **Pagination**: Use `ParsePagination(c)` and `NewPaginatedResponse(...)` from `utils.go`.

## ANTI-PATTERNS
- **Pagination Fragmentation**: Avoid `models.PaginatedResponse` (root-level meta). Prefer `handlers.PaginatedResponse` (nested `pagination` object) from `utils.go`.
- **Manual Parameter Parsing**: Do not use `strconv.Atoi` for `page`/`page_size` in handlers; use `ParsePagination`.
- **Logic Leaks**: Business logic (e.g., risk scoring in `assessments.go`) belongs in `internal/services`.
- **Manual JSON Errors**: Avoid `c.JSON(http.Status..., gin.H{"error": ...})`. Use `utils.go` helpers to ensure standard error codes.
- **Deprecated Exports**: `PatientsCSV` and `AssessmentsCSV` in `export.go` are deprecated; do not extend them.
