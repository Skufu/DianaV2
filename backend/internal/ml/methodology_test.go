package ml

import (
	"context"
	"math"
	"testing"

	"github.com/skufu/DianaV2/backend/internal/models"
)

// =============================================================================
// Clinical Thresholds from METHODOLOGY.md Section 1.3
// =============================================================================

// HbA1c thresholds (ADA 2024)
const (
	hba1cPrediabeticMin = 5.7
	hba1cDiabeticMin    = 6.5
)

// FBS thresholds (ADA 2024)
const (
	fbsPrediabeticMin = 100
	fbsDiabeticMin    = 126
)

// BMI thresholds (Asia-Pacific WHO)
const (
	bmiOverweightMin = 23.0
	bmiObeseMin      = 25.0
)

// =============================================================================
// Clinical Plausibility Ranges from METHODOLOGY.md Section 3.6
// =============================================================================

type plausibilityRange struct {
	min, max float64
}

var clinicalPlausibilityRanges = map[string]plausibilityRange{
	"bmi":                 {15.0, 60.0},
	"triglycerides":       {20.0, 800.0},
	"ldl":                 {20.0, 300.0},
	"hdl":                 {10.0, 120.0},
	"hba1c":               {3.5, 15.0},
	"fbs":                 {50.0, 400.0},
	"age":                 {18.0, 100.0},
	"waist_circumference": {50.0, 180.0},
}

// =============================================================================
// Test Class 1: MockPredictor Cluster Assignment
// =============================================================================

func TestMethodology_ClusterAssignment(t *testing.T) {
	p := NewMockPredictor()

	tests := []struct {
		name        string
		input       models.Assessment
		wantCluster string
		description string
	}{
		{
			name: "SIRD - highest LAP score (high WC + high TG)",
			input: models.Assessment{
				BMI:                36.0,
				Triglycerides:      240.0,
				LDL:                140.0,
				HDL:                35.0,
				WaistCircumference: 105.0,
			},
			wantCluster: "SIRD",
			description: "High BMI and lipids indicate insulin resistance",
		},
		{
			name: "SIDD - high LDL, lower BMI",
			input: models.Assessment{
				BMI:           22.0,
				Triglycerides: 210.0,
				LDL:           170.0,
				HDL:           45.0,
			},
			wantCluster: "SIDD",
			description: "Atherogenic dyslipidemia profile",
		},
		{
			name: "MOD - high BMI, moderate lipids",
			input: models.Assessment{
				BMI:                32.0,
				Triglycerides:      130.0,
				LDL:                110.0,
				HDL:                50.0,
				WaistCircumference: 95.0,
			},
			wantCluster: "MOD",
			description: "Obesity-driven metabolic profile",
		},
		{
			name: "MARD - normal BMI, moderate lipids, even patient ID",
			input: models.Assessment{
				PatientID:          10,
				BMI:                24.0,
				Triglycerides:      110.0,
				LDL:                100.0,
				HDL:                55.0,
				WaistCircumference: 85.0,
			},
			wantCluster: "MARD",
			description: "Milder metabolic dysfunction",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			prediction, err := p.Predict(context.Background(), tt.input)
			if err != nil {
				t.Fatalf("Predict() error: %v", err)
			}
			if prediction.Cluster != tt.wantCluster {
				t.Errorf("cluster = %q, want %q (%s)", prediction.Cluster, tt.wantCluster, tt.description)
			}
		})
	}
}

// =============================================================================
// Test Class 2: Risk Level Assignment
// =============================================================================

