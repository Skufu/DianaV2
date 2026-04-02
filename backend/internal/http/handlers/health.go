package handlers

import "github.com/gin-gonic/gin"

// SimpleHealthResponse represents a simple health status response
type SimpleHealthResponse struct {
	Status string `json:"status"`
}

// RegisterHealth registers Kubernetes-style health check endpoints
// @Summary Kubernetes health checks
// @Description Simple health endpoints for load balancers and orchestrators
// @Tags Health
// @Produce json
// @Router /api/v1/healthz [get]
// @Success 200 {object} SimpleHealthResponse
//
// @Router /api/v1/livez [get]
// @Success 200 {object} SimpleHealthResponse
func RegisterHealth(rg *gin.RouterGroup) {
	rg.GET("/healthz", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})
	rg.GET("/livez", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "live"})
	})
}
