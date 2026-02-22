package pdf

import (
	"os"
	"testing"

	"github.com/skufu/DianaV2/backend/internal/models"
)

func TestGeneratePDF(t *testing.T) {
	generator := NewReportGenerator("")

	patient := models.Patient{
		Name:            "Jane Doe",
		Age:             55,
		MenopauseStatus: "Post",
		YearsMenopause:  5,
	}

	assessment := models.Assessment{
		Cluster:       "High Risk",
		RiskScore:     85,
		HbA1c:         6.2,
		FBS:           110,
		BMI:           28.5,
		Cholesterol:   210,
		LDL:           140,
		HDL:           45,
		Triglycerides: 180,
	}

	shapData := map[string]any{
		"shap_values": []any{
			map[string]any{"feature": "HbA1c", "feature_value": 6.2, "shap_value": 0.15},
			map[string]any{"feature": "BMI", "feature_value": 28.5, "shap_value": 0.08},
			map[string]any{"feature": "Age", "feature_value": 55.0, "shap_value": 0.05},
			map[string]any{"feature": "YearsMenopause", "feature_value": 5.0, "shap_value": -0.02},
			map[string]any{"feature": "HDL", "feature_value": 45.0, "shap_value": 0.01},
			map[string]any{"feature": "Cholesterol", "feature_value": 210.0, "shap_value": 0.005},
		},
	}

	pdfBytes, err := generator.GenerateAssessmentReport(patient, assessment, shapData)
	if err != nil {
		t.Fatalf("Failed to generate PDF: %v", err)
	}

	if len(pdfBytes) == 0 {
		t.Fatal("Generated PDF is empty")
	}

	// Write to disk so we can optionally inspect it locally
	err = os.WriteFile("test_report.pdf", pdfBytes, 0644)
	if err != nil {
		t.Logf("Warning: could not write test file: %v", err)
	}
}
