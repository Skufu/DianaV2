# MIGRATIONS KNOWLEDGE BASE

**Generated:** 2026-01-14
**Schema Version:** 0011

## OVERVIEW
Sequential SQL migrations using Goose to evolve the schema from a clinician-centric model to a direct-to-consumer menopausal platform.

## WHERE TO LOOK
| Version | Migration | Focus |
|---------|-----------|-------|
| 0001 | `init.sql` | Base schema: Users, Patients, Assessments, Audit |
| 0002-03 | `family_history`, `indexes` | Schema hardening and additional biomarkers |
| 0004 | `refresh_tokens` | JWT session management |
| 0005 | `patient_user_id` | **Pivot**: Link patients to clinician user accounts |
| 0006-08 | `mock_data`, `clusters` | Data seeding and ML cluster naming alignment |
| 0009 | `add_clinics` | Multi-tenant/clinic support structure |
| 0010 | `admin_features` | Admin dashboard tracking (is_active, last_login) |
| 0011 | `refactor_to_menopausal` | **Major Refactor**: Users become the primary health subjects; `patients` table dropped |

## SCHEMA EVOLUTION
### Phase 1: Clinician Management (0001-0004)
The initial architecture focused on a B2B model where clinicians (Users) managed multiple Patients. Data was siloed by patient ID, and clinicians performed assessments on behalf of their clients.

### Phase 2: Hybrid Ownership (0005-0010)
Introduced `user_id` to the `patients` table to facilitate multi-tenancy and data ownership. This phase also added support for Clinics (0009) and Admin oversight (0010).

### Phase 3: Direct-to-Consumer (0011+)
The "Great Refactor" eliminated the `patients` table entirely. Every person in the system is now a `User` with their own health profile (biomarkers, menopause status) stored directly on the user record. Assessments now link directly to the User.

## CONVENTIONS
- **Tooling**: Uses [Goose](https://github.com/pressly/goose). Run via `go run ./cmd/migrate`.
- **Anatomy**: Every file MUST contain `-- +goose Up` and `-- +goose Down` blocks.
- **Naming**: `XXXX_description.sql` (e.g., `0010_admin_features.sql`).
- **Safety**: Use `IF NOT EXISTS` for CREATE and `IF EXISTS` for DROP to ensure idempotency.
- **Rollback**: Every `Up` migration must have a functional `Down` counterpart that restores the previous state.
- **SQL Formatting**: Keywords should be UPPERCASE (e.g., `ALTER TABLE`, `ADD COLUMN`).

## NOTES
- **The Great Shift (v0011)**: This migration marks the transition from clinicians managing patients to users managing their own health. The `patients` table was entirely removed, and health markers moved to the `users` table.
- **Audit Logs**: The `audit_events` table (v0001) persists across refactors and tracks actions via JSONB details.
- **SQLC Sync**: After running migrations, you MUST run `sqlc generate` in the backend root to update the Go database layer.
- **Mock Data**: `0006_add_mock_data.sql` contains substantial seeding; use `go run ./cmd/seed` for programmatic seeding instead of adding to migrations where possible.
- **Data Loss Warning**: Rollback of v0011 will re-create a blank `patients` table; it does NOT currently restore deleted patient data from the transition.
