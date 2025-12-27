-- +goose Up
-- Update legacy cluster names to paper-aligned names
UPDATE assessments SET cluster = 'SIRD' WHERE cluster = 'SOIRD';
UPDATE assessments SET cluster = 'MOD' WHERE cluster = 'MIDD';

-- +goose Down
-- Revert to legacy cluster names
UPDATE assessments SET cluster = 'SOIRD' WHERE cluster = 'SIRD';
UPDATE assessments SET cluster = 'MIDD' WHERE cluster = 'MOD';
