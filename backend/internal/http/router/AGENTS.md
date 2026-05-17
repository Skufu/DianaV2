# ROUTER KNOWLEDGE BASE

**Directory**: `backend/internal/http/router`
**Generated:** 2026-01-28
**Updated:** 2026-05-17

## OVERVIEW
Centralized route registration using Gin framework, organizing endpoints by domain and applying middleware consistently.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Route definitions | `router.go` | Main router setup and middleware chain |
| Handler registration | All handlers | Each handler has `Register(rg *gin.RouterGroup)` |

## ROUTER STRUCTURE

```go
func New(cfg config.Config, st store.Store, cache *cache.Cache) (*gin.Engine, *middleware.AuditLogger) {
    r := gin.New()

    // Global middleware
    r.Use(sentry.RecoveryMiddleware())
    r.Use(middleware.DistributedTracing("diana-api"))
    r.Use(middleware.RequestID())
    r.Use(middleware.Logger())
    r.Use(metrics.HTTPMiddleware())
    r.Use(cors.New(...))
    r.Use(middleware.SecurityHeaders())
    r.Use(middleware.RateLimit(...))
    r.Use(middleware.MaxBodySize(...))

    // API version group
    api := r.Group("/api/v1")

    // Public routes (no auth)
    auth.Register(api.Group("/auth"), authHandler)

    // Protected routes (require JWT)
    protected := api.Group("")
    protected.Use(middleware.Auth(cfg.JWTSecret, st.Users()))

    // User routes
    usersGroup := protected.Group("/users/me")
    users.Register(usersGroup, usersHandler)

    // User-owned assessment routes
    assessmentsGroup := userGroup.Group("/assessments")
    assessments.Register(assessmentsGroup, assessmentsHandler)

    // User-owned PDF export routes
    exportGroup := userGroup.Group("/export")
    export.Register(exportGroup, exportHandler)

    // Admin routes (require admin role)
    admin := protected.Group("/admin")
    admin.Use(middleware.RoleRequired(models.RoleAdmin))

    adminDashboard.Register(admin.Group("/dashboard"), adminDashboardHandler)
    adminUsers.Register(admin.Group("/users"), adminUsersHandler)
    adminAudit.Register(admin.Group("/audit"), adminAuditHandler)
    adminModels.Register(admin.Group("/models"), adminModelsHandler)

    // Admin/doctor insights routes
    insights.Register(protected.Group("/insights"), insightsHandler)

    // Conditional ML proxy routes
    if cfg.ModelURL != "" { mlProxy.Register(protected.Group("/ml")) }

    return r
}
```

## ROUTE HIERARCHY

```
/
├── /api/v1/
│   ├── /auth (public)
│   │   ├── POST   /login
│   │   ├── POST   /register
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
│   │   ├── /users/me/assessments
│   │   │   ├── GET    /
│   │   │   ├── POST   /
│   │   │   ├── GET    /:id
│   │   │   ├── PUT    /:id
│   │   │   └── DELETE /:id
│   │   │
│   │   ├── /users/me/export
│   │   │   └── GET    /pdf
│   │   │
│   │   ├── /users/me/privacy
│   │   │   ├── GET    /export/data
│   │   │   ├── DELETE /delete
│   │   │   ├── GET    /consent/history
│   │   │   ├── POST   /consent/withdraw
│   │   │   └── GET    /processing-info
│   │   │
│   │   ├── /analytics
│   │   │   └── GET    /summary
│   │   │
│   │   ├── /ml [registered only when MODEL_URL is set]
│   │   │   ├── GET    /health
│   │   │   ├── GET    /insights/metrics
│   │   │   ├── GET    /insights/information-gain
│   │   │   ├── GET    /insights/clusters
│   │   │   ├── GET    /insights/visualizations/:name
│   │   │   └── POST   /predict/explain
│   │
│   ├── /clinics [legacy; protected]
│   │   ├── GET    /
│   │   └── GET    /:id/dashboard
│   │
│   ├── /insights [admin or doctor]
│   │   ├── GET    /cluster-distribution
│   │   ├── GET    /biomarker-trends
│   │   └── GET    /cohort
│   │
│   ├── /admin/events/stream [token query/cookie auth]
│   │
│   └── /admin [protected by admin role]
│       ├── GET /dashboard
│       ├── GET /clinics
│       ├── GET /clinics/comparison
│       │
│       ├── /users
│       │   ├── GET    /
│       │   ├── POST   /
│       │   ├── PUT    /:id
│       │   └── DELETE /:id
│       │
│       ├── GET /audit
│       ├── GET /operations/health
│       ├── GET /operations/logs
│       │
│       └── /models
│           ├── GET /
│           ├── GET /active
│           ├── GET /drift
│           ├── GET /drift/alerts
│           └── POST /sync
│
├── /api/v1/healthz
├── /api/v1/livez
├── /api/v1/metrics
└── /swagger/*
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
| New | func | router.go | server | Main router constructor; returns `*gin.Engine` and `*middleware.AuditLogger` |
| gin.Default | func | router.go | - | Create Gin engine |
| RouterGroup | type | gin | router.go | Route grouping |
| Use | method | RouterGroup | router.go | Apply middleware |

## MIDDLEWARE CONFIGURATION

### CORS
```go
r.Use(cors.New(cors.Config{
    AllowOrigins:     cfg.CORSOrigins,
    AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
    AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With", "X-CSRF-Token"},
    ExposeHeaders:    []string{"Content-Length", "Content-Disposition"},
    AllowCredentials: true,
    MaxAge:          12 * time.Hour,
}))
```

### Rate Limiting
```go
// Global limit comes from cfg.RateLimitPerMinute
rateLimiter := middleware.NewRateLimiter(cfg.RateLimitPerMinute, time.Minute)
r.Use(middleware.RateLimit(rateLimiter))

// Auth routes use a separate 100 requests/minute limiter
authGroup.Use(middleware.AuthRateLimit(100))
```

### Auth Middleware
```go
// Applied to all protected routes
protected := api.Group("")
protected.Use(middleware.Auth(cfg.JWTSecret, st.Users()))
```

### Admin RBAC
```go
// Applied to admin routes
admin := protected.Group("/admin")
admin.Use(middleware.RoleRequired(models.RoleAdmin))
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
- **Legacy clinic routes**: `/clinics` and admin clinic comparison routes still exist in code; do not present them as the active thesis workflow.
- **Conditional ML routes**: `/api/v1/ml/*` is registered only when `MODEL_URL` is set.
- **Public metrics/docs**: `/api/v1/metrics` and `/swagger/*` are public in router code; protect at ingress if production policy requires it.

### Technical Debt
- **CORS is configurable**: `CORS_ORIGINS` drives the allowed origins.
- **No API versioning strategy**: URL has `/api/v1` but no deprecation plan

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
`handlers.RegisterHealth(api)` registers `/api/v1/healthz` and `/api/v1/livez` for probes.

### Clinics Routes
`/api/v1/clinics` and `/api/v1/clinics/:id/dashboard` still exist as legacy protected routes. They are not part of the active thesis workflow.

### Observability Endpoints
- **`/api/v1/metrics`** - Prometheus-style metrics endpoint.
- **`/swagger/*`** - Generated Swagger documentation.
- **`/api/v1/debug/*`** - Registered but disabled in production mode by handler guard.

### Development Route Printing
In non-production mode, router prints all registered routes to console for debugging via `printRoutes(r)`.
