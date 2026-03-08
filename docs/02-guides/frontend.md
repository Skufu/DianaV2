# Frontend Guide (React/Vite)

## Purpose
This guide defines how frontend should integrate with backend and render assessment results.

Canonical backend-facing result semantics are defined in:
- `../03-ml/assessment-contract.md`

Frontend should not redefine these semantics independently.

## Frontend Role In Assessment Flow
1. Collect assessment inputs in form components
2. Submit to backend endpoint (`/api/v1/users/me/assessments`)
3. Receive backend-normalized assessment result
4. Render risk, status, and subtype from backend-provided fields

## Integration Boundaries
- API wrapper: `frontend/src/api.js`
- Assessment input UI: `frontend/src/components/user/AssessmentForm.jsx`
- Result rendering UI: `frontend/src/components/common/MLResultModal.jsx`

Rule: consume backend canonical fields (`risk_level`, `risk_label`, `cluster`, `predicted_status`, warnings) rather than recomputing from local heuristics.

## Model Context In UI
- Active screening context: `binary_v2_no_bp`
- Optional contexts: `binary_v2_bp`, `ada`
- Compatibility alias `clinical` may still appear; prefer explicit model identifiers in new UI logic and messaging

## Data Semantics Guardrails
- Do not treat HbA1c/FBS as active screening inputs for `binary_v2_no_bp`.
- Use backend contract values for risk semantics and subtype interpretation.
- Unknown or unavailable subtype data should render neutral messaging, not synthetic fallback narratives.

## Environment
```bash
# frontend/.env.local
VITE_API_BASE=http://localhost:8080
VITE_ML_BASE=http://localhost:5001
```

## Running
```bash
cd frontend
npm install
npm run dev
npm run build
```

## Related Docs
- `../03-ml/assessment-contract.md`
- `../03-ml/api-contract.md`
- `../03-ml/feature-documentation.md`
- `../03-ml/methodology.md`
- `../02-guides/backend.md`
