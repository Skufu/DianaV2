# Diana Database ERD

## Entity Relationship Diagram

```mermaid
erDiagram
    users {
        int id PK
        string email UK
        string password_hash
        string first_name
        string last_name
        date date_of_birth
        string phone
        string address
        string menopause_status "CHECK: pre|peri|post|surgical"
        string menopause_type "CHECK: natural|surgical"
        int years_menopause "CHECK: 0-50"
        string hypertension "CHECK: no|controlled|uncontrolled"
        string heart_disease "CHECK: no|yes"
        string smoking_status "CHECK: never|former|current"
        string physical_activity
        string alcohol
        boolean consent_personal_data "DEFAULT: true"
        boolean consent_research_participation "DEFAULT: false"
        boolean consent_email_updates "DEFAULT: false"
        boolean consent_analytics "DEFAULT: true"
        timestamp consent_updated_at
        int assessment_frequency_months "DEFAULT: 3, CHECK: 1-12"
        boolean reminder_email "DEFAULT: true"
        timestamp last_assessment_reminder_sent
        boolean onboarding_completed "DEFAULT: false"
        string account_status "DEFAULT: active, CHECK: active|deleted"
        timestamp deleted_at
        boolean is_admin "DEFAULT: false"
        boolean is_active "DEFAULT: true"
        timestamp last_login_at
        int created_by FK
        boolean email_verified "DEFAULT: false"
        timestamp email_verified_at
        timestamp created_at
        timestamp updated_at
    }

    assessments {
        int id PK
        int user_id FK
        numeric fbs "NUMERIC(6,2)"
        numeric hba1c "NUMERIC(4,2)"
        int cholesterol
        int ldl
        int hdl
        int triglycerides
        int systolic
        int diastolic
        numeric waist_circumference "NUMERIC(5,2)"
        numeric bmi "NUMERIC(5,2)"
        boolean family_history_diabetes "DEFAULT: false"
        int age
        string activity
        string alcohol
        boolean history_flag
        string smoking
        string hypertension
        string heart_disease
        string cluster
        int risk_score
        string risk_label
        string cluster_description
        string treatment_focus
        string predicted_status
        float at_risk_probability
        string model_version
        string dataset_hash
        jsonb drift_baseline
        string validation_status
        jsonb feature_set
        jsonb cluster_capability
        jsonb output_capabilities
        boolean is_self_reported "DEFAULT: true"
        string source "DEFAULT: 'manual'"
        text notes
        timestamp created_at
        timestamp updated_at
    }

    refresh_tokens {
        int id PK
        int user_id FK
        string token_hash UK
        timestamp expires_at
        boolean revoked "DEFAULT: false"
        timestamp created_at
        timestamp revoked_at
    }

    clinics {
        int id PK
        string name
        string address
        timestamp created_at
        timestamp updated_at
    }

    user_clinics {
        int user_id PK,FK
        int clinic_id PK,FK
        string role "DEFAULT: 'member'"
        timestamp created_at
    }

    model_runs {
        int id PK
        string model_version
        string dataset_hash
        text notes
        boolean is_active
        timestamp created_at
    }

    audit_events {
        int id PK
        string actor
        string action
        string target_type
        int target_id
        jsonb details
        timestamp created_at
    }

    auth_events {
        uuid id PK
        string event_type "CHECK: login|logout|failed_login|token_refresh"
        string email
        inet ip_address
        text user_agent
        boolean success "DEFAULT: true"
        jsonb device_info
        jsonb location
        jsonb metadata
        timestamp created_at
    }

    users ||--o{ assessments : "has many"
    users ||--o{ refresh_tokens : "has many"
    users ||--o{ user_clinics : "belongs to"
    users ||--o{ audit_events : "creates (as actor)"
    users ||--o{ auth_events : "generates"
    clinics ||--o{ user_clinics : "has many"
    users ||--o{ users : "created_by (self-ref)"
```

---

## Table Definitions

### users
The central entity representing platform users. After migration 0011, this table combines authentication and health profile data (previously split between users and patients tables).

**Key Fields:**
- **menopause_status**: Clinical stage (pre/peri/post/surgical)
- **account_status**: Soft delete support (active/deleted)
- **is_admin**: Legacy boolean role flag
- **role**: Extended roles (user/admin/doctor) from migration 0014
- **created_by**: Self-referential FK for admin-created accounts

### assessments
ML prediction records linked to users. Contains both input biomarkers and ML output fields.

