# Database Schema Diagram

## Overview

DIANA uses **PostgreSQL 16** with **SQLC** for type-safe query generation. The database supports a direct-to-consumer (B2C) platform for menopausal women at risk of Type 2 Diabetes Mellitus (T2DM).

**Key Technologies:**
- PostgreSQL 16 (running in Docker)
- SQLC v1.30.0 - Type-safe SQL code generator
- Goose - Database migration tool
- pgx/v5 - PostgreSQL driver for Go

---

## Entity Relationship Diagram (Mermaid)

```mermaid
erDiagram
    USERS ||--o{ ASSESSMENTS : has
    USERS ||--o{ REFRESH_TOKENS : owns
    USERS ||--o{ NOTIFICATION_QUEUE : receives
    USERS ||--o{ USER_CLINICS : belongs_to
    USERS ||--o{ AUDIT_EVENTS : performs
    USERS ||--o{ AUTH_EVENTS : generates
    USERS }o--|| USERS : created_by
    CLINICS ||--o{ USER_CLINICS : has_members
    
    USERS {
        serial id PK
        text email UK "NOT NULL"
        text password_hash "NOT NULL"
        text first_name
        text last_name
        date date_of_birth
        text phone
        text address
        text menopause_status "pre|peri|post|surgical"
        text menopause_type "natural|surgical"
        int years_menopause "0-50"
        text hypertension "no|controlled|uncontrolled"
        text heart_disease "no|yes"
        boolean family_history_diabetes
        text smoking_status "never|former|current"
        boolean consent_personal_data
        boolean consent_research_participation
        boolean consent_email_updates
        boolean consent_analytics
        timestamptz consent_updated_at
        int assessment_frequency_months "1-12"
        boolean reminder_email
        timestamptz last_assessment_reminder_sent
        boolean onboarding_completed
        text account_status "active|deleted"
        timestamptz deleted_at
        boolean is_admin
        boolean is_active
        timestamptz last_login_at
        int created_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    
    ASSESSMENTS {
        serial id PK
        int user_id FK
        numeric fbs "6,2 - Fasting blood sugar"
        numeric hba1c "4,2 - HbA1c level"
        int cholesterol
        int ldl
        int hdl
        int triglycerides
        int systolic "Blood pressure"
        int diastolic "Blood pressure"
        numeric bmi "5,2"
        text activity
        boolean history_flag
        text smoking
        text hypertension
        text heart_disease
        text cluster "SIDD|SIRD|MOD|MARD"
        int risk_score "0-100"
        text model_version
        text dataset_hash
        text validation_status
        boolean is_self_reported
        text source "manual|import|..."
        text notes
        timestamptz created_at
        timestamptz updated_at
    }
    
    CLINICS {
        serial id PK
        text name "NOT NULL"
        text address
        timestamptz created_at
        timestamptz updated_at
    }
    
    USER_CLINICS {
        int user_id PK,FK
        int clinic_id PK,FK
        text role "member|admin"
        timestamptz created_at
    }
    
    REFRESH_TOKENS {
        serial id PK
        int user_id FK
        text token_hash UK "NOT NULL"
        timestamptz expires_at
        boolean revoked
        timestamptz created_at
        timestamptz revoked_at
    }
    
    NOTIFICATION_QUEUE {
        serial id PK
        int user_id FK
        text notification_type "assessment_reminder|risk_alert|..."
        text subject "NOT NULL"
        text body "NOT NULL"
        int priority "1-10"
        timestamptz scheduled_for
        timestamptz sent_at
        text status "pending|sent|failed"
        text error_message
        timestamptz created_at
    }
    
    MODEL_RUNS {
        serial id PK
        text model_version "NOT NULL"
        text dataset_hash
        text notes
        timestamptz created_at
    }
    
    AUDIT_EVENTS {
        serial id PK
        text actor
        text action
        text target_type
        int target_id
        jsonb details
        timestamptz created_at
    }
    
    AUTH_EVENTS {
        uuid id PK "gen_random_uuid()"
        varchar_50 event_type "login|logout|failed_login|token_refresh"
        varchar_255 email
        inet ip_address
        text user_agent
        boolean success
        jsonb device_info
        jsonb location
        jsonb metadata
        timestamptz created_at
    }
```

---

## Data Flow Diagram

