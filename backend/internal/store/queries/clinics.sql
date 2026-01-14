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

-- name: IsClinicAdmin :one
SELECT EXISTS(
    SELECT 1 FROM user_clinics 
    WHERE user_id = $1 AND clinic_id = $2 AND role = 'admin'
);

-- name: ClinicAggregate :one
SELECT 
    (SELECT COUNT(*) FROM user_clinics uc1 WHERE uc1.clinic_id = $1)::int AS total_patients,
    (SELECT COUNT(*) FROM assessments a JOIN user_clinics uc2 ON a.user_id = uc2.user_id WHERE uc2.clinic_id = $1)::int AS total_assessments,
    COALESCE((SELECT AVG(risk_score) FROM assessments a JOIN user_clinics uc3 ON a.user_id = uc3.user_id WHERE uc3.clinic_id = $1), 0)::float8 AS avg_risk_score,
    (SELECT COUNT(*) FROM assessments a JOIN user_clinics uc4 ON a.user_id = uc4.user_id WHERE uc4.clinic_id = $1 AND a.risk_score >= 70)::int AS high_risk_count,
    (SELECT COUNT(*) FROM assessments a JOIN user_clinics uc5 ON a.user_id = uc5.user_id WHERE uc5.clinic_id = $1 AND a.created_at >= DATE_TRUNC('month', NOW()))::int AS assessments_this_month;

-- name: AdminSystemStats :one
SELECT
    (SELECT COUNT(*) FROM users)::int AS total_users,
    (SELECT COUNT(*) FROM users WHERE role = 'patient')::int AS total_patients,
    (SELECT COUNT(*) FROM assessments)::int AS total_assessments,
    (SELECT COUNT(*) FROM clinics)::int AS total_clinics,
    COALESCE((SELECT AVG(risk_score) FROM assessments), 0)::float8 AS avg_risk_score,
    (SELECT COUNT(*) FROM assessments WHERE risk_score >= 70)::int AS high_risk_count,
    (SELECT COUNT(*) FROM assessments WHERE created_at >= DATE_TRUNC('month', NOW()))::int AS assessments_this_month,
    (SELECT COUNT(*) FROM users WHERE created_at >= DATE_TRUNC('month', NOW()))::int AS new_users_this_month;

-- name: AdminClinicComparison :many
SELECT 
    c.id AS clinic_id,
    c.name AS clinic_name,
    COUNT(DISTINCT uc.user_id)::int AS patient_count,
    COUNT(a.id)::int AS assessment_count,
    COALESCE(AVG(a.risk_score), 0)::float8 AS avg_risk_score,
    COUNT(CASE WHEN a.risk_score >= 70 THEN 1 END)::int AS high_risk_count
FROM clinics c
LEFT JOIN user_clinics uc ON c.id = uc.clinic_id
LEFT JOIN assessments a ON uc.user_id = a.user_id
GROUP BY c.id, c.name
ORDER BY c.name;
