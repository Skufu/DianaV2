-- +goose Up
-- Add updated_at column to assessments table
ALTER TABLE assessments
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add indexes for performance optimization
-- Index on patient_id for faster assessment lookups by patient
CREATE INDEX IF NOT EXISTS idx_assessments_patient_id ON assessments(patient_id);

-- Index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at DESC);

-- Index on cluster for analytics queries
CREATE INDEX IF NOT EXISTS idx_assessments_cluster ON assessments(cluster);

-- Index on risk_score for filtering high-risk patients
CREATE INDEX IF NOT EXISTS idx_assessments_risk_score ON assessments(risk_score DESC);

-- Index on email for user authentication lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index on patients created_at for sorting
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at DESC);

-- Composite index for assessment queries filtered by patient and time
CREATE INDEX IF NOT EXISTS idx_assessments_patient_created ON assessments(patient_id, created_at DESC);

-- +goose Down
-- Remove indexes
DROP INDEX IF EXISTS idx_assessments_patient_created;
DROP INDEX IF EXISTS idx_patients_created_at;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_assessments_risk_score;
DROP INDEX IF EXISTS idx_assessments_cluster;
DROP INDEX IF EXISTS idx_assessments_created_at;
DROP INDEX IF EXISTS idx_assessments_patient_id;

-- Remove updated_at column
ALTER TABLE assessments
    DROP COLUMN IF EXISTS updated_at;