```mermaid
flowchart TD
    subgraph User["👤 User Layer"]
        U[User Profile]
    end
    
    subgraph Input["📊 Data Input"]
        A[Assessment Data]
    end
    
    subgraph Processing["🤖 ML Processing"]
        ML[ML Pipeline<br/>Python/Go]
        CL[Cluster Classification<br/>SIDD/SIRD/MOD/MARD]
        RS[Risk Score<br/>0-100]
    end
    
    subgraph Storage["💾 Database Storage"]
        DB[(PostgreSQL)]
        AS[assessments table]
        MR[model_runs table]
    end
    
    subgraph Output["📈 Output"]
        RES[Assessment Record<br/>with cluster & risk]
    end
    
    U -->|provides health data| A
    A -->|biomarkers + lifestyle| ML
    ML -->|classifies| CL
    ML -->|calculates| RS
    CL -->|stores| AS
    RS -->|stores| AS
    ML -->|logs| MR
    AS -->|result| RES
    
    style User fill:#e1f5ff
    style Input fill:#fff4e1
    style Processing fill:#f3e5f5
    style Storage fill:#e8f5e9
    style Output fill:#ffebee
```

---

## Table Relationships

```mermaid
graph LR
    subgraph Users["👥 Users"]
        U[users<br/>1 record per person]
    end
    
    subgraph Assessments["📋 Assessments"]
        A[assessments<br/>N records per user]
    end
    
    subgraph Tokens["🔑 Auth"]
        RT[refresh_tokens<br/>N per user]
        AE[auth_events<br/>N per user]
    end
    
    subgraph Notifications["🔔 Notifications"]
        NQ[notification_queue<br/>N per user]
    end
    
    subgraph Clinics["🏥 Multi-tenant"]
        C[clinics]
        UC[user_clinics<br/>junction table]
    end
    
    subgraph Audit["📊 Audit"]
        AUD[audit_events]
        MR[model_runs]
    end
    
    U -->|1:N| A
    U -->|1:N| RT
    U -->|1:N| AE
    U -->|1:N| NQ
    U -->|N:M via UC| C
    U -.->|logs| AUD
    A -.->|references| MR
    
    style Users fill:#e3f2fd
    style Assessments fill:#fff3e0
    style Tokens fill:#f3e5f5
    style Notifications fill:#e8f5e9
    style Clinics fill:#fce4ec
    style Audit fill:#fff9c4
```

---

## Schema Overview by Category

### Core User Data

```mermaid
erDiagram
    USERS {
        serial id PK
        text email UK
        text password_hash
        text first_name
        text last_name
        date date_of_birth
        text phone
        text address
        boolean is_admin
        boolean is_active
        timestamptz last_login_at
        int created_by FK
        timestamptz created_at
        timestamptz updated_at
    }
```

### Health Profile

```mermaid
erDiagram
    USERS {
        text menopause_status
        text menopause_type
        int years_menopause
        text hypertension
        text heart_disease
        boolean family_history_diabetes
        text smoking_status
    }
```

### Consent & Privacy (GDPR)

```mermaid
erDiagram
    USERS {
        boolean consent_personal_data
        boolean consent_research_participation
        boolean consent_email_updates
        boolean consent_analytics
        timestamptz consent_updated_at
    }
```

### Account Management

```mermaid
erDiagram
    USERS {
        text account_status
        timestamptz deleted_at
        boolean onboarding_completed
        int assessment_frequency_months
        boolean reminder_email
        timestamptz last_assessment_reminder_sent
    }
```

### Assessment Data

```mermaid
erDiagram
    ASSESSMENTS {
        serial id PK
        int user_id FK
        numeric fbs
        numeric hba1c
        int cholesterol
        int ldl
        int hdl
        int triglycerides
        int systolic
        int diastolic
        numeric bmi
        text activity
        boolean history_flag
        text smoking
        text hypertension
        text heart_disease
        text cluster
        int risk_score
        text model_version
        text dataset_hash
        boolean is_self_reported
        text source
        timestamptz created_at
        timestamptz updated_at
    }
```

---

## T2DM Clusters Explained

