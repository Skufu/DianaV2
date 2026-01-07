package ml

import (
	"testing"

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
			wantValid:    true,
		},
		{
			name: "diabetic HbA1c",
			input: models.Assessment{
				HbA1c: 7.0,
			},
			wantWarnings: []string{"hba1c_diabetic"},
			wantValid:    true,
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
			name: "hypertensive blood pressure",
			input: models.Assessment{
				Systolic: 145,
			},
			wantWarnings: []string{"bp_hypertensive"},
			wantValid:    true,
		},
		{
			name: "elevated blood pressure",
			input: models.Assessment{
				Systolic: 130,
			},
			wantWarnings: []string{"bp_elevated"},
			wantValid:    true,
		},
		{
			name: "obese BMI",
			input: models.Assessment{
				BMI: 32,
			},
			wantWarnings: []string{"bmi_obese"},
			wantValid:    true,
		},
		{
			name: "overweight BMI",
			input: models.Assessment{
				BMI: 27,
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
			minWarningCount: 4,
			wantValid:       true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ValidateBiomarkers(tt.input)

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

func TestBiomarkerRanges(t *testing.T) {
	// Verify ranges match clinical guidelines
	if BiomarkerRanges.FBSNormal != 100 {
		t.Errorf("FBSNormal = %v, want 100", BiomarkerRanges.FBSNormal)
	}
	if BiomarkerRanges.HbA1cNormal != 5.7 {
		t.Errorf("HbA1cNormal = %v, want 5.7", BiomarkerRanges.HbA1cNormal)
	}
	if BiomarkerRanges.BMINormal != 25.0 {
		t.Errorf("BMINormal = %v, want 25.0", BiomarkerRanges.BMINormal)
	}
}
