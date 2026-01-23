// Package ml provides machine learning prediction interfaces and implementations.
// This file contains input validation utilities for biomarker data before ML prediction.
package ml

import (
	"github.com/skufu/DianaV2/backend/internal/config"
	"github.com/skufu/DianaV2/backend/internal/models"
)

// ValidationResult contains outcome of biomarker validation
type ValidationResult struct {
	Warnings []string
	Valid    bool
}

// ValidateBiomarkers checks assessment input against clinical reference ranges.
// Returns warnings for out-of-range values to inform both prediction and clinician.
func ValidateBiomarkers(input models.Assessment, thresholds config.ClinicalThresholds) ValidationResult {
	var warnings []string
	valid := true

	if input.FBS >= thresholds.FBSPrediabetic {
		warnings = append(warnings, "fbs_diabetic_range")
	} else if input.FBS >= thresholds.FBSNormal {
		warnings = append(warnings, "fbs_prediabetic_range")
	}

	if input.HbA1c >= thresholds.HbA1cDiabetic {
		warnings = append(warnings, "hba1c_diabetic")
	} else if input.HbA1c >= thresholds.HbA1cNormal {
		warnings = append(warnings, "hba1c_prediabetic")
	}

	if input.Systolic >= thresholds.BPSysElevated {
		warnings = append(warnings, "bp_hypertensive")
	} else if input.Systolic >= thresholds.BPSysNormal {
		warnings = append(warnings, "bp_elevated")
	}

	if input.BMI >= thresholds.BMIObese {
		warnings = append(warnings, "bmi_obese")
	} else if input.BMI >= thresholds.BMINormal {
		warnings = append(warnings, "bmi_overweight")
	}

	if input.Cholesterol > int(thresholds.CholesterolBorderline) {
		warnings = append(warnings, "cholesterol_high")
	}
	if input.LDL > int(thresholds.LDLBorderline) {
		warnings = append(warnings, "ldl_elevated")
	}
	if input.HDL < int(thresholds.HDLLow) {
		warnings = append(warnings, "hdl_low")
	}
	if input.Triglycerides > int(thresholds.TriglyceridesBorderline) {
		warnings = append(warnings, "triglycerides_high")
	}

	return ValidationResult{
		Warnings: warnings,
		Valid:    valid,
	}
}

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
