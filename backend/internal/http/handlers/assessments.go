package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/cache"
	"github.com/skufu/DianaV2/backend/internal/config"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/ml"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

const (
	canonicalAssessmentMinAge = 45
	canonicalAssessmentMaxAge = 60
	canonicalAssessmentAgeErr = "Age must be between 45-60 years for postmenopausal women. This application is designed for this specific population."
	doctorLockedModelType     = "binary_v2_no_bp"
)

type AssessmentsHandler struct {
	store       store.Store
	predictor   ml.Predictor
	cache       *cache.Cache
	modelVer    string
	datasetHash string
	thresholds  config.ClinicalThresholds
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}

	return ""
}

func driftBaselineMap(b ml.DriftBaselineMetadata) map[string]any {
	if b.BaselineID == "" &&
		b.BaselineVersion == "" &&
		b.ModelVersion == "" &&
		b.DatasetHash == "" &&
		b.FeatureSchemaVersion == "" &&
		b.SourceKind == "" &&
		b.CreatedAt == "" &&
		b.RefreshedAt == "" &&
		b.StaleAfter == "" &&
		b.SampleCount == 0 &&
		len(b.ReferenceFeatures) == 0 &&
		b.LineageStatus == "" {
		return nil
	}

	return map[string]any{
		"baseline_id":            b.BaselineID,
		"baseline_version":       b.BaselineVersion,
		"model_version":          b.ModelVersion,
		"dataset_hash":           b.DatasetHash,
		"feature_schema_version": b.FeatureSchemaVersion,
		"source_kind":            b.SourceKind,
		"created_at":             b.CreatedAt,
		"refreshed_at":           b.RefreshedAt,
		"stale_after":            b.StaleAfter,
		"sample_count":           b.SampleCount,
		"reference_features":     b.ReferenceFeatures,
		"lineage_status":         b.LineageStatus,
	}
}

func ensureAssessmentLineage(assessment *models.Assessment, fallbackModelVersion, fallbackDatasetHash string) {
	if assessment == nil {
		return
	}

	assessment.ModelVersion = firstNonEmpty(assessment.ModelVersion, fallbackModelVersion)
	assessment.DatasetHash = firstNonEmpty(assessment.DatasetHash, fallbackDatasetHash)

	if assessment.DriftBaseline == nil {
		assessment.DriftBaseline = map[string]any{
			"baseline_id":            "",
			"baseline_version":       "",
			"model_version":          assessment.ModelVersion,
			"dataset_hash":           assessment.DatasetHash,
			"feature_schema_version": "",
			"source_kind":            "",
			"created_at":             "",
			"refreshed_at":           "",
			"stale_after":            "",
			"sample_count":           0,
			"reference_features":     []string{},
			"lineage_status":         "lineage_incomplete",
		}
	}

	if _, ok := assessment.DriftBaseline["model_version"]; !ok {
		assessment.DriftBaseline["model_version"] = assessment.ModelVersion
	}
	if _, ok := assessment.DriftBaseline["dataset_hash"]; !ok {
		assessment.DriftBaseline["dataset_hash"] = assessment.DatasetHash
	}

	baselineModelVersion := strings.TrimSpace(fmt.Sprintf("%v", assessment.DriftBaseline["model_version"]))
	baselineDatasetHash := strings.TrimSpace(fmt.Sprintf("%v", assessment.DriftBaseline["dataset_hash"]))
	if baselineModelVersion == "" || baselineModelVersion == "<nil>" {
		assessment.DriftBaseline["model_version"] = assessment.ModelVersion
		baselineModelVersion = assessment.ModelVersion
	}
	if baselineDatasetHash == "" || baselineDatasetHash == "<nil>" {
		assessment.DriftBaseline["dataset_hash"] = assessment.DatasetHash
		baselineDatasetHash = assessment.DatasetHash
	}

	lineageStatus := strings.TrimSpace(fmt.Sprintf("%v", assessment.DriftBaseline["lineage_status"]))
	if lineageStatus == "" || lineageStatus == "<nil>" {
		lineageStatus = "lineage_incomplete"
	}

	switch {
	case baselineModelVersion != "" && assessment.ModelVersion != "" && baselineModelVersion != assessment.ModelVersion:
		lineageStatus = "reference_mismatch"
	case baselineDatasetHash != "" && assessment.DatasetHash != "" && baselineDatasetHash != assessment.DatasetHash:
		lineageStatus = "reference_mismatch"
	case lineageStatus == "healthy" && (baselineModelVersion == "" || (assessment.DatasetHash != "" && baselineDatasetHash == "")):
		lineageStatus = "lineage_incomplete"
	}

	assessment.DriftBaseline["lineage_status"] = lineageStatus
}

