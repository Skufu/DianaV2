package services

import (
	"fmt"
)

type ValidationService struct{}

type BiomarkerRange struct {
	Min  float64
	Max  float64
	Unit string
	Name string
}

type ClinicalRange struct {
	Normal      BiomarkerRange
	Prediabetic BiomarkerRange
	Diabetic    BiomarkerRange
}

type ValidationResult struct {
	Valid    bool
	Warnings []string
}

var BiomarkerRanges = map[string]BiomarkerRange{
	"fbs":           {Min: 40, Max: 600, Unit: "mg/dL", Name: "Fasting Blood Sugar"},
	"hba1c":         {Min: 3.5, Max: 15.0, Unit: "%", Name: "HbA1c"},
	"bmi":           {Min: 15, Max: 60, Unit: "kg/m²", Name: "Body Mass Index"},
	"systolic":      {Min: 70, Max: 250, Unit: "mmHg", Name: "Systolic Blood Pressure"},
	"diastolic":     {Min: 40, Max: 150, Unit: "mmHg", Name: "Diastolic Blood Pressure"},
	"cholesterol":   {Min: 100, Max: 400, Unit: "mg/dL", Name: "Total Cholesterol"},
	"ldl":           {Min: 30, Max: 300, Unit: "mg/dL", Name: "LDL Cholesterol"},
	"hdl":           {Min: 15, Max: 120, Unit: "mg/dL", Name: "HDL Cholesterol"},
	"triglycerides": {Min: 20, Max: 1000, Unit: "mg/dL", Name: "Triglycerides"},
}

var ClinicalRanges = map[string]ClinicalRange{
	"hba1c": {
		Normal:      BiomarkerRange{Min: 3.5, Max: 5.6},
		Prediabetic: BiomarkerRange{Min: 5.7, Max: 6.4},
		Diabetic:    BiomarkerRange{Min: 6.5, Max: 15.0},
	},
	"fbs": {
		Normal:      BiomarkerRange{Min: 40, Max: 99},
		Prediabetic: BiomarkerRange{Min: 100, Max: 125},
		Diabetic:    BiomarkerRange{Min: 126, Max: 600},
	},
}

// NewValidationService creates a new validation service
func NewValidationService() *ValidationService {
	return &ValidationService{}
}

// ValidateBiomarkerRanges checks if values are within acceptable ranges
func (s *ValidationService) ValidateBiomarkerRanges(values map[string]interface{}) ValidationResult {
	warnings := []string{}

	// Check FBS
	if fbs, ok := values["fbs"]; ok && fbs != nil {
		if val, ok := fbs.(float64); ok {
			if val < 40 || val > 600 {
				warnings = append(warnings, fmt.Sprintf("FBS (%.2f %s) is outside the valid range (40-600 mg/dL)", val, BiomarkerRanges["fbs"].Unit))
			}
		}
	}

	// Check HbA1c
	if hba1c, ok := values["hba1c"]; ok && hba1c != nil {
		if val, ok := hba1c.(float64); ok {
			if val < 3.5 || val > 15.0 {
				warnings = append(warnings, fmt.Sprintf("HbA1c (%.2f %s) is outside the valid range (3.5-15.0 %s)", val, BiomarkerRanges["hba1c"].Unit, BiomarkerRanges["hba1c"].Unit))
			}
		}
	}

	// Check BMI
	if bmi, ok := values["bmi"]; ok && bmi != nil {
		if val, ok := bmi.(float64); ok {
			if val < 15 || val > 60 {
				warnings = append(warnings, fmt.Sprintf("BMI (%.1f %s) is outside the valid range (15-60 kg/m²)", val, BiomarkerRanges["bmi"].Unit))
			}
		}
	}

	// Check blood pressure
	if systolic, ok := values["systolic"]; ok && systolic != nil {
		if val, ok := systolic.(float64); ok {
			if val < 70 || val > 250 {
				warnings = append(warnings, fmt.Sprintf("Systolic (%.0f %s) is outside the valid range (70-250 mmHg)", val, BiomarkerRanges["systolic"].Unit))
			}
		}
	}

	if diastolic, ok := values["diastolic"]; ok && diastolic != nil {
		if val, ok := diastolic.(float64); ok {
			if val < 40 || val > 150 {
				warnings = append(warnings, fmt.Sprintf("Diastolic (%.0f %s) is outside the valid range (40-150 mmHg)", val, BiomarkerRanges["diastolic"].Unit))
			}
		}
	}

	// Check cholesterol
	if cholesterol, ok := values["cholesterol"]; ok && cholesterol != nil {
		if val, ok := cholesterol.(float64); ok {
			if val < 100 || val > 400 {
				warnings = append(warnings, fmt.Sprintf("Total cholesterol (%.0f %s) is outside the valid range (100-400 mg/dL)", val, BiomarkerRanges["cholesterol"].Unit))
			}
		}
	}

	// Check lipids
	if ldl, ok := values["ldl"]; ok && ldl != nil {
		if val, ok := ldl.(float64); ok {
			if val < 30 || val > 300 {
				warnings = append(warnings, fmt.Sprintf("LDL (%.0f %s) is outside the valid range (30-300 mg/dL)", val, BiomarkerRanges["ldl"].Unit))
			}
		}
	}

	if hdl, ok := values["hdl"]; ok && hdl != nil {
		if val, ok := hdl.(float64); ok {
			if val < 15 || val > 120 {
				warnings = append(warnings, fmt.Sprintf("HDL (%.0f %s) is outside the valid range (15-120 mg/dL)", val, BiomarkerRanges["hdl"].Unit))
			}
		}
	}

	if triglycerides, ok := values["triglycerides"]; ok && triglycerides != nil {
		if val, ok := triglycerides.(float64); ok {
			if val < 20 || val > 1000 {
				warnings = append(warnings, fmt.Sprintf("Triglycerides (%.0f %s) is outside the valid range (20-1000 mg/dL)", val, BiomarkerRanges["triglycerides"].Unit))
			}
		}
	}

	// Determine overall validation status
	valid := len(warnings) == 0

	return ValidationResult{
		Valid:    valid,
		Warnings: warnings,
	}
}

// GetReferenceRanges returns clinical reference ranges for display
func (s *ValidationService) GetReferenceRanges(biomarker string) ClinicalRange {
	if ranges, ok := ClinicalRanges[biomarker]; ok {
		return ranges
	}
	return ClinicalRange{
		Normal:      BiomarkerRange{Min: 0, Max: 0, Unit: "", Name: ""},
		Prediabetic: BiomarkerRange{Min: 0, Max: 0, Unit: "", Name: ""},
		Diabetic:    BiomarkerRange{Min: 0, Max: 0, Unit: "", Name: ""},
	}
}

// GetRiskLevelText returns text representation of risk level
func (s *ValidationService) GetRiskLevelText(level string) string {
	switch level {
	case "low":
		return "Low risk - Continue healthy habits"
	case "medium":
		return "Moderate risk - Consider lifestyle changes"
	case "high":
		return "High risk - Consult healthcare provider"
	default:
		return "Unknown risk level"
	}
}
