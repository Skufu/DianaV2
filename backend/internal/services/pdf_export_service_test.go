package services

import (
	"os"
	"strings"
	"testing"
	"time"

	"github.com/skufu/DianaV2/backend/internal/models"
)

func TestPDFExportService_GenerateHealthReport(t *testing.T) {
	service := NewPDFExportService()

	now := time.Date(2026, time.January, 14, 10, 30, 0, 0, time.UTC)
	user := models.UserProfile{
		User: models.User{
			ID:        1,
			FirstName: "John",
			LastName:  "Doe",
			Email:     "john.doe@example.com",
		},
	}

	assessments := []models.Assessment{
		{
			ID:        1,
			PatientID: 1,
			HbA1c:     6.5,
			CreatedAt: now,
		},
		{
			ID:        2,
			PatientID: 1,
			HbA1c:     7.0,
			CreatedAt: now.Add(-24 * time.Hour),
		},
	}

	result, err := service.GenerateHealthReport(user, assessments)

	if err != nil {
		t.Errorf("GenerateHealthReport() returned error: %v", err)
	}

	if len(result) == 0 {
		t.Fatal("expected non-empty PDF data")
	}
}

func TestPDFExportService_GenerateHealthReport_IncludesClinicianContextMarkers(t *testing.T) {
	service := NewPDFExportService()

	user := models.UserProfile{
		User: models.User{
			ID:        10,
			FirstName: "Elena",
			LastName:  "Cruz",
			Email:     "elena.cruz@example.com",
		},
	}

	assessments := []models.Assessment{
		{
			ID:                 100,
			UserID:             10,
			RiskScore:          72,
			Cluster:            "SIRD",
			ClusterDescription: "Insulin resistance dominant pattern",
			TreatmentFocus:     "Improve insulin sensitivity with activity and dietary planning",
			PredictedStatus:    "at-risk",
			AtRiskProbability:  0.72,
			ValidationStatus:   "validated_within_range",
			FBS:                131,
			HbA1c:              6.6,
			BMI:                28.7,
			LDL:                141,
			HDL:                45,
			Triglycerides:      188,
			CreatedAt:          time.Date(2026, time.March, 1, 9, 0, 0, 0, time.UTC),
		},
	}

	pdfData, err := service.GenerateHealthReport(user, assessments)
	if err != nil {
		t.Fatalf("GenerateHealthReport() returned error: %v", err)
	}

	pdfText := string(pdfData)

	requiredMarkers := []string{
		"Biomarker Assessment",
		"Metabolic Profile",
		"Clinical Summary",
		"Screening result: at-risk",
		"Confidence: 72%",
		"AI-assisted screening support only; present to your physician for confirmatory diagnostic testing.",
	}

	for _, marker := range requiredMarkers {
		if !strings.Contains(pdfText, marker) {
			t.Fatalf("expected PDF to contain marker %q", marker)
		}
	}
}

func TestPDFExportService_GenerateHealthReport_UsesLatestAssessmentByCreatedAt(t *testing.T) {
	service := NewPDFExportService()

	user := models.UserProfile{User: models.User{ID: 20, Email: "latest.check@example.com"}}

	older := models.Assessment{
		ID:                 200,
		UserID:             20,
		RiskScore:          25,
		Cluster:            "MARD",
		PredictedStatus:    "not-at-risk",
		AtRiskProbability:  0.12,
		ValidationStatus:   "validated_within_range",
		FBS:                90,
		HbA1c:              5.2,
		BMI:                21.4,
		LDL:                92,
		HDL:                58,
		Triglycerides:      108,
		CreatedAt:          time.Date(2026, time.January, 1, 8, 0, 0, 0, time.UTC),
		ClusterDescription: "Older record",
		TreatmentFocus:     "Older plan",
	}

	latest := models.Assessment{
		ID:                 201,
		UserID:             20,
		RiskScore:          81,
		Cluster:            "SIDD",
		PredictedStatus:    "at-risk",
		AtRiskProbability:  0.81,
		ValidationStatus:   "validated_within_range",
		FBS:                140,
		HbA1c:              6.8,
		BMI:                31.2,
		LDL:                170,
		HDL:                37,
		Triglycerides:      220,
		CreatedAt:          time.Date(2026, time.March, 1, 8, 0, 0, 0, time.UTC),
		ClusterDescription: "Most recent record",
		TreatmentFocus:     "Most recent plan",
	}

	// Intentionally unsorted input to ensure service picks latest by timestamp.
	pdfData, err := service.GenerateHealthReport(user, []models.Assessment{older, latest})
	if err != nil {
		t.Fatalf("GenerateHealthReport() returned error: %v", err)
	}

	pdfText := string(pdfData)

	if !strings.Contains(pdfText, "Risk Score: 81%") {
		t.Fatalf("expected PDF to use latest risk score")
	}

	if !strings.Contains(pdfText, "SIDD-like") {
		t.Fatalf("expected PDF to include SIDD-like cluster name for latest assessment")
	}

	if strings.Contains(pdfText, "MARD-like (Age-Related Profile)") {
		// The phenotype summary should use the latest SIDD, not the older MARD
		t.Logf("Note: older MARD assessment may appear in history table — this is expected")
	}
}

// TestPDFExportService_GenerateMockReport generates a sample PDF with mock data
// Run with: go test -v -run TestPDFExportService_GenerateMockReport
// The PDF will be saved to sample_report.pdf in the current directory
func TestPDFExportService_GenerateMockReport(t *testing.T) {
	service := NewPDFExportService()

	// Use mock data for a realistic preview
	user, assessments := GenerateMockData()

	result, err := service.GenerateHealthReport(user, assessments)
	if err != nil {
		t.Fatalf("GenerateHealthReport() returned error: %v", err)
	}

	if len(result) == 0 {
		t.Fatal("expected non-empty PDF data")
	}

	// Save to file for visual inspection
	outputPath := "sample_report.pdf"
	err = os.WriteFile(outputPath, result, 0644)
	if err != nil {
		t.Fatalf("failed to write sample PDF: %v", err)
	}

	t.Logf("✅ Sample PDF generated: %s (%d bytes)", outputPath, len(result))
	t.Logf("Open this file to preview the report design")
}

func TestRiskBandLabel(t *testing.T) {
	service := NewPDFExportService()

	tests := []struct {
		score    int
		expected string
	}{
		{20, "LOW RISK"},
		{29, "LOW RISK"},
		{30, "MODERATE RISK"},
		{69, "MODERATE RISK"},
		{70, "HIGH RISK"},
		{100, "HIGH RISK"},
	}

	for _, tc := range tests {
		t.Run("", func(t *testing.T) {
			result := service.riskBandLabel(tc.score)
			if result != tc.expected {
				t.Errorf("riskBandLabel(%d) = %q, want %q", tc.score, result, tc.expected)
			}
		})
	}
}
