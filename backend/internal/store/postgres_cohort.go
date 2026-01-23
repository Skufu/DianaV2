// cohort_repo.go: PostgreSQL implementation of CohortRepository interface.
package store

import (
	"context"
	"errors"

	"github.com/skufu/DianaV2/backend/internal/models"
	sqlcgen "github.com/skufu/DianaV2/backend/internal/store/sqlc"
)

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
