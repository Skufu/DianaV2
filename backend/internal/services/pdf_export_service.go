package services

import (
	"bytes"
	"fmt"
	"time"

	"github.com/go-pdf/fpdf"
	"github.com/skufu/DianaV2/backend/internal/models"
)

// Professional Medical Color Palette (Industry Standard)
var (
	textDark    = [3]int{30, 41, 59}    // Slate-800
	textLight   = [3]int{100, 116, 139} // Slate-500
	primary     = [3]int{15, 23, 42}    // Slate-900
	borderLight = [3]int{226, 232, 240} // Slate-200

	success = [3]int{22, 163, 74} // Green-600
	warning = [3]int{234, 179, 8} // Yellow-500
	danger  = [3]int{220, 38, 38} // Red-600
)

type PDFExportService struct{}

func NewPDFExportService() *PDFExportService {
	return &PDFExportService{}
}

// GenerateHealthReport generates a professional clinical screening report on a single page
func (s *PDFExportService) GenerateHealthReport(user models.UserProfile, assessments []models.Assessment) ([]byte, error) {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(10, 10, 10) // Industry standard tighter margins
	pdf.SetAutoPageBreak(true, 10)
	pdf.AddPage()

	// === HEADER (Clinical Branding) ===
	pdf.SetFont("Arial", "B", 20)
	pdf.SetTextColor(primary[0], primary[1], primary[2])
	pdf.CellFormat(0, 10, "DIANA CLINICAL HEALTH REPORT", "", 1, "C", false, 0, "")

	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(textLight[0], textLight[1], textLight[2])
	pdf.CellFormat(0, 5, "Diabetes Risk Screening Tool for Postmenopausal Well-being", "", 1, "C", false, 0, "")

	pdf.Ln(4)
	pdf.SetDrawColor(primary[0], primary[1], primary[2])
	pdf.SetLineWidth(0.4)
	pdf.Line(10, pdf.GetY(), 200, pdf.GetY())
	pdf.Ln(6)

	// === PATIENT & RISK SUMMARY (Side-by-Side) ===
	currentY := pdf.GetY()

	// Left Column: Patient Profile
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(textDark[0], textDark[1], textDark[2])
	pdf.CellFormat(95, 7, "Patient Profile", "", 1, "L", false, 0, "")

	fullname := fmt.Sprintf("%s %s", user.FirstName, user.LastName)
	if user.FirstName == "" {
		fullname = user.Email
	}

	pdf.SetFont("Arial", "", 10)
	pdf.SetTextColor(textLight[0], textLight[1], textLight[2])
	s.drawInfoRow(pdf, "Full Name:", fullname, 30)

	age := "N/A"
	if user.DateOfBirth != nil {
		age = fmt.Sprintf("%d years", time.Now().Year()-user.DateOfBirth.Year())
	}
	s.drawInfoRow(pdf, "Age / ID:", fmt.Sprintf("%s (ID: #%d)", age, user.User.ID), 30)
	s.drawInfoRow(pdf, "Status:", casesTitle(user.MenopauseStatus), 30)
	s.drawInfoRow(pdf, "Reported:", time.Now().Format("Jan 02, 2006"), 30)

	bottomYPatient := pdf.GetY()

	// Right Column: Clinical Interpretation
	if len(assessments) > 0 {
		a := assessments[0]
		pdf.SetY(currentY)
		pdf.SetX(110)

		pdf.SetFont("Arial", "B", 12)
		pdf.SetTextColor(textDark[0], textDark[1], textDark[2])
		pdf.CellFormat(90, 7, "Screening Interpretation", "", 1, "C", false, 0, "")

		pdf.SetX(110)
		scoreColor := s.getRiskColor(a.RiskScore)
		pdf.SetFillColor(scoreColor[0], scoreColor[1], scoreColor[2])
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Arial", "B", 14)

		riskLevel := "LOW RISK"
		if a.RiskScore >= 70 {
			riskLevel = "HIGH RISK"
		} else if a.RiskScore >= 30 {
			riskLevel = "MODERATE RISK"
		}

		pdf.CellFormat(90, 10, riskLevel, "1", 1, "C", true, 0, "")

		pdf.SetX(110)
		pdf.SetFillColor(primary[0], primary[1], primary[2])
		pdf.CellFormat(90, 10, fmt.Sprintf("Risk Score: %d%%", a.RiskScore), "1", 1, "C", true, 0, "")
	}

	if pdf.GetY() < bottomYPatient {
		pdf.SetY(bottomYPatient)
	}
	pdf.Ln(8)

	// === BIOMARKER VALUES ===
	if len(assessments) > 0 {
		s.drawBiomarkerTable(pdf, assessments[0])
	}
	pdf.Ln(6)

	// === HISTORY & TRENDS ===
	if len(assessments) > 1 {
		s.drawHistorySection(pdf, assessments)
		pdf.Ln(6)
	}

	// === RECOMMENDATIONS ===
	if len(assessments) > 0 {
		s.drawRecommendations(pdf, assessments[0])
	}

	// === FOOTER ===
	pdf.SetY(-20)
	pdf.SetFont("Arial", "I", 8)
	pdf.SetTextColor(textLight[0], textLight[1], textLight[2])
	pdf.SetDrawColor(borderLight[0], borderLight[1], borderLight[2])
	pdf.Line(10, pdf.GetY(), 200, pdf.GetY())
	pdf.Ln(2)
	pdf.CellFormat(0, 4, "This screening report is AI-assisted and intended for professional clinical reference only.", "", 1, "C", false, 0, "")
	pdf.CellFormat(0, 4, fmt.Sprintf("Generated: %s | DIANA V2 Health Systems", time.Now().Format("2006-01-02 15:04")), "", 1, "C", false, 0, "")

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}
	return buf.Bytes(), nil
}

