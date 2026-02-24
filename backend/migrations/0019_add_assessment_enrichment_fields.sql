-- +goose Up
ALTER TABLE assessments
    ADD COLUMN IF NOT EXISTS waist_circumference NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS race_ethnicity SMALLINT,
    ADD COLUMN IF NOT EXISTS family_history_diabetes BOOLEAN NOT NULL DEFAULT false;

-- +goose Down
ALTER TABLE assessments
    DROP COLUMN IF EXISTS family_history_diabetes,
    DROP COLUMN IF EXISTS race_ethnicity,
    DROP COLUMN IF EXISTS waist_circumference;
