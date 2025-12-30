-- cohort.sql: SQLC queries for cohort analysis and aggregate statistics

-- name: CohortStatsByCluster :many
SELECT 
    COALESCE(cluster, 'Unknown') AS group_name,
    COUNT(*)::int AS count,
    COALESCE(AVG(hba1c), 0)::float8 AS avg_hba1c,
    COALESCE(AVG(fbs), 0)::float8 AS avg_fbs,
    COALESCE(AVG(bmi), 0)::float8 AS avg_bmi,
    COALESCE(AVG(systolic), 0)::float8 AS avg_bp_systolic,
    COALESCE(AVG(diastolic), 0)::float8 AS avg_bp_diastolic,
    COALESCE(AVG(risk_score), 0)::float8 AS avg_risk_score,
    COUNT(CASE WHEN risk_score < 34 THEN 1 END)::int AS low_risk_count,
    COUNT(CASE WHEN risk_score >= 34 AND risk_score < 67 THEN 1 END)::int AS moderate_risk_count,
    COUNT(CASE WHEN risk_score >= 67 THEN 1 END)::int AS high_risk_count
FROM assessments
GROUP BY COALESCE(cluster, 'Unknown');

-- name: CohortStatsByRiskLevel :many
SELECT 
    CASE 
        WHEN risk_score < 34 THEN 'Low'
        WHEN risk_score >= 34 AND risk_score < 67 THEN 'Moderate'
        ELSE 'High'
    END AS group_name,
    COUNT(*)::int AS count,
    COALESCE(AVG(hba1c), 0)::float8 AS avg_hba1c,
    COALESCE(AVG(fbs), 0)::float8 AS avg_fbs,
    COALESCE(AVG(bmi), 0)::float8 AS avg_bmi,
    COALESCE(AVG(systolic), 0)::float8 AS avg_bp_systolic,
    COALESCE(AVG(diastolic), 0)::float8 AS avg_bp_diastolic,
    COALESCE(AVG(risk_score), 0)::float8 AS avg_risk_score
FROM assessments
GROUP BY 
    CASE 
        WHEN risk_score < 34 THEN 'Low'
        WHEN risk_score >= 34 AND risk_score < 67 THEN 'Moderate'
        ELSE 'High'
    END;

-- name: CohortStatsByAgeGroup :many
SELECT 
    CASE 
        WHEN p.age < 45 THEN 'Under 45'
        WHEN p.age >= 45 AND p.age < 55 THEN '45-54'
        WHEN p.age >= 55 AND p.age < 65 THEN '55-64'
        ELSE '65+'
    END AS group_name,
    COUNT(*)::int AS count,
    COALESCE(AVG(a.hba1c), 0)::float8 AS avg_hba1c,
    COALESCE(AVG(a.fbs), 0)::float8 AS avg_fbs,
    COALESCE(AVG(a.bmi), 0)::float8 AS avg_bmi,
    COALESCE(AVG(a.systolic), 0)::float8 AS avg_bp_systolic,
    COALESCE(AVG(a.diastolic), 0)::float8 AS avg_bp_diastolic,
    COALESCE(AVG(a.risk_score), 0)::float8 AS avg_risk_score
FROM assessments a
JOIN patients p ON a.patient_id = p.id
GROUP BY 
    CASE 
        WHEN p.age < 45 THEN 'Under 45'
        WHEN p.age >= 45 AND p.age < 55 THEN '45-54'
        WHEN p.age >= 55 AND p.age < 65 THEN '55-64'
        ELSE '65+'
    END;

-- name: CohortStatsByMenopauseStatus :many
SELECT 
    COALESCE(p.menopause_status, 'Unknown') AS group_name,
    COUNT(*)::int AS count,
    COALESCE(AVG(a.hba1c), 0)::float8 AS avg_hba1c,
    COALESCE(AVG(a.fbs), 0)::float8 AS avg_fbs,
    COALESCE(AVG(a.bmi), 0)::float8 AS avg_bmi,
    COALESCE(AVG(a.systolic), 0)::float8 AS avg_bp_systolic,
    COALESCE(AVG(a.diastolic), 0)::float8 AS avg_bp_diastolic,
    COALESCE(AVG(a.risk_score), 0)::float8 AS avg_risk_score
FROM assessments a
JOIN patients p ON a.patient_id = p.id
GROUP BY COALESCE(p.menopause_status, 'Unknown');

-- name: ClinicAggregate :one
SELECT 
    COUNT(DISTINCT p.id)::int AS total_patients,
    COUNT(a.id)::int AS total_assessments,
    COALESCE(AVG(a.risk_score), 0)::float8 AS avg_risk_score,
    COUNT(CASE WHEN a.risk_score >= 67 THEN 1 END)::int AS high_risk_count,
    COUNT(CASE WHEN a.created_at >= date_trunc('month', CURRENT_DATE) THEN 1 END)::int AS assessments_this_month
FROM patients p
LEFT JOIN assessments a ON a.patient_id = p.id
WHERE p.user_id IN (SELECT user_id FROM user_clinics WHERE clinic_id = $1);

-- name: ClinicCliniciansCount :one
SELECT COUNT(*)::int AS count
FROM user_clinics
WHERE clinic_id = $1;

-- name: AdminSystemStats :one
SELECT 
    (SELECT COUNT(*)::int FROM users) AS total_users,
    (SELECT COUNT(*)::int FROM patients) AS total_patients,
    (SELECT COUNT(*)::int FROM assessments) AS total_assessments,
    (SELECT COUNT(*)::int FROM clinics) AS total_clinics,
    COALESCE((SELECT AVG(risk_score) FROM assessments), 0)::float8 AS avg_risk_score,
    (SELECT COUNT(*)::int FROM assessments WHERE risk_score >= 67) AS high_risk_count,
    (SELECT COUNT(*)::int FROM assessments WHERE created_at >= date_trunc('month', CURRENT_DATE)) AS assessments_this_month,
    (SELECT COUNT(*)::int FROM users WHERE created_at >= date_trunc('month', CURRENT_DATE)) AS new_users_this_month;

-- name: AdminClinicComparison :many
SELECT 
    c.id AS clinic_id,
    c.name AS clinic_name,
    COUNT(DISTINCT p.id)::int AS patient_count,
    COUNT(a.id)::int AS assessment_count,
    COALESCE(AVG(a.risk_score), 0)::float8 AS avg_risk_score,
    COUNT(CASE WHEN a.risk_score >= 67 THEN 1 END)::int AS high_risk_count
FROM clinics c
LEFT JOIN user_clinics uc ON c.id = uc.clinic_id
LEFT JOIN patients p ON p.user_id = uc.user_id
LEFT JOIN assessments a ON a.patient_id = p.id
GROUP BY c.id, c.name
ORDER BY patient_count DESC;

-- name: TotalAssessmentCount :one
SELECT COUNT(*)::int AS count FROM assessments;

-- name: TotalPatientCount :one
SELECT COUNT(*)::int AS count FROM patients;