func NewAssessmentsHandler(store store.Store, predictor ml.Predictor, cache *cache.Cache, modelVer, datasetHash string, thresholds config.ClinicalThresholds) *AssessmentsHandler {
	return &AssessmentsHandler{
		store:       store,
		predictor:   predictor,
		cache:       cache,
		modelVer:    modelVer,
		datasetHash: datasetHash,
		thresholds:  thresholds,
	}
}

// Register registers the handler routes
func (h *AssessmentsHandler) Register(r *gin.RouterGroup, auditLogger *middleware.AuditLogger) {
	if auditLogger != nil {
		r.POST("", middleware.CaptureRequestBody(), auditLogger.LogAction("assessment.create", "assessment"), h.Create)
		r.GET("", h.List)
		r.GET("/:assessmentID", h.Get)
		r.PUT("/:assessmentID", middleware.CaptureRequestBody(), auditLogger.LogAction("assessment.update", "assessment"), h.Update)
		r.DELETE("/:assessmentID", auditLogger.LogAction("assessment.delete", "assessment"), h.Delete)
		return
	}

	r.POST("", h.Create)
	r.GET("", h.List)
	r.GET("/:assessmentID", h.Get)
	r.PUT("/:assessmentID", h.Update)
	r.DELETE("/:assessmentID", h.Delete)
}

// invalidateUserCache invalidates all cache keys for a given user
func (h *AssessmentsHandler) invalidateUserCache(ctx context.Context, userID int64) {
	if h.cache == nil {
		return
	}

	keys := []string{
		fmt.Sprintf("summary:%d", userID),
		fmt.Sprintf("cluster-distribution:%d", userID),
	}

	patterns := []string{
		fmt.Sprintf("trends:%d:*", userID),
	}

	for _, key := range keys {
		if err := h.cache.Delete(ctx, key); err != nil {
			log.Printf("[WARN] Failed to delete cache key %s for user %d: %v", key, userID, err)
		}
	}

	for _, pattern := range patterns {
		if err := h.cache.DeleteByPattern(ctx, pattern); err != nil {
			log.Printf("[WARN] Failed to delete cache pattern %s for user %d: %v", pattern, userID, err)
		}
	}
}

// Helper functions reused from other handlers in package

// Helper function to calculate risk level (local version to avoid conflict/undefined issues)
func calculateRiskLevel(score int) string {
	if score < 0 || score > 100 {
		return "unknown"
	}
	if score < 30 {
		return "low"
	} else if score < 70 {
		return "medium"
	} else {
		return "high"
	}
}

func canonicalRiskLabel(riskLevel string, fallback string) string {
	switch riskLevel {
	case "low":
		return "Low Risk"
	case "medium":
		return "Moderate Risk"
	case "high":
		return "High Risk"
	default:
		if fallback != "" {
			return fallback
		}
		return "Unknown Risk"
	}
}

func ageFromDOB(dob time.Time, now time.Time) int {
	age := now.Year() - dob.Year()
	if now.Month() < dob.Month() || (now.Month() == dob.Month() && now.Day() < dob.Day()) {
		age--
	}
	return age
}

func (h *AssessmentsHandler) resolveAssessmentAge(ctx context.Context, userID int64, requestedAge *int, fallbackAge int) (int, error) {
	age := fallbackAge
	if requestedAge != nil {
		age = *requestedAge
	}
	if age > 0 {
		return age, nil
	}

	user, err := h.store.Users().FindByID(ctx, int32(userID))
	if err != nil {
		return 0, err
	}
	if user != nil && user.DateOfBirth != nil {
		return ageFromDOB(*user.DateOfBirth, time.Now().UTC()), nil
	}

	return age, nil
}

func applyValidationStatus(assessment *models.Assessment, validationResult ml.ValidationResult) {
	assessment.ValidationStatus = ml.FormatValidationStatus(validationResult)
}

