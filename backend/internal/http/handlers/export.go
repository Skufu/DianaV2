// ExportHandler: CSV export endpoints for patients, assessments, and dataset slices.
package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/store"
)

type ExportHandler struct {
	maxRows int
	store   store.Store
}

func NewExportHandler(store store.Store, maxRows int) *ExportHandler {
	return &ExportHandler{store: store, maxRows: maxRows}
}

func (h *ExportHandler) Register(rg *gin.RouterGroup) {
	rg.GET("/patients.csv", h.patientsCSV)
	rg.GET("/assessments.csv", h.assessmentsCSV)
	rg.GET("/datasets/:slice", h.datasetSlice)
}

func (h *ExportHandler) patientsCSV(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.Status(http.StatusUnauthorized)
		return
	}

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=\"patients.csv\"")
	w := csv.NewWriter(c.Writer)
	_ = w.Write([]string{"id", "name", "age", "menopause_status", "years_menopause", "bmi", "bp_systolic", "bp_diastolic", "activity", "phys_activity", "smoking", "hypertension", "heart_disease", "family_history", "chol", "ldl", "hdl", "triglycerides", "cluster"})
	patients, err := h.store.Patients().ListAllLimited(c.Request.Context(), userID, h.maxRows)
	if err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	for _, p := range patients {
		_ = w.Write([]string{
			strconv.FormatInt(p.ID, 10),
			p.Name,
			intToStr(p.Age),
			p.MenopauseStatus,
			intToStr(p.YearsMenopause),
			floatToStr(p.BMI),
			intToStr(p.BPSystolic),
			intToStr(p.BPDiastolic),
			p.Activity,
			boolToStr(p.PhysActivity),
			p.Smoking,
			p.Hypertension,
			p.HeartDisease,
			boolToStr(p.FamilyHistory),
			intToStr(p.Chol),
			intToStr(p.LDL),
			intToStr(p.HDL),
			intToStr(p.Triglycerides),
			"", // cluster not stored on patient
		})
	}
	w.Flush()
}

func (h *ExportHandler) assessmentsCSV(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.Status(http.StatusUnauthorized)
		return
	}

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=\"assessments.csv\"")
	w := csv.NewWriter(c.Writer)
	_ = w.Write([]string{"id", "patient_id", "fbs", "hba1c", "cholesterol", "ldl", "hdl", "triglycerides", "systolic", "diastolic", "activity", "history_flag", "smoking", "hypertension", "heart_disease", "bmi", "cluster", "risk_score", "model_version", "dataset_hash", "validation_status", "created_at"})
	// Only export assessments for patients owned by the authenticated user
	rows, err := h.store.Assessments().ListAllLimitedByUser(c.Request.Context(), userID, h.maxRows)
	if err != nil {
		c.Status(http.StatusInternalServerError)
		return
	}
	for _, a := range rows {
		_ = w.Write([]string{
			strconv.FormatInt(a.ID, 10),
			strconv.FormatInt(a.PatientID, 10),
			floatToStr(a.FBS),
			floatToStr(a.HbA1c),
			intToStr(a.Cholesterol),
			intToStr(a.LDL),
			intToStr(a.HDL),
			intToStr(a.Triglycerides),
			intToStr(a.Systolic),
			intToStr(a.Diastolic),
			a.Activity,
			boolToStr(a.HistoryFlag),
			a.Smoking,
			a.Hypertension,
			a.HeartDisease,
			floatToStr(a.BMI),
			a.Cluster,
			intToStr(a.RiskScore),
			a.ModelVersion,
			a.DatasetHash,
			a.ValidationStatus,
			a.CreatedAt.Format(time.RFC3339),
		})
	}
	w.Flush()
}

func (h *ExportHandler) datasetSlice(c *gin.Context) {
	slice := c.Param("slice")
	hash := fmt.Sprintf("mock-hash-%s-%d", slice, time.Now().Unix())
	c.JSON(http.StatusOK, gin.H{
		"slice":        slice,
		"dataset_hash": hash,
		"rows":         0,
		"max_rows":     h.maxRows,
		"note":         "dataset slice stub; extend to filtered exports",
	})
}

func intToStr(v int) string {
	return strconv.Itoa(v)
}

func floatToStr(v float64) string {
	return strconv.FormatFloat(v, 'f', -1, 64)
}

func boolToStr(v bool) string {
	if v {
		return "true"
	}
	return "false"
}
