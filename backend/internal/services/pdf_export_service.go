package services

import (
	"bytes"
	"fmt"
	"math/rand"
	"time"

	"github.com/go-pdf/fpdf"
	"github.com/skufu/DianaV2/backend/internal/models"
)

// Professional Medical Color Palette
var (
	textDark    = [3]int{30, 41, 59}    // Slate-800
	textLight   = [3]int{100, 116, 139} // Slate-500
	primary     = [3]int{15, 23, 42}    // Slate-900
	accent      = [3]int{59, 130, 246}  // Blue-500
	bgLight     = [3]int{248, 250, 252} // Slate-50
	borderLight = [3]int{226, 232, 240} // Slate-200

	success = [3]int{22, 163, 74} // Green-600
	warning = [3]int{234, 179, 8} // Yellow-500
	danger  = [3]int{220, 38, 38} // Red-600
)

type PDFExportService struct{}

type PDFExportOptions struct {
	UserID        int64
	UserName      string
	UserEmail     string
	Assessments   []models.Assessment
	IncludeCharts bool
	FormatDate    time.Time
}

func NewPDFExportService() *PDFExportService {
	return &PDFExportService{}
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
		{ID: 6, UserID: 1, HbA1c: 6.2, FBS: 112, BMI: 27.4, LDL: 142, HDL: 48, Triglycerides: 168, Cholesterol: 215, Cluster: "MARD", RiskScore: 58, CreatedAt: baseTime},
		{ID: 5, UserID: 1, HbA1c: 6.4, FBS: 118, BMI: 27.8, LDL: 148, HDL: 45, Triglycerides: 175, Cluster: "MARD", RiskScore: 62, CreatedAt: baseTime.AddDate(0, -1, 0)},
		{ID: 4, UserID: 1, HbA1c: 6.5, FBS: 122, BMI: 28.1, LDL: 155, HDL: 44, Triglycerides: 182, Cluster: "SIDD", RiskScore: 68, CreatedAt: baseTime.AddDate(0, -2, 0)},
		{ID: 3, UserID: 1, HbA1c: 6.7, FBS: 128, BMI: 28.5, LDL: 162, HDL: 42, Triglycerides: 195, Cluster: "SIDD", RiskScore: 72, CreatedAt: baseTime.AddDate(0, -4, 0)},
	}
	return user, assessments
}

// GenerateHealthReport generates a compact single-page PDF
func (s *PDFExportService) GenerateHealthReport(user models.UserProfile, assessments []models.Assessment) ([]byte, error) {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 12, 15)
	pdf.SetAutoPageBreak(false, 10)

	if len(assessments) == 0 {
		user, assessments = GenerateMockData()
	}

	pdf.AddPage()

	// === HEADER ===
	pdf.SetFont("Arial", "B", 20)
	pdf.SetTextColor(primary[0], primary[1], primary[2])
	pdf.CellFormat(60, 10, "DIANA", "", 0, "L", false, 0, "")

	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(textLight[0], textLight[1], textLight[2])
	pdf.CellFormat(0, 10, "CONFIDENTIAL HEALTH REPORT  |  "+time.Now().Format("January 2, 2006"), "", 1, "R", false, 0, "")

	pdf.SetDrawColor(primary[0], primary[1], primary[2])
	pdf.SetLineWidth(0.4)
	pdf.Line(15, pdf.GetY(), 195, pdf.GetY())
	pdf.Ln(6)

	// === PATIENT INFO (Compact Inline) ===
	fullname := fmt.Sprintf("%s %s", user.FirstName, user.LastName)
	if user.FirstName == "" {
		fullname = user.Email
	}
	age := "N/A"
	if user.DateOfBirth != nil {
		age = fmt.Sprintf("%d yrs", time.Now().Year()-user.DateOfBirth.Year())
	}

	pdf.SetFont("Arial", "B", 10)
	pdf.SetTextColor(textDark[0], textDark[1], textDark[2])
	pdf.CellFormat(0, 6, fmt.Sprintf("Patient: %s  |  Age: %s  |  Status: %s  |  ID: #%d",
		fullname, age, casesTitle(user.MenopauseStatus), user.User.ID), "", 1, "L", false, 0, "")
	pdf.Ln(4)

	// === KEY METRICS (3 Cards, Full Width) ===
	if len(assessments) > 0 {
		a := assessments[0]
		boxW := 55.0
		boxH := 22.0
		gap := 7.5
		startX := 15.0
		y := pdf.GetY()

		s.drawMetricCard(pdf, startX, y, boxW, boxH, "DIABETES RISK", fmt.Sprintf("%d%%", a.RiskScore), s.getRiskColor(a.RiskScore))
		s.drawMetricCard(pdf, startX+boxW+gap, y, boxW, boxH, "HbA1c", fmt.Sprintf("%.1f%%", a.HbA1c), s.getStatusColor(s.getHbA1cStatus(a.HbA1c)))
		s.drawMetricCard(pdf, startX+(boxW+gap)*2, y, boxW, boxH, "BMI", fmt.Sprintf("%.1f", a.BMI), s.getStatusColor(s.getBMIStatus(a.BMI)))

		pdf.SetY(y + boxH + 6)
	}

	// === BIOMARKER TABLE ===
	if len(assessments) > 0 {
		s.drawBiomarkerTable(pdf, assessments[0])
	}
	pdf.Ln(4)

	// === BOTTOM SECTION: 2-Column Layout ===
	bottomY := pdf.GetY()
	histW := 90.0
	careX := 15 + histW + 10.0
	careW := 180.0 - histW - 10.0

	// Left: History
	if len(assessments) > 1 {
		s.drawHistorySection(pdf, assessments, histW)
	}
	histEndY := pdf.GetY()

	// Right: Care Plan (use margin trick)
	if len(assessments) > 0 {
		pdf.SetY(bottomY)
		pdf.SetLeftMargin(careX)
		pdf.SetX(careX)
		s.drawCarePlanSection(pdf, assessments[0], careW)
		pdf.SetLeftMargin(15) // Restore
	}
	careEndY := pdf.GetY()

	// Move below
	if histEndY > careEndY {
		pdf.SetY(histEndY)
	} else {
		pdf.SetY(careEndY)
	}

	// === FOOTER ===
	pdf.SetY(-12)
	pdf.SetFont("Arial", "", 7)
	pdf.SetTextColor(textLight[0], textLight[1], textLight[2])
	pdf.CellFormat(0, 4, "Generated by DIANA. This report is for informational purposes only.", "", 0, "C", false, 0, "")

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}
	return buf.Bytes(), nil
}

