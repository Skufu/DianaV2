package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/backend/internal/config"
	"github.com/skufu/DianaV2/backend/internal/http/middleware"
	"github.com/skufu/DianaV2/backend/internal/ml"
	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/skufu/DianaV2/backend/internal/store"
)

func TestValidationStatus(t *testing.T) {
	// Uses ml.ValidateBiomarkers + ml.FormatValidationStatus (canonical implementation)
	thresholds := getDefaultTestThresholds()

	cases := []struct {
		name   string
		input  models.Assessment
		expect string
	}{
		{
			name:   "normal values",
			input:  models.Assessment{Triglycerides: 120, LDL: 90, HDL: 55, Systolic: 118, Diastolic: 76, BMI: 22},
			expect: "ok",
		},
		{
			name:   "diabetic fbs and obese bmi",
			input:  models.Assessment{FBS: 130, BMI: 32, HDL: 50},
			expect: "warning:fbs_diabetic_range,bmi_obese",
		},
		{
			name:   "prediabetic hba1c",
			input:  models.Assessment{HbA1c: 6.0, HDL: 50},
			expect: "warning:hba1c_prediabetic",
		},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			result := ml.ValidateBiomarkers(tc.input, thresholds)
			got := ml.FormatValidationStatus(result)
			if got != tc.expect {
				t.Fatalf("expected %s, got %s", tc.expect, got)
			}
		})
	}
}

func TestCalculateRiskLevel(t *testing.T) {
	cases := []struct {
		name  string
		score int
		want  string
	}{
		{name: "unknown when score below range", score: -1, want: "unknown"},
		{name: "low below 30", score: 29, want: "low"},
		{name: "medium at lower bound", score: 30, want: "medium"},
		{name: "medium below upper bound", score: 69, want: "medium"},
		{name: "high at upper tier", score: 70, want: "high"},
		{name: "unknown when score above range", score: 101, want: "unknown"},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			if got := calculateRiskLevel(tc.score); got != tc.want {
				t.Fatalf("expected %s, got %s", tc.want, got)
			}
		})
	}
}

func TestCanonicalRiskLabel(t *testing.T) {
	cases := []struct {
		name      string
		riskLevel string
		fallback  string
		want      string
	}{
		{name: "low label", riskLevel: "low", fallback: "Lower risk", want: "Low Risk"},
		{name: "medium label", riskLevel: "medium", fallback: "Moderate risk", want: "Moderate Risk"},
		{name: "high label", riskLevel: "high", fallback: "High risk", want: "High Risk"},
		{name: "unknown uses fallback when present", riskLevel: "unknown", fallback: "Service fallback", want: "Service fallback"},
		{name: "unknown uses canonical default", riskLevel: "unknown", fallback: "", want: "Unknown Risk"},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			if got := canonicalRiskLabel(tc.riskLevel, tc.fallback); got != tc.want {
				t.Fatalf("expected %s, got %s", tc.want, got)
			}
		})
	}
}

func TestAssessmentsHandler_Create_UsesHTTPPredictor(t *testing.T) {
	gin.SetMode(gin.TestMode)

	modelSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"risk_cluster": "SIDD",
			"risk_score":   87,
			"cluster_capability": map[string]any{
				"supported": true,
			},
			"output_capabilities": map[string]any{
				"metabolic_subtype":   true,
				"cluster_description": true,
				"treatment_focus":     true,
			},
		})
	}))
	defer modelSrv.Close()

	repo := &fakeAssessmentRepo{}
	h := NewAssessmentsHandler(&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}}, ml.NewHTTPPredictor(modelSrv.URL, "v1", "", defaultTestTimeout), nil, "v1", "hash123", getDefaultTestThresholds())

	r := gin.New()
	r.Use(mockAuthMiddleware())
	r.POST("/:id/assessments", h.Create)

	body := bytes.NewBufferString(`{"age":55,"bmi":25,"triglycerides":150,"ldl":120,"hdl":50,"systolic":120,"diastolic":80}`)
	req, _ := http.NewRequest(http.MethodPost, "/123/assessments", body)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", w.Code)
	}
	if repo.last.Cluster != "SIDD" || repo.last.RiskScore != 87 {
		t.Fatalf("expected predictor output stored, got cluster=%s risk=%d", repo.last.Cluster, repo.last.RiskScore)
	}
	if repo.last.ModelVersion != "v1" {
		t.Fatalf("expected model version fallback v1, got %s", repo.last.ModelVersion)
	}
	if repo.last.DatasetHash != "hash123" {
		t.Fatalf("expected dataset hash fallback hash123, got %s", repo.last.DatasetHash)
	}
	if repo.last.DriftBaseline == nil {
		t.Fatalf("expected drift baseline map to be initialized")
	}
}

func TestAssessmentsHandler_Create_RejectsAgeOutsideCanonicalRange(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name string
		age  int
	}{
		{name: "below canonical minimum", age: 44},
		{name: "above canonical maximum", age: 61},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeAssessmentRepo{}
			h := NewAssessmentsHandler(&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}}, &fakePredictor{}, nil, "v1", "hash123", getDefaultTestThresholds())

			r := gin.New()
			r.Use(mockAuthMiddleware())
			r.POST("/:id/assessments", h.Create)

			payload, _ := json.Marshal(map[string]any{
				"age":           tt.age,
				"bmi":           25,
				"triglycerides": 150,
				"ldl":           120,
				"hdl":           50,
				"systolic":      120,
				"diastolic":     80,
			})
			req, _ := http.NewRequest(http.MethodPost, "/123/assessments", bytes.NewReader(payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != http.StatusBadRequest {
				t.Fatalf("expected status 400 for age=%d, got %d", tt.age, w.Code)
			}
			if !strings.Contains(w.Body.String(), canonicalAssessmentAgeErr) {
				t.Fatalf("expected canonical age policy message, got %s", w.Body.String())
			}
			if repo.last.ID != 0 {
				t.Fatalf("expected no assessment to be persisted on invalid age")
			}
		})
	}
}

func TestAssessmentsHandler_Create_AcceptsCanonicalAgeBoundaries(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name string
		age  int
	}{
		{name: "accepts lower boundary", age: 45},
		{name: "accepts upper boundary", age: 60},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeAssessmentRepo{}
			h := NewAssessmentsHandler(
				&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}},
				&fakePredictor{},
				nil,
				"v1",
				"hash123",
				getDefaultTestThresholds(),
			)

			r := gin.New()
			r.Use(mockAuthMiddleware())
			r.POST("/:id/assessments", h.Create)

			payload, _ := json.Marshal(map[string]any{
				"age":           tt.age,
				"bmi":           25,
				"triglycerides": 150,
				"ldl":           120,
				"hdl":           50,
				"systolic":      120,
				"diastolic":     80,
			})
			req, _ := http.NewRequest(http.MethodPost, "/123/assessments", bytes.NewReader(payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != http.StatusCreated {
				t.Fatalf("expected status 201 for age=%d, got %d", tt.age, w.Code)
			}
			if repo.last.Age != tt.age {
				t.Fatalf("expected persisted age=%d, got %d", tt.age, repo.last.Age)
			}
		})
	}
}

