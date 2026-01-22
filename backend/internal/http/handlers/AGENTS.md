# HTTP HANDLERS KNOWLEDGE BASE

**Directory**: `backend/internal/http/handlers/`

## OVERVIEW
HTTP request handlers implementing REST API endpoints for authentication, user management, assessments, admin functions, and ML integration.

## WHERE TO LOOK

| Handler | File | Endpoints | Notes |
|---------|------|-----------|-------|
| Utils | `utils.go` | N/A | **CRITICAL**: Error helpers, pagination, context extraction |
| Auth | `auth.go` | `/auth/login`, `/auth/refresh`, `/auth/logout` | JWT token management |
| Users | `users.go` | `/users/me/*` (profile, onboarding, consent, trends, account) | User-facing operations |
| Assessments | `assessments.go` | `/users/me/assessments/*` | Risk assessments with ML prediction |
| Export | `export.go` | `/users/me/export/pdf` | PDF generation (gopdf) |
| Admin Dashboard | `admin_dashboard.go` | `/admin/dashboard` | System stats |
| Admin Users | `admin_users.go` | `/admin/users/*` | User CRUD, activation/deactivation |
| Admin Audit | `admin_audit.go` | `/admin/audit` | Audit log viewer |
| Admin Models | `admin_models.go` | `/admin/models` | ML model run tracking |
| Insights | `insights.go` | `/insights/*` | Analytics, cluster distribution |

## HANDLER STRUCTURE

Each handler follows consistent pattern:

```go
type HandlerName struct {
    store       store.Store       // Data access layer
    predictor   ml.Predictor     // ML integration (optional)
    // ... other dependencies
}

func NewHandlerName(store store.Store, ...) *HandlerName {
    return &HandlerName{store: store, ...}
}

func (h *HandlerName) Register(rg *gin.RouterGroup) {
    rg.GET("/path", h.MethodName)
    rg.POST("/path", h.MethodName)
    rg.PUT("/path/:id", h.MethodName)
    rg.DELETE("/path/:id", h.MethodName)
}

func (h *HandlerName) MethodName(c *gin.Context) {
    // 1. Extract context (user, claims)
    // 2. Bind/validate request
    // 3. Call store/service
    // 4. Return response
}
```

## CONVENTIONS

### Request Validation
- **Gin binding**: Use `c.ShouldBindJSON(&req)` for JSON payloads
- **Validation tags**: Struct tags for validation: `binding:"required,email"`, `binding:"oneof=pre,peri,post,surgical"`
- **Custom validation**: Additional checks after binding (e.g., consent requirements)

### Authentication
- **User extraction**: `getUserID(c)` or `getUserClaims(c)` from utils.go
- **Context storage**: Middleware stores `UserClaims` in `c.Get("user")`
- **Required middleware**: All protected handlers use `middleware.Auth(jwtSecret)`

### Error Handling
- **Standardized errors**: Use helpers from `utils.go`:
  - `ErrBadRequest(c, code, message, details)`
  - `ErrInternal(c, message)`
  - `ErrNotFound(c, message)`
  - `ErrUnauthorized(c)`
  - `ErrValidation(c, errors)`
- **Never manual JSON**: Avoid `c.JSON(status, gin.H{"error": ...})`

### Pagination
- **Use helper**: `ParsePagination(c)` returns `PaginationParams{page, pageSize}`
- **Response wrapper**: `NewPaginatedResponse(data, params, total)` formats response
- **Default values**: Page=1, PageSize=20

### ML Integration
- **Predictor interface**: All handlers accept `ml.Predictor` via constructor
- **Dual implementation**: HTTPPredictor (production) or MockPredictor (dev)
- **Biomarker validation**: Run `ml.ValidateBiomarkers()` before `Predictor.Predict()`
- **Result storage**: Save `cluster`, `risk_score`, `validation_status` to database

