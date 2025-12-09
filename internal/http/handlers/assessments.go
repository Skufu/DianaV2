package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/internal/ml"
	"github.com/skufu/DianaV2/internal/models"
	"github.com/skufu/DianaV2/internal/store"
)

type AssessmentsHandler struct {
	store     store.Store
	predictor ml.Predictor
	modelVer  string
}

func NewAssessmentsHandler(store store.Store, predictor ml.Predictor, modelVersion string) *AssessmentsHandler {
	return &AssessmentsHandler{store: store, predictor: predictor, modelVer: modelVersion}
}

func (h *AssessmentsHandler) Register(rg *gin.RouterGroup) {
	rg.POST("/:patientID/assessments", h.create)
	rg.GET("/:patientID/assessments", h.list)
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
	patientID, err := parseIDParam(c, "patientID")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient id"})
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
	patientID, err := parseIDParam(c, "patientID")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid patient id"})
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
