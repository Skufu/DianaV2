-- clinics.sql: SQLC queries for clinic management

-- name: ListClinics :many
SELECT id, name, address, created_at, updated_at
FROM clinics
ORDER BY name;

-- name: GetClinic :one
SELECT id, name, address, created_at, updated_at
FROM clinics
WHERE id = $1
LIMIT 1;

-- name: CreateClinic :one
INSERT INTO clinics (name, address)
VALUES ($1, $2)
RETURNING id, name, address, created_at, updated_at;

-- name: UpdateClinic :one
UPDATE clinics
SET name = $2, address = $3, updated_at = NOW()
WHERE id = $1
RETURNING id, name, address, created_at, updated_at;

-- name: DeleteClinic :exec
DELETE FROM clinics WHERE id = $1;

-- name: ListUserClinics :many
SELECT c.id, c.name, c.address, c.created_at, c.updated_at, uc.role
FROM clinics c
JOIN user_clinics uc ON c.id = uc.clinic_id
WHERE uc.user_id = $1
ORDER BY c.name;

-- name: ListClinicUsers :many
SELECT u.id, u.email, u.role AS user_role, uc.role AS clinic_role, u.created_at
FROM users u
JOIN user_clinics uc ON u.id = uc.user_id
WHERE uc.clinic_id = $1
ORDER BY u.email;

-- name: AddUserToClinic :exec
INSERT INTO user_clinics (user_id, clinic_id, role)
VALUES ($1, $2, $3)
ON CONFLICT (user_id, clinic_id) DO UPDATE SET role = $3;

-- name: RemoveUserFromClinic :exec
DELETE FROM user_clinics
WHERE user_id = $1 AND clinic_id = $2;

-- name: GetUserClinicRole :one
SELECT role
FROM user_clinics
WHERE user_id = $1 AND clinic_id = $2
LIMIT 1;

-- name: IsClinicAdmin :one
SELECT EXISTS(
    SELECT 1 FROM user_clinics
    WHERE user_id = $1 AND clinic_id = $2 AND role = 'clinic_admin'
) AS is_admin;
