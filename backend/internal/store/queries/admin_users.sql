-- name: ListUsers :many
SELECT id, email, password_hash, role, is_active, last_login_at, created_by, created_at, updated_at
FROM users
WHERE 
    ($1::text = '' OR email ILIKE '%' || $1 || '%')
    AND ($2::text = '' OR role = $2)
    AND ($3::boolean IS NULL OR is_active = $3)
ORDER BY created_at DESC
LIMIT $4 OFFSET $5;

-- name: CountUsers :one
SELECT COUNT(*) 
FROM users
WHERE 
    ($1::text = '' OR email ILIKE '%' || $1 || '%')
    AND ($2::text = '' OR role = $2)
    AND ($3::boolean IS NULL OR is_active = $3);

-- name: CreateUser :one
INSERT INTO users (email, password_hash, role, is_active, created_by, created_at, updated_at)
VALUES ($1, $2, $3, true, $4, NOW(), NOW())
RETURNING id, email, password_hash, role, is_active, last_login_at, created_by, created_at, updated_at;

-- name: UpdateUser :one
UPDATE users
SET 
    email = COALESCE(NULLIF($2, ''), email),
    role = COALESCE(NULLIF($3, ''), role),
    updated_at = NOW()
WHERE id = $1
RETURNING id, email, password_hash, role, is_active, last_login_at, created_by, created_at, updated_at;

-- name: DeactivateUser :exec
UPDATE users
SET is_active = false, updated_at = NOW()
WHERE id = $1;

-- name: ActivateUser :exec
UPDATE users
SET is_active = true, updated_at = NOW()
WHERE id = $1;

-- name: UpdateLastLogin :exec
UPDATE users
SET last_login_at = NOW(), updated_at = NOW()
WHERE id = $1;

-- name: ResetPassword :exec
UPDATE users
SET password_hash = $2, updated_at = NOW()
WHERE id = $1;
