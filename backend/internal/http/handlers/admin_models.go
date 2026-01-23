package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

// AdminModelsHandler handles ML model traceability operations
type AdminModelsHandler struct {
	store store.Store
}

// NewAdminModelsHandler creates a new AdminModelsHandler
func NewAdminModelsHandler(store store.Store) *AdminModelsHandler {
	return &AdminModelsHandler{store: store}
}

// Register registers model run routes on the given router group
func (h *AdminModelsHandler) Register(rg *gin.RouterGroup) {
	models := rg.Group("/models")
	{
		models.GET("", h.listModelRuns)
		models.GET("/active", h.getActiveModel)
	}
}

// listModelRuns returns paginated list of model training runs
// @Summary List model runs (admin only)
// @Description Returns history of ML model training runs
// @Tags Admin
// @Produce json
// @Param page query int false "Page number (default 1)"
// @Param page_size query int false "Items per page (default 20)"
// @Success 200 {object} models.PaginatedResponse
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /admin/models [get]
func (h *AdminModelsHandler) listModelRuns(c *gin.Context) {
	params := ParsePagination(c)

	runs, total, err := h.store.ModelRuns().List(c.Request.Context(), params.PageSize, params.Offset)
	if err != nil {
		log.Printf("[ERROR] Failed to fetch model runs: %v", err)
		ErrInternal(c, "Failed to fetch model runs")
		return
	}

	c.JSON(http.StatusOK, models.PaginatedResponse{
		Data:       runs,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: (total + params.PageSize - 1) / params.PageSize,
	})
}

// getActiveModel returns the currently active ML model
// @Summary Get active model (admin only)
// @Description Returns the currently active/latest ML model version
// @Tags Admin
// @Produce json
// @Success 200 {object} models.ModelRun
// @Failure 403 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /admin/models/active [get]
func (h *AdminModelsHandler) getActiveModel(c *gin.Context) {
	run, err := h.store.ModelRuns().GetActive(c.Request.Context())
	if err != nil {
		if isNotFoundError(err) {
			ErrNotFound(c, "model runs")
			return
		}
		log.Printf("[ERROR] Failed to fetch active model: %v", err)
		ErrInternal(c, "Failed to fetch active model")
		return
	}

	c.JSON(http.StatusOK, run)
}

func isNotFoundError(err error) bool {
	if err == nil {
		return false
	}
	return containsString(err.Error(), "no active model") ||
		containsString(err.Error(), "not found")
}
