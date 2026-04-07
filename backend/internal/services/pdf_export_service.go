package services

import (
	"bytes"
	"fmt"
	"sort"
	"strings"
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
	orderedAssessments := s.orderAssessmentsByRecency(assessments)
	latestAssessment, hasLatestAssessment := s.latestAssessment(orderedAssessments)

	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(10, 10, 10) // Industry standard tighter margins
	pdf.SetAutoPageBreak(true, 10)
	pdf.SetCompression(false)
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
	s.drawInfoRow(pdf, "Age / ID:", fmt.Sprintf("%s (ID: #%d)", age, user.ID), 30)
	s.drawInfoRow(pdf, "Status:", casesTitle(user.MenopauseStatus), 30)
	s.drawInfoRow(pdf, "Reported:", time.Now().Format("Jan 02, 2006"), 30)
	if hasLatestAssessment {
		s.drawInfoRow(pdf, "Latest Record:", latestAssessment.CreatedAt.Format("Jan 02, 2006 15:04"), 30)
	} else {
		s.drawInfoRow(pdf, "Latest Record:", "N/A", 30)
	}

	bottomYPatient := pdf.GetY()

	// Right Column: Clinical Interpretation
	if hasLatestAssessment {
		a := latestAssessment
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

		riskLevel := s.riskBandLabel(a.RiskScore)

		pdf.CellFormat(90, 10, riskLevel, "1", 1, "C", true, 0, "")

		pdf.SetX(110)
		pdf.SetFillColor(primary[0], primary[1], primary[2])
		pdf.CellFormat(90, 10, fmt.Sprintf("Risk Score: %d%%", a.RiskScore), "1", 1, "C", true, 0, "")

		probabilitySummary := s.buildProbabilitySummary(a)
		if probabilitySummary != "" {
			pdf.SetX(110)
			pdf.SetTextColor(textDark[0], textDark[1], textDark[2])
			pdf.SetFont("Arial", "", 7)
			pdf.MultiCell(90, 4, probabilitySummary, "1", "L", false)
		}
	}

	bottomYInterpretation := pdf.GetY()
	if bottomYInterpretation > bottomYPatient {
		pdf.SetY(bottomYInterpretation)
	} else {
		pdf.SetY(bottomYPatient)
	}
	pdf.Ln(8)

	// === BIOMARKER VALUES ===
	if hasLatestAssessment {
		s.drawBiomarkerTable(pdf, latestAssessment)
		pdf.Ln(4)
		s.drawPhenotypeSummary(pdf, latestAssessment)
	}
	pdf.Ln(6)

	// === HISTORY & TRENDS ===
	if len(orderedAssessments) > 1 {
		s.drawHistorySection(pdf, orderedAssessments)
		pdf.Ln(6)
	}

	// === RECOMMENDATIONS ===
	if hasLatestAssessment {
		s.drawRecommendations(pdf, latestAssessment)
	}

	// === FOOTER ===
	pdf.SetY(-20)
	pdf.SetFont("Arial", "I", 8)
	pdf.SetTextColor(textLight[0], textLight[1], textLight[2])
	pdf.SetDrawColor(borderLight[0], borderLight[1], borderLight[2])
	pdf.Line(10, pdf.GetY(), 200, pdf.GetY())
	pdf.Ln(2)
	pdf.CellFormat(0, 4, "AI-assisted screening support only; present to your physician for confirmatory diagnostic testing.", "", 1, "C", false, 0, "")
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
	pdf.Cell(0, 8, "Biomarker Assessment (Latest Stored Record)")
	pdf.Ln(8)

	headers := []string{"Biomarker Component", "Patient Result", "Reference Range", "Clinical Status"}
	widths := []float64{65, 40, 45, 40}

	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(borderLight[0], borderLight[1], borderLight[2])
	for i, h := range headers {
		pdf.CellFormat(widths[i], 8, h, "1", 0, "C", true, 0, "")
	}
	pdf.Ln(8)

	// Simplified biomarker panel for clinical review (FBS, HbA1c, BP, Total Cholesterol removed)
	rows := []struct{ name, val, ref, status string }{
		{"BMI (Body Mass Index)", s.formatFloatValue(a.BMI, "kg/m²"), "18.5 - 22.9", s.getBMIStatus(a.BMI)},
		{"LDL Cholesterol", s.formatIntValue(a.LDL, "mg/dL"), "< 100", s.getLDLStatus(a.LDL)},
		{"HDL Cholesterol", s.formatIntValue(a.HDL, "mg/dL"), "> 50", s.getHDLStatus(a.HDL)},
		{"Triglycerides", s.formatIntValue(a.Triglycerides, "mg/dL"), "< 150", s.getTGStatus(a.Triglycerides)},
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

func (s *PDFExportService) drawPhenotypeSummary(pdf *fpdf.Fpdf, a models.Assessment) {
	cluster := strings.ToUpper(strings.TrimSpace(a.Cluster))
	if cluster == "" {
		cluster = "N/A"
	}

	clusterColors := map[string][3]int{
		"SIDD": {220, 53, 69}, // Red - SIDD-like/Lipid-driven cardiovascular risk
		"SIRD": {255, 153, 0}, // Orange - Insulin resistance
		"MOD":  {255, 193, 7}, // Yellow - Obesity-related
		"MARD": {40, 167, 69}, // Green - Mild/Age-related
	}

	clusterNames := map[string]string{
		"SIDD": "SIDD-like (Lipid-Driven Profile)",
		"SIRD": "SIRD-like (Insulin Resistant Profile)",
		"MOD":  "MOD-like (Obesity-Related Profile)",
		"MARD": "MARD-like (Age-Related Profile)",
	}

	clusterShortDesc := map[string]string{
		"SIDD": "High LDL cholesterol, cardiovascular risk priority",
		"SIRD": "Elevated metabolic strain, insulin resistance pattern",
		"MOD":  "Weight-driven metabolic pattern, lifestyle focus",
		"MARD": "Mild age-related pattern, routine monitoring",
	}

	treatmentShort := map[string]string{
		"SIDD": "Lipid management, statin consideration",
		"SIRD": "Insulin sensitivity, metformin option",
		"MOD":  "Weight reduction, lifestyle program",
		"MARD": "Annual check-ups, prevention focus",
	}

	clusterColor, ok := clusterColors[cluster]
	if !ok {
		clusterColor = [3]int{100, 116, 139}
	}

	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(textDark[0], textDark[1], textDark[2])
	pdf.Cell(0, 8, "Metabolic Profile")
	pdf.Ln(8)

	pdf.SetFillColor(clusterColor[0], clusterColor[1], clusterColor[2])
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 14)

	displayName := cluster
	if name, ok := clusterNames[cluster]; ok {
		displayName = name
	}
	pdf.CellFormat(190, 12, displayName, "1", 1, "C", true, 0, "")

	pdf.SetTextColor(textDark[0], textDark[1], textDark[2])
	pdf.SetFont("Arial", "", 10)

	if shortDesc, ok := clusterShortDesc[cluster]; ok {
		pdf.CellFormat(190, 8, shortDesc, "LR", 1, "C", false, 0, "")
	}

	if treatment, ok := treatmentShort[cluster]; ok {
		pdf.SetFont("Arial", "B", 9)
		pdf.CellFormat(60, 7, "Clinical Priority:", "LB", 0, "L", false, 0, "")
		pdf.SetFont("Arial", "", 9)
		pdf.CellFormat(130, 7, treatment, "RB", 1, "L", false, 0, "")
	}

	pdf.SetFont("Arial", "I", 8)
	pdf.SetTextColor(textLight[0], textLight[1], textLight[2])
	pdf.CellFormat(190, 6, "Screening support only. Not a diagnosis.", "LRB", 1, "C", false, 0, "")
	pdf.SetTextColor(textDark[0], textDark[1], textDark[2])
}

func (s *PDFExportService) drawHistorySection(pdf *fpdf.Fpdf, assessments []models.Assessment) {
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(textDark[0], textDark[1], textDark[2])
	pdf.Cell(0, 8, "Recent Assessments")
	pdf.Ln(8)

	colW := 190.0 / 4.0
	pdf.SetFont("Arial", "B", 9)
	pdf.SetFillColor(borderLight[0], borderLight[1], borderLight[2])
	pdf.CellFormat(colW, 7, "Date", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colW, 7, "Risk Score", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colW, 7, "BMI", "1", 0, "C", true, 0, "")
	pdf.CellFormat(colW, 7, "Metabolic Type", "1", 1, "C", true, 0, "")

	pdf.SetFont("Arial", "", 9)
	pdf.SetTextColor(textDark[0], textDark[1], textDark[2])

	limit := 3
	if len(assessments) < limit {
		limit = len(assessments)
	}

	clusterShortNames := map[string]string{
		"SIDD": "SIDD-like",
		"SIRD": "SIRD-like",
		"MOD":  "MOD-like",
		"MARD": "MARD-like",
	}

	for i := 0; i < limit; i++ {
		a := assessments[i]
		clusterDisplay := strings.ToUpper(strings.TrimSpace(a.Cluster))
		if name, ok := clusterShortNames[clusterDisplay]; ok {
			clusterDisplay = name
		} else if clusterDisplay == "" {
			clusterDisplay = "N/A"
		}
		pdf.CellFormat(colW, 6, a.CreatedAt.Format("Jan 02, 2006"), "1", 0, "C", false, 0, "")
		pdf.CellFormat(colW, 6, fmt.Sprintf("%d %%", a.RiskScore), "1", 0, "C", false, 0, "")
		pdf.CellFormat(colW, 6, fmt.Sprintf("%.1f", a.BMI), "1", 0, "C", false, 0, "")
		pdf.CellFormat(colW, 6, clusterDisplay, "1", 1, "C", false, 0, "")
	}
}

func (s *PDFExportService) drawRecommendations(pdf *fpdf.Fpdf, a models.Assessment) {
	pdf.SetFont("Arial", "B", 12)
	pdf.SetTextColor(textDark[0], textDark[1], textDark[2])
	pdf.Cell(0, 8, "Clinical Summary")
	pdf.Ln(8)

	recs := s.getSmartRecommendations(a)
	pdf.SetFont("Arial", "", 10)
	pdf.SetTextColor(textDark[0], textDark[1], textDark[2])

	for _, rec := range recs {
		pdf.CellFormat(4, 6, "-", "", 0, "R", false, 0, "")
		pdf.MultiCell(186, 6, " "+rec, "", "L", false)
	}
}

// --- Clinical Logic Helpers ---

func casesTitle(s string) string {
	if len(s) == 0 {
		return "N/A"
	}
	if len(s) == 1 {
		return strings.ToUpper(s)
	}
	return strings.ToUpper(s[:1]) + s[1:]
}

func (s *PDFExportService) getStatusColor(status string) [3]int {
	switch status {
	case "Normal":
		return success
	case "Not recorded":
		return textLight
	case "Borderline", "Elevated", "Overweight", "Pre-diabetic":
		return warning
	default:
		return danger
	}
}

func (s *PDFExportService) riskBandLabel(score int) string {
	if score >= 70 {
		return "HIGH RISK"
	}
	if score >= 30 {
		return "MODERATE RISK"
	}
	return "LOW RISK"
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

	riskLabel := s.riskBandLabel(a.RiskScore)
	recs = append(recs, fmt.Sprintf("Risk Level: %s (%d%% score)", riskLabel, a.RiskScore))

	if a.Cluster != "" {
		clusterName := s.getFriendlyClusterName(a.Cluster)
		recs = append(recs, fmt.Sprintf("Metabolic Profile: %s", clusterName))
	}

	if a.RiskScore >= 70 {
		recs = append(recs, "Action: Present this report to your physician for confirmatory diagnostic testing (HbA1c, fasting blood sugar).")
		recs = append(recs, "Priority: Schedule follow-up within 1-2 weeks.")
	} else if a.RiskScore >= 30 {
		recs = append(recs, "Action: Discuss these results with your physician. Consider confirmatory HbA1c and fasting blood sugar testing.")
		recs = append(recs, "Schedule: Follow-up within 1-3 months with repeat screening.")
	} else {
		recs = append(recs, "Action: Continue routine preventive care and annual health screening.")
		recs = append(recs, "Maintain: Healthy lifestyle, balanced nutrition, regular physical activity.")
	}

	recs = append(recs, "Note: This screening uses non-diagnostic biomarkers (BMI, lipid panel) to estimate risk. It is not a diagnosis. Clinical judgment and confirmatory lab tests are required.")

	return recs
}

func (s *PDFExportService) getFriendlyClusterName(cluster string) string {
	switch strings.ToUpper(strings.TrimSpace(cluster)) {
	case "SIDD":
		return "SIDD-like (Lipid-Driven / Cardiovascular Risk)"
	case "SIRD":
		return "SIRD-like (Insulin Resistant / Metabolic Strain)"
	case "MOD":
		return "MOD-like (Obesity-Related / Weight Focus)"
	case "MARD":
		return "MARD-like (Age-Related / Routine Monitoring)"
	default:
		return cluster
	}
}

func (s *PDFExportService) getBMIStatus(v float64) string {
	if v <= 0 {
		return "Not recorded"
	}
	if v >= 25 {
		return "Obese"
	}
	if v >= 23 {
		return "Overweight"
	}
	return "Normal"
}

func (s *PDFExportService) getLDLStatus(v int) string {
	if v <= 0 {
		return "Not recorded"
	}
	if v >= 160 {
		return "High"
	}
	if v >= 130 {
		return "Borderline"
	}
	return "Normal"
}
func (s *PDFExportService) getHDLStatus(v int) string {
	if v <= 0 {
		return "Not recorded"
	}
	if v < 40 {
		return "Low"
	}
	return "Normal"
}
func (s *PDFExportService) getTGStatus(v int) string {
	if v <= 0 {
		return "Not recorded"
	}
	if v >= 200 {
		return "High"
	}
	if v >= 150 {
		return "Borderline"
	}
	return "Normal"
}



func (s *PDFExportService) formatIntValue(v int, unit string) string {
	if v <= 0 {
		return "Not recorded"
	}
	return fmt.Sprintf("%d %s", v, unit)
}

func (s *PDFExportService) formatFloatValue(v float64, unit string) string {
	if v <= 0 {
		return "Not recorded"
	}
	return fmt.Sprintf("%.1f %s", v, unit)
}

func (s *PDFExportService) buildProbabilitySummary(a models.Assessment) string {
	parts := make([]string, 0, 2)

	if strings.TrimSpace(a.PredictedStatus) != "" {
		parts = append(parts, fmt.Sprintf("Screening result: %s", a.PredictedStatus))
	}

	if a.AtRiskProbability > 0 {
		parts = append(parts, fmt.Sprintf("Confidence: %.0f%%", a.AtRiskProbability*100))
	}

	// Intentionally exclude raw validation_status codes — the biomarker table
	// already shows which values are abnormal in a clinician-friendly format.

	return strings.Join(parts, " | ")
}

func (s *PDFExportService) orderAssessmentsByRecency(assessments []models.Assessment) []models.Assessment {
	ordered := make([]models.Assessment, len(assessments))
	copy(ordered, assessments)

	sort.SliceStable(ordered, func(i, j int) bool {
		if ordered[i].CreatedAt.Equal(ordered[j].CreatedAt) {
			return ordered[i].ID > ordered[j].ID
		}
		return ordered[i].CreatedAt.After(ordered[j].CreatedAt)
	})

	return ordered
}

func (s *PDFExportService) latestAssessment(assessments []models.Assessment) (models.Assessment, bool) {
	if len(assessments) == 0 {
		return models.Assessment{}, false
	}
	return assessments[0], true
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
