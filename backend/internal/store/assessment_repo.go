// assessment_repo.go: PostgreSQL implementation of AssessmentRepository interface.
package store

import (
	"context"
	"errors"

	"github.com/skufu/DianaV2/backend/internal/models"
	sqlcgen "github.com/skufu/DianaV2/backend/internal/store/sqlc"
)

type pgAssessmentRepo struct {
	q *sqlcgen.Queries
}

// ============================================================================
// Basic Assessment CRUD
// ============================================================================

func (r *pgAssessmentRepo) ListByPatient(ctx context.Context, patientID int64) ([]models.Assessment, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ListAssessmentsByUser(ctx, int64ToPgInt(patientID))
	if err != nil {
		return nil, err
	}
	return mapListAssessmentsByUserRows(rows), nil
}

func (r *pgAssessmentRepo) ListByPatientPaginated(ctx context.Context, patientID int64, limit, offset int) ([]models.Assessment, int, error) {
	if r.q == nil {
		return nil, 0, errors.New("db not configured")
	}
	count, err := r.q.CountAssessmentsByUser(ctx, int64ToPgInt(patientID))
	if err != nil {
		return nil, 0, err
	}
	rows, err := r.q.ListAssessmentsByUserPaginated(ctx, sqlcgen.ListAssessmentsByUserPaginatedParams{
		UserID: int64ToPgInt(patientID),
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	return mapListAssessmentsByUserPaginatedRows(rows), int(count), nil
}

func (r *pgAssessmentRepo) Create(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.CreateAssessment(ctx, sqlcgen.CreateAssessmentParams{
		UserID:                int64ToPgInt(a.UserID),
		Fbs:                   floatToNumeric(a.FBS),
		Hba1c:                 floatToNumeric(a.HbA1c),
		Cholesterol:           intToPgInt(a.Cholesterol),
		Ldl:                   intToPgInt(a.LDL),
		Hdl:                   intToPgInt(a.HDL),
		Triglycerides:         intToPgInt(a.Triglycerides),
		Systolic:              intToPgInt(a.Systolic),
		Diastolic:             intToPgInt(a.Diastolic),
		WaistCircumference:    floatToNumeric(a.WaistCircumference),
		FamilyHistoryDiabetes: a.FamilyHistoryDiabetes,
		Activity:              textToPg(a.Activity),
		HistoryFlag:           boolToPg(a.HistoryFlag),
		Smoking:               textToPg(a.Smoking),
		Hypertension:          textToPg(a.Hypertension),
		HeartDisease:          textToPg(a.HeartDisease),
		Bmi:                   floatToNumeric(a.BMI),
		Cluster:               textToPg(a.Cluster),
		RiskScore:             intToPgInt(a.RiskScore),
		ModelVersion:          textToPg(a.ModelVersion),
		DatasetHash:           textToPg(a.DatasetHash),
		ValidationStatus:      textToPg(a.ValidationStatus),
		PredictedStatus:       textToPg(a.PredictedStatus),
		RiskLabel:             textToPg(a.RiskLabel),
		ClusterDescription:    textToPg(a.ClusterDescription),
		TreatmentFocus:        textToPg(a.TreatmentFocus),
		AtRiskProbability:     floatToPgFloat(a.AtRiskProbability),
		IsSelfReported:        a.IsSelfReported,
		Source:                a.Source,
		Notes:                 textToPg(a.Notes),
	})
	if err != nil {
		return nil, err
	}
	res := mapCreateAssessmentRow(row)
	return &res, nil
}

func (r *pgAssessmentRepo) Get(ctx context.Context, id int32) (*models.Assessment, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.GetAssessment(ctx, id)
	if err != nil {
		return nil, err
	}
	res := mapGetAssessmentRow(row)
	return &res, nil
}

func (r *pgAssessmentRepo) Update(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.UpdateAssessment(ctx, sqlcgen.UpdateAssessmentParams{
		ID:                    int32(a.ID),
		UserID:                int64ToPgInt(a.UserID),
		Fbs:                   floatToNumeric(a.FBS),
		Hba1c:                 floatToNumeric(a.HbA1c),
		Cholesterol:           intToPgInt(a.Cholesterol),
		Ldl:                   intToPgInt(a.LDL),
		Hdl:                   intToPgInt(a.HDL),
		Triglycerides:         intToPgInt(a.Triglycerides),
		Systolic:              intToPgInt(a.Systolic),
		Diastolic:             intToPgInt(a.Diastolic),
		WaistCircumference:    floatToNumeric(a.WaistCircumference),
		FamilyHistoryDiabetes: a.FamilyHistoryDiabetes,
		Activity:              textToPg(a.Activity),
		HistoryFlag:           boolToPg(a.HistoryFlag),
		Smoking:               textToPg(a.Smoking),
		Hypertension:          textToPg(a.Hypertension),
		HeartDisease:          textToPg(a.HeartDisease),
		Bmi:                   floatToNumeric(a.BMI),
		Cluster:               textToPg(a.Cluster),
		RiskScore:             intToPgInt(a.RiskScore),
		ModelVersion:          textToPg(a.ModelVersion),
		DatasetHash:           textToPg(a.DatasetHash),
		ValidationStatus:      textToPg(a.ValidationStatus),
		PredictedStatus:       textToPg(a.PredictedStatus),
		RiskLabel:             textToPg(a.RiskLabel),
		ClusterDescription:    textToPg(a.ClusterDescription),
		TreatmentFocus:        textToPg(a.TreatmentFocus),
		AtRiskProbability:     floatToPgFloat(a.AtRiskProbability),
		Notes:                 textToPg(a.Notes),
	})
	if err != nil {
		return nil, err
	}
	res := mapUpdateAssessmentRow(row)
	return &res, nil
}

func (r *pgAssessmentRepo) Delete(ctx context.Context, id int32) error {
	if r.q == nil {
		return errors.New("db not configured")
	}
	return r.q.DeleteAssessment(ctx, id)
}

func (r *pgAssessmentRepo) ListAllLimited(ctx context.Context, limit int) ([]models.Assessment, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ListAssessmentsLimited(ctx, int32(limit))
	if err != nil {
		return nil, err
	}
	return mapAssessmentsLimitedRows(rows), nil
}

func (r *pgAssessmentRepo) ListAllLimitedByUser(ctx context.Context, userID int32, limit int) ([]models.Assessment, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ListAssessmentsByUserPaginated(ctx, sqlcgen.ListAssessmentsByUserPaginatedParams{
		UserID: int64ToPgInt(int64(userID)),
		Limit:  int32(limit),
		Offset: 0,
	})
	if err != nil {
		return nil, err
	}
	return mapListAssessmentsByUserPaginatedRows(rows), nil
}

// ============================================================================
// Assessment Analytics & Insights
// ============================================================================

func (r *pgAssessmentRepo) ClusterCounts(ctx context.Context) ([]models.ClusterInsights, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ClusterCounts(ctx)
	if err != nil {
		return nil, err
	}
	var res []models.ClusterInsights
	for _, c := range rows {
		res = append(res, models.ClusterInsights{
			Cluster: c.Cluster,
			Count:   int(c.Count),
		})
	}
	return res, nil
}

func (r *pgAssessmentRepo) TrendAverages(ctx context.Context) ([]models.TrendPoint, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.TrendAverages(ctx)
	if err != nil {
		return nil, err
	}
	var res []models.TrendPoint
	for _, t := range rows {
		res = append(res, models.TrendPoint{
			Label:     t.Label,
			BMI:       t.Bmi,
			RiskScore: t.RiskScore,
		})
	}
	return res, nil
}

func (r *pgAssessmentRepo) ClusterCountsByUser(ctx context.Context, userID int32) ([]models.ClusterInsights, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ClusterCountsByUser(ctx, intToPgInt(int(userID)))
	if err != nil {
		return nil, err
	}
	var res []models.ClusterInsights
	for _, c := range rows {
		res = append(res, models.ClusterInsights{
			Cluster: c.Cluster,
			Count:   int(c.Count),
		})
	}
	return res, nil
}

func (r *pgAssessmentRepo) TrendAveragesByUser(ctx context.Context, userID int32) ([]models.TrendPoint, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.TrendAveragesByUser(ctx, intToPgInt(int(userID)))
	if err != nil {
		return nil, err
	}
	var res []models.TrendPoint
	for _, t := range rows {
		res = append(res, models.TrendPoint{
			Label:     t.Label,
			BMI:       t.Bmi,
			RiskScore: t.RiskScore,
		})
	}
	return res, nil
}

func (r *pgAssessmentRepo) GetTrend(ctx context.Context, patientID int64) ([]models.AssessmentTrend, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	// Use raw SQL since this query may not be in sqlc yet
	// Query returns assessment trend data ordered by created_at ASC
	assessments, err := r.ListByPatient(ctx, patientID)
	if err != nil {
		return nil, err
	}

	// Convert to trend format and sort by date ascending
	var trends []models.AssessmentTrend
	for i := len(assessments) - 1; i >= 0; i-- {
		a := assessments[i]
		var riskScore *float64
		if a.RiskScore > 0 {
			rs := float64(a.RiskScore) / 100.0
			riskScore = &rs
		}
		trends = append(trends, models.AssessmentTrend{
			ID:            a.ID,
			CreatedAt:     a.CreatedAt,
			RiskScore:     riskScore,
			Cluster:       a.Cluster,
			HbA1c:         a.HbA1c,
			BMI:           a.BMI,
			FBS:           a.FBS,
			Triglycerides: a.Triglycerides,
			LDL:           a.LDL,
			HDL:           a.HDL,
		})
	}
	return trends, nil
}
