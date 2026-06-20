// postgres_admin.go: Admin-specific repository implementations for audit events and model runs.
package store

import (
	"context"
	"encoding/json"
	"errors"
	"log"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/skufu/DianaV2/backend/internal/models"
	sqlcgen "github.com/skufu/DianaV2/backend/internal/store/sqlc"
)

// safeInt32 converts an int to int32 with bounds checking
func safeInt32(i int) int32 {
	if i > 2147483647 {
		return 2147483647
	}
	if i < -2147483648 {
		return -2147483648
	}
	return int32(i)
}

// ============================================================================
// AuditEventRepository implementation
// ============================================================================

type pgAuditEventRepo struct {
	q  *sqlcgen.Queries
	tx pgx.Tx // Transaction context for atomicity (used when repo is created via TxStore)
}

func (r *pgAuditEventRepo) Create(ctx context.Context, event models.AuditEvent) error {
	if r.q == nil {
		return errors.New("db not configured")
	}

	detailsJSON, err := json.Marshal(event.Details)
	if err != nil {
		return err
	}

	return r.q.CreateAuditEvent(ctx, sqlcgen.CreateAuditEventParams{
		Actor:      pgtype.Text{String: event.Actor, Valid: event.Actor != ""},
		Action:     pgtype.Text{String: event.Action, Valid: event.Action != ""},
		TargetType: pgtype.Text{String: event.TargetType, Valid: event.TargetType != ""},
		TargetID:   pgtype.Int4{Int32: safeInt32(event.TargetID), Valid: event.TargetID != 0},
		Details:    string(detailsJSON),
	})
}

func (r *pgAuditEventRepo) List(ctx context.Context, params models.AuditListParams) ([]models.AuditEvent, int, error) {
	if r.q == nil {
		return nil, 0, errors.New("db not configured")
	}

	page := params.Page
	if page < 1 {
		page = 1
	}
	pageSize := params.PageSize
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize

	// Prepare timestamp parameters
	var startDate pgtype.Timestamptz
	if !params.StartDate.IsZero() {
		startDate = pgtype.Timestamptz{Time: params.StartDate, Valid: true}
	}
	var endDate pgtype.Timestamptz
	if !params.EndDate.IsZero() {
		endDate = pgtype.Timestamptz{Time: params.EndDate, Valid: true}
	}

	// Get total count
	total, err := r.q.CountAuditEvents(ctx, sqlcgen.CountAuditEventsParams{
		Column1: params.Actor,
		Column2: params.Action,
		Column3: startDate,
		Column4: endDate,
	})
	if err != nil {
		return nil, 0, err
	}

	// Get paginated list
	rows, err := r.q.ListAuditEvents(ctx, sqlcgen.ListAuditEventsParams{
		Column1: params.Actor,
		Column2: params.Action,
		Column3: startDate,
		Column4: endDate,
		Limit:   safeInt32(pageSize),
		Offset:  safeInt32(offset),
	})
	if err != nil {
		return nil, 0, err
	}

	var events []models.AuditEvent
	for _, row := range rows {
		var details map[string]any
		if len(row.Details) > 0 {
			if err := json.Unmarshal(row.Details, &details); err != nil {
				log.Printf("[AUDIT DEBUG] Failed to unmarshal audit details: %v", err)
			}
		}

		events = append(events, models.AuditEvent{
			ID:         int64(row.ID),
			Actor:      textVal(row.Actor),
			Action:     textVal(row.Action),
			TargetType: textVal(row.TargetType),
			TargetID:   intVal(row.TargetID),
			Details:    details,
			CreatedAt:  row.CreatedAt.Time,
		})
	}

	return events, int(total), nil
}

// ============================================================================
// ModelRunRepository implementation
// ============================================================================

type pgModelRunRepo struct {
	q  *sqlcgen.Queries
	tx pgx.Tx // Transaction context for atomicity (used when repo is created via TxStore)
}

func (r *pgModelRunRepo) List(ctx context.Context, limit, offset int) ([]models.ModelRun, int, error) {
	if r.q == nil {
		return nil, 0, errors.New("db not configured")
	}

	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	// Get total count
	total, err := r.q.CountModelRuns(ctx)
	if err != nil {
		return nil, 0, err
	}

	// Get paginated list
	rows, err := r.q.ListModelRuns(ctx, sqlcgen.ListModelRunsParams{
		Limit:  safeInt32(limit),
		Offset: safeInt32(offset),
	})
	if err != nil {
		return nil, 0, err
	}

	var runs []models.ModelRun
	isFirst := true
	for _, row := range rows {
		runs = append(runs, models.ModelRun{
			ID:           int64(row.ID),
			ModelVersion: row.ModelVersion,
			DatasetHash:  textVal(row.DatasetHash),
			Notes:        textVal(row.Notes),
			IsActive:     isFirst,
			CreatedAt:    row.CreatedAt.Time,
		})
		isFirst = false
	}

	return runs, int(total), nil
}

func (r *pgModelRunRepo) GetActive(ctx context.Context) (*models.ModelRun, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}

	row, err := r.q.GetLatestModelRun(ctx)
	if err != nil {
		return nil, err
	}

	return &models.ModelRun{
		ID:           int64(row.ID),
		ModelVersion: row.ModelVersion,
		DatasetHash:  textVal(row.DatasetHash),
		Notes:        textVal(row.Notes),
		IsActive:     true,
		CreatedAt:    row.CreatedAt.Time,
	}, nil
}

func (r *pgModelRunRepo) Create(ctx context.Context, run models.ModelRun) (*models.ModelRun, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}

	row, err := r.q.CreateModelRun(ctx, sqlcgen.CreateModelRunParams{
		ModelVersion: run.ModelVersion,
		DatasetHash:  textToPg(run.DatasetHash),
		Notes:        textToPg(run.Notes),
	})
	if err != nil {
		return nil, err
	}

	return &models.ModelRun{
		ID:           int64(row.ID),
		ModelVersion: row.ModelVersion,
		DatasetHash:  textVal(row.DatasetHash),
		Notes:        textVal(row.Notes),
		IsActive:     true,
		CreatedAt:    row.CreatedAt.Time,
	}, nil
}

func (r *pgModelRunRepo) SetActive(ctx context.Context, id int32) error {
	// Note: Model runs are inherently ordered by created_at DESC, so the "active"
	// model is always the most recent one. This method is a no-op placeholder
	// for potential future implementation of explicit model activation.
	return nil
}
