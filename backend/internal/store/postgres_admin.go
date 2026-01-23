// postgres_admin.go: Admin-specific repository implementations for audit events and model runs.
package store

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/skufu/DianaV2/backend/internal/models"
)

func itoa(n int) string {
	if n < 10 {
		return string(rune('0' + n))
	}
	return itoa(n/10) + string(rune('0'+n%10))
}

// ============================================================================
// AuditEventRepository implementation
// ============================================================================

type pgAuditEventRepo struct {
	pool *pgxpool.Pool
}

func (r *pgAuditEventRepo) Create(ctx context.Context, event models.AuditEvent) error {
	if r.pool == nil {
		return errors.New("db not configured")
	}

	detailsJSON, err := json.Marshal(event.Details)
	if err != nil {
		detailsJSON = []byte("{}")
	}

	query := `
		INSERT INTO audit_events (actor, action, target_type, target_id, details, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
	`

	_, err = r.pool.Exec(ctx, query,
		event.Actor, event.Action, event.TargetType, event.TargetID, detailsJSON,
	)
	return err
}

func (r *pgAuditEventRepo) List(ctx context.Context, params models.AuditListParams) ([]models.AuditEvent, int, error) {
	if r.pool == nil {
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

	query := `
		SELECT id, actor, action, target_type, target_id, details, created_at
		FROM audit_events
		WHERE 1=1
	`
	countQuery := `SELECT COUNT(*) FROM audit_events WHERE 1=1`
	args := []any{}
	argNum := 1

	if params.Actor != "" {
		query += ` AND actor ILIKE '%' || $` + itoa(argNum) + ` || '%'`
		countQuery += ` AND actor ILIKE '%' || $` + itoa(argNum) + ` || '%'`
		args = append(args, params.Actor)
		argNum++
	}

	if params.Action != "" {
		query += ` AND action = $` + itoa(argNum)
		countQuery += ` AND action = $` + itoa(argNum)
		args = append(args, params.Action)
		argNum++
	}

	if !params.StartDate.IsZero() {
		query += ` AND created_at >= $` + itoa(argNum)
		countQuery += ` AND created_at >= $` + itoa(argNum)
		args = append(args, params.StartDate)
		argNum++
	}

	if !params.EndDate.IsZero() {
		query += ` AND created_at <= $` + itoa(argNum)
		countQuery += ` AND created_at <= $` + itoa(argNum)
		args = append(args, params.EndDate)
		argNum++
	}

	var total int
	err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query += ` ORDER BY created_at DESC LIMIT $` + itoa(argNum) + ` OFFSET $` + itoa(argNum+1)
	args = append(args, pageSize, offset)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var events []models.AuditEvent
	for rows.Next() {
		var e models.AuditEvent
		var targetID pgtype.Int4
		var detailsJSON []byte

		err := rows.Scan(&e.ID, &e.Actor, &e.Action, &e.TargetType, &targetID, &detailsJSON, &e.CreatedAt)
		if err != nil {
			return nil, 0, err
		}

		if targetID.Valid {
			e.TargetID = int(targetID.Int32)
		}

		if len(detailsJSON) > 0 {
			_ = json.Unmarshal(detailsJSON, &e.Details)
		}

		events = append(events, e)
	}

	return events, total, nil
}

// ============================================================================
// ModelRunRepository implementation
// ============================================================================

type pgModelRunRepo struct {
	pool *pgxpool.Pool
}

func (r *pgModelRunRepo) List(ctx context.Context, limit, offset int) ([]models.ModelRun, int, error) {
	if r.pool == nil {
		return nil, 0, errors.New("db not configured")
	}

	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	var total int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM model_runs`).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, model_version, dataset_hash, notes, created_at
		FROM model_runs
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var runs []models.ModelRun
	isFirst := true
	for rows.Next() {
		var run models.ModelRun
		var datasetHash, notes pgtype.Text

		err := rows.Scan(&run.ID, &run.ModelVersion, &datasetHash, &notes, &run.CreatedAt)
		if err != nil {
			return nil, 0, err
		}

		if datasetHash.Valid {
			run.DatasetHash = datasetHash.String
		}
		if notes.Valid {
			run.Notes = notes.String
		}

		run.IsActive = isFirst
		isFirst = false

		runs = append(runs, run)
	}

	return runs, total, nil
}

func (r *pgModelRunRepo) GetActive(ctx context.Context) (*models.ModelRun, error) {
	if r.pool == nil {
		return nil, errors.New("db not configured")
	}

	query := `
		SELECT id, model_version, dataset_hash, notes, created_at
		FROM model_runs
		ORDER BY created_at DESC
		LIMIT 1
	`

	var run models.ModelRun
	var datasetHash, notes pgtype.Text

	err := r.pool.QueryRow(ctx, query).Scan(&run.ID, &run.ModelVersion, &datasetHash, &notes, &run.CreatedAt)
	if err != nil {
		return nil, err
	}

	if datasetHash.Valid {
		run.DatasetHash = datasetHash.String
	}
	if notes.Valid {
		run.Notes = notes.String
	}
	run.IsActive = true

	return &run, nil
}

func (r *pgModelRunRepo) Create(ctx context.Context, run models.ModelRun) (*models.ModelRun, error) {
	if r.pool == nil {
		return nil, errors.New("db not configured")
	}

	query := `
		INSERT INTO model_runs (model_version, dataset_hash, notes, created_at)
		VALUES ($1, $2, $3, NOW())
		RETURNING id, created_at
	`

	err := r.pool.QueryRow(ctx, query, run.ModelVersion, run.DatasetHash, run.Notes).Scan(&run.ID, &run.CreatedAt)
	if err != nil {
		return nil, err
	}

	run.IsActive = true
	return &run, nil
}

func (r *pgModelRunRepo) SetActive(ctx context.Context, id int32) error {
	return nil
}
