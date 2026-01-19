// Package router wires HTTP handlers, middleware, and routes for the DIANA API.
package router

import (
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/config"
	"github.com/skufu/DianaV2/backend/internal/http/handlers"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/ml"
	"github.com/skufu/DianaV2/backend/internal/store"
)

// New creates and configures the Gin router with all routes and middleware.
func New(cfg config.Config, st store.Store) *gin.Engine {
	// Set Gin mode based on environment
	if cfg.Env == "production" || cfg.Env == "prod" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Recovery middleware
	r.Use(gin.Recovery())

	// Request ID (must be before Logger)
	r.Use(middleware.RequestID())

	// Logging middleware
	r.Use(middleware.Logger())

	// Security headers
	r.Use(middleware.SecurityHeaders())

	// CORS configuration
	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "Content-Disposition"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Rate limiting (100 requests per minute per IP/user)
	rateLimiter := middleware.NewRateLimiter(100, time.Minute)
	r.Use(middleware.RateLimit(rateLimiter))

	// Request body size limit (1MB max to prevent DoS via large payloads)
	r.Use(middleware.MaxBodySize(1 << 20))

	// Create ML predictor
	var predictor ml.Predictor
	if cfg.ModelURL != "" {
		predictor = ml.NewHTTPPredictor(
			cfg.ModelURL,
			cfg.ModelVersion,
			time.Duration(cfg.ModelTimeoutMS)*time.Millisecond,
		)
	} else {
		predictor = ml.NewMockPredictor()
	}

	// =========================================================================
	// API v1 Routes
	// =========================================================================
	api := r.Group("/api/v1")

	// -------------------------------------------------------------------------
	// Public routes (no authentication required)
	// -------------------------------------------------------------------------

	// Health checks
	handlers.RegisterHealth(api)

	// Authentication (with stricter rate limiting: 10 requests/minute for brute-force protection)
	authGroup := api.Group("/auth")
	authGroup.Use(middleware.AuthRateLimit(10))
	authHandler := handlers.NewAuthHandler(cfg, st)
	authHandler.Register(authGroup)

	// -------------------------------------------------------------------------
	// Protected routes (JWT authentication required)
	// -------------------------------------------------------------------------
	protected := api.Group("")
	protected.Use(middleware.Auth(cfg.JWTSecret))

	// User profile and self-service endpoints (/users/me/...)
	userGroup := protected.Group("/users/me")
	{
		usersHandler := handlers.NewUsersHandler(st)
		usersHandler.Register(userGroup)

		// User's own assessments
		assessmentsHandler := handlers.NewAssessmentsHandler(st, predictor, cfg.ModelVersion, cfg.DatasetHash)
		assessmentsHandler.Register(userGroup.Group("/assessments"))

		// User's export functionality
		exportHandler := handlers.NewExportHandler(st)
		exportHandler.Register(userGroup.Group("/export"))
	}

	// Insights endpoints (user-scoped)
	insightsGroup := protected.Group("/insights")
	{
		insightsHandler := handlers.NewInsightsHandler(st)
		insightsHandler.Register(insightsGroup)

		cohortHandler := handlers.NewCohortHandler(st)
		cohortHandler.Register(insightsGroup)
	}

	// Clinics endpoints (for clinic members)
	clinicsGroup := protected.Group("/clinics")
	{
		clinicDashboardHandler := handlers.NewClinicDashboardHandler(st)
		clinicDashboardHandler.Register(clinicsGroup)
	}

	// -------------------------------------------------------------------------
	// Admin routes (requires admin role)
	// -------------------------------------------------------------------------
	admin := protected.Group("/admin")
	admin.Use(middleware.RoleRequired("admin"))
	{
		// Admin dashboard and system stats
		adminDashboardHandler := handlers.NewAdminDashboardHandler(st)
		adminDashboardHandler.Register(admin)

		// User management
		adminUsersHandler := handlers.NewAdminUsersHandler(st)
		adminUsersHandler.Register(admin)

		// Audit logs
		adminAuditHandler := handlers.NewAdminAuditHandler(st)
		adminAuditHandler.Register(admin)

		// Model traceability
		adminModelsHandler := handlers.NewAdminModelsHandler(st)
		adminModelsHandler.Register(admin)
	}

	// =========================================================================
	// Debug: Print registered routes (development only)
	// =========================================================================
	if cfg.Env != "production" && cfg.Env != "prod" {
		printRoutes(r)
	}

	return r
}

// printRoutes logs all registered routes (for debugging)
func printRoutes(r *gin.Engine) {
	routes := r.Routes()
	maxMethod := 0
	maxPath := 0
	for _, route := range routes {
		if len(route.Method) > maxMethod {
			maxMethod = len(route.Method)
		}
		if len(route.Path) > maxPath {
			maxPath = len(route.Path)
		}
	}

	gin.DefaultWriter.Write([]byte("\n=== Registered Routes ===\n"))
	for _, route := range routes {
		method := route.Method + strings.Repeat(" ", maxMethod-len(route.Method))
		gin.DefaultWriter.Write([]byte(method + " " + route.Path + "\n"))
	}
	gin.DefaultWriter.Write([]byte("=========================\n\n"))
}
