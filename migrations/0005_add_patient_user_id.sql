-- +goose Up
-- Add user_id to patients table for ownership tracking
ALTER TABLE patients ADD COLUMN user_id INT;

-- Add foreign key constraint
ALTER TABLE patients ADD CONSTRAINT fk_patients_user_id
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create index for faster ownership queries
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);

-- Migrate existing patients to first user (for backwards compatibility)
-- In production, you'd need a proper data migration strategy
UPDATE patients SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1) WHERE user_id IS NULL;

-- Make user_id NOT NULL after migration
ALTER TABLE patients ALTER COLUMN user_id SET NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS idx_patients_user_id;
ALTER TABLE patients DROP CONSTRAINT IF EXISTS fk_patients_user_id;
ALTER TABLE patients DROP COLUMN IF EXISTS user_id;