func applyCapabilityContract(assessment *models.Assessment, featureSet ml.FeatureSet, clusterCapability ml.ClusterCapability, outputCapabilities ml.OutputCapabilities) {
	assessment.FeatureSet = map[string]any{
		"features":      featureSet.Features,
		"feature_count": featureSet.FeatureCount,
		"source":        featureSet.Source,
	}
	assessment.ClusterCapability = map[string]any{
		"supported":       clusterCapability.Supported,
		"required_inputs": clusterCapability.RequiredInputs,
		"output_field":    clusterCapability.OutputField,
		"alias_field":     clusterCapability.AliasField,
	}
	assessment.OutputCapabilities = map[string]any{
		"predicted_status":      outputCapabilities.PredictedStatus,
		"risk_score":            outputCapabilities.RiskScore,
		"at_risk_probability":   outputCapabilities.AtRiskProbability,
		"prediction_confidence": outputCapabilities.PredictionConfidence,
		"metabolic_subtype":     outputCapabilities.MetabolicSubtype,
		"risk_label":            outputCapabilities.RiskLabel,
		"cluster_description":   outputCapabilities.ClusterDescription,
		"treatment_focus":       outputCapabilities.TreatmentFocus,
	}
}

func applyResultCapabilities(assessment *models.Assessment, prediction ml.Prediction) {
	applyCapabilityContract(assessment, prediction.FeatureSet, prediction.ClusterCapability, prediction.OutputCapabilities)
}

func (h *AssessmentsHandler) ensureAssessmentCapabilities(ctx context.Context, assessment *models.Assessment, metadata *ml.ModelMetadata) {
	if assessment == nil {
		return
	}
	if assessment.FeatureSet != nil && assessment.ClusterCapability != nil && assessment.OutputCapabilities != nil && assessment.DriftBaseline != nil {
		return
	}

	if metadata != nil {
		applyCapabilityContract(assessment, metadata.FeatureSet, metadata.ClusterCapability, metadata.OutputCapabilities)
		ensureAssessmentLineage(assessment, metadata.ModelVersion, metadata.DatasetHash)
		return
	}

	fetchedMetadata, err := h.predictor.GetActiveModelMetadata(ctx)
	if err != nil || fetchedMetadata == nil {
		ensureAssessmentLineage(assessment, assessment.ModelVersion, assessment.DatasetHash)
		return
	}
	applyCapabilityContract(assessment, fetchedMetadata.FeatureSet, fetchedMetadata.ClusterCapability, fetchedMetadata.OutputCapabilities)
	ensureAssessmentLineage(assessment, fetchedMetadata.ModelVersion, fetchedMetadata.DatasetHash)
}

func applyCanonicalPredictionResult(assessment *models.Assessment, prediction ml.Prediction) {
	clusterCapabilitySupported := prediction.ClusterCapability.Supported
	hasClusterCode := strings.TrimSpace(prediction.Cluster) != ""

	if clusterCapabilitySupported && hasClusterCode {
		assessment.Cluster = prediction.Cluster
	} else {
		assessment.Cluster = ""
	}

	assessment.RiskScore = prediction.RiskScore
	assessment.PredictedStatus = prediction.PredictedStatus
	if clusterCapabilitySupported && hasClusterCode {
		assessment.ClusterDescription = prediction.ClusterDescription
		assessment.TreatmentFocus = prediction.TreatmentFocus
	} else {
		assessment.ClusterDescription = ""
		assessment.TreatmentFocus = ""
	}
	assessment.AtRiskProbability = prediction.AtRiskProbability
	assessment.ModelVersion = firstNonEmpty(prediction.ModelVersion, assessment.ModelVersion)
	assessment.DatasetHash = firstNonEmpty(prediction.DatasetHash, assessment.DatasetHash)
	if baseline := driftBaselineMap(prediction.DriftBaseline); baseline != nil {
		assessment.DriftBaseline = baseline
	}
	applyResultCapabilities(assessment, prediction)

	assessment.RiskLevel = calculateRiskLevel(assessment.RiskScore)
	assessment.RiskLabel = canonicalRiskLabel(assessment.RiskLevel, prediction.RiskLabel)
}

// validationStatus is REMOVED — use ml.ValidateBiomarkers() + ml.FormatValidationStatus() instead.
// See validation.go in the ml package for the canonical implementation.

