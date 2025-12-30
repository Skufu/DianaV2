// Package pdf provides PDF report generation for patient assessments.
package pdf

import (
	"bytes"
	"fmt"
	"time"

	"github.com/go-pdf/fpdf"
	"github.com/skufu/DianaV2/backend/internal/models"
)

// ReportGenerator generates PDF reports for patient assessments
type ReportGenerator struct {
	logoPath string
}

// NewReportGenerator creates a new PDF report generator
func NewReportGenerator(logoPath string) *ReportGenerator {
	return &ReportGenerator{logoPath: logoPath}
}

// GenerateAssessmentReport creates a PDF report for a patient assessment
func (g *ReportGenerator) GenerateAssessmentReport(
	patient models.Patient,
	assessment models.Assessment,
	shapData map[string]interface{},
) ([]byte, error) {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.AddPage()

	// Header
	g.addHeader(pdf, patient)

	// Patient Information Section
	g.addPatientInfo(pdf, patient)

	// Biomarker Values Section
	g.addBiomarkerSection(pdf, assessment)

	// Risk Assessment Section
	g.addRiskAssessment(pdf, assessment)

	// SHAP Explanation Section (if available)
	if shapData != nil {
		g.addSHAPExplanation(pdf, shapData)
	}

	// Recommendations Section
	g.addRecommendations(pdf, assessment)

	// Footer
	g.addFooter(pdf)

	// Output to buffer
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return buf.Bytes(), nil
}

