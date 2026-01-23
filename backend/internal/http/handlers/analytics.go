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

// AnalyticsHandler handles analytics endpoints
type AnalyticsHandler struct {
	store store.Store
	cache *cache.Cache
}

// NewAnalyticsHandler creates a new AnalyticsHandler
func NewAnalyticsHandler(store store.Store, cache *cache.Cache) *AnalyticsHandler {
	return &AnalyticsHandler{store: store, cache: cache}
}

// Register registers analytics routes on the given router group
func (h *AnalyticsHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/summary", h.getSummary)
}

// getSummary returns summary analytics for the current user
// @Summary Get user analytics summary
// @Description Returns summary analytics for authenticated user (cached for 5 minutes)
// @Tags Analytics
// @Produce json
// @Success 200 {object} map[string]any
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /analytics/summary [get]
func (h *AnalyticsHandler) getSummary(c *gin.Context) {
	claims, exists := c.Get("user")
	if !exists {
		ErrUnauthorized(c)
		return
	}
	userClaims := claims.(middleware.UserClaims)
	userID := userClaims.UserID

	cacheKey := fmt.Sprintf("summary:%d", userID)

	if h.cache != nil {
		var cachedSummary map[string]any
		if err := h.cache.Get(c.Request.Context(), cacheKey, &cachedSummary); err == nil {
			c.JSON(http.StatusOK, cachedSummary)
			return
		}
	}

	assessments, err := h.store.Assessments().ListAllLimitedByUser(c.Request.Context(), int32(userID), 10000)
	if err != nil {
		log.Printf("[ERROR] Failed to load assessments for user %d: %v", userID, err)
		ErrInternal(c, "Failed to load analytics summary")
		return
	}

	assessmentCount := len(assessments)

	clusterDist, err := h.store.Assessments().ClusterCountsByUser(c.Request.Context(), int32(userID))
	if err != nil {
		log.Printf("[ERROR] Failed to load cluster distribution for user %d: %v", userID, err)
		ErrInternal(c, "Failed to load analytics summary")
		return
	}

	trends, err := h.store.Assessments().TrendAveragesByUser(c.Request.Context(), int32(userID))
	if err != nil {
		log.Printf("[ERROR] Failed to load trends for user %d: %v", userID, err)
		ErrInternal(c, "Failed to load analytics summary")
		return
	}

	summary := map[string]any{
		"assessment_count":     assessmentCount,
		"cluster_distribution": clusterDist,
		"trends":               trends,
	}

	if h.cache != nil {
		if err := h.cache.Set(c.Request.Context(), cacheKey, summary, 5*time.Minute); err != nil {
			log.Printf("[WARN] Failed to cache analytics summary for user %d: %v", userID, err)
		}
	}

	c.JSON(http.StatusOK, summary)
}
