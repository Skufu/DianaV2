package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/skufu/DianaV2/internal/models"
	sqlcgen "github.com/skufu/DianaV2/internal/store/sqlc"
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
	return &pgUserRepo{q: s.q}
}

func (s *PostgresStore) Patients() PatientRepository {
	return &pgPatientRepo{q: s.q}
}

func (s *PostgresStore) Assessments() AssessmentRepository {
	return &pgAssessmentRepo{q: s.q}
}

type pgUserRepo struct{ q *sqlcgen.Queries }

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

type pgPatientRepo struct{ q *sqlcgen.Queries }

func (r *pgPatientRepo) List(ctx context.Context) ([]models.Patient, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ListPatients(ctx)
	if err != nil {
		return nil, err
	}
	return mapPatients(rows), nil
}

func (r *pgPatientRepo) Create(ctx context.Context, p models.Patient) (*models.Patient, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.CreatePatient(ctx, sqlcgen.CreatePatientParams{
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
	res := mapPatient(row)
	return &res, nil
}

func (r *pgPatientRepo) ListAllLimited(ctx context.Context, limit int) ([]models.Patient, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ListPatientsLimited(ctx, int32(limit))
	if err != nil {
		return nil, err
	}
	return mapPatients(rows), nil
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
	return mapAssessments(rows), nil
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
	res := mapAssessment(row)
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

func (r *pgAssessmentRepo) ListAllLimited(ctx context.Context, limit int) ([]models.Assessment, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ListAssessmentsLimited(ctx, int32(limit))
	if err != nil {
		return nil, err
	}
	return mapAssessments(rows), nil
}

// mapping helpers
func mapPatients(ps []sqlcgen.Patient) []models.Patient {
	var out []models.Patient
	for _, p := range ps {
		out = append(out, mapPatient(p))
	}
	return out
}

func mapPatient(p sqlcgen.Patient) models.Patient {
	return models.Patient{
		ID:              int64(p.ID),
		Name:            p.Name,
		Age:             intVal(p.Age),
		MenopauseStatus: textVal(p.MenopauseStatus),
		YearsMenopause:  intVal(p.YearsMenopause),
		BMI:             numericVal(p.Bmi),
		BPSystolic:      intVal(p.BpSystolic),
		BPDiastolic:     intVal(p.BpDiastolic),
		Activity:        textVal(p.Activity),
		PhysActivity:    boolVal(p.PhysActivity),
		Smoking:         textVal(p.Smoking),
		Hypertension:    textVal(p.Hypertension),
		HeartDisease:    textVal(p.HeartDisease),
		FamilyHistory:   boolVal(p.FamilyHistory),
		Chol:            intVal(p.Chol),
		LDL:             intVal(p.Ldl),
		HDL:             intVal(p.Hdl),
		Triglycerides:   intVal(p.Triglycerides),
		CreatedAt:       p.CreatedAt.Time,
		UpdatedAt:       p.UpdatedAt.Time,
	}
}

func mapAssessments(as []sqlcgen.Assessment) []models.Assessment {
	var out []models.Assessment
	for _, a := range as {
		out = append(out, mapAssessment(a))
	}
	return out
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
	_ = n.Scan(v)
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
