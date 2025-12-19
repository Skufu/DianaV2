-- +goose Up
-- Update cluster names from generic risk levels to specific T2DM subgroups
-- Based on risk_score ranges, assign proper cluster names

UPDATE assessments
SET cluster = CASE
    -- High risk (67-100) -> Split between SIDD and SIRD
    WHEN risk_score >= 80 THEN 'SIDD'  -- Severe Insulin-Deficient Diabetes
    WHEN risk_score >= 67 THEN 'SIRD'  -- Severe Insulin-Resistant Diabetes
    -- Moderate risk (34-66) -> Split between MOD and transition
    WHEN risk_score >= 50 THEN 'MOD'   -- Mild Obesity-Related Diabetes
    WHEN risk_score >= 34 THEN 'MARD'  -- Mild Age-Related Diabetes
    -- Low risk (0-33) -> MARD
    ELSE 'MARD'
END
WHERE cluster IN ('low_risk', 'moderate_risk', 'high_risk', 'Low risk', 'Moderate risk', 'High risk')
   OR cluster IS NULL;

-- +goose Down
-- Revert cluster names back to generic risk levels
UPDATE assessments
SET cluster = CASE
    WHEN risk_score >= 67 THEN 'high_risk'
    WHEN risk_score >= 34 THEN 'moderate_risk'
    ELSE 'low_risk'
END
WHERE cluster IN ('SIDD', 'SIRD', 'MOD', 'MARD');
