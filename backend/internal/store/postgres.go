// PostgresStore: pgx-backed repositories for users, patients, and assessments.
package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/skufu/DianaV2/backend/internal/models"
	sqlcgen "github.com/skufu/DianaV2/backend/internal/store/sqlc"
)

type PostgresStore struct {
	pool *pgxpool.Pool
	q    *sqlcgen.Queries
}

func NewPostgresStore(pool *pgxpool.Pool) *PostgresStore {
	var q *sqlcgen.Queries
	if pool != nil {
		q = sqlcgen.New(pool)
	}
	return &PostgresStore{pool: pool, q: q}
}

func (s *PostgresStore) Close() {
	if s.pool != nil {
		s.pool.Close()
	}
}

func (s *PostgresStore) Users() UserRepository {
	return &pgUserRepo{q: s.q, pool: s.pool}
}

func (s *PostgresStore) Patients() PatientRepository {
	return &pgPatientRepo{q: s.q}
}

func (s *PostgresStore) Assessments() AssessmentRepository {
	return &pgAssessmentRepo{q: s.q}
}

func (s *PostgresStore) RefreshTokens() RefreshTokenRepository {
	return &pgRefreshTokenRepo{q: s.q}
}

type pgUserRepo struct {
	q    *sqlcgen.Queries
	pool *pgxpool.Pool
}

func (r *pgUserRepo) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.FindUserByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	return &models.User{
		ID:           int64(row.ID),
		Email:        row.Email,
		PasswordHash: row.PasswordHash,
		Role:         row.Role,
		CreatedAt:    row.CreatedAt.Time,
		UpdatedAt:    row.UpdatedAt.Time,
	}, nil
}

func (r *pgUserRepo) FindByID(ctx context.Context, id int32) (*models.User, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.FindUserByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return &models.User{
		ID:           int64(row.ID),
		Email:        row.Email,
		PasswordHash: row.PasswordHash,
		Role:         row.Role,
		CreatedAt:    row.CreatedAt.Time,
		UpdatedAt:    row.UpdatedAt.Time,
	}, nil
}

type pgPatientRepo struct{ q *sqlcgen.Queries }

func (r *pgPatientRepo) List(ctx context.Context, userID int32) ([]models.Patient, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ListPatients(ctx, userID)
	if err != nil {
		return nil, err
	}
	return mapPatientRows(rows), nil
}

func (r *pgPatientRepo) ListWithLatestAssessment(ctx context.Context, userID int32) ([]models.PatientSummary, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ListPatientsWithLatestAssessment(ctx, userID)
	if err != nil {
		return nil, err
	}
	var out []models.PatientSummary
	for _, r := range rows {
		out = append(out, models.PatientSummary{
			Patient: models.Patient{
				ID:              int64(r.ID),
				UserID:          int64(r.UserID),
				Name:            r.Name,
				Age:             intVal(r.Age),
				MenopauseStatus: textVal(r.MenopauseStatus),
				YearsMenopause:  intVal(r.YearsMenopause),
				BMI:             numericVal(r.Bmi),
				BPSystolic:      intVal(r.BpSystolic),
				BPDiastolic:     intVal(r.BpDiastolic),
				Activity:        textVal(r.Activity),
				PhysActivity:    boolVal(r.PhysActivity),
				Smoking:         textVal(r.Smoking),
				Hypertension:    textVal(r.Hypertension),
				HeartDisease:    textVal(r.HeartDisease),
				FamilyHistory:   boolVal(r.FamilyHistory),
				Chol:            intVal(r.Chol),
				LDL:             intVal(r.Ldl),
				HDL:             intVal(r.Hdl),
				Triglycerides:   intVal(r.Triglycerides),
				CreatedAt:       r.CreatedAt.Time,
				UpdatedAt:       r.UpdatedAt.Time,
			},
			Cluster:   r.LatestCluster,
			RiskScore: int(r.LatestRiskScore),
			Risk:      int(r.LatestRiskScore),
			FBS:       numericVal(r.LatestFbs),
			HbA1c:     numericVal(r.LatestHba1c),
			LastVisit: r.LatestAssessmentAt.Time,
		})
	}
	return out, nil
}

