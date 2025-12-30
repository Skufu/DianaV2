package router

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	"github.com/skufu/DianaV2/backend/internal/config"
	"github.com/skufu/DianaV2/backend/internal/http/handlers"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/ml"
	"github.com/skufu/DianaV2/backend/internal/store"

	// Import docs for swagger registration
	_ "github.com/skufu/DianaV2/backend/docs"
)

func New(cfg config.Config, st store.Store) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	// Add security headers to all responses
	r.Use(middleware.SecurityHeaders())

	corsCfg := cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}
	// In dev mode, allow all origins; in production, use configured origins
	if cfg.Env == "dev" || cfg.Env == "development" {
		corsCfg.AllowAllOrigins = true
		corsCfg.AllowCredentials = false // Can't use AllowCredentials with AllowAllOrigins
	} else {
		corsCfg.AllowOrigins = cfg.CORSOrigins
	}
	r.Use(cors.New(corsCfg))

	// Swagger UI route - available at /swagger/index.html
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	api := r.Group("/api/v1")

	handlers.RegisterHealth(api)

	// Create rate limiter: 30 requests per minute for auth endpoints
	rateLimiter := middleware.NewRateLimiter(30, time.Minute)

	// Auth endpoints with rate limiting
	authGroup := api.Group("/auth")
	authGroup.Use(middleware.RateLimit(rateLimiter))
	authHandler := handlers.NewAuthHandler(cfg, st)
	authHandler.Register(authGroup)

	protected := api.Group("")
	protected.Use(middleware.Auth(cfg.JWTSecret))

	patientHandler := handlers.NewPatientsHandler(st)
	patientHandler.Register(protected.Group("/patients"))

	timeout := time.Duration(cfg.ModelTimeoutMS) * time.Millisecond
	var predictor ml.Predictor
	if cfg.ModelURL != "" {
		predictor = ml.NewHTTPPredictor(cfg.ModelURL, cfg.ModelVersion, timeout)
	} else {
		predictor = ml.NewMockPredictor()
	}
	assessmentHandler := handlers.NewAssessmentsHandler(st, predictor, cfg.ModelVersion, cfg.DatasetHash)
	assessmentHandler.Register(protected.Group("/patients"))

	analyticsHandler := handlers.NewAnalyticsHandler(st)
	analyticsHandler.Register(protected.Group("/analytics"))

	exportHandler := handlers.NewExportHandler(st, cfg.ExportMaxRows)
	exportHandler.Register(protected.Group("/export"))

	// Cohort analysis handler (extends analytics group)
	cohortHandler := handlers.NewCohortHandler(st)
	cohortHandler.Register(protected.Group("/analytics"))

	// Clinic dashboard handler
	clinicHandler := handlers.NewClinicDashboardHandler(st)
	clinicHandler.Register(protected.Group("/clinics"))

	// Admin dashboard handler
	adminHandler := handlers.NewAdminDashboardHandler(st)
	adminHandler.Register(protected.Group("/admin"))

	return r
}
