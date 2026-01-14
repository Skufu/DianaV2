-- name: ListAssessmentsByUser :many
SELECT id, user_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
    activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
    model_version, dataset_hash, validation_status, is_self_reported, source, notes, created_at, updated_at
FROM assessments
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: CountAssessmentsByUser :one
SELECT COUNT(*) FROM assessments WHERE user_id = $1;

-- name: ListAssessmentsByUserPaginated :many
SELECT id, user_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
    activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
    model_version, dataset_hash, validation_status, is_self_reported, source, notes, created_at, updated_at
FROM assessments
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListAssessmentsLimited :many
SELECT id, user_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
    activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
    model_version, dataset_hash, validation_status, is_self_reported, source, notes, created_at, updated_at
FROM assessments
ORDER BY created_at DESC
LIMIT $1;

-- name: GetAssessment :one
SELECT id, user_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
    activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
    model_version, dataset_hash, validation_status, is_self_reported, source, notes, created_at, updated_at
FROM assessments
WHERE id = $1
LIMIT 1;

-- name: CreateAssessment :one
INSERT INTO assessments (
   user_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
   activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
   model_version, dataset_hash, validation_status, is_self_reported, source, notes
) VALUES (
   $1, $2, $3, $4, $5, $6, $7, $8, $9,
   $10, $11, $12, $13, $14, $15, $16, $17, $18,
   $19, $20, sqlc.narg('is_self_reported'), sqlc.narg('source'), sqlc.narg('notes')
)
RETURNING id, user_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
           activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
           model_version, dataset_hash, validation_status, is_self_reported, source, notes, created_at, updated_at;

-- name: UpdateAssessment :one
UPDATE assessments
SET user_id = $1,
    fbs = $2,
    hba1c = $3,
    cholesterol = $4,
    ldl = $5,
    hdl = $6,
    triglycerides = $7,
    systolic = $8,
    diastolic = $9,
    activity = $10,
    history_flag = $11,
    smoking = $12,
    hypertension = $13,
    heart_disease = $14,
    bmi = $15,
    cluster = $16,
    risk_score = $17,
    model_version = $18,
    dataset_hash = $19,
    validation_status = $20,
    notes = $21,
    updated_at = NOW()
WHERE id = $22
RETURNING id, user_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
          activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
          model_version, dataset_hash, validation_status, is_self_reported, source, notes, created_at, updated_at;

-- name: DeleteAssessment :exec
DELETE FROM assessments
WHERE id = $1;

-- name: GetLatestAssessmentByUser :one
SELECT id, user_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
    activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
    model_version, dataset_hash, validation_status, is_self_reported, source, notes, created_at, updated_at
FROM assessments
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 1;

-- name: GetLatestAssessmentDateByUser :one
SELECT created_at FROM assessments
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 1;

-- name: ClusterCounts :many
SELECT COALESCE(cluster, '') AS cluster, COUNT(*) AS count
FROM assessments
GROUP BY COALESCE(cluster, '');

-- name: ClusterCountsByUser :many
SELECT COALESCE(cluster, '') AS cluster, COUNT(*) AS count
FROM assessments
WHERE user_id = $1
GROUP BY COALESCE(cluster, '');

-- name: TrendAverages :many
SELECT to_char(created_at, 'YYYY-MM') AS label,
    COALESCE(avg(hba1c), 0)::float8 AS hba1c,
    COALESCE(avg(fbs), 0)::float8 AS fbs
FROM assessments
GROUP BY label
ORDER BY label;

-- name: TrendAveragesByUser :many
SELECT to_char(created_at, 'YYYY-MM') AS label,
    COALESCE(avg(hba1c), 0)::float8 AS hba1c,
    COALESCE(avg(fbs), 0)::float8 AS fbs
FROM assessments
WHERE user_id = $1
GROUP BY label
ORDER BY label;

-- name: GetAssessmentTrendByUser :many
SELECT id, created_at, risk_score, cluster, hba1c, bmi, fbs, 
    triglycerides, ldl, hdl
FROM assessments
WHERE user_id = $1
ORDER BY created_at ASC;