func (r *pgPatientRepo) Create(ctx context.Context, p models.Patient) (*models.Patient, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.CreatePatient(ctx, sqlcgen.CreatePatientParams{
		UserID:          int32(p.UserID),
		Name:            p.Name,
		Age:             intToPgInt(p.Age),
		MenopauseStatus: textToPg(p.MenopauseStatus),
		YearsMenopause:  intToPgInt(p.YearsMenopause),
		Bmi:             floatToNumeric(p.BMI),
		BpSystolic:      intToPgInt(p.BPSystolic),
		BpDiastolic:     intToPgInt(p.BPDiastolic),
		Activity:        textToPg(p.Activity),
		PhysActivity:    boolToPg(p.PhysActivity),
		Smoking:         textToPg(p.Smoking),
		Hypertension:    textToPg(p.Hypertension),
		HeartDisease:    textToPg(p.HeartDisease),
		FamilyHistory:   boolToPg(p.FamilyHistory),
		Chol:            intToPgInt(p.Chol),
		Ldl:             intToPgInt(p.LDL),
		Hdl:             intToPgInt(p.HDL),
		Triglycerides:   intToPgInt(p.Triglycerides),
	})
	if err != nil {
		return nil, err
	}
	res := mapCreatePatientRow(row)
	return &res, nil
}

func (r *pgPatientRepo) Get(ctx context.Context, id int32, userID int32) (*models.Patient, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.GetPatient(ctx, sqlcgen.GetPatientParams{
		ID:     int32(id),
		UserID: userID,
	})
	if err != nil {
		return nil, err
	}
	res := mapGetPatientRow(row)
	return &res, nil
}

func (r *pgPatientRepo) Update(ctx context.Context, p models.Patient) (*models.Patient, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.UpdatePatient(ctx, sqlcgen.UpdatePatientParams{
		ID:              int32(p.ID),
		UserID:          int32(p.UserID),
		Name:            p.Name,
		Age:             intToPgInt(p.Age),
		MenopauseStatus: textToPg(p.MenopauseStatus),
		YearsMenopause:  intToPgInt(p.YearsMenopause),
		Bmi:             floatToNumeric(p.BMI),
		BpSystolic:      intToPgInt(p.BPSystolic),
		BpDiastolic:     intToPgInt(p.BPDiastolic),
		Activity:        textToPg(p.Activity),
		PhysActivity:    boolToPg(p.PhysActivity),
		Smoking:         textToPg(p.Smoking),
		Hypertension:    textToPg(p.Hypertension),
		HeartDisease:    textToPg(p.HeartDisease),
		FamilyHistory:   boolToPg(p.FamilyHistory),
		Chol:            intToPgInt(p.Chol),
		Ldl:             intToPgInt(p.LDL),
		Hdl:             intToPgInt(p.HDL),
		Triglycerides:   intToPgInt(p.Triglycerides),
	})
	if err != nil {
		return nil, err
	}
	res := mapUpdatePatientRow(row)
	return &res, nil
}

func (r *pgPatientRepo) Delete(ctx context.Context, id int32, userID int32) error {
	if r.q == nil {
		return errors.New("db not configured")
	}
	return r.q.DeletePatient(ctx, sqlcgen.DeletePatientParams{
		ID:     int32(id),
		UserID: userID,
	})
}

func (r *pgPatientRepo) ListAllLimited(ctx context.Context, userID int32, limit int) ([]models.Patient, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ListPatientsLimited(ctx, sqlcgen.ListPatientsLimitedParams{
		UserID: userID,
		Limit:  int32(limit),
	})
	if err != nil {
		return nil, err
	}
	return mapPatientLimitedRows(rows), nil
}

