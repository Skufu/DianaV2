package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/cache"
	"github.com/skufu/DianaV2/backend/internal/models"
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
	_, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	cacheKey := "cluster-distribution:all"

	if h.cache != nil {
		var cachedData any
		if err := h.cache.Get(c.Request.Context(), cacheKey, &cachedData); err == nil {
			c.JSON(http.StatusOK, cachedData)
			return
		}
	}

	var data []models.ClusterInsights
	var err error
	data, err = h.store.Assessments().ClusterCounts(c.Request.Context())
	if err != nil {
		log.Printf("[ERROR] Failed to load cluster distribution: %v", err)
		ErrInternal(c, "Failed to load cluster distribution")
		return
	}

	if h.cache != nil {
		if err := h.cache.Set(c.Request.Context(), cacheKey, data, 10*time.Minute); err != nil {
			log.Printf("[WARN] Failed to cache cluster distribution: %v", err)
		}
	}

	c.JSON(http.StatusOK, data)
}

func (h *InsightsHandler) trends(c *gin.Context) {
	_, exists := c.Get("user")
	if !exists {
		ErrUnauthorized(c)
		return
	}

	var data []models.TrendPoint
	var err error
	data, err = h.store.Assessments().TrendAverages(c.Request.Context())
	if err != nil {
		ErrInternal(c, "Failed to load biomarker trends")
		return
	}
	c.JSON(http.StatusOK, data)
}