func TestAssessmentsHandler_Create_TransportsCanonicalWarningStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &fakeAssessmentRepo{}
	h := NewAssessmentsHandler(
		&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}},
		&fakePredictor{},
		nil,
		"v1",
		"hash123",
		getDefaultTestThresholds(),
	)

	r := gin.New()
	r.Use(mockAuthMiddleware())
	r.POST("/:id/assessments", h.Create)

	payload, _ := json.Marshal(map[string]any{
		"age":           55,
		"bmi":           32,
		"fbs":           130,
		"triglycerides": 120,
		"ldl":           90,
		"hdl":           50,
		"systolic":      120,
		"diastolic":     80,
	})
	req, _ := http.NewRequest(http.MethodPost, "/123/assessments", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", w.Code)
	}

	var response map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}

	rawValidationStatus, ok := response["validation_status"].(string)
	if !ok || rawValidationStatus == "" {
		t.Fatalf("expected canonical validation_status string in response, got %#v", response["validation_status"])
	}
	if !strings.HasPrefix(rawValidationStatus, "warning:") {
		t.Fatalf("expected canonical warning transport prefix warning:, got %q", rawValidationStatus)
	}
	if !strings.Contains(rawValidationStatus, "fbs_diabetic_range") {
		t.Fatalf("expected validation_status to include fbs_diabetic_range, got %q", rawValidationStatus)
	}
	if !strings.Contains(rawValidationStatus, "bmi_obese") {
		t.Fatalf("expected validation_status to include bmi_obese, got %q", rawValidationStatus)
	}
	if _, exists := response["validation_warnings"]; exists {
		t.Fatalf("did not expect legacy validation_warnings field in response")
	}
	if _, exists := response["warning"]; exists {
		t.Fatalf("did not expect legacy warning field in response")
	}
	if repo.last.ValidationStatus != rawValidationStatus {
		t.Fatalf("expected persisted validation_status %q to match response %q", repo.last.ValidationStatus, rawValidationStatus)
	}
}

func TestAssessmentsHandler_Create_DoctorRoleRejectsNonNoBPModel(t *testing.T) {
	gin.SetMode(gin.TestMode)

	repo := &fakeAssessmentRepo{}
	h := NewAssessmentsHandler(
		&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}},
		&fakePredictor{},
		nil,
		"binary_v2_no_bp",
		"hash123",
		getDefaultTestThresholds(),
	)

	r := gin.New()
	r.Use(mockAuthMiddlewareWithRole("doctor"))
	r.POST("/:id/assessments", h.Create)

	payload, _ := json.Marshal(map[string]any{
		"age":           55,
		"bmi":           25,
		"triglycerides": 150,
		"ldl":           120,
		"hdl":           50,
		"model_type":    "ada",
	})
	req, _ := http.NewRequest(http.MethodPost, "/1/assessments", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected status 403 for doctor override model, got %d", w.Code)
	}
	if repo.last.ID != 0 {
		t.Fatalf("expected no assessment to be persisted when doctor requests disallowed model")
	}
}

func TestAssessmentsHandler_Create_DoctorRoleForcesNoBPModel(t *testing.T) {
	gin.SetMode(gin.TestMode)

	predictor := &fakePredictor{}
	repo := &fakeAssessmentRepo{}
	h := NewAssessmentsHandler(
		&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}},
		predictor,
		nil,
		"binary_v2_no_bp",
		"hash123",
		getDefaultTestThresholds(),
	)

	r := gin.New()
	r.Use(mockAuthMiddlewareWithRole("doctor"))
	r.POST("/:id/assessments", h.Create)

	payload, _ := json.Marshal(map[string]any{
		"age":           55,
		"bmi":           25,
		"triglycerides": 150,
		"ldl":           120,
		"hdl":           50,
	})
	req, _ := http.NewRequest(http.MethodPost, "/1/assessments", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201 for doctor no-BP request, got %d", w.Code)
	}
	if predictor.lastModelType != doctorLockedModelType {
		t.Fatalf("expected predictor model type %q, got %q", doctorLockedModelType, predictor.lastModelType)
	}
	if repo.last.ModelVersion != doctorLockedModelType {
		t.Fatalf("expected persisted model version %q, got %q", doctorLockedModelType, repo.last.ModelVersion)
	}
}

func TestAssessmentsHandler_Create_DoctorRoleCaseInsensitive(t *testing.T) {
	gin.SetMode(gin.TestMode)

	testCases := []struct {
		name       string
		role       string
		modelType  string
		wantStatus int
	}{
		{
			name:       "uppercase DOCTOR forces locked model",
			role:       "DOCTOR",
			modelType:  "",
			wantStatus: http.StatusCreated,
		},
		{
			name:       "mixed case Doctor forces locked model",
			role:       "Doctor",
			modelType:  "",
			wantStatus: http.StatusCreated,
		},
		{
			name:       "uppercase DOCTOR rejects non-locked model",
			role:       "DOCTOR",
			modelType:  "ada",
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "mixed case Doctor rejects non-locked model",
			role:       "Doctor",
			modelType:  "ada",
			wantStatus: http.StatusForbidden,
		},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			predictor := &fakePredictor{}
			repo := &fakeAssessmentRepo{}
			h := NewAssessmentsHandler(
				&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}},
				predictor,
				nil,
				"binary_v2_no_bp",
				"hash123",
				getDefaultTestThresholds(),
			)

			r := gin.New()
			r.Use(mockAuthMiddlewareWithRole(tc.role))
			r.POST("/:id/assessments", h.Create)

			payload, _ := json.Marshal(map[string]any{
				"age":           55,
				"bmi":           25,
				"triglycerides": 150,
				"ldl":           120,
				"hdl":           50,
				"model_type":    tc.modelType,
			})
			req, _ := http.NewRequest(http.MethodPost, "/1/assessments", bytes.NewReader(payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tc.wantStatus {
				t.Fatalf("expected status %d for role %q, got %d", tc.wantStatus, tc.role, w.Code)
			}

			if tc.wantStatus == http.StatusCreated {
				if predictor.lastModelType != doctorLockedModelType {
					t.Fatalf("expected predictor model type %q, got %q", doctorLockedModelType, predictor.lastModelType)
				}
			}
		})
	}
}

