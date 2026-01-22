# ROUTER KNOWLEDGE BASE

**Directory**: `backend/internal/http/router/`

## OVERVIEW
Centralized route registration using Gin framework, organizing endpoints by domain and applying middleware consistently.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Route definitions | `router.go` | Main router setup and middleware chain |
| Handler registration | All handlers | Each handler has `Register(rg *gin.RouterGroup)` |

## ROUTER STRUCTURE

```go
func SetupRouter(cfg config.Config, st store.Store) *gin.Engine {
    r := gin.New()

    // Global middleware
    r.Use(gin.Recovery())
    r.Use(middleware.RequestID())
    r.Use(middleware.Logger())
    r.Use(middleware.SecurityHeaders())
    r.Use(cors.New(...))
    r.Use(middleware.RateLimit(...))
    r.Use(middleware.MaxBodySize(...))

    // API version group
    api := r.Group("/api/v1")

    // Public routes (no auth)
    auth.Register(api.Group("/auth"), authHandler)

    // Protected routes (require JWT)
    protected := api.Group("")
    protected.Use(middleware.Auth(cfg.JWTSecret))

    // User routes
    usersGroup := protected.Group("/users/me")
    users.Register(usersGroup, usersHandler)

    // Assessment routes
    assessmentsGroup := protected.Group("/assessments")
    assessments.Register(assessmentsGroup, assessmentsHandler)

    // Export routes
    exportGroup := protected.Group("/export")
    export.Register(exportGroup, exportHandler)

    // Admin routes (require admin role)
    admin := protected.Group("/admin")
    admin.Use(middleware.RoleRequired("admin"))

    adminDashboard.Register(admin.Group("/dashboard"), adminDashboardHandler)
    adminUsers.Register(admin.Group("/users"), adminUsersHandler)
    adminAudit.Register(admin.Group("/audit"), adminAuditHandler)
    adminModels.Register(admin.Group("/models"), adminModelsHandler)

    // Public insights routes
    insights.Register(protected.Group("/insights"), insightsHandler)

    return r
}
```

## ROUTE HIERARCHY

```
/
├── /api/v1/
│   ├── /auth (public)
│   │   ├── POST   /login
│   │   ├── POST   /refresh
│   │   └── POST   /logout
│   │
│   ├── [All protected by JWT middleware]
│   │   ├── /users/me
│   │   │   ├── GET    /profile
│   │   │   ├── PUT    /profile
│   │   │   ├── POST   /onboarding
│   │   │   ├── GET    /consent
│   │   │   ├── PUT    /consent
│   │   │   ├── GET    /trends
│   │   │   ├── DELETE /account
│   │   │
│   │   ├── /assessments
│   │   │   ├── GET    /
│   │   │   ├── POST   /
│   │   │   ├── GET    /:id
│   │   │   ├── PUT    /:id
│   │   │   └── DELETE /:id
│   │   │
│   │   └── /export
│   │       └── GET    /pdf
│   │
│   ├── /clinics
│   │   └── GET    /dashboard
│   │
│   ├── /insights
│   │   ├── GET    /cluster-distribution
│   │   └── GET    /cluster
│   │
│   └── /admin [protected by RoleRequired("admin")]
│       ├── /dashboard
│       │   └── GET /
│       │
│       ├── /users
│       │   ├── GET    /
│       │   ├── POST   /
│       │   ├── PUT    /:id
│       │   └── DELETE /:id
│       │
│       ├── /audit
│       │   └── GET /
│       │
│       └── /models
│           └── GET /
│
└── /health
    └── GET /
```

## CONVENTIONS

### Middleware Chain
Order is critical - middleware applies from top to bottom:

1. **Recovery** - Panic recovery (always first)
2. **RequestID** - Unique ID for tracing
3. **Logger** - Structured request logging
4. **SecurityHeaders** - HSTS, CSP, X-Content-Type-Options
5. **CORS** - Cross-origin configuration
6. **RateLimit** - Token bucket rate limiting
7. **MaxBodySize** - 1MB request body limit
8. **Auth** - JWT validation (protected routes only)
9. **RoleRequired** - RBAC enforcement (admin routes only)