func (s *PDFExportService) drawMetricCard(pdf *fpdf.Fpdf, x, y, w, h float64, label, value string, color [3]int) {
	pdf.SetFillColor(bgLight[0], bgLight[1], bgLight[2])
	pdf.SetDrawColor(borderLight[0], borderLight[1], borderLight[2])
	pdf.Rect(x, y, w, h, "FD")

	// Status bar
	pdf.SetFillColor(color[0], color[1], color[2])
	pdf.Rect(x, y, 3, h, "F")

	// Label
	pdf.SetXY(x+6, y+4)
	pdf.SetFont("Arial", "B", 7)
	pdf.SetTextColor(textLight[0], textLight[1], textLight[2])
	pdf.Cell(w-6, 4, label)

	// Value
	pdf.SetXY(x+6, y+10)
	pdf.SetFont("Arial", "B", 14)
	pdf.SetTextColor(textDark[0], textDark[1], textDark[2])
	pdf.Cell(w-6, 8, value)
}

func (s *PDFExportService) drawBiomarkerTable(pdf *fpdf.Fpdf, a models.Assessment) {
	pdf.SetFont("Arial", "B", 10)
	pdf.SetTextColor(primary[0], primary[1], primary[2])
	pdf.Cell(0, 8, "Biomarker Details")
	pdf.Ln(6)

	headers := []string{"TEST", "RESULT", "REF. RANGE", "STATUS"}
	widths := []float64{65, 28, 52, 35}
	aligns := []string{"L", "R", "C", "C"}

	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(textLight[0], textLight[1], textLight[2])
	pdf.SetFillColor(bgLight[0], bgLight[1], bgLight[2])
	for i, h := range headers {
		pdf.CellFormat(widths[i], 6, h, "", 0, aligns[i], true, 0, "")
	}
	pdf.Ln(6)

	rows := []struct{ name, val, ref, status string }{
		{"Fasting Blood Glucose", fmt.Sprintf("%.0f mg/dL", a.FBS), "< 100", s.getFBSStatus(a.FBS)},
		{"HbA1c", fmt.Sprintf("%.1f %%", a.HbA1c), "< 5.7", s.getHbA1cStatus(a.HbA1c)},
		{"Total Cholesterol", fmt.Sprintf("%d mg/dL", a.Cholesterol), "< 200", s.getCholStatus(a.Cholesterol)},
		{"HDL Cholesterol", fmt.Sprintf("%d mg/dL", a.HDL), "> 50", s.getHDLStatus(a.HDL)},
		{"LDL Cholesterol", fmt.Sprintf("%d mg/dL", a.LDL), "< 100", s.getLDLStatus(a.LDL)},
		{"Triglycerides", fmt.Sprintf("%d mg/dL", a.Triglycerides), "< 150", s.getTGStatus(a.Triglycerides)},
	}

	pdf.SetFont("Arial", "", 9)
	for i, r := range rows {
		fill := i%2 == 1
		if fill {
			pdf.SetFillColor(252, 252, 253)
		}
		pdf.SetTextColor(textDark[0], textDark[1], textDark[2])
		pdf.CellFormat(widths[0], 6, r.name, "", 0, "L", fill, 0, "")
		pdf.CellFormat(widths[1], 6, r.val, "", 0, "R", fill, 0, "")
		pdf.SetTextColor(textLight[0], textLight[1], textLight[2])
		pdf.CellFormat(widths[2], 6, r.ref, "", 0, "C", fill, 0, "")
		c := s.getStatusColor(r.status)
		pdf.SetTextColor(c[0], c[1], c[2])
		pdf.SetFont("Arial", "B", 8)
		pdf.CellFormat(widths[3], 6, r.status, "", 1, "C", fill, 0, "")
		pdf.SetFont("Arial", "", 9)
	}
}

