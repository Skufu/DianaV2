package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/ml"
	"github.com/skufu/DianaV2/backend/internal/store"
)

// HealthHandler handles health check endpoints for monitoring and load balancers.
type HealthHandler struct {
	store     store.Store
	predictor ml.Predictor
}

// NewHealthHandler creates a new health handler with dependency checking.
func NewHealthHandler(store store.Store, predictor ml.Predictor) *HealthHandler {
	return &HealthHandler{
		store:     store,
		predictor: predictor,
	}
}

// RegisterHealth registers health check endpoints on the router group.
// This registers both Kubernetes-style endpoints (healthz, livez) and
// standard /health endpoint with dependency verification.
func RegisterHealth(rg *gin.RouterGroup) {
	rg.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	rg.GET("/livez", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "live"})
	})
}

// HealthStatus represents the health status of a dependency.
type HealthStatus struct {
	Status  string `json:"status"`
	Message string `json:"message,omitempty"`
}

// HealthResponse represents the full health check response.
type HealthResponse struct {
	Status       string                 `json:"status"`
	Timestamp    string                 `json:"timestamp"`
	Dependencies map[string]HealthStatus `json:"dependencies"`
}

// Register registers all health endpoints including the comprehensive /health endpoint.
func (h *HealthHandler) Register(rg *gin.RouterGroup) {
	// Kubernetes-style simple health checks (no dependency verification)
	rg.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	rg.GET("/livez", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "live"})
	})
	rg.GET("/readyz", h.Readyz)

	// Comprehensive health check with dependency verification
	rg.GET("/health", h.Health)
}

// Health returns comprehensive health status including all dependencies.
// This endpoint is used by load balancers and monitoring systems to verify
// the service is fully operational.
func (h *HealthHandler) Health(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	response := HealthResponse{
		Status:       "healthy",
		Timestamp:    time.Now().UTC().Format(time.RFC3339),
		Dependencies: make(map[string]HealthStatus),
	}

	// Check database connectivity
	dbStatus := HealthStatus{Status: "healthy"}
	if h.store == nil {
		dbStatus.Status = "unhealthy"
		dbStatus.Message = "store not configured"
		response.Status = "unhealthy"
	} else if err := h.store.Ping(ctx); err != nil {
		dbStatus.Status = "unhealthy"
		dbStatus.Message = err.Error()
		response.Status = "unhealthy"
	}
	response.Dependencies["database"] = dbStatus

	// Check ML predictor availability
	mlStatus := HealthStatus{Status: "healthy"}
	if h.predictor == nil {
		mlStatus.Status = "degraded"
		mlStatus.Message = "predictor not configured"
		// ML not available doesn't make the whole service unhealthy
		// since predictions can work in mock mode
	} else {
		// Try a lightweight ping to ML service if it's an HTTP predictor
		// For mock predictor, we just report it as available
		if httpPred, ok := h.predictor.(*ml.HTTPPredictor); ok {
			if !httpPred.IsAvailable() {
				mlStatus.Status = "unhealthy"
				mlStatus.Message = "ML service unreachable"
				// ML unavailable makes service degraded, not unhealthy
				if response.Status == "healthy" {
					response.Status = "degraded"
				}
			}
		}
	}
	response.Dependencies["ml_service"] = mlStatus

	// Return appropriate HTTP status code
	httpStatus := http.StatusOK
	if response.Status == "unhealthy" {
		httpStatus = http.StatusServiceUnavailable
	} else if response.Status == "degraded" {
		httpStatus = http.StatusOK // Degraded is still OK for load balancers
	}

	c.JSON(httpStatus, response)
}

// Readyz checks if the service is ready to accept requests.
// This is used by Kubernetes to determine if the pod should receive traffic.
func (h *HealthHandler) Readyz(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	// For readiness, we only check critical dependencies (database)
	if h.store == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "not_ready",
			"reason": "store not configured",
		})
		return
	}

	if err := h.store.Ping(ctx); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status": "not_ready",
			"reason": "database unavailable: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}