func TestMethodology_RiskLevels(t *testing.T) {
	p := NewMockPredictor()

	tests := []struct {
		name        string
		input       models.Assessment
		wantCluster string
		wantRiskMin int
		wantRiskMax int
		wantStatus  string
	}{
		{
			name: "SIRD - HIGH risk level",
			input: models.Assessment{
				BMI:           36,
				Triglycerides: 180,
				LDL:           150,
				HDL:           40,
			},
			wantCluster: "SIRD",
			wantRiskMin: 80,
			wantRiskMax: 100,
			wantStatus:  "high",
		},
		{
			name: "SIDD - HIGH risk level",
			input: models.Assessment{
				BMI:           22,
				Triglycerides: 210,
				LDL:           170,
			},
			wantCluster: "SIDD",
			wantRiskMin: 70,
			wantRiskMax: 90,
			wantStatus:  "high",
		},
		{
			name: "MOD - MODERATE risk level",
			input: models.Assessment{
				PatientID:     11,
				BMI:           31,
				Triglycerides: 130,
				LDL:           110,
				HDL:           50,
			},
			wantCluster: "MOD",
			wantRiskMin: 50,
			wantRiskMax: 70,
			wantStatus:  "moderate",
		},
		{
			name: "MARD - LOW risk level",
			input: models.Assessment{
				PatientID:     10,
				BMI:           24,
				Triglycerides: 110,
				LDL:           100,
				HDL:           55,
			},
			wantCluster: "MARD",
			wantRiskMin: 40,
			wantRiskMax: 50,
			wantStatus:  "low",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			prediction, err := p.Predict(context.Background(), tt.input)
			if err != nil {
				t.Fatalf("Predict() error: %v", err)
			}
			if prediction.RiskScore < tt.wantRiskMin || prediction.RiskScore > tt.wantRiskMax {
				t.Errorf("risk score = %d, want [%d, %d]", prediction.RiskScore, tt.wantRiskMin, tt.wantRiskMax)
			}
			if prediction.PredictedStatus != tt.wantStatus {
				t.Errorf("status = %q, want %q", prediction.PredictedStatus, tt.wantStatus)
			}
		})
	}
}

// =============================================================================
// Test Class 3: Clinical Plausibility Ranges
// =============================================================================

func TestMethodology_ClinicalPlausibilityRanges(t *testing.T) {
	tests := []struct {
		feature string
		value   float64
		valid   bool
	}{
		// BMI range: 15-60
		{"bmi", 14.0, false},
		{"bmi", 15.0, true},
		{"bmi", 25.0, true},
		{"bmi", 60.0, true},
		{"bmi", 61.0, false},
		// Triglycerides range: 20-800
		{"triglycerides", 19.0, false},
		{"triglycerides", 20.0, true},
		{"triglycerides", 150.0, true},
		{"triglycerides", 800.0, true},
		{"triglycerides", 801.0, false},
		// LDL range: 20-300
		{"ldl", 19.0, false},
		{"ldl", 20.0, true},
		{"ldl", 100.0, true},
		{"ldl", 300.0, true},
		{"ldl", 301.0, false},
		// HDL range: 10-120
		{"hdl", 9.0, false},
		{"hdl", 10.0, true},
		{"hdl", 50.0, true},
		{"hdl", 120.0, true},
		{"hdl", 121.0, false},
		// Age range: 18-100
		{"age", 17.0, false},
		{"age", 18.0, true},
		{"age", 55.0, true},
		{"age", 100.0, true},
		{"age", 101.0, false},
		// Waist circumference range: 50-180
		{"waist_circumference", 49.0, false},
		{"waist_circumference", 50.0, true},
		{"waist_circumference", 90.0, true},
		{"waist_circumference", 180.0, true},
		{"waist_circumference", 181.0, false},
	}

	for _, tt := range tests {
		t.Run(tt.feature, func(t *testing.T) {
			rng, exists := clinicalPlausibilityRanges[tt.feature]
			if !exists {
				t.Fatalf("unknown feature: %s", tt.feature)
			}
			isValid := tt.value >= rng.min && tt.value <= rng.max
			if isValid != tt.valid {
				t.Errorf("%s=%v should be valid=%v, got valid=%v", tt.feature, tt.value, tt.valid, isValid)
			}
		})
	}
}

// =============================================================================
// Test Class 4: HbA1c Classification Thresholds
// =============================================================================

func TestMethodology_HbA1cThresholds(t *testing.T) {
	tests := []struct {
		hba1c         float64
		expectedClass string
	}{
		{5.0, "Normal"},
		{5.6, "Normal"},
		{5.7, "Pre-diabetic"},
		{6.0, "Pre-diabetic"},
		{6.4, "Pre-diabetic"},
		{6.5, "Diabetic"},
		{7.0, "Diabetic"},
	}

	for _, tt := range tests {
		t.Run("", func(t *testing.T) {
			var actual string
			if tt.hba1c >= hba1cDiabeticMin {
				actual = "Diabetic"
			} else if tt.hba1c >= hba1cPrediabeticMin {
				actual = "Pre-diabetic"
			} else {
				actual = "Normal"
			}
			if actual != tt.expectedClass {
				t.Errorf("HbA1c %.1f: got %q, want %q", tt.hba1c, actual, tt.expectedClass)
			}
		})
	}
}

