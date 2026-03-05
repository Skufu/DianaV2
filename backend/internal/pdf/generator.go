package pdf

import (
	"bytes"
	"fmt"
	"math"
	"sort"
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
	shapData map[string]any,
) ([]byte, error) {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(10, 10, 10)     // Tighter margins (10mm)
	pdf.SetAutoPageBreak(true, 10) // 10mm bottom margin
	pdf.AddPage()

	g.addHeader(pdf)
	g.addPatientAndRiskInfo(pdf, patient, assessment)
	g.addBiomarkerSection(pdf, assessment)

	if shapData != nil {
		g.addSHAPExplanation(pdf, shapData)
	}

	g.addRecommendations(pdf, assessment)
	g.addFooter(pdf)

	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return buf.Bytes(), nil
}

func (g *ReportGenerator) addHeader(pdf *fpdf.Fpdf) {
	pdf.SetFont("Arial", "B", 16)
	pdf.SetTextColor(75, 0, 130) // Indigo
	pdf.CellFormat(190, 8, "DIANA CLINICAL SCREENING REPORT", "", 1, "C", false, 0, "")

	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(128, 128, 128)
	pdf.CellFormat(190, 4, "Diabetes Risk Assessment for Menopausal Women", "", 1, "C", false, 0, "")

	pdf.Ln(4)
	pdf.SetDrawColor(75, 0, 130)
	pdf.Line(10, pdf.GetY(), 200, pdf.GetY())
	pdf.Ln(4)
}

func (g *ReportGenerator) addPatientAndRiskInfo(pdf *fpdf.Fpdf, patient models.Patient, assessment models.Assessment) {
	// Top section: Patient info on left, Risk on right
	startY := pdf.GetY()

	// Left: Patient Info
	pdf.SetFont("Arial", "B", 11)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(95, 6, "Patient Details", "", 1, "L", false, 0, "")

	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(64, 64, 64)
	pdf.CellFormat(25, 5, "Name:", "", 0, "L", false, 0, "")
	pdf.CellFormat(70, 5, patient.Name, "", 1, "L", false, 0, "")

	pdf.CellFormat(25, 5, "Age:", "", 0, "L", false, 0, "")
	pdf.CellFormat(70, 5, fmt.Sprintf("%d years", patient.Age), "", 1, "L", false, 0, "")

	menopauseText := patient.MenopauseStatus
	if patient.YearsMenopause > 0 {
		menopauseText += fmt.Sprintf(" (%d yrs)", patient.YearsMenopause)
	}
	pdf.CellFormat(25, 5, "Menopause:", "", 0, "L", false, 0, "")
	pdf.CellFormat(70, 5, menopauseText, "", 1, "L", false, 0, "")

	pdf.CellFormat(25, 5, "Date:", "", 0, "L", false, 0, "")
	pdf.CellFormat(70, 5, time.Now().Format("Jan 02, 2006"), "", 1, "L", false, 0, "")

	endYPatient := pdf.GetY()

	// Right: Clinical Risk Outcome
	pdf.SetY(startY)
	pdf.SetX(105)

	pdf.SetFont("Arial", "B", 11)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(95, 6, "Screening Outcome", "", 1, "R", false, 0, "")

	pdf.SetX(105)

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
	pdf.SetFont("Arial", "B", 12)
	pdf.CellFormat(95, 8, "RISK LEVEL: "+assessment.Cluster, "1", 1, "C", true, 0, "")

	pdf.SetX(105)
	pdf.SetFillColor(75, 0, 130)
	pdf.CellFormat(95, 8, fmt.Sprintf("Risk Score: %d%%", assessment.RiskScore), "1", 1, "C", true, 0, "")

	endYRisk := pdf.GetY()

	if endYRisk > endYPatient {
		pdf.SetY(endYRisk)
	} else {
		pdf.SetY(endYPatient)
	}
	pdf.Ln(6)
}

