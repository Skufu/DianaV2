package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/store"
)

type InsightsHandler struct {
	store store.Store
}

func NewInsightsHandler(store store.Store) *InsightsHandler {
	return &InsightsHandler{store: store}
}

func (h *InsightsHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/cluster-distribution", h.cluster)
	rg.GET("/biomarker-trends", h.trends)
}

func (h *InsightsHandler) cluster(c *gin.Context) {
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

func (h *InsightsHandler) trends(c *gin.Context) {
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
