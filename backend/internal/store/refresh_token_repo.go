// refresh_token_repo.go: PostgreSQL implementation of RefreshTokenRepository interface.
package store

import (
	"context"
	"errors"
	"time"

	"github.com/skufu/DianaV2/backend/internal/models"
	sqlcgen "github.com/skufu/DianaV2/backend/internal/store/sqlc"
)

type pgRefreshTokenRepo struct {
	q *sqlcgen.Queries
}

// ============================================================================
// Refresh Token CRUD
// ============================================================================

func (r *pgRefreshTokenRepo) CreateRefreshToken(ctx context.Context, tokenHash string, userID int32, expiresAt time.Time) (*models.RefreshToken, error) {
	if r.q == nil {
		return nil, errors.New("db not configured")
	}
	row, err := r.q.CreateRefreshToken(ctx, sqlcgen.CreateRefreshTokenParams{
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: timeToPgTimestamptz(expiresAt),
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
		RevokedAt: timestampTzVal(row.RevokedAt),
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
		RevokedAt: timestampTzVal(row.RevokedAt),
	}, nil
}

// ============================================================================
// Token Management
// ============================================================================

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