## CODE MAP

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| NewAuthHandler | func | auth.go | router | Auth handler constructor |
| NewUsersHandler | func | users.go | router | User handler constructor |
| NewAssessmentsHandler | func | assessments.go | router | Assessment handler constructor |
| NewExportHandler | func | export.go | router | Export handler constructor |
| NewAdminDashboardHandler | func | admin_dashboard.go | router | Admin dashboard constructor |
| NewAdminUsersHandler | func | admin_users.go | router | Admin users constructor |
| NewAdminAuditHandler | func | admin_audit.go | router | Admin audit constructor |
| NewAdminModelsHandler | func | admin_models.go | router | Admin models constructor |
| NewInsightsHandler | func | insights.go | router | Insights handler constructor |
| login | method | auth.go | frontend | Issue JWT tokens |
| refresh | method | auth.go | frontend | Refresh JWT with rotation |
| logout | method | auth.go | frontend | Revoke refresh token |
| GetUserProfile | method | users.go | frontend | User profile + latest assessment |
| UpdateUserProfile | method | users.go | frontend | Update user data |
| CompleteOnboarding | method | users.go | frontend | Multi-step onboarding |
| GetConsentSettings | method | users.go | frontend | Consent flags |
| UpdateConsentSettings | method | users.go | frontend | Update consent |
| GetTrends | method | users.go | frontend | Biomarker trends over time |
| DeleteAccount | method | users.go | frontend | Soft-delete user |
| Create | method | assessments.go | frontend | Create assessment + ML prediction |
| List | method | assessments.go | frontend | List user assessments |
| Get | method | assessments.go | frontend | Get single assessment |
| Update | method | assessments.go | frontend | Update assessment + re-predict |
| Delete | method | assessments.go | frontend | Delete assessment |
| ExportPDF | method | export.go | frontend | Generate PDF report |
| getDashboard | method | admin_dashboard.go | frontend/admin | System statistics |
| listUsers | method | admin_users.go | frontend/admin | User list (paginated) |
| createUser | method | admin_users.go | frontend/admin | Create new user |
| updateUser | method | admin_users.go | frontend/admin | Update user |
| deactivateUser | method | admin_users.go | frontend/admin | Soft-delete user |
| listAuditEvents | method | admin_audit.go | frontend/admin | Audit logs (paginated) |
| listModelRuns | method | admin_models.go | frontend/admin | ML model tracking |
| cluster | method | insights.go | frontend | Cluster distribution |
| clusterDistribution | method | insights.go | frontend | Detailed cluster stats |
| ParsePagination | func | utils.go | all handlers | Extract pagination params |
| NewPaginatedResponse | func | utils.go | all handlers | Format paginated response |
| getUserID | func | utils.go | all handlers | Extract user ID from claims |
| getUserClaims | func | utils.go | all handlers | Extract full claims |
| APIError | struct | utils.go | all handlers | Standard error format |
| ErrBadRequest | func | utils.go | all handlers | 400 error helper |
| ErrInternal | func | utils.go | all handlers | 500 error helper |
| ErrNotFound | func | utils.go | all handlers | 404 error helper |
| ErrUnauthorized | func | utils.go | all handlers | 401 error helper |
| ErrValidation | func | utils.go | all handlers | Validation error helper |

## ANTI-PATTERNS (THIS PROJECT)

### Critical Issues
- **Inconsistent error handling**: Some handlers use manual `gin.H{"error": ...}` instead of utils
- **Manual JSON responses**: Avoid `c.JSON(status, gin.H{...})` - use APIError struct
- **Missing validation**: Not all handlers validate request before processing
- **No transaction support**: Multi-step operations (onboarding, user+consent updates) lack atomicity
- **interface{} usage**: Should use `any` (Go 1.18+)

### Technical Debt
- **Direct SQL in postgres_admin.go**: Some admin queries bypass SQLC with raw pgx
- **Deprecated exports**: `PatientsCSV` and `AssessmentsCSV` in `export.go` are deprecated
- **Logic leaks**: Business logic (e.g., risk scoring in `assessments.go`) belongs in `internal/services`

## NOTES

### Missing Endpoints
- **`/auth/register`**: Frontend `Signup.jsx` exists but no backend handler implementation
- **Research export**: `/admin/export/research` commented out in `export.go`

### Path Mismatches
- **Admin stats**: Frontend calls `/admin/stats` but backend route is `/admin/dashboard`

### Assessment Flow
1. User submits biomarkers → Handler validates (range checks)
2. Call `ml.ValidateBiomarkers()` → Get clinical warnings
3. Call `Predictor.Predict()` → Get `cluster` + `risk_score`
4. Store in database with `validation_status`, `model_version`, `dataset_hash`
5. Return full assessment to frontend

### Onboarding Transaction
`CompleteOnboarding` performs three database updates:
1. Update user profile (personal info, medical history)
2. Update consent settings
3. Mark `onboarding_completed = true`

**Issue**: Not wrapped in actual transaction - partial updates possible on failure.

### Biomarker Validation
`validationStatus()` in `assessments.go` generates warnings:
- `fbs_diabetic_range`, `fbs_prediabetic_range`
- `hba1c_diabetic`, `hba1c_prediabetic`
- `cholesterol_high`, `chol_borderline`
- `ldl_high`, `ldl_borderline`
- `hdl_low`
- `triglycerides_high`, `triglycerides_borderline`
- `bp_high`, `bp_elevated`
- `bmi_obese`, `bmi_overweight`