func TestAssessmentsHandler_Update_DoctorRoleRejectsNonNoBPModel(t *testing.T) {
	gin.SetMode(gin.TestMode)

	predictor := &fakePredictor{}
	repo := &fakeAssessmentRepo{
		existing: &models.Assessment{
			ID:            99,
			UserID:        1,
			Age:           55,
			BMI:           25,
			Triglycerides: 150,
			LDL:           120,
			HDL:           50,
			ModelVersion:  doctorLockedModelType,
		},
	}
	h := NewAssessmentsHandler(
		&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}},
		predictor,
		nil,
		doctorLockedModelType,
		"hash123",
		getDefaultTestThresholds(),
	)

	r := gin.New()
	r.Use(mockAuthMiddlewareWithRole("doctor"))
	r.PUT("/:id/assessments/:assessmentID", h.Update)

	payload, _ := json.Marshal(map[string]any{
		"model_type": "ada",
	})
	req, _ := http.NewRequest(http.MethodPut, "/1/assessments/99", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected status 403 for doctor update model override, got %d", w.Code)
	}
	if predictor.lastModelType != "" {
		t.Fatalf("expected predictor not to be called on forbidden doctor update")
	}
	if repo.updateCalled {
		t.Fatalf("expected no persistence when doctor update model override is rejected")
	}
}

func TestAssessmentsHandler_Update_DoctorRoleForcesNoBPModel(t *testing.T) {
	gin.SetMode(gin.TestMode)

	predictor := &fakePredictor{}
	repo := &fakeAssessmentRepo{
		existing: &models.Assessment{
			ID:            42,
			UserID:        1,
			Age:           55,
			BMI:           25,
			Triglycerides: 150,
			LDL:           120,
			HDL:           50,
			ModelVersion:  doctorLockedModelType,
		},
	}
	h := NewAssessmentsHandler(
		&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}},
		predictor,
		nil,
		doctorLockedModelType,
		"hash123",
		getDefaultTestThresholds(),
	)

	r := gin.New()
	r.Use(mockAuthMiddlewareWithRole("doctor"))
	r.PUT("/:id/assessments/:assessmentID", h.Update)

	payload, _ := json.Marshal(map[string]any{
		"notes": "doctor update without model override",
	})
	req, _ := http.NewRequest(http.MethodPut, "/1/assessments/42", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200 for doctor update, got %d", w.Code)
	}
	if predictor.lastModelType != doctorLockedModelType {
		t.Fatalf("expected forced model type %q, got %q", doctorLockedModelType, predictor.lastModelType)
	}
	if !repo.updateCalled {
		t.Fatalf("expected update repository call to execute")
	}
	if repo.last.ModelVersion != doctorLockedModelType {
		t.Fatalf("expected persisted model version %q, got %q", doctorLockedModelType, repo.last.ModelVersion)
	}
}

func TestAssessmentsHandler_Update_DoctorRoleCaseInsensitive(t *testing.T) {
	gin.SetMode(gin.TestMode)

	testCases := []struct {
		name       string
		role       string
		modelType  string
		wantStatus int
	}{
		{
			name:       "uppercase DOCTOR forces locked model",
			role:       "DOCTOR",
			modelType:  "",
			wantStatus: http.StatusOK,
		},
		{
			name:       "mixed case Doctor forces locked model",
			role:       "Doctor",
			modelType:  "",
			wantStatus: http.StatusOK,
		},
		{
			name:       "uppercase DOCTOR rejects non-locked model",
			role:       "DOCTOR",
			modelType:  "ada",
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "mixed case Doctor rejects non-locked model",
			role:       "Doctor",
			modelType:  "ada",
			wantStatus: http.StatusForbidden,
		},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			predictor := &fakePredictor{}
			repo := &fakeAssessmentRepo{
				existing: &models.Assessment{
					ID:            42,
					UserID:        1,
					Age:           55,
					BMI:           25,
					Triglycerides: 150,
					LDL:           120,
					HDL:           50,
					ModelVersion:  doctorLockedModelType,
				},
			}
			h := NewAssessmentsHandler(
				&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}},
				predictor,
				nil,
				doctorLockedModelType,
				"hash123",
				getDefaultTestThresholds(),
			)

			r := gin.New()
			r.Use(mockAuthMiddlewareWithRole(tc.role))
			r.PUT("/:id/assessments/:assessmentID", h.Update)

			payload := map[string]any{
				"notes": "doctor update",
			}
			if tc.modelType != "" {
				payload["model_type"] = tc.modelType
			}
			payloadBytes, _ := json.Marshal(payload)
			req, _ := http.NewRequest(http.MethodPut, "/1/assessments/42", bytes.NewReader(payloadBytes))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != tc.wantStatus {
				t.Fatalf("expected status %d for role %q, got %d", tc.wantStatus, tc.role, w.Code)
			}

			if tc.wantStatus == http.StatusOK {
				if predictor.lastModelType != doctorLockedModelType {
					t.Fatalf("expected forced model type %q, got %q", doctorLockedModelType, predictor.lastModelType)
				}
			}
		})
	}
}

