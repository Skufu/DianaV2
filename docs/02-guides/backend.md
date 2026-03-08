# Backend Guide (Go/Gin)

## Purpose
This guide explains backend responsibilities and integration boundaries.

Canonical assessment semantics are defined in:
- `../03-ml/assessment-contract.md`

Transport details for backend-to-ML calls are defined in:
- `../03-ml/api-contract.md`

## Backend Role In Assessment Flow
Backend is the normalization boundary between frontend and ML service:

1. Receive assessment request from frontend
2. Validate request and population constraints
3. Route request to selected model type
4. Normalize raw ML response into canonical assessment shape
5. Persist normalized result
6. Return canonical result payload to frontend

Frontend should treat backend response as source of truth for risk and subtype semantics.

## Key Backend Areas
- Router and middleware: `backend/internal/http/router/` and `backend/internal/http/middleware/`
- Assessment endpoint handling: `backend/internal/http/handlers/assessments.go`
- ML transport client: `backend/internal/ml/http_predictor.go`
- Validation rules and warning codes: `backend/internal/ml/validation.go`
- Persistence model types: `backend/internal/models/types.go`
- SQLC storage layer: `backend/internal/store/` and `backend/internal/store/sqlc/`

## Model Type Handling
Backend assessment flow supports:
- `binary_v2_no_bp` (active non-circular screening path)
- `binary_v2_bp`
- `ada`
- `clinical` (compatibility alias, not preferred for new integrations)

## Validation And Contract Highlights
- Population age constraints in assessment flow are enforced by backend.
- Backend emits canonical risk and cluster semantics after normalization.
- Backend warning transport is contract-controlled; frontend should render warnings from backend output instead of inferring from raw ML response.

## Integration Rule Of Thumb
When implementing backend changes:
- update canonical contract docs first (`assessment-contract.md` and `api-contract.md`)
- then update handler/validation code
- then update frontend consumers if output contract changed

## Related Docs
- `../03-ml/assessment-contract.md`
- `../03-ml/api-contract.md`
- `../03-ml/feature-documentation.md`
- `../03-ml/methodology.md`
- `../06-operations/deployment.md`