func (r *pgPatientRepo) ListPaginated(ctx context.Context, userID int32, limit, offset int) ([]models.Patient, int, error) {
	if r.q == nil {
		return nil, 0, errors.New("db not configured")
	}
	count, err := r.q.CountPatientsByUser(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	rows, err := r.q.ListPatientsPaginated(ctx, sqlcgen.ListPatientsPaginatedParams{
		UserID: userID,
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	return mapPatientPaginatedRows(rows), int(count), nil
}

type pgAssessmentRepo struct{ q *sqlcgen.Queries }

func (r *pgAssessmentRepo) ListByPatient(ctx context.Context, patientID int64) ([]models.Assessment, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ListAssessmentsByPatient(ctx, int64ToPgInt(patientID))
	if err != nil {
		return nil, err
	}
	return mapAssessmentsByPatientRows(rows), nil
}

func (r *pgAssessmentRepo) ListByPatientPaginated(ctx context.Context, patientID int64, limit, offset int) ([]models.Assessment, int, error) {
	if r.q == nil {
		return nil, 0, errors.New("db not configured")
	}
	count, err := r.q.CountAssessmentsByPatient(ctx, int64ToPgInt(patientID))
	if err != nil {
		return nil, 0, err
	}
	rows, err := r.q.ListAssessmentsByPatientPaginated(ctx, sqlcgen.ListAssessmentsByPatientPaginatedParams{
		PatientID: int64ToPgInt(patientID),
		Limit:     int32(limit),
		Offset:    int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	return mapAssessmentsByPatientRows(rows), int(count), nil
}

func (r *pgAssessmentRepo) Create(ctx context.Context, a models.Assessment) (*models.Assessment, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.CreateAssessment(ctx, sqlcgen.CreateAssessmentParams{
		PatientID:        int64ToPgInt(a.PatientID),
		Fbs:              floatToNumeric(a.FBS),
		Hba1c:            floatToNumeric(a.HbA1c),
		Cholesterol:      intToPgInt(a.Cholesterol),
		Ldl:              intToPgInt(a.LDL),
		Hdl:              intToPgInt(a.HDL),
		Triglycerides:    intToPgInt(a.Triglycerides),
		Systolic:         intToPgInt(a.Systolic),
		Diastolic:        intToPgInt(a.Diastolic),
		Activity:         textToPg(a.Activity),
		HistoryFlag:      boolToPg(a.HistoryFlag),
		Smoking:          textToPg(a.Smoking),
		Hypertension:     textToPg(a.Hypertension),
		HeartDisease:     textToPg(a.HeartDisease),
		Bmi:              floatToNumeric(a.BMI),
		Cluster:          textToPg(a.Cluster),
		RiskScore:        intToPgInt(a.RiskScore),
		ModelVersion:     textToPg(a.ModelVersion),
		DatasetHash:      textToPg(a.DatasetHash),
		ValidationStatus: textToPg(a.ValidationStatus),
	})
	if err != nil {
		return nil, err
	}
	res := mapCreateAssessmentRow(row)
	return &res, nil
}

func (r *pgAssessmentRepo) ClusterCounts(ctx context.Context) ([]models.ClusterAnalytics, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ClusterCounts(ctx)
	if err != nil {
		return nil, err
	}
	var res []models.ClusterAnalytics
	for _, c := range rows {
		res = append(res, models.ClusterAnalytics{
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
			Label: t.Label,
			HbA1c: t.Hba1c,
			FBS:   t.Fbs,
		})
	}
	return res, nil
}

func (r *pgAssessmentRepo) ClusterCountsByUser(ctx context.Context, userID int32) ([]models.ClusterAnalytics, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ClusterCountsByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	var res []models.ClusterAnalytics
	for _, c := range rows {
		res = append(res, models.ClusterAnalytics{
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
	rows, err := r.q.TrendAveragesByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	var res []models.TrendPoint
	for _, t := range rows {
		res = append(res, models.TrendPoint{
			Label: t.Label,
			HbA1c: t.Hba1c,
			FBS:   t.Fbs,
		})
	}
	return res, nil
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
		ID:               int32(a.ID),
		PatientID:        int64ToPgInt(a.PatientID),
		Fbs:              floatToNumeric(a.FBS),
		Hba1c:            floatToNumeric(a.HbA1c),
		Cholesterol:      intToPgInt(a.Cholesterol),
		Ldl:              intToPgInt(a.LDL),
		Hdl:              intToPgInt(a.HDL),
		Triglycerides:    intToPgInt(a.Triglycerides),
		Systolic:         intToPgInt(a.Systolic),
		Diastolic:        intToPgInt(a.Diastolic),
		Activity:         textToPg(a.Activity),
		HistoryFlag:      boolToPg(a.HistoryFlag),
		Smoking:          textToPg(a.Smoking),
		Hypertension:     textToPg(a.Hypertension),
		HeartDisease:     textToPg(a.HeartDisease),
		Bmi:              floatToNumeric(a.BMI),
		Cluster:          textToPg(a.Cluster),
		RiskScore:        intToPgInt(a.RiskScore),
		ModelVersion:     textToPg(a.ModelVersion),
		DatasetHash:      textToPg(a.DatasetHash),
		ValidationStatus: textToPg(a.ValidationStatus),
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
	rows, err := r.q.ListAssessmentsLimitedByUser(ctx, sqlcgen.ListAssessmentsLimitedByUserParams{
		UserID: userID,
		Limit:  int32(limit),
	})
	if err != nil {
		return nil, err
	}
	return mapAssessmentsLimitedRows(rows), nil
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

type pgRefreshTokenRepo struct{ q *sqlcgen.Queries }

func (r *pgRefreshTokenRepo) CreateRefreshToken(ctx context.Context, tokenHash string, userID int32, expiresAt time.Time) (*models.RefreshToken, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.CreateRefreshToken(ctx, sqlcgen.CreateRefreshTokenParams{
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: timeToPgTimestamp(expiresAt),
	})
	if err != nil {
		return nil, err
	}
	return &models.RefreshToken{
		ID:        int64(row.ID),
		UserID:    int64(row.UserID),
		TokenHash: row.TokenHash,
		ExpiresAt: row.ExpiresAt.Time,
		Revoked:   row.Revoked,
		CreatedAt: row.CreatedAt.Time,
		RevokedAt: timestampVal(row.RevokedAt),
	}, nil
}

func (r *pgRefreshTokenRepo) FindRefreshToken(ctx context.Context, tokenHash string) (*models.RefreshToken, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.FindRefreshToken(ctx, tokenHash)
	if err != nil {
		return nil, err
	}
	return &models.RefreshToken{
		ID:        int64(row.ID),
		UserID:    int64(row.UserID),
		TokenHash: row.TokenHash,
		ExpiresAt: row.ExpiresAt.Time,
		Revoked:   row.Revoked,
		CreatedAt: row.CreatedAt.Time,
		RevokedAt: timestampVal(row.RevokedAt),
	}, nil
}

func (r *pgRefreshTokenRepo) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	if r.q == nil {
		return errors.New("db not configured")
	}
	return r.q.RevokeRefreshToken(ctx, tokenHash)
}

func (r *pgRefreshTokenRepo) RevokeAllUserTokens(ctx context.Context, userID int32) error {
	if r.q == nil {
		return errors.New("db not configured")
	}
	return r.q.RevokeAllUserTokens(ctx, userID)
}

func (r *pgRefreshTokenRepo) DeleteExpiredTokens(ctx context.Context) error {
	if r.q == nil {
		return errors.New("db not configured")
	}
	return r.q.DeleteExpiredTokens(ctx)
}

// mapping helpers - patients
func mapPatientRows(rows []sqlcgen.ListPatientsRow) []models.Patient {
	var out []models.Patient
	for _, r := range rows {
		out = append(out, models.Patient{
			ID:              int64(r.ID),
			UserID:          int64(r.UserID),
			Name:            r.Name,
			Age:             intVal(r.Age),
			MenopauseStatus: textVal(r.MenopauseStatus),
			YearsMenopause:  intVal(r.YearsMenopause),
			BMI:             numericVal(r.Bmi),
			BPSystolic:      intVal(r.BpSystolic),
			BPDiastolic:     intVal(r.BpDiastolic),
			Activity:        textVal(r.Activity),
			PhysActivity:    boolVal(r.PhysActivity),
			Smoking:         textVal(r.Smoking),
			Hypertension:    textVal(r.Hypertension),
			HeartDisease:    textVal(r.HeartDisease),
			FamilyHistory:   boolVal(r.FamilyHistory),
			Chol:            intVal(r.Chol),
			LDL:             intVal(r.Ldl),
			HDL:             intVal(r.Hdl),
			Triglycerides:   intVal(r.Triglycerides),
			CreatedAt:       r.CreatedAt.Time,
			UpdatedAt:       r.UpdatedAt.Time,
		})
	}
	return out
}

func mapPatientLimitedRows(rows []sqlcgen.ListPatientsLimitedRow) []models.Patient {
	var out []models.Patient
	for _, r := range rows {
		out = append(out, models.Patient{
			ID:              int64(r.ID),
			UserID:          int64(r.UserID),
			Name:            r.Name,
			Age:             intVal(r.Age),
			MenopauseStatus: textVal(r.MenopauseStatus),
			YearsMenopause:  intVal(r.YearsMenopause),
			BMI:             numericVal(r.Bmi),
			BPSystolic:      intVal(r.BpSystolic),
			BPDiastolic:     intVal(r.BpDiastolic),
			Activity:        textVal(r.Activity),
			PhysActivity:    boolVal(r.PhysActivity),
			Smoking:         textVal(r.Smoking),
			Hypertension:    textVal(r.Hypertension),
			HeartDisease:    textVal(r.HeartDisease),
			FamilyHistory:   boolVal(r.FamilyHistory),
			Chol:            intVal(r.Chol),
			LDL:             intVal(r.Ldl),
			HDL:             intVal(r.Hdl),
			Triglycerides:   intVal(r.Triglycerides),
			CreatedAt:       r.CreatedAt.Time,
			UpdatedAt:       r.UpdatedAt.Time,
		})
	}
	return out
}

func mapPatientPaginatedRows(rows []sqlcgen.ListPatientsPaginatedRow) []models.Patient {
	var out []models.Patient
	for _, r := range rows {
		out = append(out, models.Patient{
			ID:              int64(r.ID),
			UserID:          int64(r.UserID),
			Name:            r.Name,
			Age:             intVal(r.Age),
			MenopauseStatus: textVal(r.MenopauseStatus),
			YearsMenopause:  intVal(r.YearsMenopause),
			BMI:             numericVal(r.Bmi),
			BPSystolic:      intVal(r.BpSystolic),
			BPDiastolic:     intVal(r.BpDiastolic),
			Activity:        textVal(r.Activity),
			PhysActivity:    boolVal(r.PhysActivity),
			Smoking:         textVal(r.Smoking),
			Hypertension:    textVal(r.Hypertension),
			HeartDisease:    textVal(r.HeartDisease),
			FamilyHistory:   boolVal(r.FamilyHistory),
			Chol:            intVal(r.Chol),
			LDL:             intVal(r.Ldl),
			HDL:             intVal(r.Hdl),
			Triglycerides:   intVal(r.Triglycerides),
			CreatedAt:       r.CreatedAt.Time,
			UpdatedAt:       r.UpdatedAt.Time,
		})
	}
	return out
}

func mapCreatePatientRow(r sqlcgen.CreatePatientRow) models.Patient {
	return models.Patient{
		ID:              int64(r.ID),
		UserID:          int64(r.UserID),
		Name:            r.Name,
		Age:             intVal(r.Age),
		MenopauseStatus: textVal(r.MenopauseStatus),
		YearsMenopause:  intVal(r.YearsMenopause),
		BMI:             numericVal(r.Bmi),
		BPSystolic:      intVal(r.BpSystolic),
		BPDiastolic:     intVal(r.BpDiastolic),
		Activity:        textVal(r.Activity),
		PhysActivity:    boolVal(r.PhysActivity),
		Smoking:         textVal(r.Smoking),
		Hypertension:    textVal(r.Hypertension),
		HeartDisease:    textVal(r.HeartDisease),
		FamilyHistory:   boolVal(r.FamilyHistory),
		Chol:            intVal(r.Chol),
		LDL:             intVal(r.Ldl),
		HDL:             intVal(r.Hdl),
		Triglycerides:   intVal(r.Triglycerides),
		CreatedAt:       r.CreatedAt.Time,
		UpdatedAt:       r.UpdatedAt.Time,
	}
}

func mapGetPatientRow(r sqlcgen.GetPatientRow) models.Patient {
	return models.Patient{
		ID:              int64(r.ID),
		UserID:          int64(r.UserID),
		Name:            r.Name,
		Age:             intVal(r.Age),
		MenopauseStatus: textVal(r.MenopauseStatus),
		YearsMenopause:  intVal(r.YearsMenopause),
		BMI:             numericVal(r.Bmi),
		BPSystolic:      intVal(r.BpSystolic),
		BPDiastolic:     intVal(r.BpDiastolic),
		Activity:        textVal(r.Activity),
		PhysActivity:    boolVal(r.PhysActivity),
		Smoking:         textVal(r.Smoking),
		Hypertension:    textVal(r.Hypertension),
		HeartDisease:    textVal(r.HeartDisease),
		FamilyHistory:   boolVal(r.FamilyHistory),
		Chol:            intVal(r.Chol),
		LDL:             intVal(r.Ldl),
		HDL:             intVal(r.Hdl),
		Triglycerides:   intVal(r.Triglycerides),
		CreatedAt:       r.CreatedAt.Time,
		UpdatedAt:       r.UpdatedAt.Time,
	}
}

func mapUpdatePatientRow(r sqlcgen.UpdatePatientRow) models.Patient {
	return models.Patient{
		ID:              int64(r.ID),
		UserID:          int64(r.UserID),
		Name:            r.Name,
		Age:             intVal(r.Age),
		MenopauseStatus: textVal(r.MenopauseStatus),
		YearsMenopause:  intVal(r.YearsMenopause),
		BMI:             numericVal(r.Bmi),
		BPSystolic:      intVal(r.BpSystolic),
		BPDiastolic:     intVal(r.BpDiastolic),
		Activity:        textVal(r.Activity),
		PhysActivity:    boolVal(r.PhysActivity),
		Smoking:         textVal(r.Smoking),
		Hypertension:    textVal(r.Hypertension),
		HeartDisease:    textVal(r.HeartDisease),
		FamilyHistory:   boolVal(r.FamilyHistory),
		Chol:            intVal(r.Chol),
		LDL:             intVal(r.Ldl),
		HDL:             intVal(r.Hdl),
		Triglycerides:   intVal(r.Triglycerides),
		CreatedAt:       r.CreatedAt.Time,
		UpdatedAt:       r.UpdatedAt.Time,
	}
}

// mapping helpers - assessments
func mapAssessmentsByPatientRows(rows []sqlcgen.Assessment) []models.Assessment {
	var out []models.Assessment
	for _, r := range rows {
		out = append(out, mapAssessment(r))
	}
	return out
}

func mapAssessmentsLimitedRows(rows []sqlcgen.Assessment) []models.Assessment {
	var out []models.Assessment
	for _, r := range rows {
		out = append(out, mapAssessment(r))
	}
	return out
}

func mapCreateAssessmentRow(r sqlcgen.Assessment) models.Assessment {
	return mapAssessment(r)
}

func mapGetAssessmentRow(r sqlcgen.Assessment) models.Assessment {
	return mapAssessment(r)
}

func mapUpdateAssessmentRow(r sqlcgen.Assessment) models.Assessment {
	return mapAssessment(r)
}

func mapAssessment(a sqlcgen.Assessment) models.Assessment {
	return models.Assessment{
		ID:               int64(a.ID),
		PatientID:        int64Val(a.PatientID),
		FBS:              numericVal(a.Fbs),
		HbA1c:            numericVal(a.Hba1c),
		Cholesterol:      intVal(a.Cholesterol),
		LDL:              intVal(a.Ldl),
		HDL:              intVal(a.Hdl),
		Triglycerides:    intVal(a.Triglycerides),
		Systolic:         intVal(a.Systolic),
		Diastolic:        intVal(a.Diastolic),
		Activity:         textVal(a.Activity),
		HistoryFlag:      boolVal(a.HistoryFlag),
		Smoking:          textVal(a.Smoking),
		Hypertension:     textVal(a.Hypertension),
		HeartDisease:     textVal(a.HeartDisease),
		BMI:              numericVal(a.Bmi),
		Cluster:          textVal(a.Cluster),
		RiskScore:        intVal(a.RiskScore),
		ModelVersion:     textVal(a.ModelVersion),
		DatasetHash:      textVal(a.DatasetHash),
		ValidationStatus: textVal(a.ValidationStatus),
		CreatedAt:        a.CreatedAt.Time,
		UpdatedAt:        a.UpdatedAt.Time,
	}
}

// pgtype helpers
func intVal(v pgtype.Int4) int {
	if !v.Valid {
		return 0
	}
	return int(v.Int32)
}

func int64Val(v pgtype.Int4) int64 {
	if !v.Valid {
		return 0
	}
	return int64(v.Int32)
}

func intToPgInt(v int) pgtype.Int4 {
	return pgtype.Int4{Int32: int32(v), Valid: true}
}

func int64ToPgInt(v int64) pgtype.Int4 {
	return pgtype.Int4{Int32: int32(v), Valid: true}
}

func textVal(t pgtype.Text) string {
	if !t.Valid {
		return ""
	}
	return t.String
}

func textToPg(v string) pgtype.Text {
	if v == "" {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: v, Valid: true}
}

func numericVal(n pgtype.Numeric) float64 {
	if !n.Valid {
		return 0
	}
	f, err := n.Float64Value()
	if err != nil {
		return 0
	}
	return f.Float64
}

func floatToNumeric(v float64) pgtype.Numeric {
	var n pgtype.Numeric
	// Use string representation to ensure proper scanning, including for 0 values
	str := fmt.Sprintf("%f", v)
	_ = n.Scan(str)
	return n
}

func boolVal(b pgtype.Bool) bool {
	if !b.Valid {
		return false
	}
	return b.Bool
}

func boolToPg(v bool) pgtype.Bool {
	return pgtype.Bool{Bool: v, Valid: true}
}

func timestampVal(t pgtype.Timestamptz) time.Time {
	if !t.Valid {
		return time.Time{}
	}
	return t.Time
}

func timeToPgTimestamp(t time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: t, Valid: true}
}
