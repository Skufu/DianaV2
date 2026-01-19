// Cohort and Clinic repository implementations for PostgresStore
package store

import (
	"context"
	"errors"

	"github.com/skufu/DianaV2/backend/internal/models"
	sqlcgen "github.com/skufu/DianaV2/backend/internal/store/sqlc"
)

// Cohort returns the CohortRepository implementation
func (s *PostgresStore) Cohort() CohortRepository {
	return &pgCohortRepo{q: s.q}
}

// Clinics returns the ClinicRepository implementation
func (s *PostgresStore) Clinics() ClinicRepository {
	return &pgClinicRepo{q: s.q}
}

// pgCohortRepo implements CohortRepository
type pgCohortRepo struct{ q *sqlcgen.Queries }

func (r *pgCohortRepo) StatsByCluster(ctx context.Context) ([]models.CohortGroup, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.CohortStatsByCluster(ctx)
	if err != nil {
		return nil, err
	}
	var result []models.CohortGroup
	for _, row := range rows {
		result = append(result, models.CohortGroup{
			Name:              row.GroupName,
			Count:             int(row.Count),
			AvgHbA1c:          row.AvgHba1c,
			AvgFBS:            row.AvgFbs,
			AvgBMI:            row.AvgBmi,
			AvgBPSystolic:     row.AvgBpSystolic,
			AvgBPDiastolic:    row.AvgBpDiastolic,
			AvgRiskScore:      row.AvgRiskScore,
			LowRiskCount:      int(row.LowRiskCount),
			ModerateRiskCount: int(row.ModerateRiskCount),
			HighRiskCount:     int(row.HighRiskCount),
		})
	}
	return result, nil
}

func (r *pgCohortRepo) StatsByRiskLevel(ctx context.Context) ([]models.CohortGroup, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.CohortStatsByRiskLevel(ctx)
	if err != nil {
		return nil, err
	}
	var result []models.CohortGroup
	for _, row := range rows {
		result = append(result, models.CohortGroup{
			Name:           row.GroupName,
			Count:          int(row.Count),
			AvgHbA1c:       row.AvgHba1c,
			AvgFBS:         row.AvgFbs,
			AvgBMI:         row.AvgBmi,
			AvgBPSystolic:  row.AvgBpSystolic,
			AvgBPDiastolic: row.AvgBpDiastolic,
			AvgRiskScore:   row.AvgRiskScore,
		})
	}
	return result, nil
}

func (r *pgCohortRepo) StatsByAgeGroup(ctx context.Context) ([]models.CohortGroup, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.CohortStatsByAgeGroup(ctx)
	if err != nil {
		return nil, err
	}
	var result []models.CohortGroup
	for _, row := range rows {
		result = append(result, models.CohortGroup{
			Name:           row.GroupName,
			Count:          int(row.Count),
			AvgHbA1c:       row.AvgHba1c,
			AvgFBS:         row.AvgFbs,
			AvgBMI:         row.AvgBmi,
			AvgBPSystolic:  row.AvgBpSystolic,
			AvgBPDiastolic: row.AvgBpDiastolic,
			AvgRiskScore:   row.AvgRiskScore,
		})
	}
	return result, nil
}

func (r *pgCohortRepo) StatsByMenopauseStatus(ctx context.Context) ([]models.CohortGroup, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.CohortStatsByMenopauseStatus(ctx)
	if err != nil {
		return nil, err
	}
	var result []models.CohortGroup
	for _, row := range rows {
		result = append(result, models.CohortGroup{
			Name:           row.GroupName,
			Count:          int(row.Count),
			AvgHbA1c:       row.AvgHba1c,
			AvgFBS:         row.AvgFbs,
			AvgBMI:         row.AvgBmi,
			AvgBPSystolic:  row.AvgBpSystolic,
			AvgBPDiastolic: row.AvgBpDiastolic,
			AvgRiskScore:   row.AvgRiskScore,
		})
	}
	return result, nil
}

