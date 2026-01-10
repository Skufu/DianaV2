-- patients.sql: sqlc queries for patient CRUD/listing used by the Postgres store.
-- name: ListPatients :many
SELECT id, user_id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
       activity, phys_activity, smoking, hypertension, heart_disease, family_history, chol, ldl, hdl, triglycerides,
       created_at, updated_at
FROM patients
WHERE user_id = $1
ORDER BY id DESC;

-- name: ListPatientsLimited :many
SELECT id, user_id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
       activity, phys_activity, smoking, hypertension, heart_disease, family_history, chol, ldl, hdl, triglycerides,
       created_at, updated_at
FROM patients
WHERE user_id = $1
ORDER BY id DESC
LIMIT $2;

-- name: CreatePatient :one
INSERT INTO patients (
  user_id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
  activity, phys_activity, smoking, hypertension, heart_disease, family_history, chol, ldl, hdl, triglycerides
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8,
  $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
)
RETURNING id, user_id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
          activity, phys_activity, smoking, hypertension, heart_disease, family_history, chol, ldl, hdl, triglycerides,
          created_at, updated_at;

-- name: GetPatient :one
SELECT id, user_id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
       activity, phys_activity, smoking, hypertension, heart_disease, family_history, chol, ldl, hdl, triglycerides,
       created_at, updated_at
FROM patients
WHERE id = $1 AND user_id = $2
LIMIT 1;

-- name: UpdatePatient :one
UPDATE patients
SET name = $3,
    age = $4,
    menopause_status = $5,
    years_menopause = $6,
    bmi = $7,
    bp_systolic = $8,
    bp_diastolic = $9,
    activity = $10,
    phys_activity = $11,
    smoking = $12,
    hypertension = $13,
    heart_disease = $14,
    family_history = $15,
    chol = $16,
    ldl = $17,
    hdl = $18,
    triglycerides = $19,
    updated_at = NOW()
WHERE id = $1 AND user_id = $2
RETURNING id, user_id, name, age, menopause_status, years_menopause, bmi, bp_systolic, bp_diastolic,
          activity, phys_activity, smoking, hypertension, heart_disease, family_history, chol, ldl, hdl, triglycerides,
          created_at, updated_at;

-- name: DeletePatient :exec
DELETE FROM patients
WHERE id = $1 AND user_id = $2;

-- name: ListPatientsWithLatestAssessment :many
SELECT 
    p.id, p.user_id, p.name, p.age, p.menopause_status, p.years_menopause, 
    p.bmi, p.bp_systolic, p.bp_diastolic, p.activity, p.phys_activity, 
    p.smoking, p.hypertension, p.heart_disease, p.family_history, 
    p.chol, p.ldl, p.hdl, p.triglycerides, p.created_at, p.updated_at,
    COALESCE(la.cluster, '') AS latest_cluster,
    COALESCE(la.risk_score, 0) AS latest_risk_score,
    COALESCE(la.fbs, 0) AS latest_fbs,
    COALESCE(la.hba1c, 0) AS latest_hba1c,
    la.created_at AS latest_assessment_at
FROM patients p
LEFT JOIN LATERAL (
    SELECT a.cluster, a.risk_score, a.fbs, a.hba1c, a.created_at
    FROM assessments a
    WHERE a.patient_id = p.id
    ORDER BY a.created_at DESC
    LIMIT 1
) la ON true
WHERE p.user_id = $1
ORDER BY p.id DESC;