func (s *PDFExportService) drawInfoRow(pdf *fpdf.Fpdf, label, value string, labelW float64) {
	pdf.SetFont("Arial", "B", 9)
	pdf.CellFormat(labelW, 5, label, "", 0, "L", false, 0, "")
	pdf.SetFont("Arial", "", 9)
	pdf.CellFormat(70, 5, value, "", 1, "L", false, 0, "")
}

func (s *PDFExportService) drawBiomarkerTable(pdf *fpdf.Fpdf, a models.Assessment) {
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(textDark[0], textDark[1], textDark[2])
	pdf.Cell(0, 8, "Biomarker Assessment")
	pdf.Ln(8)

	headers := []string{"Biomarker Component", "Patient Result", "Reference Range", "Clinical Status"}
	widths := []float64{65, 40, 45, 40}

	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(borderLight[0], borderLight[1], borderLight[2])
	for i, h := range headers {
		pdf.CellFormat(widths[i], 8, h, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(8)

	rows := []struct{ name, val, ref, status string }{
		{"BMI (Body Mass Index)", fmt.Sprintf("%.1f kg/m2", a.BMI), "18.5 - 22.9", s.getBMIStatus(a.BMI)},
		{"Total Cholesterol", fmt.Sprintf("%d mg/dL", a.Cholesterol), "< 200", s.getCholStatus(a.Cholesterol)},
		{"LDL (Low-Density Lipoprotein)", fmt.Sprintf("%d mg/dL", a.LDL), "< 100", s.getLDLStatus(a.LDL)},
		{"HDL (High-Density Lipoprotein)", fmt.Sprintf("%d mg/dL", a.HDL), "> 50", s.getHDLStatus(a.HDL)},
		{"Triglycerides", fmt.Sprintf("%d mg/dL", a.Triglycerides), "< 150", s.getTGStatus(a.Triglycerides)},
	}

	pdf.SetFont("Arial", "", 9)
	for _, r := range rows {
		pdf.SetTextColor(textDark[0], textDark[1], textDark[2])
		pdf.CellFormat(widths[0], 6, " "+r.name, "1", 0, "L", false, 0, "")
		pdf.CellFormat(widths[1], 6, r.val, "1", 0, "C", false, 0, "")
		pdf.CellFormat(widths[2], 6, r.ref, "1", 0, "C", false, 0, "")

		color := s.getStatusColor(r.status)
		pdf.SetTextColor(color[0], color[1], color[2])
		pdf.SetFont("Arial", "B", 9)
		pdf.CellFormat(widths[3], 6, r.status, "1", 1, "C", false, 0, "")
		pdf.SetFont("Arial", "", 9)
	}
}

func (s *PDFExportService) drawHistorySection(pdf *fpdf.Fpdf, assessments []models.Assessment) {
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(textDark[0], textDark[1], textDark[2])
	pdf.Cell(0, 8, "Clinical Risk Trends")
	pdf.Ln(8)

	colW := 190.0 / 4.0
	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(borderLight[0], borderLight[1], borderLight[2])
	pdf.CellFormat(colW, 7, "Assessment Date", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colW, 7, "Risk Score", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colW, 7, "BMI", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colW, 7, "Risk Cluster", "1", 1, "C", true, 0, "")

	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(textDark[0], textDark[1], textDark[2])

	limit := 3
	if len(assessments) < limit {
		limit = len(assessments)
	}

	for i := 0; i < limit; i++ {
		a := assessments[i]
		pdf.CellFormat(colW, 6, a.CreatedAt.Format("Jan 02, 2006"), "1", 0, "C", false, 0, "")
		pdf.CellFormat(colW, 6, fmt.Sprintf("%d %%", a.RiskScore), "1", 0, "C", false, 0, "")
		pdf.CellFormat(colW, 6, fmt.Sprintf("%.1f", a.BMI), "1", 0, "C", false, 0, "")
		pdf.CellFormat(colW, 6, a.Cluster, "1", 1, "C", false, 0, "")
	}
}

func (s *PDFExportService) drawRecommendations(pdf *fpdf.Fpdf, a models.Assessment) {
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(textDark[0], textDark[1], textDark[2])
	pdf.Cell(0, 8, "Clinical Discussion Points")
	pdf.Ln(8)

	recs := s.getSmartRecommendations(a)
	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(textDark[0], textDark[1], textDark[2])

	for _, rec := range recs {
		pdf.CellFormat(4, 5, "-", "", 0, "R", false, 0, "")
		pdf.MultiCell(186, 5, " "+rec, "", "L", false)
	}
}

// --- Clinical Logic Helpers ---

func casesTitle(s string) string {
	if len(s) == 0 {
		return "N/A"
	}
	return string(s[0]-32) + s[1:]
}

func (s *PDFExportService) getStatusColor(status string) [3]int {
	switch status {
	case "Normal":
		return success
	case "Borderline", "Elevated", "Overweight", "Pre-diabetic":
		return warning
	default:
		return danger
	}
}

func (s *PDFExportService) getRiskColor(score int) [3]int {
	if score < 30 {
		return success
	}
	if score < 70 {
		return warning
	}
	return danger
}

func (s *PDFExportService) getSmartRecommendations(a models.Assessment) []string {
	var recs []string
	if a.RiskScore >= 70 {
		recs = append(recs, "High clinical risk detected. Schedule immediate medical consultation for comprehensive diagnostic screening.")
	}
	if a.BMI >= 25 {
		recs = append(recs, "Weight management intervention indicated. Discuss nutritional counseling and gradual metabolic targets.")
	}
	if a.LDL >= 130 || a.Cholesterol >= 200 || a.Triglycerides >= 150 {
		recs = append(recs, "Lipid panel outside reference range. Evaluate cardiovascular risk and lipid-lowering lifestyle modifications.")
	}
	if len(recs) == 0 {
		recs = append(recs, "Biomarkers are within physiological targets. Maintain current preventative lifestyle habits and annual screening.")
	}
	return recs
}

func (s *PDFExportService) getBMIStatus(v float64) string {
	if v >= 25 {
		return "Obese"
	}
	if v >= 23 {
		return "Overweight"
	}
	return "Normal"
}
func (s *PDFExportService) getCholStatus(v int) string {
	if v >= 240 {
		return "High"
	}
	if v >= 200 {
		return "Borderline"
	}
	return "Normal"
}
func (s *PDFExportService) getLDLStatus(v int) string {
	if v >= 160 {
		return "High"
	}
	if v >= 130 {
		return "Borderline"
	}
	return "Normal"
}
func (s *PDFExportService) getHDLStatus(v int) string {
	if v < 40 {
		return "Low"
	}
	return "Normal"
}
func (s *PDFExportService) getTGStatus(v int) string {
	if v >= 200 {
		return "High"
	}
	if v >= 150 {
		return "Borderline"
	}
	return "Normal"
}

// GenerateMockData creates realistic mock data for PDF testing
func GenerateMockData() (models.UserProfile, []models.Assessment) {
	dob := time.Date(1968, 5, 15, 0, 0, 0, 0, time.UTC)
	user := models.UserProfile{
		User: models.User{
			ID:              1,
			Email:           "maria.santos@email.com",
			FirstName:       "Maria",
			LastName:        "Santos",
			DateOfBirth:     &dob,
			MenopauseStatus: "post",
			YearsMenopause:  8,
		},
		AssessmentCount:  6,
		CurrentCluster:   "MARD",
		CurrentRiskLevel: "moderate",
	}

	baseTime := time.Now()
	assessments := []models.Assessment{
		{ID: 6, UserID: 1, BMI: 27.4, LDL: 142, HDL: 48, Triglycerides: 168, Cholesterol: 215, Cluster: "MARD", RiskScore: 58, CreatedAt: baseTime},
		{ID: 5, UserID: 1, BMI: 27.8, LDL: 148, HDL: 45, Triglycerides: 175, Cluster: "MARD", RiskScore: 62, CreatedAt: baseTime.AddDate(0, -1, 0)},
		{ID: 4, UserID: 1, BMI: 28.1, LDL: 155, HDL: 44, Triglycerides: 182, Cluster: "SIDD", RiskScore: 68, CreatedAt: baseTime.AddDate(0, -2, 0)},
	}
	return user, assessments
}

func getRiskLevel(score int32) string {
	if score < 30 {
		return "Low"
	}
	if score < 70 {
		return "Moderate"
	}
	return "High"
}