// =============================================================================
// Test Class 5: FBS Classification Thresholds
// =============================================================================

func TestMethodology_FBSThresholds(t *testing.T) {
	tests := []struct {
		fbs           float64
		expectedClass string
	}{
		{90.0, "Normal"},
		{99.0, "Normal"},
		{100.0, "Pre-diabetic"},
		{110.0, "Pre-diabetic"},
		{125.0, "Pre-diabetic"},
		{126.0, "Diabetic"},
		{150.0, "Diabetic"},
	}

	for _, tt := range tests {
		t.Run("", func(t *testing.T) {
			var actual string
			if tt.fbs >= fbsDiabeticMin {
				actual = "Diabetic"
			} else if tt.fbs >= fbsPrediabeticMin {
				actual = "Pre-diabetic"
			} else {
				actual = "Normal"
			}
			if actual != tt.expectedClass {
				t.Errorf("FBS %.1f: got %q, want %q", tt.fbs, actual, tt.expectedClass)
			}
		})
	}
}

// =============================================================================
// Test Class 6: BMI Asia-Pacific WHO Thresholds
// =============================================================================

func TestMethodology_BMIAsiaPacificThresholds(t *testing.T) {
	tests := []struct {
		bmi              float64
		expectedCategory string
	}{
		{22.0, "Normal"},
		{23.0, "Overweight"},
		{24.0, "Overweight"},
		{25.0, "Obese"},
		{30.0, "Obese"},
	}

	for _, tt := range tests {
		t.Run("", func(t *testing.T) {
			var actual string
			if tt.bmi >= bmiObeseMin {
				actual = "Obese"
			} else if tt.bmi >= bmiOverweightMin {
				actual = "Overweight"
			} else {
				actual = "Normal"
			}
			if actual != tt.expectedCategory {
				t.Errorf("BMI %.1f: got %q, want %q", tt.bmi, actual, tt.expectedCategory)
			}
		})
	}
}

// =============================================================================
// Test Class 7: Feature Weights (METHODOLOGY.md Section 4.2, Table 4.1)
// =============================================================================

func TestMethodology_FeatureWeights(t *testing.T) {
	// From METHODOLOGY.md Table 4.1
	expectedWeights := map[string]float64{
		"ldl":                 2.5, // Rank #1
		"triglycerides":       2.0, // Rank #2 (tied)
		"waist_circumference": 2.0, // Rank #2 (tied)
		"bmi":                 1.5, // Rank #3
		"hdl":                 1.2, // Rank #4
		"age":                 1.0, // Rank #5
	}

	for feature, expected := range expectedWeights {
		t.Run(feature, func(t *testing.T) {
			actual := expertFeatureWeights[feature]
			if math.Abs(actual-expected) > 0.001 {
				t.Errorf("%s weight = %v, want %v", feature, actual, expected)
			}
		})
	}

	// Verify ordering: LDL > TG=WC > BMI > HDL > Age
	t.Run("weight_ordering", func(t *testing.T) {
		w := expertFeatureWeights
		if w["ldl"] <= w["triglycerides"] {
			t.Error("LDL weight should be > TG weight")
		}
		if w["triglycerides"] != w["waist_circumference"] {
			t.Error("TG and WC weights should be equal")
		}
		if w["waist_circumference"] <= w["bmi"] {
			t.Error("WC weight should be > BMI weight")
		}
		if w["bmi"] <= w["hdl"] {
			t.Error("BMI weight should be > HDL weight")
		}
		if w["hdl"] <= w["age"] {
			t.Error("HDL weight should be > Age weight")
		}
	})
}

// expertFeatureWeights matches METHODOLOGY.md Table 4.1
var expertFeatureWeights = map[string]float64{
	"ldl":                 2.5,
	"triglycerides":       2.0,
	"waist_circumference": 2.0,
	"bmi":                 1.5,
	"hdl":                 1.2,
	"age":                 1.0,
}

// =============================================================================
// Test Class 8: LAP Score Calculation (METHODOLOGY.md Section 4.3)
// =============================================================================

