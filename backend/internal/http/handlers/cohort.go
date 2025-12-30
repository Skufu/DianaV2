package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/store"
)

// CohortHandler handles cohort analysis endpoints
type CohortHandler struct {
	store store.Store
}

// NewCohortHandler creates a new CohortHandler
func NewCohortHandler(store store.Store) *CohortHandler {
	return &CohortHandler{store: store}
}

// Register registers cohort routes on the given router group
func (h *CohortHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/cohort", h.getCohortStats)
}

// getCohortStats returns aggregated statistics grouped by the specified parameter
// @Summary Get cohort analysis statistics
// @Description Returns risk factor comparison across patient groups
// @Tags Analytics
// @Produce json
// @Param groupBy query string false "Grouping parameter: cluster, risk_level, age_group, menopause_status" default(cluster)
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]string
// @Router /analytics/cohort [get]
func (h *CohortHandler) getCohortStats(c *gin.Context) {
	groupBy := c.DefaultQuery("groupBy", "cluster")

	var groups interface{}
	var err error

	cohortRepo := h.store.Cohort()

	switch groupBy {
	case "cluster":
		groups, err = cohortRepo.StatsByCluster(c.Request.Context())
	case "risk_level":
		groups, err = cohortRepo.StatsByRiskLevel(c.Request.Context())
	case "age_group":
		groups, err = cohortRepo.StatsByAgeGroup(c.Request.Context())
	case "menopause_status":
		groups, err = cohortRepo.StatsByMenopauseStatus(c.Request.Context())
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid groupBy parameter"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load cohort statistics"})
		return
	}

	totalPatients, _ := cohortRepo.TotalPatientCount(c.Request.Context())
	totalAssessments, _ := cohortRepo.TotalAssessmentCount(c.Request.Context())

	c.JSON(http.StatusOK, gin.H{
		"groups":            groups,
		"total_patients":    totalPatients,
		"total_assessments": totalAssessments,
		"group_by":          groupBy,
	})
}