// Create creates a new assessment for the logged-in user
func (h *AssessmentsHandler) Create(c *gin.Context) {
	claims, err := getUserClaims(c)
	if err != nil {
		ErrUnauthorized(c)
		return
	}
	userID := int64(claims.UserID)

	var req models.UpdateAssessmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[ERROR] Assessment validation failed: %v", err)
		ErrBadRequest(c, "Invalid request payload")
		return
	}

	if req.BMI != nil && *req.BMI < 0 {
		ErrBadRequest(c, "BMI must be non-negative")
		return
	}

	if req.ModelType != "" && req.ModelType != "ada" && req.ModelType != "binary_v2_no_bp" && req.ModelType != "binary_v2_bp" {
		ErrBadRequest(c, "Invalid model type")
		return
	}

	if strings.ToLower(claims.Role) == "doctor" {
		if req.ModelType != "" && req.ModelType != doctorLockedModelType {
			ErrForbidden(c)
			return
		}
		req.ModelType = doctorLockedModelType
	}

	if req.FBS != nil && *req.FBS < 0 {
		ErrBadRequest(c, "FBS must be non-negative")
		return
	}

	if req.Cholesterol != nil && *req.Cholesterol < 0 {
		ErrBadRequest(c, "Cholesterol must be non-negative")
		return
	}

	if req.LDL != nil && *req.LDL < 0 {
		ErrBadRequest(c, "LDL must be non-negative")
		return
	}

	if req.HDL != nil && *req.HDL < 0 {
		ErrBadRequest(c, "HDL must be non-negative")
		return
	}

	if req.Triglycerides != nil && *req.Triglycerides < 0 {
		ErrBadRequest(c, "Triglycerides must be non-negative")
		return
	}

	if req.Systolic != nil && *req.Systolic < 0 {
		ErrBadRequest(c, "Systolic blood pressure must be non-negative")
		return
	}

	if req.Diastolic != nil && *req.Diastolic < 0 {
		ErrBadRequest(c, "Diastolic blood pressure must be non-negative")
		return
	}

	age, err := h.resolveAssessmentAge(c.Request.Context(), userID, req.Age, 0)
	if err != nil {
		log.Printf("[ERROR] Failed to resolve user age for assessment: %v", err)
		ErrInternal(c, "Failed to resolve age for prediction")
		return
	}
	if age < canonicalAssessmentMinAge || age > canonicalAssessmentMaxAge {
		ErrBadRequest(c, canonicalAssessmentAgeErr)
		return
	}

	// Add user_id to assessment
	assessment := models.Assessment{
		UserID:                userID,
		FBS:                   coalesceFloat64(req.FBS, 0),
		HbA1c:                 coalesceFloat64(req.HbA1c, 0),
		Cholesterol:           coalesceInt(req.Cholesterol, 0),
		LDL:                   coalesceInt(req.LDL, 0),
		HDL:                   coalesceInt(req.HDL, 0),
		Triglycerides:         coalesceInt(req.Triglycerides, 0),
		Systolic:              coalesceInt(req.Systolic, 0),
		Diastolic:             coalesceInt(req.Diastolic, 0),
		WaistCircumference:    coalesceFloat64(req.WaistCircumference, 0),
		FamilyHistoryDiabetes: coalesceBool(req.FamilyHistoryDiabetes, false),
		Age:                   age,
		Activity:              req.Activity,
		Alcohol:               req.Alcohol,
		HistoryFlag:           req.HistoryFlag,
		Smoking:               req.Smoking,
		Hypertension:          req.Hypertension,
		HeartDisease:          req.HeartDisease,
		BMI:                   coalesceFloat64(req.BMI, 0),
		IsSelfReported:        true,
		Source:                "manual",
	}
	if assessment.Alcohol == "" {
		assessment.Alcohol = "Unknown"
	}

	// Validate biomarker ranges before ML prediction (clinical safety)
	validationResult := ml.ValidateBiomarkers(assessment, h.thresholds)
	applyValidationStatus(&assessment, validationResult)

	// Get prediction from ML server
	// Pass request context for cancellation support
	prediction, err := h.predictor.PredictWithModelType(c.Request.Context(), assessment, req.ModelType)
	if err != nil {
		log.Printf("Failed to get ML prediction: %v", err)
		ErrInternal(c, "Failed to get prediction from ML service")
		return
	}

	responseModelVersion := h.modelVer
	if req.ModelType != "" {
		responseModelVersion = req.ModelType
	}
	applyCanonicalPredictionResult(&assessment, prediction)
	ensureAssessmentLineage(&assessment, responseModelVersion, h.datasetHash)

	// Create assessment in database
	created, err := h.store.Assessments().Create(c.Request.Context(), assessment)
	if err != nil {
		log.Printf("Failed to create assessment: %v", err)
		ErrInternal(c, "Failed to create assessment")
		return
	}

	// Get full assessment with model info
	assessment.ID = created.ID
	c.Set(middleware.AuditTargetIDContextKey, int(assessment.ID))
	ensureAssessmentLineage(&assessment, responseModelVersion, h.datasetHash)

	h.invalidateUserCache(c.Request.Context(), userID)

	// Reset last assessment reminder sent date (UpdateLastLogin as proxy, or ignore)
	if err := h.store.Users().UpdateLastLogin(c.Request.Context(), int32(userID)); err != nil {
		log.Printf("[WARN] Failed to update last login for user %d: %v", userID, err)
	}

	c.JSON(http.StatusCreated, assessment)
}