func (g *ReportGenerator) addBiomarkerSection(pdf *fpdf.Fpdf, assessment models.Assessment) {
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(190, 6, "Clinical Biomarkers", "", 1, "L", false, 0, "")

	pdf.SetFillColor(75, 0, 130)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(70, 6, "Biomarker", "1", 0, "C", true, 0, "")
	pdf.CellFormat(40, 6, "Result", "1", 0, "C", true, 0, "")
	pdf.CellFormat(40, 6, "Reference Range", "1", 0, "C", true, 0, "")
	pdf.CellFormat(40, 6, "Status", "1", 1, "C", true, 0, "")

	pdf.SetTextColor(0, 0, 0)
	pdf.SetFont("Arial", "", 9)

	g.addBiomarkerRow(pdf, "HbA1c (%)", fmt.Sprintf("%.1f", assessment.HbA1c), "< 5.7", g.getHbA1cStatus(assessment.HbA1c))
	g.addBiomarkerRow(pdf, "Fasting Blood Sugar (mg/dL)", fmt.Sprintf("%.0f", assessment.FBS), "< 100", g.getFBSStatus(assessment.FBS))
	g.addBiomarkerRow(pdf, "BMI (kg/m²)", fmt.Sprintf("%.1f", assessment.BMI), "18.5 - 22.9", g.getBMIStatus(assessment.BMI))
	g.addBiomarkerRow(pdf, "Total Cholesterol (mg/dL)", fmt.Sprintf("%d", assessment.Cholesterol), "< 200", g.getCholStatus(assessment.Cholesterol))
	g.addBiomarkerRow(pdf, "LDL (mg/dL)", fmt.Sprintf("%d", assessment.LDL), "< 100", g.getLDLStatus(assessment.LDL))
	g.addBiomarkerRow(pdf, "HDL (mg/dL)", fmt.Sprintf("%d", assessment.HDL), "> 50", g.getHDLStatus(assessment.HDL))
	g.addBiomarkerRow(pdf, "Triglycerides (mg/dL)", fmt.Sprintf("%d", assessment.Triglycerides), "< 150", g.getTGStatus(assessment.Triglycerides))

	pdf.Ln(6)
}

func (g *ReportGenerator) addBiomarkerRow(pdf *fpdf.Fpdf, name, value, normalRange, status string) {
	pdf.SetFillColor(245, 245, 250)
	pdf.CellFormat(70, 5, name, "1", 0, "L", true, 0, "")
	pdf.CellFormat(40, 5, value, "1", 0, "C", true, 0, "")
	pdf.CellFormat(40, 5, normalRange, "1", 0, "C", true, 0, "")

	switch status {
	case "Normal":
		pdf.SetTextColor(34, 139, 34)
	case "Borderline", "Elevated":
		pdf.SetTextColor(255, 165, 0)
	case "High", "Low", "Obese", "Pre-diabetic":
		pdf.SetTextColor(255, 69, 0)
	case "Diabetic":
		pdf.SetTextColor(178, 34, 34)
	default:
		pdf.SetTextColor(0, 0, 0)
	}

	pdf.CellFormat(40, 5, status, "1", 1, "C", true, 0, "")
	pdf.SetTextColor(0, 0, 0)
}

type shapItem struct {
	Feature      string
	FeatureValue string
	ShapValue    float64
	Contribution string
}

func (g *ReportGenerator) addSHAPExplanation(pdf *fpdf.Fpdf, shapData map[string]any) {
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(190, 6, "AI Explanation (Top 5 Influencing Factors)", "", 1, "L", false, 0, "")

	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(64, 64, 64)
	pdf.CellFormat(190, 4, "These biomarkers had the greatest impact (+ increases risk, - decreases risk) on the AI's prediction.", "", 1, "L", false, 0, "")
	pdf.Ln(2)

	if shapValues, ok := shapData["shap_values"].([]any); ok {
		var items []shapItem
		for _, sv := range shapValues {
			if svMap, ok := sv.(map[string]any); ok {
				feature := fmt.Sprintf("%v", svMap["feature"])
				featureValue := fmt.Sprintf("%.2f", svMap["feature_value"])
				shapValue := svMap["shap_value"].(float64)
				contribution := fmt.Sprintf("%+.4f", shapValue)
				items = append(items, shapItem{
					Feature:      feature,
					FeatureValue: featureValue,
					ShapValue:    shapValue,
					Contribution: contribution,
				})
			}
		}

		sort.Slice(items, func(i, j int) bool {
			return math.Abs(items[i].ShapValue) > math.Abs(items[j].ShapValue)
		})

		if len(items) > 5 {
			items = items[:5]
		}

		pdf.SetFont("Arial", "B", 9)
		pdf.SetFillColor(147, 112, 219)
		pdf.SetTextColor(255, 255, 255)
		pdf.CellFormat(90, 6, "Feature", "1", 0, "C", true, 0, "")
		pdf.CellFormat(50, 6, "Recorded Value", "1", 0, "C", true, 0, "")
		pdf.CellFormat(50, 6, "Impact", "1", 1, "C", true, 0, "")

		pdf.SetFont("Arial", "", 9)

		for _, item := range items {
			pdf.SetTextColor(0, 0, 0)
			pdf.CellFormat(90, 5, item.Feature, "1", 0, "L", false, 0, "")
			pdf.CellFormat(50, 5, item.FeatureValue, "1", 0, "C", false, 0, "")

			if item.ShapValue > 0 {
				pdf.SetTextColor(239, 68, 68)
			} else {
				pdf.SetTextColor(34, 197, 94)
			}
			pdf.CellFormat(50, 5, item.Contribution, "1", 1, "C", false, 0, "")
		}
	}
	pdf.Ln(6)
}

