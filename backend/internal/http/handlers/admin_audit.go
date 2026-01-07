package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

// AdminAuditHandler handles audit log viewing operations
type AdminAuditHandler struct {
	store store.Store
}

// NewAdminAuditHandler creates a new AdminAuditHandler
func NewAdminAuditHandler(store store.Store) *AdminAuditHandler {
	return &AdminAuditHandler{store: store}
}

// Register registers audit log routes on the given router group
func (h *AdminAuditHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/audit", h.listAuditEvents)
}

// AuditQueryParams defines the query parameters for listing audit events
type AuditQueryParams struct {
	Page      int    `form:"page"`
	PageSize  int    `form:"page_size"`
	Actor     string `form:"actor"`
	Action    string `form:"action"`
	StartDate string `form:"start_date"` // ISO 8601 format
	EndDate   string `form:"end_date"`   // ISO 8601 format
}

// listAuditEvents returns paginated, filterable audit events
// @Summary List audit events (admin only)
// @Description Returns paginated list of audit events with optional filters
// @Tags Admin
// @Produce json
// @Param page query int false "Page number (default 1)"
// @Param page_size query int false "Items per page (default 20, max 100)"
// @Param actor query string false "Filter by actor email"
// @Param action query string false "Filter by action type"
// @Param start_date query string false "Filter from date (ISO 8601)"
// @Param end_date query string false "Filter to date (ISO 8601)"
// @Success 200 {object} models.PaginatedResponse
// @Failure 400 {object} map[string]string
// @Failure 403 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /admin/audit [get]
func (h *AdminAuditHandler) listAuditEvents(c *gin.Context) {
	var queryParams AuditQueryParams
	if err := c.ShouldBindQuery(&queryParams); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid query parameters"})
		return
	}

	// Build params
	params := models.AuditListParams{
		Page:     queryParams.Page,
		PageSize: queryParams.PageSize,
		Actor:    queryParams.Actor,
		Action:   queryParams.Action,
	}

	// Parse dates if provided
	if queryParams.StartDate != "" {
		t, err := time.Parse(time.RFC3339, queryParams.StartDate)
		if err != nil {
			// Try date-only format
			t, err = time.Parse("2006-01-02", queryParams.StartDate)
		}
		if err == nil {
			params.StartDate = t
		}
	}

	if queryParams.EndDate != "" {
		t, err := time.Parse(time.RFC3339, queryParams.EndDate)
		if err != nil {
			// Try date-only format
			t, err = time.Parse("2006-01-02", queryParams.EndDate)
			if err == nil {
				// End of day
				t = t.Add(24*time.Hour - time.Second)
			}
		}
		if err == nil {
			params.EndDate = t
		}
	}

	// Set defaults
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 {
		params.PageSize = 20
	}

	events, total, err := h.store.AuditEvents().List(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch audit events"})
		return
	}

	totalPages := (total + params.PageSize - 1) / params.PageSize

	c.JSON(http.StatusOK, models.PaginatedResponse{
		Data:       events,
		Total:      total,
		Page:       params.Page,
		PageSize:   params.PageSize,
		TotalPages: totalPages,
	})
}
