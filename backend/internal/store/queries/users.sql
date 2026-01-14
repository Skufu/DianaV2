-- users.sql: SQLC queries for user management

-- name: FindUserByEmail :one
SELECT id, email, password_hash, is_admin, is_active, created_at, updated_at
FROM users
WHERE email = $1 AND account_status = 'active'
LIMIT 1;

-- name: FindUserByID :one
SELECT id, email, password_hash, is_admin, is_active, created_at, updated_at,
    first_name, last_name, date_of_birth, phone, address,
    menopause_status, menopause_type, years_menopause,
    hypertension, heart_disease, family_history_diabetes, smoking_status,
    consent_personal_data, consent_research_participation, 
    consent_email_updates, consent_analytics, consent_updated_at,
    assessment_frequency_months, reminder_email, last_assessment_reminder_sent,
    onboarding_completed, account_status, deleted_at
FROM users
WHERE id = $1 LIMIT 1;

-- name: GetUsersForNotification :many
SELECT id, email, first_name, last_name, 
    assessment_frequency_months, last_assessment_reminder_sent
FROM users
WHERE reminder_email = true
    AND account_status = 'active'
    AND is_active = true
ORDER BY last_assessment_reminder_sent ASC NULLS FIRST;

-- name: SearchUsers :many
SELECT id, email, first_name, last_name, created_at, is_active,
    onboarding_completed, account_status
FROM users
WHERE ($1::text IS NULL OR email ILIKE '%' || $1 || '%' OR first_name ILIKE '%' || $1 || '%' OR last_name ILIKE '%' || $1 || '%')
    AND ($2::boolean IS NULL OR is_active = $2)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: SoftDeleteUser :exec
UPDATE users SET deleted_at = NOW(), is_active = false, updated_at = NOW() WHERE id = $1;

-- name: UpdateLastLogin :exec
UPDATE users SET
    last_login_at = NOW(),
    updated_at = NOW()
WHERE id = $1;

-- name: UpdateUser :exec
UPDATE users SET
    first_name = $2, last_name = $3, date_of_birth = $4, phone = $5,
    address = $6, menopause_status = $7, menopause_type = $8, years_menopause = $9,
    hypertension = $10, heart_disease = $11, family_history_diabetes = $12, smoking_status = $13,
    assessment_frequency_months = $14, reminder_email = $15,
    updated_at = NOW()
WHERE id = $1;

-- name: UpdateUserConsent :exec
UPDATE users SET 
    consent_personal_data = $2,
    consent_research_participation = $3,
    consent_email_updates = $4,
    consent_analytics = $5,
    consent_updated_at = NOW(),
    updated_at = NOW()
WHERE id = $1;

-- name: UpdateUserOnboarding :exec
UPDATE users SET onboarding_completed = $2, updated_at = NOW() WHERE id = $1;