func TestAssessmentsHandler_CreateAndUpdate_ModelTypeValidationConsistency(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Test that both Create and Update handlers accept the same model types
	// and both reject "clinical" (VAL-MODEL-004)
	validModelTypes := []string{"ada", "binary_v2_no_bp", "binary_v2_bp"}
	invalidModelType := "clinical"

	t.Run("Create rejects clinical model type", func(t *testing.T) {
		repo := &fakeAssessmentRepo{}
		h := NewAssessmentsHandler(
			&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}},
			&fakePredictor{},
			nil,
			"binary_v2_no_bp",
			"hash123",
			getDefaultTestThresholds(),
		)

		r := gin.New()
		r.Use(mockAuthMiddlewareWithRole("admin"))
		r.POST("/:id/assessments", h.Create)

		payload, _ := json.Marshal(map[string]any{
			"age":           55,
			"bmi":           25,
			"triglycerides": 150,
			"ldl":           120,
			"hdl":           50,
			"model_type":    invalidModelType,
		})
		req, _ := http.NewRequest(http.MethodPost, "/1/assessments", bytes.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status 400 for clinical model type in Create, got %d", w.Code)
		}
		// Validation happens at struct binding level with oneof tag
		if !strings.Contains(w.Body.String(), "Invalid") {
			t.Fatalf("expected 'Invalid' error message, got %s", w.Body.String())
		}
	})

	t.Run("Update rejects clinical model type", func(t *testing.T) {
		predictor := &fakePredictor{}
		repo := &fakeAssessmentRepo{
			existing: &models.Assessment{
				ID:            42,
				UserID:        1,
				Age:           55,
				BMI:           25,
				Triglycerides: 150,
				LDL:           120,
				HDL:           50,
				ModelVersion:  "binary_v2_no_bp",
			},
		}
		h := NewAssessmentsHandler(
			&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}},
			predictor,
			nil,
			"binary_v2_no_bp",
			"hash123",
			getDefaultTestThresholds(),
		)

		r := gin.New()
		r.Use(mockAuthMiddlewareWithRole("admin"))
		r.PUT("/:id/assessments/:assessmentID", h.Update)

		payload, _ := json.Marshal(map[string]any{
			"model_type": invalidModelType,
		})
		req, _ := http.NewRequest(http.MethodPut, "/1/assessments/42", bytes.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")

		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected status 400 for clinical model type in Update, got %d", w.Code)
		}
		// Validation happens at struct binding level with oneof tag
		if !strings.Contains(w.Body.String(), "Invalid") {
			t.Fatalf("expected 'Invalid' error message, got %s", w.Body.String())
		}
	})

	for _, modelType := range validModelTypes {
		modelType := modelType
		t.Run(fmt.Sprintf("Create accepts valid model type %s", modelType), func(t *testing.T) {
			predictor := &fakePredictor{}
			repo := &fakeAssessmentRepo{}
			h := NewAssessmentsHandler(
				&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}},
				predictor,
				nil,
				"binary_v2_no_bp",
				"hash123",
				getDefaultTestThresholds(),
			)

			r := gin.New()
			r.Use(mockAuthMiddlewareWithRole("admin"))
			r.POST("/:id/assessments", h.Create)

			payload, _ := json.Marshal(map[string]any{
				"age":           55,
				"bmi":           25,
				"triglycerides": 150,
				"ldl":           120,
				"hdl":           50,
				"model_type":    modelType,
			})
			req, _ := http.NewRequest(http.MethodPost, "/1/assessments", bytes.NewReader(payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != http.StatusCreated {
				t.Fatalf("expected status 201 for model type %s in Create, got %d", modelType, w.Code)
			}
		})

		t.Run(fmt.Sprintf("Update accepts valid model type %s", modelType), func(t *testing.T) {
			predictor := &fakePredictor{}
			repo := &fakeAssessmentRepo{
				existing: &models.Assessment{
					ID:            42,
					UserID:        1,
					Age:           55,
					BMI:           25,
					Triglycerides: 150,
					LDL:           120,
					HDL:           50,
					ModelVersion:  "binary_v2_no_bp",
				},
			}
			h := NewAssessmentsHandler(
				&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}},
				predictor,
				nil,
				"binary_v2_no_bp",
				"hash123",
				getDefaultTestThresholds(),
			)

			r := gin.New()
			r.Use(mockAuthMiddlewareWithRole("admin"))
			r.PUT("/:id/assessments/:assessmentID", h.Update)

			payload, _ := json.Marshal(map[string]any{
				"model_type": modelType,
			})
			req, _ := http.NewRequest(http.MethodPut, "/1/assessments/42", bytes.NewReader(payload))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			r.ServeHTTP(w, req)

			if w.Code != http.StatusOK {
				t.Fatalf("expected status 200 for model type %s in Update, got %d", modelType, w.Code)
			}
		})
	}
}

func TestAssessmentsHandler_Update_AdminRoleAllowsAlternateModel(t *testing.T) {
	gin.SetMode(gin.TestMode)

	predictor := &fakePredictor{}
	repo := &fakeAssessmentRepo{
		existing: &models.Assessment{
			ID:            7,
			UserID:        1,
			Age:           55,
			BMI:           25,
			Triglycerides: 150,
			LDL:           120,
			HDL:           50,
			ModelVersion:  doctorLockedModelType,
		},
	}
	h := NewAssessmentsHandler(
		&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}},
		predictor,
		nil,
		doctorLockedModelType,
		"hash123",
		getDefaultTestThresholds(),
	)

	r := gin.New()
	r.Use(mockAuthMiddlewareWithRole("admin"))
	r.PUT("/:id/assessments/:assessmentID", h.Update)

	payload, _ := json.Marshal(map[string]any{
		"model_type": "ada",
		"fbs":        126,
		"hba1c":      6.5,
	})
	req, _ := http.NewRequest(http.MethodPut, "/1/assessments/7", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200 for admin update, got %d", w.Code)
	}
	if predictor.lastModelType != "ada" {
		t.Fatalf("expected admin-selected model type ada, got %q", predictor.lastModelType)
	}
	if !repo.updateCalled {
		t.Fatalf("expected admin update to persist successfully")
	}
}

func TestAssessmentsHandler_Create_HTTPPredictorError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	modelSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer modelSrv.Close()

	repo := &fakeAssessmentRepo{}
	h := NewAssessmentsHandler(&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}}, ml.NewHTTPPredictor(modelSrv.URL, "v1", "", defaultTestTimeout), nil, "v1", "hash123", getDefaultTestThresholds())

	r := gin.New()
	r.Use(mockAuthMiddleware())
	r.POST("/:id/assessments", h.Create)

	body := bytes.NewBufferString(`{"age":55,"bmi":22,"triglycerides":140,"ldl":110,"hdl":55,"systolic":118,"diastolic":76}`)
	req, _ := http.NewRequest(http.MethodPost, "/5/assessments", body)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	// ML failures should fail request instead of silently storing mock predictions.
	if w.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500 when ML fails, got %d", w.Code)
	}
}

