# Database Schema

## Overview

DIANA uses **PostgreSQL** with **SQLC** for type-safe query generation.

---

## Tables

### `users`
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'clinician',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `email` | TEXT | Unique email address |
| `password_hash` | TEXT | bcrypt hashed password |
| `role` | TEXT | `clinician` or `admin` |
| `is_active` | BOOLEAN | Soft delete flag |
| `last_login_at` | TIMESTAMPTZ | Last login timestamp |
| `created_by` | INT | Admin who created this user |

### `patients`
```sql
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    name TEXT NOT NULL,
    age INT,
    menopause_status TEXT,
    years_menopause INT,
    bmi NUMERIC(5,2),
    bp_systolic INT,
    bp_diastolic INT,
    activity TEXT,
    phys_activity BOOLEAN,
    smoking TEXT,
    hypertension TEXT,
    heart_disease TEXT,
    family_history BOOLEAN,
    chol INT,
    ldl INT,
    hdl INT,
    triglycerides INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `user_id` | INT | Owning clinician |
| `name` | TEXT | Patient name |
| `age` | INT | Age in years |
| `menopause_status` | TEXT | Menopausal status |
| `years_menopause` | INT | Years since menopause |
| `bmi` | NUMERIC(5,2) | Body mass index |
| `bp_systolic` | INT | Systolic blood pressure |
| `bp_diastolic` | INT | Diastolic blood pressure |
| `activity` | TEXT | Activity level description |
| `phys_activity` | BOOLEAN | Physical activity flag |
| `smoking` | TEXT | Smoking status |
| `hypertension` | TEXT | Hypertension status |
| `heart_disease` | TEXT | Heart disease status |
| `family_history` | BOOLEAN | Family history of diabetes |
| `chol` | INT | Total cholesterol |
| `ldl` | INT | LDL cholesterol |
| `hdl` | INT | HDL cholesterol |
| `triglycerides` | INT | Triglycerides |

### `assessments`
```sql
CREATE TABLE assessments (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Biomarkers
    fbs NUMERIC(6,2),
    hba1c NUMERIC(4,2),
    cholesterol INT,
    ldl INT,
    hdl INT,
    triglycerides INT,
    systolic INT,
    diastolic INT,
    bmi NUMERIC(5,2),
    
    -- Lifestyle
    activity TEXT,
    history_flag BOOLEAN,
    smoking TEXT,
    hypertension TEXT,
    heart_disease TEXT,
    
    -- ML Results
    cluster TEXT,
    risk_score INT,
    model_version TEXT,
    dataset_hash TEXT,
    validation_status TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `clinics`
```sql
CREATE TABLE clinics (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `user_clinics`
```sql
CREATE TABLE user_clinics (
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clinic_id INT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, clinic_id)
);
```

### `model_runs`
```sql
CREATE TABLE model_runs (
    id SERIAL PRIMARY KEY,
    model_version TEXT NOT NULL,
    dataset_hash TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `audit_events`
```sql
CREATE TABLE audit_events (
    id SERIAL PRIMARY KEY,
    actor TEXT,
    action TEXT,
    target_type TEXT,
    target_id INT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Migrations

Located in `backend/migrations/`:

| File | Description |
|------|-------------|
| `0001_init.sql` | Create users, patients, assessments, model_runs, audit_events |
| `0002_add_family_history_and_phys_activity.sql` | Add family_history and phys_activity to patients |
| `0003_add_updated_at_and_indexes.sql` | Add updated_at and indexes |
| `0004_add_refresh_tokens.sql` | Refresh tokens table |
| `0005_add_patient_user_id.sql` | Add user_id to patients |
| `0006_add_mock_data.sql` | Seed mock data |
| `0007_update_cluster_names.sql` | Update cluster name mappings |
| `0008_update_cluster_names.sql` | Additional cluster name updates |
| `0009_add_clinics.sql` | Add clinics and user_clinics tables |
| `0010_admin_features.sql` | Add is_active, last_login_at, created_by to users |

Run migrations:
```bash
cd backend
goose -dir migrations postgres "$DB_DSN" up
```

Or via Makefile:
```bash
make db_up
```

---

## Database Seeding

Diana V2 has **two separate seeding mechanisms**. Understanding the difference is important to avoid credential confusion.

### 1. Migration-Based Seeding (Automatic)

When you run `make db_up`, migration `0006_add_mock_data.sql` automatically creates demo users **with sample patients and assessments**:

| Email | Password | Role | Notes |
|-------|----------|------|-------|
| `demo@diana.app` | `demo123` | Clinician | 3 sample patients, 7 assessments |
| `admin@diana.app` | `admin123` | Admin | 2 sample patients, 5 assessments |
| `clinician@example.com` | `password123` | Clinician | 4 sample patients |
| `researcher@diana.app` | `research456` | Researcher | 1 sample patient |

> [!TIP]
> **For most development work, use these credentials.** They are automatically created when migrations run and include realistic sample data.

### 2. Manual Seed Command (Optional)

Running `make seed` creates **different users without patient data**:

| Email | Password | Role |
|-------|----------|------|
| `admin@example.com` | `password123` | Admin |
| `user@example.com` | `password123` | User |
| `jane.doe@example.com` | `password123` | User |

> [!NOTE]
> The seed command uses `ON CONFLICT DO UPDATE`, so it will reset passwords for these specific emails if they already exist.

### Which Should I Use?

| Scenario | Use |
|----------|-----|
| Fresh setup, need demo data | `make db_up` (migrations include seed data) |
| Reset a specific user's password | `make seed` |
| Production deployment | Neither - create users through admin UI |

---

## NeonDB Setup

This project supports [NeonDB](https://neon.tech) as a serverless PostgreSQL provider.

### Connection String Format

```bash
DB_DSN=postgres://[user]:[password]@[endpoint].neon.tech/[database]?sslmode=require
```

Example:
```bash
DB_DSN=postgres://diana_owner:AbCdEfGh@ep-cool-name-123456.us-east-2.aws.neon.tech/diana?sslmode=require
```

> [!IMPORTANT]
> NeonDB **requires** `sslmode=require` or `sslmode=verify-full`. Without it, connections will fail.

### Debug Script

Use the debug script to verify NeonDB connectivity:

```bash
./scripts/debug-neon.sh
```

This script will:
1. Parse your `DB_DSN` from `.env`
2. Test SSL connection to the Neon endpoint
3. Run a simple query to verify database access
4. Report any connection issues

### Common NeonDB Issues

| Issue | Solution |
|-------|----------|
| `SSL connection is required` | Add `?sslmode=require` to DB_DSN |
| `endpoint not found` | Check the endpoint name in your Neon dashboard |
| `password authentication failed` | Reset password in Neon dashboard, update .env |
| Slow cold starts | First request after inactivity may take 1-2s (Neon wakes the database) |

### Migrations with NeonDB

```bash
# Set your Neon connection string
export DB_DSN="postgres://user:pass@ep-xyz.neon.tech/diana?sslmode=require"

# Run migrations
make db_up

# Check status
make db_status
```

---

## SQLC

Queries are defined in separate `.sql` files in `backend/internal/store/sqlc/`:

| File | Purpose |
|------|---------|
| `users.sql.go` | User CRUD operations |
| `patients.sql.go` | Patient CRUD operations |
| `assessments.sql.go` | Assessment operations |
| `clinics.sql.go` | Clinic operations |
| `audit_events.sql.go` | Audit log queries |
| `model_runs.sql.go` | Model run tracking |
| `admin_users.sql.go` | Admin user management |
| `cohort.sql.go` | Cohort analysis queries |

Generate Go code:
```bash
cd backend
sqlc generate
```

Or via Makefile:
```bash
make sqlc
```

---

## Indexes

Key indexes for performance:

```sql
-- Audit events (admin dashboard)
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at DESC);
CREATE INDEX idx_audit_events_actor ON audit_events(actor);
CREATE INDEX idx_audit_events_action ON audit_events(action);

-- Model runs (admin dashboard)
CREATE INDEX idx_model_runs_created_at ON model_runs(created_at DESC);

-- Users (admin user management)
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_email_search ON users(email);

-- Clinic membership
CREATE INDEX idx_user_clinics_user ON user_clinics(user_id);
CREATE INDEX idx_user_clinics_clinic ON user_clinics(clinic_id);
```
