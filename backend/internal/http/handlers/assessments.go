package handlers

import (
	"fmt"
	"log"
	"net/http"
	"regexp"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/ml"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/pdf"
	"github.com/skufu/DianaV2/backend/internal/store"
)

// sanitizeFilename removes potentially dangerous characters from filenames
var safeFilenameRegex = regexp.MustCompile(`[^a-zA-Z0-9_\-]`)

func sanitizeFilename(name string) string {
	return safeFilenameRegex.ReplaceAllString(name, "_")
}

type AssessmentsHandler struct {
	store       store.Store
	predictor   ml.Predictor
	modelVer    string
	datasetHash string
}

func NewAssessmentsHandler(store store.Store, predictor ml.Predictor, modelVersion, datasetHash string) *AssessmentsHandler {
	return &AssessmentsHandler{
		store:       store,
		predictor:   predictor,
		modelVer:    modelVersion,
		datasetHash: datasetHash,
	}
}

func (h *AssessmentsHandler) Register(rg *gin.RouterGroup) {
	rg.POST("/:id/assessments", h.create)
	rg.GET("/:id/assessments", h.list)
	rg.GET("/:id/assessments/:assessmentID", h.get)
	rg.PUT("/:id/assessments/:assessmentID", h.update)
	rg.DELETE("/:id/assessments/:assessmentID", h.delete)
	rg.GET("/:id/assessments/:assessmentID/report", h.report)
}

type assessmentReq struct {
	FBS           float64 `json:"fbs" binding:"gte=0,lte=1000"`
	HbA1c         float64 `json:"hba1c" binding:"gte=0,lte=20"`
	Cholesterol   int     `json:"cholesterol" binding:"gte=0,lte=1000"`
	LDL           int     `json:"ldl" binding:"gte=0,lte=500"`
	HDL           int     `json:"hdl" binding:"gte=0,lte=200"`
	Triglycerides int     `json:"triglycerides" binding:"gte=0,lte=2000"`
	Systolic      int     `json:"systolic" binding:"gte=0,lte=300"`
	Diastolic     int     `json:"diastolic" binding:"gte=0,lte=200"`
	Activity      string  `json:"activity" binding:"max=50,oneof='' 'sedentary' 'light' 'moderate' 'active' 'very_active'"`
	HistoryFlag   bool    `json:"history_flag"`
	Smoking       string  `json:"smoking" binding:"max=20,oneof='' 'never' 'former' 'current'"`
	Hypertension  string  `json:"hypertension" binding:"max=10,oneof='' 'yes' 'no'"`
	HeartDisease  string  `json:"heart_disease" binding:"max=10,oneof='' 'yes' 'no'"`
	BMI           float64 `json:"bmi" binding:"gte=0,lte=100"`
}

func (h *AssessmentsHandler) create(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	patientID, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient id"})
		return
	}

	// Verify patient exists and belongs to user
	_, err = h.store.Patients().Get(c.Request.Context(), int32(patientID), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "patient not found"})
		return
	}

	var req assessmentReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}
	a := models.Assessment{
		PatientID:     patientID,
		FBS:           req.FBS,
		HbA1c:         req.HbA1c,
		Cholesterol:   req.Cholesterol,
		LDL:           req.LDL,
		HDL:           req.HDL,
		Triglycerides: req.Triglycerides,
		Systolic:      req.Systolic,
		Diastolic:     req.Diastolic,
		Activity:      req.Activity,
		HistoryFlag:   req.HistoryFlag,
		Smoking:       req.Smoking,
		Hypertension:  req.Hypertension,
		HeartDisease:  req.HeartDisease,
		BMI:           req.BMI,
		ModelVersion:  h.modelVer,
		DatasetHash:   h.datasetHash,
	}
	a.ValidationStatus = validationStatus(a)
	cluster, risk := h.predictor.Predict(a)
	a.Cluster = cluster
	a.RiskScore = risk
	created, err := h.store.Assessments().Create(c.Request.Context(), a)
	if err != nil {
		log.Printf("Failed to create assessment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create assessment"})
		return
	}
	c.JSON(http.StatusCreated, created)
}

func (h *AssessmentsHandler) list(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	patientID, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient id"})
		return
	}

	// Verify patient exists and belongs to user
	_, err = h.store.Patients().Get(c.Request.Context(), int32(patientID), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "patient not found"})
		return
	}

	records, err := h.store.Assessments().ListByPatient(c.Request.Context(), patientID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list assessments"})
		return
	}
	c.JSON(http.StatusOK, records)
}

func validationStatus(a models.Assessment) string {
	warnings := []string{}
	if a.FBS >= 0 {
		switch {
		case a.FBS >= 126:
			warnings = append(warnings, "fbs_diabetic_range")
		case a.FBS >= 100:
			warnings = append(warnings, "fbs_prediabetic_range")
		}
	}
	if a.HbA1c >= 0 {
		switch {
		case a.HbA1c >= 6.5:
			warnings = append(warnings, "hba1c_diabetic_range")
		case a.HbA1c >= 5.7:
			warnings = append(warnings, "hba1c_prediabetic_range")
		}
	}
	if a.Cholesterol > 0 {
		switch {
		case a.Cholesterol >= 240:
			warnings = append(warnings, "chol_high")
		case a.Cholesterol >= 200:
			warnings = append(warnings, "chol_borderline")
		}
	}
	if a.LDL > 0 {
		switch {
		case a.LDL >= 160:
			warnings = append(warnings, "ldl_high")
		case a.LDL >= 130:
			warnings = append(warnings, "ldl_borderline")
		}
	}
	if a.HDL > 0 {
		if a.HDL < 50 {
			warnings = append(warnings, "hdl_low")
		}
	}
	if a.Triglycerides > 0 {
		switch {
		case a.Triglycerides >= 200:
			warnings = append(warnings, "triglycerides_high")
		case a.Triglycerides >= 150:
			warnings = append(warnings, "triglycerides_borderline")
		}
	}
	if a.Systolic > 0 || a.Diastolic > 0 {
		if a.Systolic >= 140 || a.Diastolic >= 90 {
			warnings = append(warnings, "bp_high")
		} else if a.Systolic >= 130 || a.Diastolic >= 80 {
			warnings = append(warnings, "bp_elevated")
		}
	}
	if a.BMI > 0 {
		switch {
		case a.BMI >= 30:
			warnings = append(warnings, "bmi_obese")
		case a.BMI >= 25:
			warnings = append(warnings, "bmi_overweight")
		}
	}
	if len(warnings) == 0 {
		return "ok"
	}
	return "warning:" + joinWarnings(warnings)
}