func TestAssessmentsHandler_Create_StoresPredictionFromRealValues(t *testing.T) {
	gin.SetMode(gin.TestMode)

	modelSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"risk_cluster":        "SIRD",
			"risk_score":          72,
			"predicted_status":    "Diabetic",
			"risk_label":          "High risk",
			"cluster_description": "Severe insulin-resistant diabetes profile.",
			"treatment_focus":     "Lifestyle + insulin sensitivity",
			"at_risk_probability": 0.82,
			"model_version":       "binary_v2_no_bp@2026.03",
			"dataset_hash":        "dataset-sha-abc",
			"drift_baseline": map[string]any{
				"baseline_id":            "baseline-2026q1",
				"baseline_version":       "3",
				"model_version":          "binary_v2_no_bp@2026.03",
				"dataset_hash":           "dataset-sha-abc",
				"feature_schema_version": "features:9",
				"source_kind":            "release_holdout",
				"created_at":             "2026-03-01T00:00:00Z",
				"stale_after":            "2026-06-01T00:00:00Z",
				"sample_count":           412,
				"reference_features":     []string{"bmi", "triglycerides", "ldl", "hdl", "age"},
				"lineage_status":         "healthy",
			},
			"feature_set": map[string]any{
				"features":      []string{"bmi", "triglycerides", "ldl", "hdl", "age"},
				"feature_count": 5,
				"source":        "features.json",
			},
			"cluster_capability": map[string]any{
				"supported":       true,
				"required_inputs": []string{"bmi", "triglycerides", "ldl", "hdl", "age", "waist_circumference"},
				"output_field":    "metabolic_subtype",
				"alias_field":     "risk_cluster",
			},
			"output_capabilities": map[string]any{
				"predicted_status":      true,
				"risk_score":            true,
				"at_risk_probability":   true,
				"prediction_confidence": true,
				"metabolic_subtype":     true,
				"risk_label":            true,
				"cluster_description":   true,
				"treatment_focus":       true,
			},
		})
	}))
	defer modelSrv.Close()

	repo := &fakeAssessmentRepo{}
	h := NewAssessmentsHandler(
		&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}},
		ml.NewHTTPPredictor(modelSrv.URL, "binary_v2_no_bp", "", defaultTestTimeout),
		nil,
		"binary_v2_no_bp",
		"hash123",
		getDefaultTestThresholds(),
	)

	r := gin.New()
	r.Use(mockAuthMiddleware())
	r.POST("/:id/assessments", h.Create)

	body := bytes.NewBufferString(`{"age":55,"bmi":32,"triglycerides":210,"ldl":160,"hdl":42,"systolic":142,"diastolic":90,"hba1c":6.5,"fbs":126}`)
	req, _ := http.NewRequest(http.MethodPost, "/1/assessments", body)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", w.Code)
	}
	if repo.last.Cluster != "SIRD" {
		t.Fatalf("expected cluster SIRD, got %s", repo.last.Cluster)
	}
	if repo.last.RiskScore != 72 {
		t.Fatalf("expected risk score 72, got %d", repo.last.RiskScore)
	}
	if repo.last.RiskLevel != "high" {
		t.Fatalf("expected risk level high, got %s", repo.last.RiskLevel)
	}
	if repo.last.PredictedStatus != "Diabetic" {
		t.Fatalf("expected predicted status Diabetic, got %s", repo.last.PredictedStatus)
	}
	if repo.last.RiskLabel != "High Risk" {
		t.Fatalf("expected canonical risk label High Risk, got %s", repo.last.RiskLabel)
	}
	if repo.last.ClusterDescription == "" || repo.last.TreatmentFocus == "" {
		t.Fatalf("expected cluster metadata populated")
	}
	if repo.last.AtRiskProbability <= 0 {
		t.Fatalf("expected at risk probability to be set")
	}
	if repo.last.ModelVersion != "binary_v2_no_bp@2026.03" {
		t.Fatalf("expected lineage model version from ML response, got %s", repo.last.ModelVersion)
	}
	if repo.last.DatasetHash != "dataset-sha-abc" {
		t.Fatalf("expected lineage dataset hash from ML response, got %s", repo.last.DatasetHash)
	}
	if repo.last.DriftBaseline == nil {
		t.Fatalf("expected drift baseline lineage metadata to be set")
	}
	if baselineID, ok := repo.last.DriftBaseline["baseline_id"].(string); !ok || baselineID != "baseline-2026q1" {
		t.Fatalf("expected drift baseline id baseline-2026q1, got %v", repo.last.DriftBaseline["baseline_id"])
	}
	if lineageStatus, ok := repo.last.DriftBaseline["lineage_status"].(string); !ok || lineageStatus != "healthy" {
		t.Fatalf("expected drift baseline lineage status healthy, got %v", repo.last.DriftBaseline["lineage_status"])
	}
	if repo.last.OutputCapabilities == nil {
		t.Fatalf("expected output capabilities to be populated")
	}
	if supported, ok := repo.last.OutputCapabilities["metabolic_subtype"].(bool); !ok || !supported {
		t.Fatalf("expected metabolic_subtype output capability to be true")
	}
	if repo.last.ClusterCapability == nil {
		t.Fatalf("expected cluster capability to be populated")
	}
	if supported, ok := repo.last.ClusterCapability["supported"].(bool); !ok || !supported {
		t.Fatalf("expected cluster capability supported=true")
	}
	if repo.last.FeatureSet == nil {
		t.Fatalf("expected feature set metadata to be populated")
	}
	if source, ok := repo.last.FeatureSet["source"].(string); !ok || source == "" {
		t.Fatalf("expected feature set source metadata")
	}
	if !strings.Contains(repo.last.ValidationStatus, "bmi_obese") {
		t.Fatalf("expected validation status to include bmi_obese, got %s", repo.last.ValidationStatus)
	}
	if !strings.Contains(repo.last.ValidationStatus, "hba1c_diabetic") {
		t.Fatalf("expected validation status to include hba1c_diabetic, got %s", repo.last.ValidationStatus)
	}
}

func TestAssessmentsHandler_Create_LineageUsesPredictionAndFlagsBaselineMismatch(t *testing.T) {
	gin.SetMode(gin.TestMode)

	modelSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"risk_cluster":     "SIRD",
			"risk_score":       72,
			"predicted_status": "Diabetic",
			"cluster_capability": map[string]any{
				"supported": true,
			},
			"output_capabilities": map[string]any{
				"metabolic_subtype": true,
			},
			"model_version": "binary_v2_no_bp",
			"dataset_hash":  "dataset_v2026_03",
			"drift_baseline": map[string]any{
				"baseline_id":            "baseline-123",
				"baseline_version":       "v4",
				"model_version":          "binary_v2_bp",
				"dataset_hash":           "dataset_v2026_03",
				"feature_schema_version": "features:5",
				"lineage_status":         "healthy",
			},
		})
	}))
	defer modelSrv.Close()

	repo := &fakeAssessmentRepo{}
	h := NewAssessmentsHandler(
		&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}},
		ml.NewHTTPPredictor(modelSrv.URL, "binary_v2_no_bp", "", defaultTestTimeout),
		nil,
		"binary_v2_no_bp",
		"config_dataset_hash",
		getDefaultTestThresholds(),
	)

	r := gin.New()
	r.Use(mockAuthMiddleware())
	r.POST("/:id/assessments", h.Create)

	body := bytes.NewBufferString(`{"age":55,"bmi":32,"triglycerides":210,"ldl":160,"hdl":42,"systolic":142,"diastolic":90,"hba1c":6.5,"fbs":126}`)
	req, _ := http.NewRequest(http.MethodPost, "/1/assessments", body)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", w.Code)
	}
	if repo.last.ModelVersion != "binary_v2_no_bp" {
		t.Fatalf("expected prediction model_version to be preserved, got %s", repo.last.ModelVersion)
	}
	if repo.last.DatasetHash != "dataset_v2026_03" {
		t.Fatalf("expected prediction dataset_hash to be preserved, got %s", repo.last.DatasetHash)
	}
	if repo.last.DriftBaseline == nil {
		t.Fatalf("expected drift baseline metadata to be present")
	}
	if status, ok := repo.last.DriftBaseline["lineage_status"].(string); !ok || status != "reference_mismatch" {
		t.Fatalf("expected drift baseline lineage_status=reference_mismatch, got %#v", repo.last.DriftBaseline["lineage_status"])
	}
	if baselineVersion, ok := repo.last.DriftBaseline["baseline_version"].(string); !ok || baselineVersion != "v4" {
		t.Fatalf("expected drift baseline version to be preserved, got %#v", repo.last.DriftBaseline["baseline_version"])
	}
}

