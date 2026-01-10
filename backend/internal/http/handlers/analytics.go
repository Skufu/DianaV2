package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/store"
)

type AnalyticsHandler struct {
	store store.Store
}

func NewAnalyticsHandler(store store.Store) *AnalyticsHandler {
	return &AnalyticsHandler{store: store}
}

func (h *AnalyticsHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/cluster-distribution", h.cluster)
	rg.GET("/biomarker-trends", h.trends)
}

func (h *AnalyticsHandler) cluster(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	userClaims := claims.(middleware.UserClaims)

	data, err := h.store.Assessments().ClusterCountsByUser(c.Request.Context(), int32(userClaims.UserID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load distribution"})
		return
	}
	c.JSON(http.StatusOK, data)
}

func (h *AnalyticsHandler) trends(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	userClaims := claims.(middleware.UserClaims)

	data, err := h.store.Assessments().TrendAveragesByUser(c.Request.Context(), int32(userClaims.UserID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load trends"})
		return
	}
	c.JSON(http.StatusOK, data)
}
