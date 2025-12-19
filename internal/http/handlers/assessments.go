package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/internal/ml"
	"github.com/skufu/DianaV2/internal/models"
	"github.com/skufu/DianaV2/internal/store"
)

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
	rg.POST("/:patientID/assessments", h.create)
	rg.GET("/:patientID/assessments", h.list)
	rg.GET("/:patientID/assessments/:id", h.get)
	rg.PUT("/:patientID/assessments/:id", h.update)
	rg.DELETE("/:patientID/assessments/:id", h.delete)
}

type assessmentReq struct {
	FBS           float64 `json:"fbs"`
	HbA1c         float64 `json:"hba1c"`
	Cholesterol   int     `json:"cholesterol"`
	LDL           int     `json:"ldl"`
	HDL           int     `json:"hdl"`
	Triglycerides int     `json:"triglycerides"`
	Systolic      int     `json:"systolic"`
	Diastolic     int     `json:"diastolic"`
	Activity      string  `json:"activity"`
	HistoryFlag   bool    `json:"history_flag"`
	Smoking       string  `json:"smoking"`
	Hypertension  string  `json:"hypertension"`
	HeartDisease  string  `json:"heart_disease"`
	BMI           float64 `json:"bmi"`
}

func (h *AssessmentsHandler) create(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	patientID, err := parseIDParam(c, "patientID")
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

	patientID, err := parseIDParam(c, "patientID")
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
	idStr := c.Param("id")
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
	c.JSON(http.StatusOK, assessment)
}

func (h *AssessmentsHandler) update(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid assessment ID"})
		return
	}

	patientID, err := parseIDParam(c, "patientID")
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
		ID:            id,
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

	patientID, err := parseIDParam(c, "patientID")
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

	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid assessment ID"})
		return
	}

	if err := h.store.Assessments().Delete(c.Request.Context(), int32(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete assessment"})
		return
	}
	c.JSON(http.StatusNoContent, nil)
}