func (s *PDFExportService) drawHistorySection(pdf *fpdf.Fpdf, assessments []models.Assessment, w float64) {
	pdf.SetFont("Arial", "B", 10)
	pdf.SetTextColor(primary[0], primary[1], primary[2])
	pdf.Cell(w, 8, "Assessment History")
	pdf.Ln(6)

	colW := w / 3.0
	pdf.SetFont("Arial", "B", 8)
	pdf.SetTextColor(textLight[0], textLight[1], textLight[2])
	pdf.SetFillColor(bgLight[0], bgLight[1], bgLight[2])
	pdf.CellFormat(colW, 5, "DATE", "", 0, "C", true, 0, "")
	pdf.CellFormat(colW, 5, "SCORE", "", 0, "C", true, 0, "")
	pdf.CellFormat(colW, 5, "HbA1c", "", 1, "C", true, 0, "")

	pdf.SetFont("Arial", "", 8)
	pdf.SetTextColor(textDark[0], textDark[1], textDark[2])
	max := 4
	if len(assessments) < max {
		max = len(assessments)
	}
	for i := 0; i < max; i++ {
		a := assessments[i]
		fill := i%2 == 1
		if fill {
			pdf.SetFillColor(252, 252, 253)
		}
		pdf.CellFormat(colW, 5, a.CreatedAt.Format("Jan 02, 06"), "", 0, "C", fill, 0, "")
		pdf.CellFormat(colW, 5, fmt.Sprintf("%d%%", a.RiskScore), "", 0, "C", fill, 0, "")
		pdf.CellFormat(colW, 5, fmt.Sprintf("%.1f", a.HbA1c), "", 1, "C", fill, 0, "")
	}
}

func (s *PDFExportService) drawCarePlanSection(pdf *fpdf.Fpdf, a models.Assessment, w float64) {
	pdf.SetFont("Arial", "B", 10)
	pdf.SetTextColor(primary[0], primary[1], primary[2])
	pdf.Cell(w, 8, "Care Plan")
	pdf.Ln(6)

	recs := s.getSmartRecommendations(a)
	if len(recs) > 3 {
		recs = recs[:3]
	}

	pdf.SetFont("Arial", "", 9)
	for _, rec := range recs {
		pdf.SetTextColor(accent[0], accent[1], accent[2])
		pdf.Cell(5, 5, "-")
		pdf.SetTextColor(textDark[0], textDark[1], textDark[2])
		pdf.MultiCell(w-5, 5, rec, "", "L", false)
		pdf.Ln(1)
	}
}

// --- Helpers ---

func casesTitle(s string) string {
	if len(s) == 0 {
		return "N/A"
	}
	if s[0] >= 'a' && s[0] <= 'z' {
		return string(s[0]-32) + s[1:]
	}
	return s
}

func (s *PDFExportService) getStatusColor(status string) [3]int {
	switch status {
	case "Normal":
		return success
	case "Borderline", "Elevated", "Overweight":
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
	if a.HbA1c >= 6.5 {
		recs = append(recs, "Endocrinology consultation recommended.")
	} else if a.HbA1c >= 5.7 {
		recs = append(recs, "Lifestyle intervention program advised. Monitor HbA1c q3 months.")
	}
	if a.BMI >= 25 {
		recs = append(recs, "Nutritional counseling for weight management.")
	}
	if a.LDL >= 130 {
		recs = append(recs, "Lipid monitoring advised. Statin therapy evaluation if indicated.")
	}
	if len(recs) == 0 {
		recs = append(recs, "Continue healthy lifestyle. Annual screening recommended.")
	}
	return recs
}

func (s *PDFExportService) getHbA1cStatus(v float64) string {
	if v >= 6.5 {
		return "High"
	}
	if v >= 5.7 {
		return "Elevated"
	}
	return "Normal"
}
func (s *PDFExportService) getFBSStatus(v float64) string {
	if v >= 126 {
		return "High"
	}
	if v >= 100 {
		return "Elevated"
	}
	return "Normal"
}
func (s *PDFExportService) getBMIStatus(v float64) string {
	if v >= 30 {
		return "Obese"
	}
	if v >= 25 {
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

// Helper for tests
func getRiskLevel(score int32) string {
	if score < 30 {
		return "Low"
	}
	if score < 70 {
		return "Moderate"
	}
	return "High"
}

var _ = rand.Int
