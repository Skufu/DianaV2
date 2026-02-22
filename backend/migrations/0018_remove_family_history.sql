-- +goose Up
ALTER TABLE patients
    DROP COLUMN IF EXISTS family_history,
    DROP COLUMN IF EXISTS family_history_diabetes;

-- +goose Down
ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS family_history BOOLEAN,
    ADD COLUMN IF NOT EXISTS family_history_diabetes BOOLEAN NOT NULL DEFAULT false;
