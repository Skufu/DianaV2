package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/cache"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/store"
)

type InsightsHandler struct {
	store store.Store
	cache *cache.Cache
}

func NewInsightsHandler(store store.Store, cache *cache.Cache) *InsightsHandler {
	return &InsightsHandler{store: store, cache: cache}
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
	userID := userClaims.UserID

	cacheKey := fmt.Sprintf("cluster-distribution:%d", userID)

	if h.cache != nil {
		var cachedData interface{}
		if err := h.cache.Get(c.Request.Context(), cacheKey, &cachedData); err == nil {
			c.JSON(http.StatusOK, cachedData)
			return
		}
	}

	data, err := h.store.Assessments().ClusterCountsByUser(c.Request.Context(), int32(userID))
	if err != nil {
		log.Printf("[ERROR] Failed to load cluster distribution for user %d: %v", userID, err)
		ErrInternal(c, "Failed to load cluster distribution")
		return
	}

	if h.cache != nil {
		if err := h.cache.Set(c.Request.Context(), cacheKey, data, 10*time.Minute); err != nil {
			log.Printf("[WARN] Failed to cache cluster distribution for user %d: %v", userID, err)
		}
	}

	c.JSON(http.StatusOK, data)
}

func (h *InsightsHandler) trends(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		ErrUnauthorized(c)
		return
	}
	userClaims := claims.(middleware.UserClaims)

	data, err := h.store.Assessments().TrendAveragesByUser(c.Request.Context(), int32(userClaims.UserID))
	if err != nil {
		ErrInternal(c, "Failed to load biomarker trends")
		return
	}
	c.JSON(http.StatusOK, data)
}
