package handlers

import (
	"bytes"
	"context"
	"encoding/json"
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
	cases := []struct {
		name   string
		input  models.Assessment
		expect string
	}{
		{
			name:   "normal values",
			input:  models.Assessment{Triglycerides: 120, LDL: 110, HDL: 55, Systolic: 118, Diastolic: 76, BMI: 24},
			expect: "ok",
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
		_ = json.NewEncoder(w).Encode(map[string]any{
			"risk_cluster": "SIDD",
			"risk_score":   87,
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
	if repo.last.RiskLabel != "High risk" {
		t.Fatalf("expected risk label High risk, got %s", repo.last.RiskLabel)
	}
	if repo.last.ClusterDescription == "" || repo.last.TreatmentFocus == "" {
		t.Fatalf("expected cluster metadata populated")
	}
	if repo.last.AtRiskProbability <= 0 {
		t.Fatalf("expected at risk probability to be set")
	}
	if !strings.Contains(repo.last.ValidationStatus, "bmi_obese") {
		t.Fatalf("expected validation status to include bmi_obese, got %s", repo.last.ValidationStatus)
	}
	if !strings.Contains(repo.last.ValidationStatus, "hba1c_diabetic") {
		t.Fatalf("expected validation status to include hba1c_diabetic, got %s", repo.last.ValidationStatus)
	}
}

const defaultTestTimeout = 2 * time.Second

func getDefaultTestThresholds() config.ClinicalThresholds {
	return config.ClinicalThresholds{
		HbA1cNormal:             5.7,
		HbA1cPrediabetic:        6.5,
		HbA1cDiabetic:           6.5,
		FBSNormal:               100,
		FBSPrediabetic:          126,
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
	return func(c *gin.Context) {
		c.Set("user", middleware.UserClaims{
			UserID: 1,
			Email:  "test@example.com",
			Role:   "admin",
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
	last models.Assessment
}

func (f *fakeAssessmentRepo) ListByPatient(ctx context.Context, patientID int64) ([]models.Assessment, error) {
	return nil, nil
}

func (f *fakeAssessmentRepo) Get(ctx context.Context, id int32) (*models.Assessment, error) {
	return nil, nil
}

func (f *fakeAssessmentRepo) Create(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	a.ID = 1
	f.last = a
	return &a, nil
}

func (f *fakeAssessmentRepo) Update(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	return nil, nil
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