### Handler Registration Pattern
```go
// In each handler file
func (h *HandlerName) Register(rg *gin.RouterGroup) {
    rg.GET("/path", h.MethodName)
    rg.POST("/path", h.MethodName)
    rg.PUT("/path/:id", h.MethodName)
    rg.DELETE("/path/:id", h.MethodName)
}
```

### Grouping Strategy
- **Public routes**: `/auth/*` - No authentication required
- **Protected user routes**: `/users/me/*` - Requires JWT
- **Protected admin routes**: `/admin/*` - Requires JWT + admin role
- **Nested groups**: Allows applying middleware at domain level

## CODE MAP

| Symbol | Type | Location | Refs | Role |
|--------|------|----------|------|------|
| SetupRouter | func | router.go | server | Main router constructor |
| gin.Default | func | router.go | - | Create Gin engine |
| RouterGroup | type | gin | router.go | Route grouping |
| Use | method | RouterGroup | router.go | Apply middleware |

## MIDDLEWARE CONFIGURATION

### CORS
```go
r.Use(cors.New(cors.Config{
    AllowOrigins:     cfg.CORSOrigins,
    AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
    AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
    ExposeHeaders:    []string{"Content-Length", "Content-Disposition"},
    AllowCredentials: true,
    MaxAge:          12 * time.Hour,
}))
```

### Rate Limiting
```go
// 100 requests per minute per IP
rateLimiter := middleware.NewRateLimiter(100, time.Minute)
r.Use(middleware.RateLimit(rateLimiter))

// Stricter limit for auth: 10 requests/minute
authGroup.Use(middleware.AuthRateLimit(10))
```

### Auth Middleware
```go
// Applied to all protected routes
protected := api.Group("")
protected.Use(middleware.Auth(cfg.JWTSecret))
```

### Admin RBAC
```go
// Applied to admin routes
admin := protected.Group("/admin")
admin.Use(middleware.RoleRequired("admin"))
```

## ML PREDICTOR SELECTION

```go
var predictor ml.Predictor
if cfg.ModelURL != "" {
    predictor = ml.NewHTTPPredictor(
        cfg.ModelURL,
        cfg.ModelVersion,
        time.Duration(cfg.ModelTimeoutMS)*time.Millisecond,
    )
} else {
    predictor = ml.NewMockPredictor()  // Local dev mode
}
```

## ANTI-PATTERNS (THIS PROJECT)

### Issues
- **Missing registration endpoint**: Router doesn't include `/auth/register` route
- **Inconsistent grouping**: Some handlers mix public/protected in single Register()
- **No health check**: Missing `/health` endpoint for load balancers (but handlers.RegisterHealth exists)

### Technical Debt
- **Hardcoded CORS**: Should be configurable via environment
- **No API versioning strategy**: URL has `/api/v1` but no deprecation plan
- **Missing metrics**: No Prometheus or OpenTelemetry endpoints

## NOTES

### Route Naming
Routes follow REST conventions:
- **GET /resource** - List
- **GET /resource/:id** - Get single
- **POST /resource** - Create
- **PUT /resource/:id** - Update
- **DELETE /resource/:id** - Delete

### Authentication Flow
1. Client requests `/auth/login` → No middleware
2. Client receives JWT → Stores in localStorage
3. Client includes `Authorization: Bearer <token>` header
4. Auth middleware validates → Sets `user` in context
5. Handler accesses `c.Get("user")` → Gets `UserClaims`
6. Admin middleware checks `claims.Role === "admin"` → Allows or denies

### Health Check
`handlers.RegisterHealth(api)` registers `/health` endpoint for Kubernetes/monitoring probes.

### Clinics Routes
`/clinics/dashboard` endpoint exists for clinic member dashboard functionality.

### Missing Endpoints
- **`/auth/register`** - User registration (frontend exists, no backend route)
- **`/metrics`** - Prometheus metrics (optional, for observability)

### Development Route Printing
In non-production mode, router prints all registered routes to console for debugging via `printRoutes(r)`.