func TestAssessmentsHandler_Create_PersistsBlankClusterForNeutralSentinelWithoutCategoryNoise(t *testing.T) {
	gin.SetMode(gin.TestMode)

	modelSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"risk_cluster":        "N/A",
			"metabolic_subtype":   "N/A",
			"risk_score":          18,
			"predicted_status":    "Normal",
			"risk_label":          "N/A",
			"cluster_description": "",
			"treatment_focus":     "",
			"cluster_capability": map[string]any{
				"supported":    true,
				"output_field": "metabolic_subtype",
				"alias_field":  "risk_cluster",
			},
			"output_capabilities": map[string]any{
				"predicted_status":    true,
				"risk_score":          true,
				"metabolic_subtype":   false,
				"cluster_description": false,
				"treatment_focus":     false,
			},
		})
	}))
	defer modelSrv.Close()

	repo := &fakeAssessmentRepo{}
	h := NewAssessmentsHandler(
		&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}},
		ml.NewHTTPPredictor(modelSrv.URL, "binary_v2_no_bp", "", defaultTestTimeout),
		nil,
		"binary_v2_no_bp",
		"dataset-hash-fallback",
		getDefaultTestThresholds(),
	)

	r := gin.New()
	r.Use(mockAuthMiddleware())
	r.POST("/:id/assessments", h.Create)

	body := bytes.NewBufferString(`{"age":55,"bmi":24.6,"triglycerides":110,"ldl":115,"hdl":58,"systolic":118,"diastolic":76,"hba1c":5.3,"fbs":92}`)
	req, _ := http.NewRequest(http.MethodPost, "/1/assessments", body)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", w.Code)
	}

	if repo.last.Cluster != "" {
		t.Fatalf("expected persisted cluster to stay blank for neutral sentinel path, got %q", repo.last.Cluster)
	}
	if repo.last.Cluster == "N/A" || repo.last.Cluster == "UNKNOWN" {
		t.Fatalf("expected no sentinel/category noise persisted in cluster field, got %q", repo.last.Cluster)
	}
	if repo.last.ClusterDescription != "" {
		t.Fatalf("expected blank cluster_description for neutral sentinel path, got %q", repo.last.ClusterDescription)
	}
	if repo.last.TreatmentFocus != "" {
		t.Fatalf("expected blank treatment_focus for neutral sentinel path, got %q", repo.last.TreatmentFocus)
	}
	if repo.last.RiskScore != 18 {
		t.Fatalf("expected risk score persistence unaffected, got %d", repo.last.RiskScore)
	}
	if repo.last.PredictedStatus != "Normal" {
		t.Fatalf("expected predicted status persistence unaffected, got %q", repo.last.PredictedStatus)
	}
	if repo.last.RiskLevel != "low" {
		t.Fatalf("expected risk level still derived from risk score, got %q", repo.last.RiskLevel)
	}
	if repo.last.RiskLabel != "Low Risk" {
		t.Fatalf("expected canonical risk label to be derived from risk score tier, got %q", repo.last.RiskLabel)
	}

	if repo.last.ClusterCapability == nil {
		t.Fatalf("expected cluster capability payload to persist")
	}
	if supported, ok := repo.last.ClusterCapability["supported"].(bool); !ok || supported {
		t.Fatalf("expected normalized cluster capability supported=false for neutral path, got %#v", repo.last.ClusterCapability["supported"])
	}
	if repo.last.OutputCapabilities == nil {
		t.Fatalf("expected output capabilities payload to persist")
	}
	if enabled, ok := repo.last.OutputCapabilities["metabolic_subtype"].(bool); !ok || enabled {
		t.Fatalf("expected normalized output capability metabolic_subtype=false for neutral path, got %#v", repo.last.OutputCapabilities["metabolic_subtype"])
	}
}

func TestAssessmentsHandler_Create_PersistsAtRiskSubtypeWhenCapabilitySupported(t *testing.T) {
	gin.SetMode(gin.TestMode)

	modelSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"risk_cluster":        "SIRD",
			"metabolic_subtype":   " sird ",
			"risk_score":          79,
			"predicted_status":    "At-Risk",
			"risk_label":          "High Risk",
			"cluster_description": "Insulin resistance dominant profile",
			"treatment_focus":     "Insulin sensitivity and triglyceride control",
			"cluster_capability": map[string]any{
				"supported":    true,
				"output_field": "metabolic_subtype",
				"alias_field":  "risk_cluster",
			},
			"output_capabilities": map[string]any{
				"predicted_status":    true,
				"risk_score":          true,
				"metabolic_subtype":   true,
				"cluster_description": true,
				"treatment_focus":     true,
			},
		})
	}))
	defer modelSrv.Close()

	repo := &fakeAssessmentRepo{}
	h := NewAssessmentsHandler(
		&fakeStore{repo: repo, patientRepo: &fakePatientRepo{}, userRepo: &fakeUserRepo{}},
		ml.NewHTTPPredictor(modelSrv.URL, "binary_v2_no_bp", "", defaultTestTimeout),
		nil,
		"binary_v2_no_bp",
		"dataset-hash-fallback",
		getDefaultTestThresholds(),
	)

	r := gin.New()
	r.Use(mockAuthMiddleware())
	r.POST("/:id/assessments", h.Create)

	body := bytes.NewBufferString(`{"age":55,"bmi":32,"triglycerides":210,"ldl":160,"hdl":42,"systolic":142,"diastolic":90,"hba1c":6.5,"fbs":126}`)
	req, _ := http.NewRequest(http.MethodPost, "/1/assessments", body)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", w.Code)
	}
	if repo.last.Cluster != "SIRD" {
		t.Fatalf("expected at-risk canonical subtype to persist, got %q", repo.last.Cluster)
	}
	if repo.last.RiskScore != 79 {
		t.Fatalf("expected risk score persistence unaffected, got %d", repo.last.RiskScore)
	}
	if repo.last.PredictedStatus != "At-Risk" {
		t.Fatalf("expected predicted status persistence unaffected, got %q", repo.last.PredictedStatus)
	}
	if repo.last.ClusterDescription == "" {
		t.Fatalf("expected cluster_description to persist for supported at-risk subtype path")
	}
	if repo.last.TreatmentFocus == "" {
		t.Fatalf("expected treatment_focus to persist for supported at-risk subtype path")
	}
	if repo.last.RiskLevel != "high" {
		t.Fatalf("expected risk level derived from risk score, got %q", repo.last.RiskLevel)
	}
}

