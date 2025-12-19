-- name: CreateRefreshToken :one
INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
VALUES ($1, $2, $3)
RETURNING id, user_id, token_hash, expires_at, revoked, created_at, revoked_at;

-- name: FindRefreshToken :one
SELECT id, user_id, token_hash, expires_at, revoked, created_at, revoked_at
FROM refresh_tokens
WHERE token_hash = $1
AND revoked = FALSE
AND expires_at > NOW()
LIMIT 1;

-- name: RevokeRefreshToken :exec
UPDATE refresh_tokens
SET revoked = TRUE,
    revoked_at = NOW()
WHERE token_hash = $1;

-- name: RevokeAllUserTokens :exec
UPDATE refresh_tokens
SET revoked = TRUE,
    revoked_at = NOW()
WHERE user_id = $1
AND revoked = FALSE;

-- name: DeleteExpiredTokens :exec
DELETE FROM refresh_tokens
WHERE expires_at < NOW();
