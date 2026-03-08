package ml

import (
	"testing"

	"github.com/skufu/DianaV2/backend/internal/config"
	"github.com/skufu/DianaV2/backend/internal/models"
)

func TestValidateBiomarkers(t *testing.T) {
	tests := []struct {
		name            string
		input           models.Assessment
		wantWarnings    []string
		wantValid       bool
		minWarningCount int
	}{
		{
			name: "normal values - no warnings",
			input: models.Assessment{
				FBS:           90,
				HbA1c:         5.0,
				Systolic:      110,
				BMI:           22,
				Cholesterol:   180,
				LDL:           90,
				HDL:           50,
				Triglycerides: 120,
			},
			wantValid:       true,
			minWarningCount: 0,
		},
		{
			name: "prediabetic FBS",
			input: models.Assessment{
				FBS: 110,
			},
			wantWarnings: []string{"fbs_prediabetic_range"},
			wantValid:    true,
		},
		{
			name: "diabetic FBS",
			input: models.Assessment{
				FBS: 130,
			},
			wantWarnings: []string{"fbs_diabetic_range"},
			wantValid:    false,
		},
		{
			name: "diabetic HbA1c",
			input: models.Assessment{
				HbA1c: 7.0,
			},
			wantWarnings: []string{"hba1c_diabetic"},
			wantValid:    false,
		},
		{
			name: "prediabetic HbA1c",
			input: models.Assessment{
				HbA1c: 6.0,
			},
			wantWarnings: []string{"hba1c_prediabetic"},
			wantValid:    true,
		},
		{
			name: "obese BMI",
			input: models.Assessment{
				BMI: 26,
			},
			wantWarnings: []string{"bmi_obese"},
			wantValid:    true,
		},
		{
			name: "overweight BMI",
			input: models.Assessment{
				BMI: 24,
			},
			wantWarnings: []string{"bmi_overweight"},
			wantValid:    true,
		},
		{
			name: "lipid panel warnings",
			input: models.Assessment{
				Cholesterol:   220,
				LDL:           120,
				HDL:           35,
				Triglycerides: 160,
			},
			wantWarnings: []string{"cholesterol_high", "ldl_elevated", "hdl_low", "triglycerides_high"},
			wantValid:    true,
		},
		{
			name: "multiple warnings",
			input: models.Assessment{
				FBS:      130,
				HbA1c:    7.5,
				Systolic: 150,
				BMI:      35,
			},
			minWarningCount: 3,
			wantValid:       false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			thresholds := getDefaultThresholds()
			result := ValidateBiomarkers(tt.input, thresholds)

			if result.Valid != tt.wantValid {
				t.Errorf("Valid = %v, want %v", result.Valid, tt.wantValid)
			}

			if tt.wantWarnings != nil {
				for _, want := range tt.wantWarnings {
					found := false
					for _, got := range result.Warnings {
						if got == want {
							found = true
							break
						}
					}
					if !found {
						t.Errorf("missing warning %q in %v", want, result.Warnings)
					}
				}
			}

			if tt.minWarningCount > 0 && len(result.Warnings) < tt.minWarningCount {
				t.Errorf("got %d warnings, want at least %d", len(result.Warnings), tt.minWarningCount)
			}
		})
	}
}

func TestFormatValidationStatus(t *testing.T) {
	tests := []struct {
		name   string
		result ValidationResult
		want   string
	}{
		{
			name:   "no warnings",
			result: ValidationResult{Warnings: nil, Valid: true},
			want:   "ok",
		},
		{
			name:   "empty warnings slice",
			result: ValidationResult{Warnings: []string{}, Valid: true},
			want:   "ok",
		},
		{
			name:   "single warning",
			result: ValidationResult{Warnings: []string{"fbs_high"}, Valid: true},
			want:   "warning:fbs_high",
		},
		{
			name:   "multiple warnings",
			result: ValidationResult{Warnings: []string{"fbs_high", "bmi_obese"}, Valid: true},
			want:   "warning:fbs_high,bmi_obese",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := FormatValidationStatus(tt.result)
			if got != tt.want {
				t.Errorf("FormatValidationStatus() = %q, want %q", got, tt.want)
			}
		})
	}
}

func getDefaultThresholds() config.ClinicalThresholds {
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
