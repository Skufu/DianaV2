-- name: ListAssessmentsByUser :many
SELECT id, user_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
    waist_circumference, family_history_diabetes,
    activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
    model_version, dataset_hash, validation_status, predicted_status, risk_label,
    cluster_description, treatment_focus, at_risk_probability, is_self_reported, source, notes,
    created_at, updated_at
FROM assessments
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: CountAssessmentsByUser :one
SELECT COUNT(*) FROM assessments WHERE user_id = $1;

-- name: ListAssessmentsByUserPaginated :many
SELECT id, user_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
    waist_circumference, family_history_diabetes,
    activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
    model_version, dataset_hash, validation_status, predicted_status, risk_label,
    cluster_description, treatment_focus, at_risk_probability, is_self_reported, source, notes,
    created_at, updated_at
FROM assessments
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: ListAssessmentsLimited :many
SELECT id, user_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
    waist_circumference, family_history_diabetes,
    activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
    model_version, dataset_hash, validation_status, predicted_status, risk_label,
    cluster_description, treatment_focus, at_risk_probability, is_self_reported, source, notes,
    created_at, updated_at
FROM assessments
ORDER BY created_at DESC
LIMIT $1;

-- name: GetAssessment :one
SELECT id, user_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
    waist_circumference, family_history_diabetes,
    activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
    model_version, dataset_hash, validation_status, predicted_status, risk_label,
    cluster_description, treatment_focus, at_risk_probability, is_self_reported, source, notes,
    created_at, updated_at
FROM assessments
WHERE id = $1
LIMIT 1;

-- name: CreateAssessment :one
INSERT INTO assessments (
   user_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
   waist_circumference, family_history_diabetes,
   activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
   model_version, dataset_hash, validation_status, predicted_status, risk_label,
   cluster_description, treatment_focus, at_risk_probability,
   is_self_reported, source, notes
) VALUES (
   $1, $2, $3, $4, $5, $6, $7, $8, $9,
   $10, $11,
   $12, $13, $14, $15, $16, $17, $18,
   $19, $20, $21, $22, $23,
    $24, $25, $26,
    $27, $28, $29,
    $30
)
RETURNING id, user_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
           waist_circumference, family_history_diabetes,
           activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
           model_version, dataset_hash, validation_status, predicted_status, risk_label,
           cluster_description, treatment_focus, at_risk_probability, is_self_reported, source, notes,
           created_at, updated_at;

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
    waist_circumference = $10,
    family_history_diabetes = $11,
    activity = $12,
    history_flag = $13,
    smoking = $14,
    hypertension = $15,
    heart_disease = $16,
    bmi = $17,
    cluster = $18,
    risk_score = $19,
    model_version = $20,
    dataset_hash = $21,
    validation_status = $22,
    predicted_status = $23,
    risk_label = $24,
    cluster_description = $25,
    treatment_focus = $26,
    at_risk_probability = $27,
    notes = $28,
    updated_at = NOW()
WHERE id = $29
RETURNING id, user_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
          waist_circumference, family_history_diabetes,
          activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
          model_version, dataset_hash, validation_status, predicted_status, risk_label,
          cluster_description, treatment_focus, at_risk_probability, is_self_reported, source, notes,
          created_at, updated_at;

-- name: DeleteAssessment :exec
DELETE FROM assessments
WHERE id = $1;

-- name: GetLatestAssessmentByUser :one
SELECT id, user_id, fbs, hba1c, cholesterol, ldl, hdl, triglycerides, systolic, diastolic,
    waist_circumference, family_history_diabetes,
    activity, history_flag, smoking, hypertension, heart_disease, bmi, cluster, risk_score,
    model_version, dataset_hash, validation_status, predicted_status, risk_label,
    cluster_description, treatment_focus, at_risk_probability, is_self_reported, source, notes,
    created_at, updated_at
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
    COALESCE(avg(bmi), 0)::float8 AS bmi,
    COALESCE(avg(risk_score), 0)::float8 AS risk_score
FROM assessments
GROUP BY label
ORDER BY label;

-- name: TrendAveragesByUser :many
SELECT to_char(created_at, 'YYYY-MM') AS label,
    COALESCE(avg(bmi), 0)::float8 AS bmi,
    COALESCE(avg(risk_score), 0)::float8 AS risk_score
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