```mermaid
graph LR
    subgraph Clusters["Type 2 Diabetes Subgroups"]
        SIDD["🔴 SIDD<br/>Severe Insulin-Deficient<br/>Diabetes"]
        SIRD["🟠 SIRD<br/>Severe Insulin-Resistant<br/>Diabetes"]
        MOD["🟡 MOD<br/>Mild Obesity-Related<br/>Diabetes"]
        MARD["🟢 MARD<br/>Mild Age-Related<br/>Diabetes"]
    end
    
    subgraph Characteristics["Key Characteristics"]
        SIDD_C["- Early onset<br/>- Low insulin<br/>- High HbA1c"]
        SIRD_C["- High insulin resistance<br/>- High BMI<br/>- Kidney issues"]
        MOD_C["- Obesity-driven<br/>- Metabolic syndrome<br/>- Younger age"]
        MARD_C["- Elderly onset<br/>- Mild symptoms<br/>- Good prognosis"]
    end
    
    SIDD --> SIDD_C
    SIRD --> SIRD_C
    MOD --> MOD_C
    MARD --> MARD_C
    
    style SIDD fill:#ffcdd2
    style SIRD fill:#ffe0b2
    style MOD fill:#fff9c4
    style MARD fill:#c8e6c9
```

---

## Migration Timeline

```mermaid
timeline
    title Database Migration History
    
    section Initial Setup
        0001 : Initial schema
             : users, patients
             : assessments, model_runs
             : audit_events
    
    section Patient Data
        0002 : Add family_history
             : Add phys_activity
        0003 : Add updated_at
             : Add indexes
        0005 : Add user_id to patients
        0006 : Add mock data
    
    section Authentication
        0004 : Add refresh_tokens
             : JWT token management
    
    section ML Improvements
        0007 : Update cluster names
             : Map risk levels
        0008 : Rename clusters
             : SOIRD→SIRD
             : MIDD→MOD
    
    section Multi-tenant
        0009 : Add clinics
             : Add user_clinics
    
    section Admin Features
        0010 : Add admin fields
             : is_active
             : last_login_at
             : created_by
    
    section B2C Refactor
        0011 : Major refactor
             : Drop patients table
             : Merge into users
             : Add notification_queue
             : Add consent fields
    
    section Monitoring
        0012 : Add auth_events
             : Real-time auth monitoring
```

---

## Index Strategy

```mermaid
mindmap
  root((Indexes))
    Users
      idx_users_email
        Authentication lookups
      idx_users_menopause_status
        Filter by status
      idx_users_account_status
        Active/deleted
      idx_users_consent_research
        Research cohorts
      idx_users_assessment_reminder
        Reminder scheduling
    Assessments
      idx_assessments_user_id_created
        User history
      idx_assessments_created_at
        Time queries
      idx_assessments_cluster
        Analytics
      idx_assessments_risk_score
        Risk filtering
    Auth
      idx_refresh_tokens_user_id
        User tokens
      idx_refresh_tokens_token_hash
        Token validation
      idx_auth_events_created_at
        Recent events
      idx_auth_events_email
        User history
    Notifications
      idx_notification_queue_status
        Pending notifications
      idx_notification_queue_user
        User notifications
    Clinics
      idx_user_clinics_user
        User's clinics
      idx_user_clinics_clinic
        Clinic members
```

---

## Table Descriptions

### 1. `users`

The central user table storing both authentication and health profile information. Following migration 0011, this table combines user account data with menopausal health profile data (previously in a separate `patients` table).

**Key Features:**
- Soft deletion via `account_status` and `deleted_at`
- Comprehensive consent management (GDPR compliant)
- Menopausal health tracking
- Admin capabilities via `is_admin` flag
- Self-referential `created_by` for admin-created accounts

**Constraints:**
- `menopause_status`: 'pre', 'peri', 'post', 'surgical'
- `menopause_type`: 'natural', 'surgical'
- `years_menopause`: 0-50
- `hypertension`: 'no', 'controlled', 'uncontrolled'
- `heart_disease`: 'no', 'yes'
- `smoking_status`: 'never', 'former', 'current'
- `account_status`: 'active', 'deleted'
- `assessment_frequency_months`: 1-12

---

### 2. `assessments`

Stores health assessment data and ML-generated risk predictions. Each assessment belongs to a user and contains biomarker values along with computed T2DM cluster classification.

**Key Features:**
- Links to ML model runs via `model_version` and `dataset_hash`
- Supports both self-reported and clinical data
- T2DM cluster classification (SIDD, SIRD, MOD, MARD)
- Risk score calculation (0-100)

**T2DM Clusters:**
- **SIDD**: Severe Insulin-Deficient Diabetes
- **SIRD**: Severe Insulin-Resistant Diabetes
- **MOD**: Mild Obesity-Related Diabetes
- **MARD**: Mild Age-Related Diabetes

