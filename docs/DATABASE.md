# Database Schema

## Overview

DIANA uses **PostgreSQL** with **SQLC** for type-safe query generation.

---

## Tables

### `users`
```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `patients`
```sql
CREATE TABLE patients (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE,
    sex TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `patient_assessments`
```sql
CREATE TABLE patient_assessments (
    id BIGSERIAL PRIMARY KEY,
    patient_id BIGINT REFERENCES patients(id),
    
    -- Biomarkers
    hba1c NUMERIC(4,2),
    fasting_glucose NUMERIC(5,1),
    bmi NUMERIC(4,1),
    triglycerides NUMERIC(5,1),
    ldl NUMERIC(5,1),
    hdl NUMERIC(5,1),
    
    -- ML Results
    risk_cluster TEXT,          -- "Low Risk", "Moderate Risk", "High Risk"
    diabetes_status TEXT,       -- "Normal", "Pre-diabetic", "Diabetic"
    risk_score INTEGER,         -- 0-100
    model_version TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Migrations

Located in `backend/migrations/`:

| File | Description |
|------|-------------|
| `001_init.sql` | Create users table |
| `002_patients.sql` | Create patients table |
| `003_assessments.sql` | Create assessments table |
| `004_tokens.sql` | Refresh tokens table |

Run migrations:
```bash
cd backend
go run ./cmd/migrate up
```

---

## SQLC

Queries defined in `backend/internal/store/sqlc/queries.sql`:

```sql
-- name: GetPatient :one
SELECT * FROM patients WHERE id = $1 AND user_id = $2;

-- name: CreateAssessment :one
INSERT INTO patient_assessments (
    patient_id, hba1c, fasting_glucose, bmi, ...
) VALUES ($1, $2, $3, $4, ...)
RETURNING *;

-- name: ListAssessmentsByPatient :many
SELECT * FROM patient_assessments 
WHERE patient_id = $1 
ORDER BY created_at DESC;
```

Generate Go code:
```bash
sqlc generate
```
