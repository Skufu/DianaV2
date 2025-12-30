package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

type PatientsHandler struct {
	store store.Store
}

// PatientSummary is the single source of truth for what the frontend expects
// when displaying patients in lists and profile views. It combines the core
// patient record with the latest assessment summary fields.
type PatientSummary struct {
	models.Patient

	// Latest assessment-derived fields (optional if no assessments exist)
	Cluster   string    `json:"cluster,omitempty"`
	RiskScore int       `json:"risk_score,omitempty"`
	Risk      int       `json:"risk,omitempty"`      // alias for compatibility
	FBS       float64   `json:"fbs,omitempty"`       // latest FBS
	HbA1c     float64   `json:"hba1c,omitempty"`     // latest HbA1c
	LastVisit time.Time `json:"lastVisit,omitempty"` // latest assessment time
}

func NewPatientsHandler(store store.Store) *PatientsHandler {
	return &PatientsHandler{store: store}
}

func (h *PatientsHandler) Register(rg *gin.RouterGroup) {
	rg.GET("", h.list)
	rg.POST("", h.create)
	rg.GET("/:id", h.get)
	rg.PUT("/:id", h.update)
	rg.DELETE("/:id", h.delete)
	rg.GET("/:id/trend", h.trend)
}

func (h *PatientsHandler) list(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	patients, err := h.store.Patients().List(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list patients"})
		return
	}

	// Attach latest assessment summary so all consumers share a single source of truth.
	summaries := make([]PatientSummary, 0, len(patients))
	for _, p := range patients {
		s := PatientSummary{Patient: p}
		assessments, err := h.store.Assessments().ListByPatient(c.Request.Context(), p.ID)
		if err == nil && len(assessments) > 0 {
			latest := assessments[0]
			s.Cluster = latest.Cluster
			s.RiskScore = latest.RiskScore
			s.Risk = latest.RiskScore
			s.FBS = latest.FBS
			s.HbA1c = latest.HbA1c
			s.LastVisit = latest.CreatedAt
		}
		summaries = append(summaries, s)
	}

	c.JSON(http.StatusOK, summaries)
}

func (h *PatientsHandler) create(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	var req models.Patient
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	// Set user_id for ownership
	req.UserID = int64(userID)

	created, err := h.store.Patients().Create(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create patient"})
		return
	}
	c.JSON(http.StatusCreated, created)
}

func (h *PatientsHandler) get(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient ID"})
		return
	}

	patient, err := h.store.Patients().Get(c.Request.Context(), int32(id), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "patient not found"})
		return
	}

	// Attach latest assessment summary for consistency with list endpoint.
	summary := PatientSummary{Patient: *patient}
	assessments, err := h.store.Assessments().ListByPatient(c.Request.Context(), patient.ID)
	if err == nil && len(assessments) > 0 {
		latest := assessments[0]
		summary.Cluster = latest.Cluster
		summary.RiskScore = latest.RiskScore
		summary.Risk = latest.RiskScore
		summary.FBS = latest.FBS
		summary.HbA1c = latest.HbA1c
		summary.LastVisit = latest.CreatedAt
	}

	c.JSON(http.StatusOK, summary)
}

func (h *PatientsHandler) update(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient ID"})
		return
	}

	var req models.Patient
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	// Set the ID from the URL parameter and user_id for ownership
	req.ID = id
	req.UserID = int64(userID)

	updated, err := h.store.Patients().Update(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update patient"})
		return
	}
	c.JSON(http.StatusOK, updated)
}

func (h *PatientsHandler) delete(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient ID"})
		return
	}

	if err := h.store.Patients().Delete(c.Request.Context(), int32(id), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete patient"})
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

// trend returns the assessment history for a patient for trend visualization
func (h *PatientsHandler) trend(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient ID"})
		return
	}

	// Verify patient exists and belongs to user
	_, err = h.store.Patients().Get(c.Request.Context(), int32(id), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "patient not found"})
		return
	}

	// Get assessment trend data
	trend, err := h.store.Assessments().GetTrend(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get trend data"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"trend": trend})
}