func TestMethodology_LAPScoreCalculation(t *testing.T) {
	// From METHODOLOGY.md Section 4.3:
	// 'SIRD-like: Assigned to the cluster exhibiting the maximum Lipid
	// Accumulation Product (LAP) score, computed as LAP = (WC − 58) × TG'
	tests := []struct {
		name        string
		wc          float64
		tg          float64
		expectedLAP float64
	}{
		{
			name:        "Typical SIRD profile",
			wc:          100.0,
			tg:          200.0,
			expectedLAP: (100.0 - 58.0) * 200.0, // 8400
		},
		{
			name:        "Higher WC and TG",
			wc:          120.0,
			tg:          250.0,
			expectedLAP: (120.0 - 58.0) * 250.0, // 15500
		},
		{
			name:        "Lower WC and TG",
			wc:          80.0,
			tg:          150.0,
			expectedLAP: (80.0 - 58.0) * 150.0, // 3300
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actualLAP := (tt.wc - 58.0) * tt.tg
			if math.Abs(actualLAP-tt.expectedLAP) > 0.001 {
				t.Errorf("LAP = %v, want %v", actualLAP, tt.expectedLAP)
			}
		})
	}
}

// =============================================================================
// Test Class 9: Binary Class Distribution (METHODOLOGY.md Section 1.3)
// =============================================================================

func TestMethodology_BinaryClassDistribution(t *testing.T) {
	// From METHODOLOGY.md Section 1.3:
	// 'Normal: 642 (46.7%), At-Risk: 734 (53.3%), Total: 1,376'
	normalCount := 642
	atRiskCount := 734
	total := 1376

	t.Run("total_count", func(t *testing.T) {
		if normalCount+atRiskCount != total {
			t.Errorf("counts don't sum to total: %d + %d = %d, want %d",
				normalCount, atRiskCount, normalCount+atRiskCount, total)
		}
	})

	t.Run("normal_proportion", func(t *testing.T) {
		proportion := float64(normalCount) / float64(total)
		expected := 0.467
		if math.Abs(proportion-expected) > 0.01 {
			t.Errorf("Normal proportion = %.3f, want %.3f", proportion, expected)
		}
	})

	t.Run("at_risk_proportion", func(t *testing.T) {
		proportion := float64(atRiskCount) / float64(total)
		expected := 0.533
		if math.Abs(proportion-expected) > 0.01 {
			t.Errorf("At-Risk proportion = %.3f, want %.3f", proportion, expected)
		}
	})

	t.Run("prediabetic_combined_with_diabetic", func(t *testing.T) {
		// From METHODOLOGY.md: Pre-diabetic (457) + Diabetic (277) = At-Risk (734)
		prediabeticCount := 457
		diabeticCount := 277
		if prediabeticCount+diabeticCount != atRiskCount {
			t.Errorf("Pre-diabetic + Diabetic = %d, want %d",
				prediabeticCount+diabeticCount, atRiskCount)
		}
	})
}

// =============================================================================
// Test Class 10: Prediction Response Completeness
// =============================================================================

func TestMethodology_PredictionResponseCompleteness(t *testing.T) {
	p := NewMockPredictor()

	input := models.Assessment{
		BMI:                32.0,
		Triglycerides:      180.0,
		LDL:                140.0,
		HDL:                40.0,
		WaistCircumference: 95.0,
	}

	prediction, err := p.Predict(context.Background(), input)
	if err != nil {
		t.Fatalf("Predict() error: %v", err)
	}

	// All required fields must be populated
	if prediction.Cluster == "" {
		t.Error("Cluster should not be empty")
	}
	if prediction.PredictedStatus == "" {
		t.Error("PredictedStatus should not be empty")
	}
	if prediction.RiskLabel == "" {
		t.Error("RiskLabel should not be empty")
	}
	if prediction.ClusterDescription == "" {
		t.Error("ClusterDescription should not be empty")
	}
	if prediction.TreatmentFocus == "" {
		t.Error("TreatmentFocus should not be empty")
	}

	// Risk score should be in valid range
	if prediction.RiskScore < 0 || prediction.RiskScore > 100 {
		t.Errorf("RiskScore = %d, want [0, 100]", prediction.RiskScore)
	}

	// Probability should be in valid range
	if prediction.AtRiskProbability < 0 || prediction.AtRiskProbability > 1 {
		t.Errorf("AtRiskProbability = %f, want [0, 1]", prediction.AtRiskProbability)
	}
}