func TestEnsureAssessmentLineage_DefaultBaselineIsHonest(t *testing.T) {
	assessment := &models.Assessment{
		ModelVersion: "binary_v2_no_bp",
		DatasetHash:  "dataset_v2026_03",
	}

	ensureAssessmentLineage(assessment, "", "")

	if assessment.DriftBaseline == nil {
		t.Fatalf("expected default drift baseline")
	}
	if status, ok := assessment.DriftBaseline["lineage_status"].(string); !ok || status != "lineage_incomplete" {
		t.Fatalf("expected default lineage_status=lineage_incomplete, got %#v", assessment.DriftBaseline["lineage_status"])
	}
	if modelVersion, ok := assessment.DriftBaseline["model_version"].(string); !ok || modelVersion != "binary_v2_no_bp" {
		t.Fatalf("expected drift baseline model_version to mirror assessment, got %#v", assessment.DriftBaseline["model_version"])
	}
	if datasetHash, ok := assessment.DriftBaseline["dataset_hash"].(string); !ok || datasetHash != "dataset_v2026_03" {
		t.Fatalf("expected drift baseline dataset_hash to mirror assessment, got %#v", assessment.DriftBaseline["dataset_hash"])
	}
}

func TestApplyCanonicalPredictionResult_GatesClusterSemanticsByCapability(t *testing.T) {
	t.Run("clears cluster semantics when capability unsupported", func(t *testing.T) {
		assessment := &models.Assessment{}
		applyCanonicalPredictionResult(assessment, ml.Prediction{
			Cluster:            "SIRD",
			RiskScore:          64,
			PredictedStatus:    "At-Risk",
			ClusterDescription: "Insulin-resistant profile",
			TreatmentFocus:     "Weight and lipid management",
			OutputCapabilities: ml.OutputCapabilities{
				MetabolicSubtype:   false,
				ClusterDescription: false,
				TreatmentFocus:     false,
			},
			ClusterCapability: ml.ClusterCapability{Supported: false},
		})

		if assessment.Cluster != "" {
			t.Fatalf("expected cluster to be blank when unsupported, got %q", assessment.Cluster)
		}
		if assessment.ClusterDescription != "" {
			t.Fatalf("expected cluster description to be blank when unsupported, got %q", assessment.ClusterDescription)
		}
		if assessment.TreatmentFocus != "" {
			t.Fatalf("expected treatment focus to be blank when unsupported, got %q", assessment.TreatmentFocus)
		}
		if assessment.RiskLevel != "medium" {
			t.Fatalf("expected risk level to still be computed from risk score, got %q", assessment.RiskLevel)
		}
	})

	t.Run("preserves cluster semantics when capability supported", func(t *testing.T) {
		assessment := &models.Assessment{}
		applyCanonicalPredictionResult(assessment, ml.Prediction{
			Cluster:            "SIRD",
			RiskScore:          82,
			PredictedStatus:    "At-Risk",
			ClusterDescription: "Insulin-resistant profile",
			TreatmentFocus:     "Weight and lipid management",
			OutputCapabilities: ml.OutputCapabilities{
				MetabolicSubtype:   true,
				ClusterDescription: true,
				TreatmentFocus:     true,
			},
			ClusterCapability: ml.ClusterCapability{Supported: true},
		})

		if assessment.Cluster != "SIRD" {
			t.Fatalf("expected cluster to be preserved, got %q", assessment.Cluster)
		}
		if assessment.ClusterDescription != "Insulin-resistant profile" {
			t.Fatalf("expected cluster description to be preserved, got %q", assessment.ClusterDescription)
		}
		if assessment.TreatmentFocus != "Weight and lipid management" {
			t.Fatalf("expected treatment focus to be preserved, got %q", assessment.TreatmentFocus)
		}
		if assessment.RiskLevel != "high" {
			t.Fatalf("expected risk level high for score 82, got %q", assessment.RiskLevel)
		}
	})
}

const defaultTestTimeout = 2 * time.Second

func getDefaultTestThresholds() config.ClinicalThresholds {
	return config.ClinicalThresholds{
		HbA1cNormal:             5.7,
		HbA1cPrediabetic:        6.5,
		HbA1cDiabetic:           6.5,
		FBSNormal:               100,
		FBSPrediabetic:          100,
		FBSDiabetic:             126,
		BPSysNormal:             120,
		BPSysElevated:           140,
		BPDiaNormal:             80,
		BMINormal:               23.0,
		BMIOverweight:           25.0,
		BMIObese:                25.0,
		CholesterolHigh:         200,
		CholesterolBorderline:   200,
		LDLHigh:                 100,
		LDLBorderline:           100,
		HDLLow:                  40,
		TriglyceridesHigh:       150,
		TriglyceridesBorderline: 150,
	}
}

type fakePredictor struct {
	lastModelType string
}

func (f *fakePredictor) Predict(ctx context.Context, input models.Assessment) (ml.Prediction, error) {
	return ml.Prediction{}, nil
}

func (f *fakePredictor) PredictWithModelType(ctx context.Context, input models.Assessment, modelType string) (ml.Prediction, error) {
	f.lastModelType = modelType
	return ml.Prediction{}, nil
}

func (f *fakePredictor) GetActiveModelMetadata(ctx context.Context) (*ml.ModelMetadata, error) {
	return nil, nil
}

func (f *fakePredictor) GetDriftStatus(ctx context.Context) (*ml.DriftStatus, error) {
	return nil, nil
}

func (f *fakePredictor) GetDriftAlerts(ctx context.Context, unacknowledgedOnly bool, limit int) (*ml.DriftAlertsEnvelope, error) {
	return nil, nil
}

type fakeStore struct {
	repo        *fakeAssessmentRepo
	patientRepo *fakePatientRepo
	userRepo    *fakeUserRepo
}

