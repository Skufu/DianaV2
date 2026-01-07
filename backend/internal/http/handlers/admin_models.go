package handlers

import (
	"net/http"
	"strconv"

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
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("page_size", "20")

	page, _ := strconv.Atoi(pageStr)
	pageSize, _ := strconv.Atoi(pageSizeStr)

	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	offset := (page - 1) * pageSize

	runs, total, err := h.store.ModelRuns().List(c.Request.Context(), pageSize, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch model runs"})
		return
	}

	totalPages := (total + pageSize - 1) / pageSize

	c.JSON(http.StatusOK, models.PaginatedResponse{
		Data:       runs,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
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
		c.JSON(http.StatusNotFound, gin.H{"error": "no model runs found"})
		return
	}

	c.JSON(http.StatusOK, run)
}