func (g *ReportGenerator) addRecommendations(pdf *fpdf.Fpdf, assessment models.Assessment) {
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(0, 0, 0)
	pdf.CellFormat(190, 6, "Clinical Recommendations", "", 1, "L", false, 0, "")

	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(64, 64, 64)

	recommendations := g.getRecommendations(assessment)
	for _, rec := range recommendations {
		pdf.CellFormat(4, 5, "-", "", 0, "R", false, 0, "")
		pdf.MultiCell(186, 5, " "+rec, "", "L", false)
	}
	pdf.Ln(4)
}

func (g *ReportGenerator) addFooter(pdf *fpdf.Fpdf) {
	pdf.SetY(-20) // Tight bottom placement
	pdf.SetFont("Arial", "I", 7)
	pdf.SetTextColor(128, 128, 128)
	pdf.SetDrawColor(200, 200, 200)
	pdf.Line(10, pdf.GetY(), 200, pdf.GetY())
	pdf.Ln(2)

	disclaimer := "This report is generated by DIANA AI and is intended for clinical reference only. " +
		"It should not replace professional medical judgment. Please consult with a healthcare provider for ongoing care decisions."
	pdf.MultiCell(190, 3, disclaimer, "", "C", false)

	pdf.Ln(1)
	pdf.SetFont("Arial", "B", 7)
	pdf.CellFormat(190, 3, fmt.Sprintf("Generated on %s | DIANA V2 Clinical Tool", time.Now().Format("2006-01-02 15:04")), "", 0, "C", false, 0, "")
}

// Status helper functions
func (g *ReportGenerator) getHbA1cStatus(val float64) string {
	if val >= 6.5 {
		return "Diabetic"
	}
	if val >= 5.7 {
		return "Pre-diabetic"
	}
	return "Normal"
}

func (g *ReportGenerator) getFBSStatus(val float64) string {
	if val >= 126 {
		return "Diabetic"
	}
	if val >= 100 {
		return "Pre-diabetic"
	}
	return "Normal"
}

func (g *ReportGenerator) getBMIStatus(val float64) string {
	if val >= 25 {
		return "Obese"
	}
	if val >= 23 {
		return "Overweight"
	}
	if val < 18.5 {
		return "Underweight"
	}
	return "Normal"
}

func (g *ReportGenerator) getCholStatus(val int) string {
	if val >= 240 {
		return "High"
	}
	if val >= 200 {
		return "Borderline"
	}
	return "Normal"
}

func (g *ReportGenerator) getLDLStatus(val int) string {
	if val >= 160 {
		return "High"
	}
	if val >= 130 {
		return "Borderline"
	}
	return "Normal"
}

func (g *ReportGenerator) getHDLStatus(val int) string {
	if val < 40 {
		return "Low"
	}
	if val < 50 {
		return "Borderline"
	}
	return "Normal"
}

func (g *ReportGenerator) getTGStatus(val int) string {
	if val >= 200 {
		return "High"
	}
	if val >= 150 {
		return "Borderline"
	}
	return "Normal"
}

func (g *ReportGenerator) getRecommendations(assessment models.Assessment) []string {
	var recs []string
	if assessment.HbA1c >= 6.5 {
		recs = append(recs, "Schedule follow-up with healthcare provider for diabetes management plan.")
		recs = append(recs, "Consider medication review and rigorous blood glucose monitoring.")
	} else if assessment.HbA1c >= 5.7 {
		recs = append(recs, "Implement dietary and lifestyle modifications to prevent diabetes progression.")
		recs = append(recs, "Monitor HbA1c every 3-6 months strictly.")
	}
	if assessment.BMI >= 30 {
		recs = append(recs, "Consult with a nutritionist for an intensive, sustainable weight management program.")
		recs = append(recs, "Aim for a gradual, clinical weight loss of 5-10% of total body weight.")
	} else if assessment.BMI >= 25 {
		recs = append(recs, "Increase cardiovascular physical activity and adopt a heart-healthy diet regimen.")
	}
	if assessment.LDL >= 160 || assessment.Triglycerides >= 200 {
		recs = append(recs, "Discuss lipid panel management and potential statin therapy with a provider.")
		recs = append(recs, "Crucial: reduce saturated fat intake and significantly increase dietary fiber.")
	}
	recs = append(recs, "Maintain regular aerobic physical activity (minimum 150 minutes per week).")
	recs = append(recs, "Schedule annual comprehensive metabolic health check-ups to track biomarker progression.")
	return recs
}
