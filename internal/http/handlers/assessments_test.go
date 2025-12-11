package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/skufu/DianaV2/internal/ml"
	"github.com/skufu/DianaV2/internal/models"
	"github.com/skufu/DianaV2/internal/store"
)

func TestValidationStatus(t *testing.T) {
	cases := []struct {
		name   string
		input  models.Assessment
		expect string
	}{
		{
			name:   "normal values",
			input:  models.Assessment{FBS: 90, HbA1c: 5.4},
			expect: "ok",
		},
		{
			name:   "prediabetic fasting",
			input:  models.Assessment{FBS: 110, HbA1c: 5.4},
			expect: "warning:fbs_prediabetic_range",
		},
		{
			name:   "diabetic a1c and fasting",
			input:  models.Assessment{FBS: 130, HbA1c: 6.8},
			expect: "warning:fbs_diabetic_range,hba1c_diabetic_range",
		},
		{
			name:   "prediabetic a1c only",
			input:  models.Assessment{FBS: 90, HbA1c: 5.8},
			expect: "warning:hba1c_prediabetic_range",
		},
		{
			name:   "lipids and bp and bmi warnings",
			input:  models.Assessment{Cholesterol: 230, LDL: 170, HDL: 45, Triglycerides: 210, Systolic: 142, Diastolic: 88, BMI: 32},
			expect: "warning:chol_borderline,ldl_high,hdl_low,triglycerides_high,bp_high,bmi_obese",
		},
		{
			name:   "borderline mix",
			input:  models.Assessment{Cholesterol: 205, LDL: 135, HDL: 70, Triglycerides: 160, Systolic: 132, Diastolic: 82, BMI: 27},
			expect: "warning:chol_borderline,ldl_borderline,triglycerides_borderline,bp_elevated,bmi_overweight",
		},
	}

	for _, tc := range cases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			got := validationStatus(tc.input)
			if got != tc.expect {
				t.Fatalf("expected %s, got %s", tc.expect, got)
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
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"cluster":    "SIDD",
			"risk_score": 87,
		})
	}))
	defer modelSrv.Close()

	repo := &fakeAssessmentRepo{}
	h := NewAssessmentsHandler(&fakeStore{repo: repo}, ml.NewHTTPPredictor(modelSrv.URL, "v1", defaultTestTimeout), "v1", "hash123")

	r := gin.New()
	r.POST("/:patientID/assessments", h.create)

	body := bytes.NewBufferString(`{"fbs":110,"hba1c":6.1,"cholesterol":205}`)
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
}

func TestAssessmentsHandler_Create_HTTPPredictorError(t *testing.T) {
	gin.SetMode(gin.TestMode)

	modelSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer modelSrv.Close()

	repo := &fakeAssessmentRepo{}
	h := NewAssessmentsHandler(&fakeStore{repo: repo}, ml.NewHTTPPredictor(modelSrv.URL, "v1", defaultTestTimeout), "v1", "hash123")

	r := gin.New()
	r.POST("/:patientID/assessments", h.create)

	body := bytes.NewBufferString(`{"fbs":95}`)
	req, _ := http.NewRequest(http.MethodPost, "/5/assessments", body)
	req.Header.Set("Content-Type", "application/json")

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", w.Code)
	}
	if repo.last.Cluster != "error" || repo.last.RiskScore != 0 {
		t.Fatalf("expected error cluster when model fails, got cluster=%s risk=%d", repo.last.Cluster, repo.last.RiskScore)
	}
}

const defaultTestTimeout = 2 * time.Second

type fakeStore struct {
	repo *fakeAssessmentRepo
}

func (f *fakeStore) Users() store.UserRepository             { return nil }
func (f *fakeStore) Patients() store.PatientRepository       { return nil }
func (f *fakeStore) Assessments() store.AssessmentRepository { return f.repo }
func (f *fakeStore) Close()                                  {}

type fakeAssessmentRepo struct {
	last models.Assessment
}

func (f *fakeAssessmentRepo) ListByPatient(ctx context.Context, patientID int64) ([]models.Assessment, error) {
	return nil, nil
}

func (f *fakeAssessmentRepo) Create(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	a.ID = 1
	f.last = a
	return &a, nil
}

func (f *fakeAssessmentRepo) ClusterCounts(ctx context.Context) ([]models.ClusterAnalytics, error) {
	return nil, nil
}

func (f *fakeAssessmentRepo) TrendAverages(ctx context.Context) ([]models.TrendPoint, error) {
	return nil, nil
}

func (f *fakeAssessmentRepo) ListAllLimited(ctx context.Context, limit int) ([]models.Assessment, error) {
	return nil, nil
}
