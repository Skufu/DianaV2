// Package ml provides machine learning prediction interfaces and implementations.
// This file contains input validation utilities for biomarker data before ML prediction.
package ml

import "github.com/skufu/DianaV2/backend/internal/models"

// ValidationResult contains the outcome of biomarker validation
type ValidationResult struct {
	Warnings []string // Warning codes like "fbs_prediabetic_range", "hba1c_elevated"
	Valid    bool     // Whether the input is valid for prediction
}

// BiomarkerRanges defines clinical reference ranges per the research paper
var BiomarkerRanges = struct {
	FBSNormal      float64
	FBSPrediabetic float64
	FBSDiabetic    float64
	HbA1cNormal    float64
	HbA1cPrediab   float64
	HbA1cDiabetic  float64
	BPSysNormal    int
	BPSysElevated  int
	BPDiaNormal    int
	BMINormal      float64
	BMIOverweight  float64
	BMIObese       float64
}{
	FBSNormal:      100, // mg/dL
	FBSPrediabetic: 126,
	FBSDiabetic:    126,
	HbA1cNormal:    5.7, // %
	HbA1cPrediab:   6.5,
	HbA1cDiabetic:  6.5,
	BPSysNormal:    120, // mmHg
	BPSysElevated:  140,
	BPDiaNormal:    80,
	BMINormal:      25.0, // kg/m²
	BMIOverweight:  30.0,
	BMIObese:       30.0,
}

// ValidateBiomarkers checks assessment input against clinical reference ranges.
// Returns warnings for out-of-range values to inform both the prediction and clinician.
func ValidateBiomarkers(input models.Assessment) ValidationResult {
	var warnings []string
	valid := true

	// Fasting Blood Sugar validation (mg/dL)
	if input.FBS >= BiomarkerRanges.FBSPrediabetic {
		warnings = append(warnings, "fbs_diabetic_range")
	} else if input.FBS >= BiomarkerRanges.FBSNormal {
		warnings = append(warnings, "fbs_prediabetic_range")
	}

	// HbA1c validation (%)
	if input.HbA1c >= BiomarkerRanges.HbA1cDiabetic {
		warnings = append(warnings, "hba1c_diabetic")
	} else if input.HbA1c >= BiomarkerRanges.HbA1cNormal {
		warnings = append(warnings, "hba1c_prediabetic")
	}

	// Blood pressure validation (mmHg)
	if input.Systolic >= BiomarkerRanges.BPSysElevated {
		warnings = append(warnings, "bp_hypertensive")
	} else if input.Systolic >= BiomarkerRanges.BPSysNormal {
		warnings = append(warnings, "bp_elevated")
	}

	// BMI validation (kg/m²)
	if input.BMI >= BiomarkerRanges.BMIObese {
		warnings = append(warnings, "bmi_obese")
	} else if input.BMI >= BiomarkerRanges.BMINormal {
		warnings = append(warnings, "bmi_overweight")
	}

	// Lipid panel warnings
	if input.Cholesterol > 200 {
		warnings = append(warnings, "cholesterol_high")
	}
	if input.LDL > 100 {
		warnings = append(warnings, "ldl_elevated")
	}
	if input.HDL < 40 {
		warnings = append(warnings, "hdl_low")
	}
	if input.Triglycerides > 150 {
		warnings = append(warnings, "triglycerides_high")
	}

	return ValidationResult{
		Warnings: warnings,
		Valid:    valid,
	}
}

// FormatValidationStatus converts validation warnings to a status string
// for storage in the database validation_status field.
func FormatValidationStatus(result ValidationResult) string {
	if len(result.Warnings) == 0 {
		return "ok"
	}
	status := "warning:"
	for i, w := range result.Warnings {
		if i > 0 {
			status += ","
		}
		status += w
	}
	return status
}
