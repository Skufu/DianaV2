// patient_repo.go: PostgreSQL implementation of PatientRepository interface.
package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/skufu/DianaV2/backend/internal/models"
	sqlcgen "github.com/skufu/DianaV2/backend/internal/store/sqlc"
)

type pgPatientRepo struct {
	q  *sqlcgen.Queries
	tx pgx.Tx // Transaction context for atomicity (used when repo is created via TxStore)
}

// ============================================================================
// Basic Patient CRUD
// ============================================================================

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

func (r *pgPatientRepo) ListWithLatestAssessmentPaginated(ctx context.Context, userID int32, limit, offset int) ([]models.PatientSummary, int, error) {
	if r.q == nil {
		return nil, 0, errors.New("db not configured")
	}
	countResult, err := r.q.CountPatientsWithLatestAssessment(ctx, userID)
	if err != nil {
		return nil, 0, err
	}
	total := int(countResult)
	rows, err := r.q.ListPatientsWithLatestAssessmentPaginated(ctx, sqlcgen.ListPatientsWithLatestAssessmentPaginatedParams{
		UserID: userID,
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return nil, 0, err
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
	return out, total, nil
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
