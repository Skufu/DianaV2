-- +goose Up
-- Remove mock model run data
DELETE FROM model_runs WHERE model_version IN ('v0-mock', 'v0-placeholder');

-- +goose Down
-- Cannot easily restore mock data, so this is left empty.
