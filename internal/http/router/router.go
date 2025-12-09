package router

import (
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/internal/config"
	"github.com/skufu/DianaV2/internal/http/handlers"
	"github.com/skufu/DianaV2/internal/http/middleware"
	"github.com/skufu/DianaV2/internal/ml"
	"github.com/skufu/DianaV2/internal/store"
)

func New(cfg config.Config, st store.Store) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())

	corsCfg := cors.Config{
		AllowOrigins: cfg.CORSOrigins,
		AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders: []string{"Origin", "Content-Type", "Authorization"},
		MaxAge:       12 * time.Hour,
	}
	r.Use(cors.New(corsCfg))

	api := r.Group("/api/v1")

	handlers.RegisterHealth(api)

	authHandler := handlers.NewAuthHandler(cfg, st)
	authHandler.Register(api.Group("/auth"))

	protected := api.Group("")
	protected.Use(middleware.Auth(cfg.JWTSecret))

	patientHandler := handlers.NewPatientsHandler(st)
	patientHandler.Register(protected.Group("/patients"))

	predictor := ml.NewMockPredictor()
	assessmentHandler := handlers.NewAssessmentsHandler(st, predictor, cfg.ModelVersion)
	assessmentHandler.Register(protected.Group("/patients"))

	analyticsHandler := handlers.NewAnalyticsHandler(st)
	analyticsHandler.Register(protected.Group("/analytics"))

	exportHandler := handlers.NewExportHandler(st, cfg.ExportMaxRows)
	exportHandler.Register(protected.Group("/export"))

	return r
}