func (f *fakeStore) Users() store.UserRepository                 { return f.userRepo }
func (f *fakeStore) Patients() store.PatientRepository           { return f.patientRepo }
func (f *fakeStore) Assessments() store.AssessmentRepository     { return f.repo }
func (f *fakeStore) RefreshTokens() store.RefreshTokenRepository { return nil }
func (f *fakeStore) Cohort() store.CohortRepository              { return nil }
func (f *fakeStore) Clinics() store.ClinicRepository             { return nil }
func (f *fakeStore) AuditEvents() store.AuditEventRepository     { return nil }
func (f *fakeStore) ModelRuns() store.ModelRunRepository         { return nil }
func (f *fakeStore) Close()                                      {}

// mockAuthMiddleware injects mock user claims for testing
func mockAuthMiddleware() gin.HandlerFunc {
	return mockAuthMiddlewareWithRole("admin")
}

func mockAuthMiddlewareWithRole(role string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{
			UserID: 1,
			Email:  "test@example.com",
			Role:   role,
		})
		c.Next()
	}
}

// fakePatientRepo mocks patient repository for tests
type fakePatientRepo struct{}

func (f *fakePatientRepo) List(ctx context.Context, userID int32) ([]models.Patient, error) {
	return nil, nil
}

func (f *fakePatientRepo) Get(ctx context.Context, id int32, userID int32) (*models.Patient, error) {
	return &models.Patient{ID: int64(id), UserID: int64(userID), Name: "Test"}, nil
}

func (f *fakePatientRepo) Create(ctx context.Context, p models.Patient) (*models.Patient, error) {
	return &p, nil
}

func (f *fakePatientRepo) Update(ctx context.Context, p models.Patient) (*models.Patient, error) {
	return &p, nil
}

func (f *fakePatientRepo) Delete(ctx context.Context, id int32, userID int32) error {
	return nil
}

func (f *fakePatientRepo) ListAllLimited(ctx context.Context, userID int32, limit int) ([]models.Patient, error) {
	return nil, nil
}

func (f *fakePatientRepo) ListWithLatestAssessment(ctx context.Context, userID int32) ([]models.PatientSummary, error) {
	return nil, nil
}

func (f *fakePatientRepo) ListWithLatestAssessmentPaginated(ctx context.Context, userID int32, limit, offset int) ([]models.PatientSummary, int, error) {
	return nil, 0, nil
}

func (f *fakePatientRepo) ListPaginated(ctx context.Context, userID int32, limit, offset int) ([]models.Patient, int, error) {
	return nil, 0, nil
}

type fakeAssessmentRepo struct {
	last         models.Assessment
	existing     *models.Assessment
	updateCalled bool
}

func (f *fakeAssessmentRepo) ListByPatient(ctx context.Context, patientID int64) ([]models.Assessment, error) {
	return nil, nil
}

func (f *fakeAssessmentRepo) Get(ctx context.Context, id int32) (*models.Assessment, error) {
	if f.existing == nil {
		return nil, nil
	}

	copy := *f.existing
	return &copy, nil
}

func (f *fakeAssessmentRepo) Create(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	a.ID = 1
	f.last = a
	return &a, nil
}

func (f *fakeAssessmentRepo) Update(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	f.updateCalled = true
	f.last = a
	if f.existing != nil {
		copy := a
		f.existing = &copy
	}
	return &a, nil
}

func (f *fakeAssessmentRepo) Delete(ctx context.Context, id int32) error {
	return nil
}

func (f *fakeAssessmentRepo) ClusterCounts(ctx context.Context) ([]models.ClusterInsights, error) {
	return nil, nil
}

func (f *fakeAssessmentRepo) TrendAverages(ctx context.Context) ([]models.TrendPoint, error) {
	return nil, nil
}

func (f *fakeAssessmentRepo) ListAllLimited(ctx context.Context, limit int) ([]models.Assessment, error) {
	return nil, nil
}

func (f *fakeAssessmentRepo) GetTrend(ctx context.Context, patientID int64) ([]models.AssessmentTrend, error) {
	return nil, nil
}

func (f *fakeAssessmentRepo) ListAllLimitedByUser(ctx context.Context, userID int32, limit int) ([]models.Assessment, error) {
	return nil, nil
}

func (f *fakeAssessmentRepo) ClusterCountsByUser(ctx context.Context, userID int32) ([]models.ClusterInsights, error) {
	return nil, nil
}

func (f *fakeAssessmentRepo) TrendAveragesByUser(ctx context.Context, userID int32) ([]models.TrendPoint, error) {
	return nil, nil
}

func (f *fakeAssessmentRepo) ListByPatientPaginated(ctx context.Context, patientID int64, limit, offset int) ([]models.Assessment, int, error) {
	return nil, 0, nil
}

// fakeUserRepo mocks user repository for tests
type fakeUserRepo struct{}

func (f *fakeUserRepo) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	return nil, nil
}
func (f *fakeUserRepo) FindByID(ctx context.Context, id int32) (*models.User, error) {
	return nil, nil
}
func (f *fakeUserRepo) GetUserByID(ctx context.Context, id int32) (*models.User, error) {
	return nil, nil
}
func (f *fakeUserRepo) List(ctx context.Context, params models.UserListParams) ([]models.User, int, error) {
	return nil, 0, nil
}
func (f *fakeUserRepo) Create(ctx context.Context, user models.User) (*models.User, error) {
	return &user, nil
}
func (f *fakeUserRepo) Update(ctx context.Context, user models.User) (*models.User, error) {
	return &user, nil
}
func (f *fakeUserRepo) UpdateUser(ctx context.Context, user models.User) (*models.User, error) {
	return &user, nil
}
func (f *fakeUserRepo) Deactivate(ctx context.Context, id int32) error {
	return nil
}
func (f *fakeUserRepo) Activate(ctx context.Context, id int32) error {
	return nil
}
func (f *fakeUserRepo) UpdateLastLogin(ctx context.Context, id int32) error {
	return nil
}
func (f *fakeUserRepo) GetUsersForNotification(ctx context.Context) ([]models.UserForNotification, error) {
	return nil, nil
}

// Add missing methods to satisfy updated UserRepository interface
func (f *fakeUserRepo) GetLatestAssessmentByUser(ctx context.Context, userID int64) (*models.Assessment, error) {
	return nil, nil
}
func (f *fakeUserRepo) GetAssessmentCountByUser(ctx context.Context, userID int64) (int, error) {
	return 0, nil
}
func (f *fakeUserRepo) GetUserTrends(ctx context.Context, userID int64, months int) (*models.TrendData, error) {
	return nil, nil
}
func (f *fakeUserRepo) SoftDeleteUser(ctx context.Context, userID int64) error {
	return nil
}
func (f *fakeUserRepo) UpdateUserOnboarding(ctx context.Context, userID int64, completed bool) error {
	return nil
}
func (f *fakeUserRepo) UpdateUserConsent(ctx context.Context, userID int64, consent models.ConsentSettings) error {
	return nil
}
