package services

import (
	"testing"
)

func TestValidationService_ValidateBiomarkerRanges(t *testing.T) {
	service := NewValidationService()

	tests := []struct {
		name      string
		values    map[string]interface{}
		wantValid bool
		wantWarn  int
	}{
		{
			name:      "all normal values",
			values:    map[string]interface{}{"fbs": 90.0, "hba1c": 5.4, "bmi": 22.0},
			wantValid: true,
			wantWarn:  0,
		},
		{
			name:      "FBS too low",
			values:    map[string]interface{}{"fbs": 30.0},
			wantValid: false,
			wantWarn:  1,
		},
		{
			name:      "FBS too high",
			values:    map[string]interface{}{"fbs": 700.0},
			wantValid: false,
			wantWarn:  1,
		},
		{
			name:      "HbA1c too low",
			values:    map[string]interface{}{"hba1c": 3.0},
			wantValid: false,
			wantWarn:  1,
		},
		{
			name:      "HbA1c too high",
			values:    map[string]interface{}{"hba1c": 16.0},
			wantValid: false,
			wantWarn:  1,
		},
		{
			name:      "BMI too low",
			values:    map[string]interface{}{"bmi": 14.0},
			wantValid: false,
			wantWarn:  1,
		},
		{
			name:      "BMI too high",
			values:    map[string]interface{}{"bmi": 65.0},
			wantValid: false,
			wantWarn:  1,
		},
		{
			name:      "systolic too low",
			values:    map[string]interface{}{"systolic": 65.0},
			wantValid: false,
			wantWarn:  1,
		},
		{
			name:      "systolic too high",
			values:    map[string]interface{}{"systolic": 260.0},
			wantValid: false,
			wantWarn:  1,
		},
		{
			name:      "diastolic too low",
			values:    map[string]interface{}{"diastolic": 35.0},
			wantValid: false,
			wantWarn:  1,
		},
		{
			name:      "diastolic too high",
			values:    map[string]interface{}{"diastolic": 160.0},
			wantValid: false,
			wantWarn:  1,
		},
		{
			name:      "cholesterol too low",
			values:    map[string]interface{}{"cholesterol": 95.0},
			wantValid: false,
			wantWarn:  1,
		},
		{
			name:      "cholesterol too high",
			values:    map[string]interface{}{"cholesterol": 420.0},
			wantValid: false,
			wantWarn:  1,
		},
		{
			name:      "LDL too low",
			values:    map[string]interface{}{"ldl": 25.0},
			wantValid: false,
			wantWarn:  1,
		},
		{
			name:      "LDL too high",
			values:    map[string]interface{}{"ldl": 320.0},
			wantValid: false,
			wantWarn:  1,
		},
		{
			name:      "HDL too low",
			values:    map[string]interface{}{"hdl": 12.0},
			wantValid: false,
			wantWarn:  1,
		},
		{
			name:      "HDL too high",
			values:    map[string]interface{}{"hdl": 130.0},
			wantValid: false,
			wantWarn:  1,
		},
		{
			name:      "triglycerides too low",
			values:    map[string]interface{}{"triglycerides": 15.0},
			wantValid: false,
			wantWarn:  1,
		},
		{
			name:      "triglycerides too high",
			values:    map[string]interface{}{"triglycerides": 1100.0},
			wantValid: false,
			wantWarn:  1,
		},
		{
			name:      "multiple out of range",
			values:    map[string]interface{}{"fbs": 700.0, "hba1c": 16.0, "bmi": 65.0},
			wantValid: false,
			wantWarn:  3,
		},
		{
			name:      "nil values",
			values:    map[string]interface{}{"fbs": nil, "hba1c": nil},
			wantValid: true,
			wantWarn:  0,
		},
		{
			name:      "non-numeric values ignored",
			values:    map[string]interface{}{"fbs": "not a number", "hba1c": 5.4},
			wantValid: true,
			wantWarn:  0,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := service.ValidateBiomarkerRanges(tc.values)

			if result.Valid != tc.wantValid {
				t.Errorf("ValidateBiomarkerRanges() Valid = %v, want %v", result.Valid, tc.wantValid)
			}

			if len(result.Warnings) < tc.wantWarn {
				t.Errorf("ValidateBiomarkerRanges() warnings count = %d, want at least %d", len(result.Warnings), tc.wantWarn)
			}
		})
	}
}

func TestValidationService_GetReferenceRanges(t *testing.T) {
	service := NewValidationService()

	tests := []struct {
		name      string
		biomarker string
		wantMin   float64
		wantMax   float64
		wantUnit  string
	}{
		{
			name:      "hba1c ranges",
			biomarker: "hba1c",
			wantMin:   3.5,
			wantMax:   5.6,
			wantUnit:  "",
		},
		{
			name:      "fbs ranges",
			biomarker: "fbs",
			wantMin:   40,
			wantMax:   99,
			wantUnit:  "",
		},
		{
			name:      "unknown biomarker",
			biomarker: "unknown",
			wantMin:   0,
			wantMax:   0,
			wantUnit:  "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := service.GetReferenceRanges(tc.biomarker)

			if result.Normal.Min != tc.wantMin {
				t.Errorf("GetReferenceRanges() Normal.Min = %v, want %v", result.Normal.Min, tc.wantMin)
			}

			if result.Normal.Max != tc.wantMax {
				t.Errorf("GetReferenceRanges() Normal.Max = %v, want %v", result.Normal.Max, tc.wantMax)
			}

			if result.Normal.Unit != tc.wantUnit {
				t.Errorf("GetReferenceRanges() Normal.Unit = %v, want %v", result.Normal.Unit, tc.wantUnit)
			}
		})
	}
}

func TestValidationService_GetRiskLevelText(t *testing.T) {
	service := NewValidationService()

	tests := []struct {
		name  string
		level string
		want  string
	}{
		{
			name:  "low risk",
			level: "low",
			want:  "Low risk - Continue healthy habits",
		},
		{
			name:  "medium risk",
			level: "medium",
			want:  "Moderate risk - Consider lifestyle changes",
		},
		{
			name:  "high risk",
			level: "high",
			want:  "High risk - Consult healthcare provider",
		},
		{
			name:  "unknown risk",
			level: "unknown",
			want:  "Unknown risk level",
		},
		{
			name:  "empty risk",
			level: "",
			want:  "Unknown risk level",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := service.GetRiskLevelText(tc.level)

			if result != tc.want {
				t.Errorf("GetRiskLevelText() = %q, want %q", result, tc.want)
			}
		})
	}
}
