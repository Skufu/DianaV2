# API Drift Prevention

This document explains how to prevent API drift between frontend, backend, and database.

## What is API Drift?

API drift occurs when the database schema, backend models, and frontend types become inconsistent over time. This can cause:
- Runtime errors when API responses don't match frontend expectations
- Database errors when trying to save data that doesn't fit the schema
- Silent data corruption
- Difficult-to-debug issues in production

## Architecture Overview

```
Database (PostgreSQL)
    ↓ migrations/*.sql
sqlc (code generator)
    ↓ sqlc generate
Backend (Go)
    ↓ JSON responses
Frontend (React/JavaScript)
```

## Current Setup

### Database Schema
- Location: `backend/migrations/`
- Format: SQL migration files with goose (versioned: `0001_init.sql`, `0002_*.sql`, etc.)
- Contains: Table definitions, indexes, constraints

### sqlc Configuration
- Location: `backend/sqlc.yaml`
- Points to: `migrations` (relative to `backend/` directory)
- Generates: Go code in `backend/internal/store/sqlc/`
- Command: `cd backend && sqlc generate`

### Backend Models
- Location: `backend/internal/models/types.go`
- Contains: Domain models for API responses/requests
- Important note: Some fields (like `Role`) are derived and not stored directly in DB

### Frontend API Layer
- Location: `frontend/src/api.js`
- Contains: API endpoint wrappers with type hints
- Maps to: Backend handlers

## Prevention Measures

### 1. Automated CI/CD Checks ✅

**Workflow**: `.github/workflows/ci.yml`

The CI pipeline automatically checks for API drift on every push/PR:

```yaml
- Validate sqlc schema (detect API drift)
- Check for uncommitted sqlc changes
- Run API drift detection script
```

**What it checks**:
- ✓ sqlc-generated code matches database schema
- ✓ Frontend consent fields align with backend
- ✓ No obsolete directories exist
- ✓ sqlc.yaml configuration is correct

**Script**: `scripts/check-api-drift.sh`

Run locally to test:
```bash
bash scripts/check-api-drift.sh
```

### 2. Schema Modification Workflow

When you need to modify the database schema:

#### Step 1: Create Migration
```bash
cd backend/migrations
# Create new migration file, e.g., 0013_add_new_feature.sql
```

#### Step 2: Write SQL
```sql
-- +goose Up
ALTER TABLE users ADD COLUMN new_field TEXT;
-- +goose Down
ALTER TABLE users DROP COLUMN new_field;
```

#### Step 3: Update sqlc Queries (if needed)
```bash
cd backend/internal/store/queries
# Modify or create .sql query files
```

#### Step 4: Regenerate sqlc Code
```bash
cd backend
sqlc generate
```

#### Step 5: Update Backend Models
```go
// backend/internal/models/types.go
type User struct {
    // ... existing fields
    NewField string `json:"new_field"` // Add new field
}
```

#### Step 6: Update Frontend Types
```javascript
// frontend/src/api.js (or component files)
const payload = {
    // ... existing fields
    new_field: value, // Add new field
};
```

#### Step 7: Test
```bash
# Backend
cd backend
go test ./...

# Frontend
cd frontend
npm run build
```

#### Step 8: Run Drift Check
```bash
bash scripts/check-api-drift.sh
```

#### Step 9: Commit
```bash
git add backend/migrations/0013_*.sql
git add backend/internal/store/sqlc/ # sqlc-generated files
git add backend/internal/models/types.go
git add frontend/src/components/user/Onboarding.jsx
git add frontend/src/api.js
git commit -m "Add new_field to user schema"
```

### 3. Key Rules to Follow

#### ✅ DO:
- Always run `sqlc generate` after modifying migrations
- Commit sqlc-generated files (`internal/store/sqlc/`)
- Test both backend and frontend builds
- Run the drift detection script before pushing
- Update all three layers (DB → Backend → Frontend) together

#### ❌ DON'T:
- Modify `internal/store/sqlc/*.go` files directly (they're auto-generated)
- Forget to update backend models after schema changes
- Forget to update frontend forms/API after backend changes
- Push without running tests
- Ignore drift check failures

### 4. Special Cases

#### Derived Fields
Some fields exist only in the backend layer and are not stored in the database:

**Example: `Role` field**
- Database: Has `is_admin` boolean (added in migration 0011)
- Migration 0011: Removed `role` column, replaced with `is_admin`
- Backend: Derives `Role` from `is_admin` at runtime for JWT compatibility
- Comment in code: Documents this design decision

**When to use**:
- Add comments explaining derived fields
- Document migration history that led to the design
- Keep logic in the repository layer (e.g., `postgres.go`)

#### Consent Fields
Standardized naming:
- `consent_personal_data`: Required for data usage agreement
- `consent_research_participation`: Optional, for anonymized research data
- `consent_email_updates`: Optional, for health tips/reminders
- `consent_analytics`: Optional, for usage analytics

**Note**: Frontend UI labels may be different (e.g., "Data Usage Agreement" vs `consent_personal_data`) but the field names must match.

### 5. Common Drift Scenarios

#### Scenario 1: Missing Field in Frontend
**Symptom**: Frontend shows undefined/null for a field

**Fix**:
1. Check backend response in browser DevTools
2. Add field to frontend component/API call
3. Run drift check

#### Scenario 2: Schema Mismatch
**Symptom**: Database error on insert/update

**Fix**:
1. Check migration file
2. Run `sqlc generate`
3. Check if field type matches (e.g., INT vs TEXT)
4. Update backend model if needed

#### Scenario 3: Type Incompatibility
**Symptom**: Frontend expects string, backend sends number

**Fix**:
1. Check database column type
2. Check sqlc-generated Go type
3. Check JSON tag in backend model
4. Add type conversion in backend or update database type

## Troubleshooting

### sqlc Fails to Generate

```bash
# Check sqlc.yaml schema path
cat backend/sqlc.yaml

# Verify migrations directory exists
ls backend/migrations/

# Try with verbose output
sqlc generate --help
```

### Drift Check Fails

```bash
# Run script with set -x to see debug output
bash -x scripts/check-api-drift.sh

# Check git diff for what changed
git diff backend/internal/store/sqlc/
```

### Build Fails After Schema Change

**Backend**:
```bash
cd backend
go build ./...
# If error, check:
# - Are sqlc imports correct?
# - Did you run sqlc generate?
# - Are model types correct?
```

**Frontend**:
```bash
cd frontend
npm run build
# If error, check:
# - Do field names match backend?
# - Is API response structure correct?
# - Did you update component state?
```

## Future Improvements

1. **Type Generation**: Consider using a tool like `openapi-generator` to share types between frontend and backend
2. **Contract Testing**: Add integration tests that verify API contracts match expectations
3. **Documentation**: Generate API docs from code (e.g., Swagger/OpenAPI)
4. **Migration History**: Better documentation of schema evolution decisions

## References

- [sqlc Documentation](https://docs.sqlc.dev/)
- [Goose Migration Tool](https://github.com/pressly/goose)
- [Project README](../README.md)

---

**Last Updated**: January 2025
**Status**: ✅ Active - CI/CD checks enabled