// List returns all assessments for the logged-in user
func (h *AssessmentsHandler) List(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		ErrUnauthorized(c)
		return
	}

	assessments, err := h.store.Assessments().ListAllLimitedByUser(c.Request.Context(), int32(userID), 100)
	if err != nil {
		log.Printf("[ERROR] Failed to list assessments: %v", err)
		ErrInternal(c, "Failed to retrieve assessments")
		return
	}
	activeModelMetadata, metadataErr := h.predictor.GetActiveModelMetadata(c.Request.Context())
	if metadataErr != nil {
		log.Printf("[WARN] Failed to fetch active model metadata for assessment capabilities: %v", metadataErr)
	}
	for i := range assessments {
		h.ensureAssessmentCapabilities(c.Request.Context(), &assessments[i], activeModelMetadata)
	}

	c.JSON(http.StatusOK, assessments)
}

// Get returns a single assessment
func (h *AssessmentsHandler) Get(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		ErrUnauthorized(c)
		return
	}
	assessmentIDStr := c.Param("assessmentID")
	assessmentID, err := strconv.ParseInt(assessmentIDStr, 10, 64)
	if err != nil {
		ErrBadRequest(c, "Invalid assessment ID")
		return
	}

	assessment, err := h.store.Assessments().Get(c.Request.Context(), int32(assessmentID))
	if err != nil {
		ErrNotFound(c, "Assessment")
		return
	}

	// Verify ownership
	if assessment.UserID != userID {
		ErrForbidden(c)
		return
	}

	h.ensureAssessmentCapabilities(c.Request.Context(), assessment, nil)

	c.JSON(http.StatusOK, assessment)
}

