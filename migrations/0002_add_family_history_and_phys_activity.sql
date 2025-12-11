-- +goose Up
ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS family_history BOOLEAN,
    ADD COLUMN IF NOT EXISTS phys_activity BOOLEAN;

-- +goose Down
ALTER TABLE patients
    DROP COLUMN IF EXISTS phys_activity,
    DROP COLUMN IF EXISTS family_history;

