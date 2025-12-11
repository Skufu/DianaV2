# ML Inference API Contract

This document specifies the HTTP contract between DianaV2 and the external ML inference service used to score patient assessments.

## Endpoint & Transport
- Method/URL: `POST MODEL_URL` (environment variable `MODEL_URL`).
- Timeout: `MODEL_TIMEOUT_MS` (ms) applies to the entire HTTP request.
- Auth: none currently enforced by the backend; add if the model service requires it.

## Headers
- `Content-Type: application/json`
- `X-Model-Version: <string>` (sent when `MODEL_VERSION` is non-empty)

## Request Schema (JSON)
Payload shape matches `internal/models.Assessment`. Fields sent by the backend:

| Field | Type | Units / Notes |
| --- | --- | --- |
| patient_id | integer | Internal patient identifier |
| fbs | number | mg/dL |
| hba1c | number | % |
| cholesterol | integer | mg/dL |
| ldl | integer | mg/dL |
| hdl | integer | mg/dL |
| triglycerides | integer | mg/dL |
| systolic | integer | mmHg |
| diastolic | integer | mmHg |
| activity | string | e.g., "low", "moderate" |
| history_flag | boolean | Patient history present |
| smoking | string | e.g., "never", "former", "current" |
| hypertension | string | free text flag |
| heart_disease | string | free text flag |
| bmi | number | kg/m² |
| model_version | string | Copied from env `MODEL_VERSION` |
| dataset_hash | string | Copied from env `DATASET_HASH` (if set) |
| validation_status | string | `ok` or `warning:<comma-separated-flags>` |

Example request:
```json
{
  "patient_id": 42,
  "fbs": 118,
  "hba1c": 6.2,
  "cholesterol": 205,
  "ldl": 132,
  "hdl": 48,
  "triglycerides": 180,
  "systolic": 138,
  "diastolic": 86,
  "activity": "moderate",
  "history_flag": true,
  "smoking": "former",
  "hypertension": "yes",
  "heart_disease": "no",
  "bmi": 29.4,
  "model_version": "v1",
  "dataset_hash": "abc123",
  "validation_status": "warning:fbs_prediabetic_range,hba1c_prediabetic_range"
}
```

## Response Schema
- Success (HTTP 200):
  ```json
  { "cluster": "<non-empty string>", "risk_score": <int> }
  ```
  - `cluster` must be non-empty; otherwise treated as an error.
  - `risk_score` is an integer (0 is acceptable).

## Error & Timeout Handling (backend behavior)
- Any non-200 status, network error, timeout, JSON decode failure, or empty `cluster` results in the backend treating the model call as failed.
- Failure mapping: `cluster="error"`, `risk_score=0`. The assessment is still stored with these values.

## Versioning & Mock Mode
- `X-Model-Version` header and `model_version` body field are populated from `MODEL_VERSION` when set.
- If `MODEL_URL` is empty, the backend uses an internal mock predictor and does not call the external model.

## Expectations for Model Service
- Respond with HTTP 200 and the response schema above for valid requests.
- Prefer returning meaningful 4xx/5xx on validation/server errors; the backend will map any non-200 to the failure behavior described above.
- Keep latency within `MODEL_TIMEOUT_MS`; otherwise the backend will time out and record the failure mapping.