---

### 3. `clinics`

Multi-tenant support for clinic/organization management. Users can belong to multiple clinics with different roles.

---

### 4. `user_clinics`

Junction table implementing many-to-many relationship between users and clinics.

**Roles:**
- `member`: Regular clinic member
- `admin`: Clinic administrator

---

### 5. `refresh_tokens`

JWT refresh token management for secure authentication.

**Security Features:**
- Token hashes stored (never raw tokens)
- Expiration tracking
- Revocation capability
- Automatic cleanup via `expires_at` index

---

### 6. `notification_queue`

Scheduled notification system for user engagement.

**Notification Types:**
- `assessment_reminder`: Periodic assessment reminders
- `risk_alert`: High-risk notifications
- `monthly_summary`: Monthly health summaries
- `educational`: Educational content

---

### 7. `model_runs`

Tracks ML model executions for reproducibility and auditing.

---

### 8. `audit_events`

General audit logging for administrative actions.

---

### 9. `auth_events`

Real-time authentication monitoring for security dashboards.

**Event Types:**
- `login`: Successful login
- `logout`: User logout
- `failed_login`: Failed authentication attempt
- `token_refresh`: JWT token refresh

---

## Migration History

| Migration | File | Description |
|-----------|------|-------------|
| 0001 | `0001_init.sql` | Initial schema: users, patients, assessments, model_runs, audit_events |
| 0002 | `0002_add_family_history_and_phys_activity.sql` | Add family_history, phys_activity to patients |
| 0003 | `0003_add_updated_at_and_indexes.sql` | Add updated_at to assessments + indexes |
| 0004 | `0004_add_refresh_tokens.sql` | Create refresh_tokens table |
| 0005 | `0005_add_patient_user_id.sql` | Add user_id FK to patients |
| 0006 | `0006_add_mock_data.sql` | Seed data with demo users and patients |
| 0007 | `0007_update_cluster_names.sql` | Map risk levels to T2DM clusters |
| 0008 | `0008_update_cluster_names.sql` | Rename SOIRD→SIRD, MIDD→MOD |
| 0009 | `0009_add_clinics.sql` | Add clinics and user_clinics tables |
| 0010 | `0010_admin_features.sql` | Add is_active, last_login_at, created_by to users |
| 0011 | `0011_refactor_users_to_menopausal.sql` | **MAJOR**: B2B→B2C refactor, drop patients table, extend users |
| 0012 | `0012_add_auth_events.sql` | Add auth_events table for real-time monitoring |

**Location:** `backend/migrations/`

**Run migrations:**
```bash
cd backend
goose -dir migrations postgres "$DB_DSN" up
```

**Or via Makefile:**
```bash
make db_up
```

---

## SQLC Configuration

SQLC generates type-safe Go code from SQL queries.

**Configuration:** `backend/sqlc.yaml`

**Query Files:** `backend/internal/store/queries/*.sql`

**Generated Files:** `backend/internal/store/sqlc/*.sql.go`

| File | Purpose |
|------|---------|
| `users.sql.go` | User CRUD operations |
| `assessments.sql.go` | Assessment operations |
| `clinics.sql.go` | Clinic operations |
| `audit_events.sql.go` | Audit log queries |
| `model_runs.sql.go` | Model run tracking |
| `admin_users.sql.go` | Admin user management |
| `cohort.sql.go` | Cohort analysis queries |
| `refresh_tokens.sql.go` | Token management |
| `notification_queue.sql.go` | Notification operations |

**Generate Go code:**
```bash
cd backend
sqlc generate
```

**Or via Makefile:**
```bash
make sqlc
```

---

## Important Notes

1. **B2C Transition**: Migration 0011 was a major refactor transitioning from a B2B clinician-patient model to a direct-to-consumer platform. The `patients` table was dropped and its fields merged into `users`.

2. **Soft Deletion**: Users are never hard-deleted. Use `account_status = 'deleted'` and `deleted_at` timestamp for GDPR compliance.

3. **Consent Management**: Multiple consent flags track user preferences for data usage, research participation, and communications.

4. **T2DM Clusters**: Cluster values represent diabetes subgroups based on research by Ahlqvist et al. (2018).

5. **Assessment Frequency**: Users can set reminder frequency (1-12 months) for reassessment notifications.

6. **Self-Referential**: The `created_by` field allows admins to create accounts for other users.
