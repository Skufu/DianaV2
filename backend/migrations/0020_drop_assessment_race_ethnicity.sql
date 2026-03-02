-- +goose Up
ALTER TABLE assessments
    DROP COLUMN IF EXISTS race_ethnicity;

-- +goose Down
ALTER TABLE assessments
    ADD COLUMN IF NOT EXISTS race_ethnicity SMALLINT;
