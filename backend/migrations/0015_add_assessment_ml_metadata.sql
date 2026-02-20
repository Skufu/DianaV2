-- +goose Up
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS predicted_status TEXT,
ADD COLUMN IF NOT EXISTS risk_label TEXT,
ADD COLUMN IF NOT EXISTS cluster_description TEXT,
ADD COLUMN IF NOT EXISTS treatment_focus TEXT,
ADD COLUMN IF NOT EXISTS at_risk_probability DOUBLE PRECISION;

-- +goose Down
ALTER TABLE assessments
DROP COLUMN IF EXISTS at_risk_probability,
DROP COLUMN IF EXISTS treatment_focus,
DROP COLUMN IF EXISTS cluster_description,
DROP COLUMN IF EXISTS risk_label,
DROP COLUMN IF EXISTS predicted_status;