func (g *ReportGenerator) addHeader(pdf *fpdf.Fpdf, patient models.Patient) {
	pdf.SetFont("Arial", "B", 20)
	pdf.SetTextColor(75, 0, 130) // Indigo color

	pdf.CellFormat(180, 12, "DIANA Assessment Report", "", 1, "C", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.SetTextColor(128, 128, 128)
	pdf.CellFormat(180, 6, "Diabetes Risk Assessment for Menopausal Women", "", 1, "C", false, 0, "")

	pdf.Ln(5)
	pdf.SetDrawColor(75, 0, 130)
	pdf.Line(15, pdf.GetY(), 195, pdf.GetY())
	pdf.Ln(8)
}

func (g *ReportGenerator) addPatientInfo(pdf *fpdf.Fpdf, patient models.Patient) {
	pdf.SetFont("Arial", "B", 14)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(180, 8, "Patient Information", "", 1, "L", false, 0, "")

	pdf.SetFont("Arial", "", 10)
	pdf.SetTextColor(64, 64, 64)

	// Create a table-like layout
	col1Width := 40.0
	col2Width := 50.0

	g.addInfoRow(pdf, "Name:", patient.Name, col1Width, col2Width)
	g.addInfoRow(pdf, "Age:", fmt.Sprintf("%d years", patient.Age), col1Width, col2Width)
	g.addInfoRow(pdf, "Menopause Status:", patient.MenopauseStatus, col1Width, col2Width)
	if patient.YearsMenopause > 0 {
		g.addInfoRow(pdf, "Years Menopause:", fmt.Sprintf("%d", patient.YearsMenopause), col1Width, col2Width)
	}
	g.addInfoRow(pdf, "Report Date:", time.Now().Format("January 2, 2006"), col1Width, col2Width)

	pdf.Ln(8)
}

func (g *ReportGenerator) addInfoRow(pdf *fpdf.Fpdf, label, value string, labelWidth, valueWidth float64) {
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(labelWidth, 6, label, "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(valueWidth, 6, value, "", 1, "L", false, 0, "")
}

func (g *ReportGenerator) addBiomarkerSection(pdf *fpdf.Fpdf, assessment models.Assessment) {
	pdf.SetFont("Arial", "B", 14)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(180, 8, "Biomarker Values", "", 1, "L", false, 0, "")

	// Table header
	pdf.SetFillColor(75, 0, 130)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(60, 8, "Biomarker", "1", 0, "C", true, 0, "")
	pdf.CellFormat(40, 8, "Value", "1", 0, "C", true, 0, "")
	pdf.CellFormat(40, 8, "Normal Range", "1", 0, "C", true, 0, "")
	pdf.CellFormat(40, 8, "Status", "1", 1, "C", true, 0, "")

	pdf.SetTextColor(0, 0, 0)
	pdf.SetFont("Arial", "", 10)

	// Biomarker rows
	g.addBiomarkerRow(pdf, "HbA1c (%)", fmt.Sprintf("%.1f", assessment.HbA1c), "< 5.7", g.getHbA1cStatus(assessment.HbA1c))
	g.addBiomarkerRow(pdf, "Fasting Blood Sugar (mg/dL)", fmt.Sprintf("%.0f", assessment.FBS), "< 100", g.getFBSStatus(assessment.FBS))
	g.addBiomarkerRow(pdf, "BMI (kg/m²)", fmt.Sprintf("%.1f", assessment.BMI), "18.5 - 24.9", g.getBMIStatus(assessment.BMI))
	g.addBiomarkerRow(pdf, "Total Cholesterol (mg/dL)", fmt.Sprintf("%d", assessment.Cholesterol), "< 200", g.getCholStatus(assessment.Cholesterol))
	g.addBiomarkerRow(pdf, "LDL (mg/dL)", fmt.Sprintf("%d", assessment.LDL), "< 100", g.getLDLStatus(assessment.LDL))
	g.addBiomarkerRow(pdf, "HDL (mg/dL)", fmt.Sprintf("%d", assessment.HDL), "> 50", g.getHDLStatus(assessment.HDL))
	g.addBiomarkerRow(pdf, "Triglycerides (mg/dL)", fmt.Sprintf("%d", assessment.Triglycerides), "< 150", g.getTGStatus(assessment.Triglycerides))

	if assessment.Systolic > 0 || assessment.Diastolic > 0 {
		bp := fmt.Sprintf("%d/%d", assessment.Systolic, assessment.Diastolic)
		g.addBiomarkerRow(pdf, "Blood Pressure (mmHg)", bp, "< 120/80", g.getBPStatus(assessment.Systolic, assessment.Diastolic))
	}

	pdf.Ln(8)
}

func (g *ReportGenerator) addBiomarkerRow(pdf *fpdf.Fpdf, name, value, normalRange, status string) {
	// Alternate row colors
	pdf.SetFillColor(245, 245, 250)

	pdf.CellFormat(60, 7, name, "1", 0, "L", false, 0, "")
	pdf.CellFormat(40, 7, value, "1", 0, "C", false, 0, "")
	pdf.CellFormat(40, 7, normalRange, "1", 0, "C", false, 0, "")

	// Status with color coding
	switch status {
	case "Normal":
		pdf.SetTextColor(34, 139, 34) // Green
	case "Borderline", "Elevated":
		pdf.SetTextColor(255, 165, 0) // Orange
	case "High", "Low", "Obese", "Pre-diabetic":
		pdf.SetTextColor(255, 69, 0) // Red-Orange
	case "Diabetic":
		pdf.SetTextColor(178, 34, 34) // Dark Red
	default:
		pdf.SetTextColor(0, 0, 0)
	}

	pdf.CellFormat(40, 7, status, "1", 1, "C", false, 0, "")
	pdf.SetTextColor(0, 0, 0)
}

func (g *ReportGenerator) addRiskAssessment(pdf *fpdf.Fpdf, assessment models.Assessment) {
	pdf.SetFont("Arial", "B", 14)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(180, 8, "Risk Assessment", "", 1, "L", false, 0, "")

	// Risk cluster box
	pdf.SetFont("Arial", "B", 12)

	// Color based on cluster
	switch assessment.Cluster {
	case "Low Risk":
		pdf.SetFillColor(34, 197, 94) // Green
	case "Moderate Risk", "MARD", "MOD":
		pdf.SetFillColor(251, 191, 36) // Yellow/Orange
	case "High Risk", "SIRD", "SIDD":
		pdf.SetFillColor(239, 68, 68) // Red
	default:
		pdf.SetFillColor(107, 114, 128) // Gray
	}

	pdf.SetTextColor(255, 255, 255)
	pdf.CellFormat(90, 12, "Risk Cluster: "+assessment.Cluster, "1", 0, "C", true, 0, "")

	// Risk score
	pdf.SetFillColor(75, 0, 130)
	riskScoreText := fmt.Sprintf("Risk Score: %d%%", assessment.RiskScore)
	pdf.CellFormat(90, 12, riskScoreText, "1", 1, "C", true, 0, "")

	pdf.SetTextColor(0, 0, 0)
	pdf.Ln(8)
}

func (g *ReportGenerator) addSHAPExplanation(pdf *fpdf.Fpdf, shapData map[string]interface{}) {
	pdf.SetFont("Arial", "B", 14)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(180, 8, "AI Explanation (SHAP Analysis)", "", 1, "L", false, 0, "")

	pdf.SetFont("Arial", "", 10)
	pdf.SetTextColor(64, 64, 64)
	pdf.MultiCell(180, 5, "SHAP (SHapley Additive exPlanations) values show how each feature contributes to the risk prediction. Positive values increase risk, negative values decrease risk.", "", "L", false)

	pdf.Ln(3)

	// Display SHAP values if available
	if shapValues, ok := shapData["shap_values"].([]interface{}); ok {
		pdf.SetFont("Arial", "B", 10)
		pdf.SetFillColor(147, 112, 219) // Purple
		pdf.SetTextColor(255, 255, 255)
		pdf.CellFormat(60, 7, "Feature", "1", 0, "C", true, 0, "")
		pdf.CellFormat(40, 7, "Value", "1", 0, "C", true, 0, "")
		pdf.CellFormat(40, 7, "Contribution", "1", 1, "C", true, 0, "")

		pdf.SetFont("Arial", "", 9)
		pdf.SetTextColor(0, 0, 0)

		for _, sv := range shapValues {
			if svMap, ok := sv.(map[string]interface{}); ok {
				feature := fmt.Sprintf("%v", svMap["feature"])
				featureValue := fmt.Sprintf("%.2f", svMap["feature_value"])
				shapValue := svMap["shap_value"].(float64)

				contribution := fmt.Sprintf("%+.4f", shapValue)
				if shapValue > 0 {
					pdf.SetTextColor(239, 68, 68) // Red for increased risk
				} else {
					pdf.SetTextColor(34, 197, 94) // Green for decreased risk
				}

				pdf.CellFormat(60, 6, feature, "1", 0, "L", false, 0, "")
				pdf.SetTextColor(0, 0, 0)
				pdf.CellFormat(40, 6, featureValue, "1", 0, "C", false, 0, "")
				if shapValue > 0 {
					pdf.SetTextColor(239, 68, 68)
				} else {
					pdf.SetTextColor(34, 197, 94)
				}
				pdf.CellFormat(40, 6, contribution, "1", 1, "C", false, 0, "")
				pdf.SetTextColor(0, 0, 0)
			}
		}
	}

	pdf.Ln(8)
}

func (g *ReportGenerator) addRecommendations(pdf *fpdf.Fpdf, assessment models.Assessment) {
	pdf.SetFont("Arial", "B", 14)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(180, 8, "Recommendations", "", 1, "L", false, 0, "")

	pdf.SetFont("Arial", "", 10)
	pdf.SetTextColor(64, 64, 64)

	recommendations := g.getRecommendations(assessment)
	for _, rec := range recommendations {
		pdf.CellFormat(5, 6, "", "", 0, "", false, 0, "")
		pdf.CellFormat(5, 6, "\u2022", "", 0, "L", false, 0, "")
		pdf.MultiCell(170, 6, rec, "", "L", false)
	}

	pdf.Ln(5)
}

func (g *ReportGenerator) addFooter(pdf *fpdf.Fpdf) {
	pdf.SetY(-30)
	pdf.SetFont("Arial", "I", 8)
	pdf.SetTextColor(128, 128, 128)
	pdf.SetDrawColor(200, 200, 200)
	pdf.Line(15, pdf.GetY(), 195, pdf.GetY())
	pdf.Ln(3)

	disclaimer := "This report is generated by the DIANA diabetes risk assessment system and is intended for clinical reference only. " +
		"It should not replace professional medical judgment. Please consult with a healthcare provider for diagnosis and treatment decisions."
	pdf.MultiCell(180, 4, disclaimer, "", "C", false)

	pdf.Ln(2)
	pdf.CellFormat(180, 4, fmt.Sprintf("Generated on %s | DIANA V2", time.Now().Format("2006-01-02 15:04")), "", 0, "C", false, 0, "")
}

// Status helper functions
func (g *ReportGenerator) getHbA1cStatus(val float64) string {
	if val >= 6.5 {
		return "Diabetic"
	} else if val >= 5.7 {
		return "Pre-diabetic"
	}
	return "Normal"
}

func (g *ReportGenerator) getFBSStatus(val float64) string {
	if val >= 126 {
		return "Diabetic"
	} else if val >= 100 {
		return "Pre-diabetic"
	}
	return "Normal"
}

func (g *ReportGenerator) getBMIStatus(val float64) string {
	if val >= 30 {
		return "Obese"
	} else if val >= 25 {
		return "Overweight"
	} else if val < 18.5 {
		return "Underweight"
	}
	return "Normal"
}

func (g *ReportGenerator) getCholStatus(val int) string {
	if val >= 240 {
		return "High"
	} else if val >= 200 {
		return "Borderline"
	}
	return "Normal"
}

func (g *ReportGenerator) getLDLStatus(val int) string {
	if val >= 160 {
		return "High"
	} else if val >= 130 {
		return "Borderline"
	}
	return "Normal"
}

func (g *ReportGenerator) getHDLStatus(val int) string {
	if val < 40 {
		return "Low"
	} else if val < 50 {
		return "Borderline"
	}
	return "Normal"
}

func (g *ReportGenerator) getTGStatus(val int) string {
	if val >= 200 {
		return "High"
	} else if val >= 150 {
		return "Borderline"
	}
	return "Normal"
}

func (g *ReportGenerator) getBPStatus(systolic, diastolic int) string {
	if systolic >= 140 || diastolic >= 90 {
		return "High"
	} else if systolic >= 130 || diastolic >= 80 {
		return "Elevated"
	}
	return "Normal"
}

func (g *ReportGenerator) getRecommendations(assessment models.Assessment) []string {
	var recs []string

	// Based on HbA1c
	if assessment.HbA1c >= 6.5 {
		recs = append(recs, "Schedule follow-up with healthcare provider for diabetes management plan")
		recs = append(recs, "Consider medication review and blood glucose monitoring")
	} else if assessment.HbA1c >= 5.7 {
		recs = append(recs, "Implement lifestyle modifications to prevent diabetes progression")
		recs = append(recs, "Monitor HbA1c every 3-6 months")
	}

	// Based on BMI
	if assessment.BMI >= 30 {
		recs = append(recs, "Consult with nutritionist for weight management program")
		recs = append(recs, "Aim for gradual weight loss of 5-10% of body weight")
	} else if assessment.BMI >= 25 {
		recs = append(recs, "Increase physical activity and adopt heart-healthy diet")
	}

	// Based on lipids
	if assessment.LDL >= 160 || assessment.Triglycerides >= 200 {
		recs = append(recs, "Discuss lipid management with healthcare provider")
		recs = append(recs, "Consider reducing saturated fats and increasing fiber intake")
	}

	// Based on blood pressure
	if assessment.Systolic >= 140 || assessment.Diastolic >= 90 {
		recs = append(recs, "Monitor blood pressure regularly")
		recs = append(recs, "Reduce sodium intake and manage stress")
	}

	// General recommendations
	recs = append(recs, "Maintain regular physical activity (150+ minutes per week)")
	recs = append(recs, "Schedule annual comprehensive health check-ups")

	return recs
}
