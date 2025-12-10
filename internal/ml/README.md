## Model inference contract

- Endpoint: `POST MODEL_URL` (env) with JSON body shaped like `models.Assessment` fields in `internal/models/types.go`.
- Headers: `Content-Type: application/json`; `X-Model-Version` set from `MODEL_VERSION` if non-empty.
- Response (200 OK): JSON `{ "cluster": "<string>", "risk_score": <int> }`.
- Errors: Any non-200, decode error, or timeout is treated as `cluster="error"` and `risk_score=0` by the server.

### Payload fields (units)
- `fbs` mg/dL, `hba1c` %, `cholesterol`/`ldl`/`hdl`/`triglycerides` mg/dL, `systolic`/`diastolic` mmHg, `bmi` kg/m², lifestyle/comorbidity strings as-is.

### Timeouts
- Configured via `MODEL_TIMEOUT_MS` (default 2000 ms). Applies to the full HTTP request.

### Fallback behavior
- If `MODEL_URL` is empty, the server uses the mock predictor for deterministic clusters/scores.
- On model errors/timeouts, the assessment is still stored with `cluster="error"` and `risk_score=0`.

### Versioning
- `MODEL_VERSION` is attached to each assessment record and sent as `X-Model-Version` to the model.