func joinWarnings(ws []string) string {
	if len(ws) == 0 {
		return ""
	}
	if len(ws) == 1 {
		return ws[0]
	}
	out := ws[0]
	for i := 1; i < len(ws); i++ {
		out += "," + ws[i]
	}
	return out
}

func (h *AssessmentsHandler) get(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	patientID, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient id"})
		return
	}

	// Verify patient exists and belongs to user
	_, err = h.store.Patients().Get(c.Request.Context(), int32(patientID), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "patient not found"})
		return
	}

	idStr := c.Param("assessmentID")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid assessment ID"})
		return
	}

	assessment, err := h.store.Assessments().Get(c.Request.Context(), int32(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "assessment not found"})
		return
	}

	// Verify the assessment belongs to the requested patient
	if assessment.PatientID != patientID {
		c.JSON(http.StatusNotFound, gin.H{"error": "assessment not found"})
		return
	}

	c.JSON(http.StatusOK, assessment)
}

func (h *AssessmentsHandler) update(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	assessmentIDStr := c.Param("assessmentID")
	assessmentID, err := strconv.ParseInt(assessmentIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid assessment ID"})
		return
	}

	patientID, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient id"})
		return
	}

	// Verify patient exists and belongs to user
	_, err = h.store.Patients().Get(c.Request.Context(), int32(patientID), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "patient not found"})
		return
	}

	var req assessmentReq
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	a := models.Assessment{
		ID:            assessmentID,
		PatientID:     patientID,
		FBS:           req.FBS,
		HbA1c:         req.HbA1c,
		Cholesterol:   req.Cholesterol,
		LDL:           req.LDL,
		HDL:           req.HDL,
		Triglycerides: req.Triglycerides,
		Systolic:      req.Systolic,
		Diastolic:     req.Diastolic,
		Activity:      req.Activity,
		HistoryFlag:   req.HistoryFlag,
		Smoking:       req.Smoking,
		Hypertension:  req.Hypertension,
		HeartDisease:  req.HeartDisease,
		BMI:           req.BMI,
		ModelVersion:  h.modelVer,
		DatasetHash:   h.datasetHash,
	}

	// Revalidate and re-predict on update
	a.ValidationStatus = validationStatus(a)
	cluster, risk := h.predictor.Predict(a)
	a.Cluster = cluster
	a.RiskScore = risk

	updated, err := h.store.Assessments().Update(c.Request.Context(), a)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update assessment"})
		return
	}
	c.JSON(http.StatusOK, updated)
}

func (h *AssessmentsHandler) delete(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	patientID, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient id"})
		return
	}

	// Verify patient exists and belongs to user
	_, err = h.store.Patients().Get(c.Request.Context(), int32(patientID), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "patient not found"})
		return
	}

	assessmentIDStr := c.Param("assessmentID")
	assessmentID, err := strconv.ParseInt(assessmentIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid assessment ID"})
		return
	}

	// Verify the assessment exists and belongs to the patient
	assessment, err := h.store.Assessments().Get(c.Request.Context(), int32(assessmentID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "assessment not found"})
		return
	}
	if assessment.PatientID != patientID {
		c.JSON(http.StatusNotFound, gin.H{"error": "assessment not found"})
		return
	}

	if err := h.store.Assessments().Delete(c.Request.Context(), int32(assessmentID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete assessment"})
		return
	}
	c.Status(http.StatusNoContent)
}

// report generates a PDF report for an assessment
func (h *AssessmentsHandler) report(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	patientID, err := parseIDParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient id"})
		return
	}

	// Verify patient exists and belongs to user
	patient, err := h.store.Patients().Get(c.Request.Context(), int32(patientID), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "patient not found"})
		return
	}

	assessmentIDStr := c.Param("assessmentID")
	assessmentID, err := strconv.ParseInt(assessmentIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid assessment ID"})
		return
	}

	assessment, err := h.store.Assessments().Get(c.Request.Context(), int32(assessmentID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "assessment not found"})
		return
	}

	// Verify the assessment belongs to the patient
	if assessment.PatientID != patientID {
		c.JSON(http.StatusNotFound, gin.H{"error": "assessment not found"})
		return
	}

	// Generate PDF
	generator := pdf.NewReportGenerator("")
	pdfBytes, err := generator.GenerateAssessmentReport(*patient, *assessment, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate report"})
		return
	}

	// Set response headers for PDF download - sanitize filename to prevent header injection
	safeName := sanitizeFilename(patient.Name)
	filename := fmt.Sprintf("diana_report_%s_%s.pdf", safeName, assessment.CreatedAt.Format("2006-01-02"))
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Content-Length", fmt.Sprintf("%d", len(pdfBytes)))
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}