**Key Fields:**
- **cluster**: Ahlqvist diabetes subtype (SIRD, SIDD, MOD, MARD)
- **risk_score**: Numeric risk score from ML model
- **model_version**: Tracks which ML model version generated the prediction
- **dataset_hash**: For model lineage and drift detection
- **is_self_reported**: Distinguishes user-entered vs device-synced data

### refresh_tokens
JWT refresh token storage for session management. Tokens are hashed before storage.

### clinics & user_clinics
Multi-tenant support allowing users to belong to multiple clinics with different roles.

### model_runs
Tracks ML model training runs for reproducibility and audit trails.

### audit_events
Admin action logging with JSONB details for flexible schema.

### auth_events
Real-time authentication monitoring with geolocation and device parsing (SSE streaming support).

---

## Indexes

### Performance Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| users | idx_users_email | Login lookups |
| users | idx_users_menopause_status | Cohort filtering |
| users | idx_users_account_status | Soft delete filtering |
| users | idx_users_role | Admin queries |
| users | idx_users_is_active | Active user filtering |
| assessments | idx_assessments_user_id_created | User timeline queries |
| assessments | idx_assessments_created_at | Time-series analysis |
| assessments | idx_assessments_cluster | Cluster analytics |
| assessments | idx_assessments_risk_score | Risk filtering |
| refresh_tokens | idx_refresh_tokens_user_id | User session lookup |
| refresh_tokens | idx_refresh_tokens_token_hash | Token validation |
| refresh_tokens | idx_refresh_tokens_expires_at | Cleanup queries |
| auth_events | idx_auth_events_created_at | Recent events |
| auth_events | idx_auth_events_email | User audit |
| auth_events | idx_auth_events_type | Event filtering |
| audit_events | idx_audit_events_created_at | Chronological sorting |
| audit_events | idx_audit_events_actor | Admin action queries |
| user_clinics | idx_user_clinics_user | User clinic lookup |
| user_clinics | idx_user_clinics_clinic | Clinic member lookup |

---

## Constraints

### Check Constraints

| Table | Column | Constraint |
|-------|--------|------------|
| users | menopause_status | IN ('pre', 'peri', 'post', 'surgical') |
| users | menopause_type | IN ('natural', 'surgical') |
| users | years_menopause | >= 0 AND <= 50 |
| users | hypertension | IN ('no', 'controlled', 'uncontrolled') |
| users | heart_disease | IN ('no', 'yes') |
| users | smoking_status | IN ('never', 'former', 'current') |
| users | assessment_frequency_months | >= 1 AND <= 12 |
| users | account_status | IN ('active', 'deleted') |
| users | role | IN ('user', 'admin', 'doctor') |
| auth_events | event_type | IN ('login', 'logout', 'failed_login', 'token_refresh') |

### Foreign Keys

| Table | Column | References | On Delete |
|-------|--------|------------|-----------|
| assessments | user_id | users(id) | CASCADE |
| refresh_tokens | user_id | users(id) | CASCADE |
| user_clinics | user_id | users(id) | CASCADE |
| user_clinics | clinic_id | clinics(id) | CASCADE |
| users | created_by | users(id) | - |

---

## Schema Evolution Notes

### Migration 0011: The Great Refactor
- **Removed**: `patients` table
- **Changed**: Assessments now link directly to `users` via `user_id`
- **Added**: All health profile fields moved to `users` table
- **Impact**: B2B clinician-patient model → B2C direct-to-consumer platform

### Migration 0014: Role Extension
- Added `role` column with extended roles (user/admin/doctor)
- Maintains backward compatibility with `is_admin` boolean

### Migration 0019: Assessment Enrichment
- Added `waist_circumference` for metabolic syndrome indicators
- Added `family_history_diabetes` for genetic risk factors

### Migration 0020: Privacy Compliance
- Removed `race_ethnicity` column from assessments

### Migration 0021: Cleanup
- Removed unused tables: `notification_queue`, `email_verification_tokens`, `password_reset_tokens`

---

## Data Types Reference

| Type | PostgreSQL | Usage |
|------|------------|-------|
| Primary Keys | SERIAL | Auto-incrementing integers |
| UUID | UUID | auth_events.id (gen_random_uuid()) |
| Numeric | NUMERIC(p,s) | Precise decimal values (biomarkers) |
| JSONB | JSONB | Flexible metadata storage |
| Timestamps | TIMESTAMPTZ | UTC timestamps with timezone |
| IP Address | INET | auth_events.ip_address |
| Boolean | BOOLEAN | Flags and status fields |
| Text | TEXT | Variable-length strings |
| Integers | INT/SMALLINT | Whole numbers and enums |

---

## Generation Timestamp
Generated: 2026-03-16
Schema Version: 0021
