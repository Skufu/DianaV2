package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/ml"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

// AdminModelsHandler handles ML model traceability operations
type AdminModelsHandler struct {
	store     store.Store
	predictor ml.Predictor
}

// NewAdminModelsHandler creates a new AdminModelsHandler
func NewAdminModelsHandler(store store.Store, predictor ml.Predictor) *AdminModelsHandler {
	return &AdminModelsHandler{
		store:     store,
		predictor: predictor,
	}
}

// Register registers model run routes on the given router group
func (h *AdminModelsHandler) Register(rg *gin.RouterGroup) {
	models := rg.Group("/models")
	{
		models.GET("", h.listModelRuns)
		models.GET("/active", h.getActiveModel)
		models.POST("/sync", h.syncModelRuns)
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
		containsString(err.Error(), "not found") ||
		containsString(err.Error(), "no rows in result set")
}

// syncModelRuns fetchesthe latest active model from the ML server and creates a record if it doesn't exist
// @Summary Sync model run tracking (admin only)
// @Description Fetches active model from ML server and adds it if it doesn't exist in historical tracking
// @Tags Admin
// @Produce json
// @Success 200 {object} models.ModelRun
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /admin/models/sync [post]
func (h *AdminModelsHandler) syncModelRuns(c *gin.Context) {
	if h.predictor == nil {
		log.Printf("[ERROR] Predictor is not configured")
		ErrInternal(c, "ML Predictor is not configured")
		return
	}

	meta, err := h.predictor.GetActiveModelMetadata(c.Request.Context())
	if err != nil {
		log.Printf("[ERROR] Failed to fetch ML metadata: %v", err)
		ErrInternal(c, "Failed to connect to ML server to sync metadata")
		return
	}

	// Fetch highest active model
	active, err := h.store.ModelRuns().GetActive(c.Request.Context())

	// Create it if there was an error fetching or the version/hash do not match
	needsCreate := false
	if err != nil && isNotFoundError(err) {
		needsCreate = true
	} else if err != nil {
		log.Printf("[ERROR] Error getting active model run: %v", err)
		ErrInternal(c, "Failed to check historical model runs")
		return
	} else if active != nil && (active.ModelVersion != meta.ModelVersion || active.DatasetHash != meta.DatasetHash) {
		needsCreate = true
	} else {
		// No sync needed, it's already active
		c.JSON(http.StatusOK, gin.H{
			"message": "Already up to date",
			"run":     active,
		})
		return
	}

	if needsCreate {
		run := models.ModelRun{
			ModelVersion: meta.ModelVersion,
			DatasetHash:  meta.DatasetHash,
			Notes:        meta.Notes,
		}

		createdRun, err := h.store.ModelRuns().Create(c.Request.Context(), run)
		if err != nil {
			log.Printf("[ERROR] Failed to create new model run: %v", err)
			ErrInternal(c, "Failed to sync model run to database")
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Synced successfully",
			"run":     createdRun,
		})
		return
	}
}
