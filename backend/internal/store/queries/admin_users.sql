-- name: ListUsers :many
SELECT id, email, is_admin, is_active, created_at, updated_at,
    first_name, last_name, account_status, onboarding_completed
FROM users
WHERE 
    ($1::text = '' OR email ILIKE '%' || $1 || '%')
    AND ($2::text = '' OR is_admin = $2)
    AND ($3::boolean IS NULL OR is_active = $3)
ORDER BY created_at DESC
LIMIT $4 OFFSET $5;

-- name: CountUsers :one
SELECT COUNT(*) 
FROM users
WHERE 
    ($1::text = '' OR email ILIKE '%' || $1 || '%')
    AND ($2::text = '' OR is_admin = $2)
    AND ($3::boolean IS NULL OR is_active = $3);

-- name: CreateUser :one
INSERT INTO users (email, password_hash, is_admin, is_active, created_at, updated_at)
VALUES ($1, $2, $3, true, NOW(), NOW())
RETURNING id, email, password_hash, is_admin, is_active, last_login_at, created_by, created_at, updated_at;

-- name: UpdateUserAdmin :one
UPDATE users
SET 
    email = COALESCE($1, email),
    is_admin = COALESCE($2, is_admin),
    updated_at = NOW()
WHERE id = $3
RETURNING id, email, password_hash, is_admin, is_active, last_login_at, created_by, created_at, updated_at;

-- name: DeactivateUser :exec
UPDATE users
SET is_active = false, updated_at = NOW()
WHERE id = $1;

-- name: ActivateUser :exec
UPDATE users
SET is_active = true, updated_at = NOW()
WHERE id = $1;

-- name: UpdateUserLastLogin :exec
UPDATE users
SET last_login_at = NOW(), updated_at = NOW()
WHERE id = $1;

-- name: ResetPassword :exec
UPDATE users
SET password_hash = $2, updated_at = NOW()
WHERE id = $1;
