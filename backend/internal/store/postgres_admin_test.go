package store

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/skufu/DianaV2/backend/internal/models"
	sqlcgen "github.com/skufu/DianaV2/backend/internal/store/sqlc"
)

type captureDBTX struct {
	query string
	args  []any
}

func (c *captureDBTX) Exec(ctx context.Context, query string, args ...any) (pgconn.CommandTag, error) {
	c.query = query
	c.args = args
	return pgconn.NewCommandTag("INSERT 0 1"), nil
}

func (c *captureDBTX) Query(ctx context.Context, query string, args ...any) (pgx.Rows, error) {
	return nil, nil
}

func (c *captureDBTX) QueryRow(ctx context.Context, query string, args ...any) pgx.Row {
	return nil
}

func TestAuditEventRepositoryCreateSendsDetailsAsJSONText(t *testing.T) {
	db := &captureDBTX{}
	repo := &pgAuditEventRepo{q: sqlcgen.New(db)}

	err := repo.Create(context.Background(), models.AuditEvent{
		Actor:      "test@example.com",
		Action:     "assessment.create",
		TargetType: "assessment",
		TargetID:   61,
		Details: map[string]any{
			"method": "POST",
			"body": map[string]any{
				"model_type": "binary_v2_no_bp",
			},
		},
	})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}

	if !strings.Contains(db.query, "::text::jsonb") {
		t.Fatalf("expected audit details query to cast JSON text to jsonb, got %q", db.query)
	}
	if len(db.args) != 5 {
		t.Fatalf("expected 5 query args, got %d", len(db.args))
	}

	details, ok := db.args[4].(string)
	if !ok {
		t.Fatalf("expected details arg to be string JSON text, got %T", db.args[4])
	}

	var decoded map[string]any
	if err := json.Unmarshal([]byte(details), &decoded); err != nil {
		t.Fatalf("details arg is not valid JSON: %v", err)
	}
}
