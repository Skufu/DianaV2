// clinic_repo.go: PostgreSQL implementation of ClinicRepository interface.
package store

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/skufu/DianaV2/backend/internal/models"
	sqlcgen "github.com/skufu/DianaV2/backend/internal/store/sqlc"
)

type pgClinicRepo struct {
	q  *sqlcgen.Queries
	tx pgx.Tx // Transaction context for atomicity (used when repo is created via TxStore)
}

// ============================================================================
// Basic Clinic CRUD
// ============================================================================

func (r *pgClinicRepo) List(ctx context.Context) ([]models.Clinic, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ListClinics(ctx)
	if err != nil {
		return nil, err
	}
	return mapClinicRows(rows), nil
}

func (r *pgClinicRepo) Get(ctx context.Context, id int32) (*models.Clinic, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.GetClinic(ctx, id)
	if err != nil {
		return nil, err
	}
	res := mapClinicRow(row)
	return &res, nil
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
	res := mapClinicRow(row)
	return &res, nil
}

// ============================================================================
// User-Clinic Relationships
// ============================================================================

func (r *pgClinicRepo) ListUserClinics(ctx context.Context, userID int32) ([]models.UserClinic, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	rows, err := r.q.ListUserClinics(ctx, userID)
	if err != nil {
		return nil, err
	}
	var clinics []models.UserClinic
	for _, row := range rows {
		clinics = append(clinics, models.UserClinic{
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
	return clinics, nil
}

func (r *pgClinicRepo) IsClinicAdmin(ctx context.Context, userID, clinicID int32) (bool, error) {
	if r.q == nil {
		return false, errors.New("db not configured")
	}
	return r.q.IsClinicAdmin(ctx, sqlcgen.IsClinicAdminParams{
		UserID:   userID,
		ClinicID: clinicID,
	})
}

// ============================================================================
// Clinic Analytics & Aggregates
// ============================================================================

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
	var comparisons []models.ClinicComparison
	for _, row := range rows {
		comparisons = append(comparisons, models.ClinicComparison{
			ClinicID:        int64(row.ClinicID),
			ClinicName:      row.ClinicName,
			PatientCount:    int(row.PatientCount),
			AssessmentCount: int(row.AssessmentCount),
			AvgRiskScore:    row.AvgRiskScore,
			HighRiskCount:   int(row.HighRiskCount),
		})
	}
	return comparisons, nil
}

// ============================================================================
// Mapping Helpers
// ============================================================================

func mapClinicRows(rows []sqlcgen.Clinic) []models.Clinic {
	var out []models.Clinic
	for _, r := range rows {
		out = append(out, models.Clinic{
			ID:        int64(r.ID),
			Name:      r.Name,
			Address:   textVal(r.Address),
			CreatedAt: r.CreatedAt.Time,
			UpdatedAt: r.UpdatedAt.Time,
		})
	}
	return out
}

func mapClinicRow(r sqlcgen.Clinic) models.Clinic {
	return models.Clinic{
		ID:        int64(r.ID),
		Name:      r.Name,
		Address:   textVal(r.Address),
		CreatedAt: r.CreatedAt.Time,
		UpdatedAt: r.UpdatedAt.Time,
	}
}