// Update modifies an existing assessment
func (h *AssessmentsHandler) Update(c *gin.Context) {
	claims, err := getUserClaims(c)
	if err != nil {
		ErrUnauthorized(c)
		return
	}
	userID := int64(claims.UserID)
	assessmentIDStr := c.Param("assessmentID")
	assessmentID, err := strconv.ParseInt(assessmentIDStr, 10, 64)
	if err != nil {
		ErrBadRequest(c, "Invalid assessment ID")
		return
	}

	var req models.UpdateAssessmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[ERROR] Assessment validation failed: %v", err)
		ErrBadRequest(c, "Invalid request payload")
		return
	}

	// Verify ownership first
	assessment, err := h.store.Assessments().Get(c.Request.Context(), int32(assessmentID))
	if err != nil {
		ErrNotFound(c, "Assessment")
		return
	}

	if assessment.UserID != userID {
		ErrForbidden(c)
		return
	}

	// Update assessment with new values
	assessment.FBS = coalesceFloat64(req.FBS, assessment.FBS)
	assessment.HbA1c = coalesceFloat64(req.HbA1c, assessment.HbA1c)
	assessment.Cholesterol = coalesceInt(req.Cholesterol, assessment.Cholesterol)
	assessment.LDL = coalesceInt(req.LDL, assessment.LDL)
	assessment.HDL = coalesceInt(req.HDL, assessment.HDL)
	assessment.Triglycerides = coalesceInt(req.Triglycerides, assessment.Triglycerides)
	assessment.Systolic = coalesceInt(req.Systolic, assessment.Systolic)
	assessment.Diastolic = coalesceInt(req.Diastolic, assessment.Diastolic)
	assessment.WaistCircumference = coalesceFloat64(req.WaistCircumference, assessment.WaistCircumference)
	assessment.FamilyHistoryDiabetes = coalesceBool(req.FamilyHistoryDiabetes, assessment.FamilyHistoryDiabetes)
	assessment.Activity = req.Activity
	assessment.Alcohol = req.Alcohol
	assessment.HistoryFlag = req.HistoryFlag
	assessment.Smoking = req.Smoking
	assessment.Hypertension = req.Hypertension
	assessment.HeartDisease = req.HeartDisease
	assessment.BMI = coalesceFloat64(req.BMI, assessment.BMI)
	assessment.Notes = req.Notes
	resolvedAge, resolveAgeErr := h.resolveAssessmentAge(c.Request.Context(), userID, req.Age, assessment.Age)
	if resolveAgeErr != nil {
		log.Printf("[ERROR] Failed to resolve user age for assessment update: %v", resolveAgeErr)
		ErrInternal(c, "Failed to resolve age for prediction")
		return
	}
	assessment.Age = resolvedAge
	if assessment.Age < canonicalAssessmentMinAge || assessment.Age > canonicalAssessmentMaxAge {
		ErrBadRequest(c, canonicalAssessmentAgeErr)
		return
	}
	if assessment.Alcohol == "" {
		assessment.Alcohol = "Unknown"
	}

	if req.ModelType != "" && req.ModelType != "ada" && req.ModelType != "binary_v2_no_bp" && req.ModelType != "binary_v2_bp" {
		ErrBadRequest(c, "Invalid model type")
		return
	}

	if strings.ToLower(claims.Role) == "doctor" {
		if req.ModelType != "" && req.ModelType != doctorLockedModelType {
			ErrForbidden(c)
			return
		}
		req.ModelType = doctorLockedModelType
	}

	modelType := req.ModelType
	if modelType == "" {
		if assessment.ModelVersion != "" {
			modelType = assessment.ModelVersion
		} else {
			modelType = h.modelVer
		}
	}

	validationResult := ml.ValidateBiomarkers(*assessment, h.thresholds)
	applyValidationStatus(assessment, validationResult)

	// Re-predict with updated values
	// Pass request context for cancellation support
	prediction, err := h.predictor.PredictWithModelType(c.Request.Context(), *assessment, modelType)
	if err != nil {
		log.Printf("Failed to get ML prediction on update: %v", err)
		ErrInternal(c, "Failed to get prediction from ML service")
		return
	}

	applyCanonicalPredictionResult(assessment, prediction)
	ensureAssessmentLineage(assessment, modelType, h.datasetHash)

	updated, err := h.store.Assessments().Update(c.Request.Context(), *assessment)
	if err != nil {
		log.Printf("Failed to update assessment: %v", err)
		ErrInternal(c, "Failed to update assessment")
		return
	}

	assessment.ID = updated.ID
	ensureAssessmentLineage(assessment, modelType, h.datasetHash)

	h.invalidateUserCache(c.Request.Context(), userID)

	c.JSON(http.StatusOK, assessment)
}

// Delete removes an assessment
func (h *AssessmentsHandler) Delete(c *gin.Context) {
	userID, err := getUserID(c)
	if err != nil {
		ErrUnauthorized(c)
		return
	}
	assessmentIDStr := c.Param("assessmentID")
	assessmentID, err := strconv.ParseInt(assessmentIDStr, 10, 64)
	if err != nil {
		ErrBadRequest(c, "Invalid assessment ID")
		return
	}

	assessment, err := h.store.Assessments().Get(c.Request.Context(), int32(assessmentID))
	if err != nil {
		ErrNotFound(c, "Assessment")
		return
	}

	// Verify ownership
	if assessment.UserID != userID {
		ErrForbidden(c)
		return
	}

	err = h.store.Assessments().Delete(c.Request.Context(), int32(assessmentID))
	if err != nil {
		log.Printf("[ERROR] Failed to delete assessment: %v", err)
		ErrInternal(c, "Failed to delete assessment")
		return
	}

	h.invalidateUserCache(c.Request.Context(), userID)

	c.Status(http.StatusNoContent)
}

// Helper functions
func coalesceFloat64(f *float64, def float64) float64 {
	if f == nil {
		return def
	}
	return *f
}

func coalesceInt(i *int, def int) int {
	if i == nil {
		return def
	}
	return *i
}

func coalesceBool(b *bool, def bool) bool {
	if b == nil {
		return def
	}
	return *b
}