func (r *pgCohortRepo) TotalPatientCount(ctx context.Context) (int, error) {
	if r.q == nil {
		return 0, errors.New("db not configured")
	}
	count, err := r.q.TotalPatientCount(ctx)
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

func (r *pgCohortRepo) TotalAssessmentCount(ctx context.Context) (int, error) {
	if r.q == nil {
		return 0, errors.New("db not configured")
	}
	count, err := r.q.TotalAssessmentCount(ctx)
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

// pgClinicRepo implements ClinicRepository
type pgClinicRepo struct{ q *sqlcgen.Queries }

func (r *pgClinicRepo) List(ctx context.Context) ([]models.Clinic, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ListClinics(ctx)
	if err != nil {
		return nil, err
	}
	var result []models.Clinic
	for _, row := range rows {
		result = append(result, models.Clinic{
			ID:        int64(row.ID),
			Name:      row.Name,
			Address:   textVal(row.Address),
			CreatedAt: row.CreatedAt.Time,
			UpdatedAt: row.UpdatedAt.Time,
		})
	}
	return result, nil
}

func (r *pgClinicRepo) Get(ctx context.Context, id int32) (*models.Clinic, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.GetClinic(ctx, id)
	if err != nil {
		return nil, err
	}
	return &models.Clinic{
		ID:        int64(row.ID),
		Name:      row.Name,
		Address:   textVal(row.Address),
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}, nil
}

func (r *pgClinicRepo) Create(ctx context.Context, name, address string) (*models.Clinic, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.CreateClinic(ctx, sqlcgen.CreateClinicParams{
		Name:    name,
		Address: textToPg(address),
	})
	if err != nil {
		return nil, err
	}
	return &models.Clinic{
		ID:        int64(row.ID),
		Name:      row.Name,
		Address:   textVal(row.Address),
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}, nil
}

func (r *pgClinicRepo) ListUserClinics(ctx context.Context, userID int32) ([]models.UserClinic, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ListUserClinics(ctx, userID)
	if err != nil {
		return nil, err
	}
	var result []models.UserClinic
	for _, row := range rows {
		result = append(result, models.UserClinic{
			Clinic: models.Clinic{
				ID:        int64(row.ID),
				Name:      row.Name,
				Address:   textVal(row.Address),
				CreatedAt: row.CreatedAt.Time,
				UpdatedAt: row.UpdatedAt.Time,
			},
			Role: row.Role,
		})
	}
	return result, nil
}

func (r *pgClinicRepo) IsClinicAdmin(ctx context.Context, userID, clinicID int32) (bool, error) {
	if r.q == nil {
		return false, errors.New("db not configured")
	}
	result, err := r.q.IsClinicAdmin(ctx, sqlcgen.IsClinicAdminParams{
		UserID:   userID,
		ClinicID: clinicID,
	})
	if err != nil {
		return false, err
	}
	return result, nil
}

func (r *pgClinicRepo) ClinicAggregate(ctx context.Context, clinicID int32) (*models.ClinicAggregate, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.ClinicAggregate(ctx, clinicID)
	if err != nil {
		return nil, err
	}
	return &models.ClinicAggregate{
		TotalPatients:        int(row.TotalPatients),
		TotalAssessments:     int(row.TotalAssessments),
		AvgRiskScore:         row.AvgRiskScore,
		HighRiskCount:        int(row.HighRiskCount),
		AssessmentsThisMonth: int(row.AssessmentsThisMonth),
	}, nil
}

func (r *pgClinicRepo) AdminSystemStats(ctx context.Context) (*models.SystemStats, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.AdminSystemStats(ctx)
	if err != nil {
		return nil, err
	}
	return &models.SystemStats{
		TotalUsers:           int(row.TotalUsers),
		TotalPatients:        int(row.TotalPatients),
		TotalAssessments:     int(row.TotalAssessments),
		TotalClinics:         int(row.TotalClinics),
		AvgRiskScore:         row.AvgRiskScore,
		HighRiskCount:        int(row.HighRiskCount),
		AssessmentsThisMonth: int(row.AssessmentsThisMonth),
		NewUsersThisMonth:    int(row.NewUsersThisMonth),
	}, nil
}

func (r *pgClinicRepo) AdminClinicComparison(ctx context.Context) ([]models.ClinicComparison, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.AdminClinicComparison(ctx)
	if err != nil {
		return nil, err
	}
	var result []models.ClinicComparison
	for _, row := range rows {
		result = append(result, models.ClinicComparison{
			ClinicID:        int64(row.ClinicID),
			ClinicName:      row.ClinicName,
			PatientCount:    int(row.PatientCount),
			AssessmentCount: int(row.AssessmentCount),
			AvgRiskScore:    row.AvgRiskScore,
			HighRiskCount:   int(row.HighRiskCount),
		})
	}
	return result, nil
}
