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
  { "risk_cluster": "<non-empty string>", "risk_score": <int> }
  ```
  - `risk_cluster` must be non-empty; otherwise treated as an error.
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

## Cluster Definitions (per Research Paper)

The model should return one of the following cluster assignments based on the research paper's diabetes subtype classification for menopausal women:

| Cluster | Full Name | Characteristics | Risk Level |
|---------|-----------|-----------------|------------|
| **SIDD** | Severe Insulin-Deficient Diabetes | Low BMI, high HbA1c, insulin deficiency, younger onset | High |
| **SIRD** | Severe Insulin-Resistant Diabetes | High BMI (≥30), insulin resistance, obesity-related, cardiovascular risk | High |
| **MOD** | Mild Obesity-Related Diabetes | Moderate BMI elevation, mild glucose intolerance, generally favorable prognosis | Moderate |
| **MARD** | Mild Age-Related Diabetes | Older onset, mild metabolic dysfunction, low complication rate | Low |

### Cluster Assignment Hints (for mock/rule-based implementations)

```
IF BMI > 30 AND HbA1c > 6.0 → SIRD (risk_score: 80-90)
IF HbA1c > 6.5 AND BMI < 27 → SIDD (risk_score: 85-95)
IF Age > 60 AND HbA1c < 7.0 → MARD (risk_score: 30-50)
ELSE → MOD (risk_score: 25-40)
```

## Input Validation

The backend performs input validation before calling the model. The `validation_status` field in the request indicates:
- `ok`: All biomarkers within normal ranges
- `warning:<codes>`: Comma-separated warning codes (e.g., `fbs_prediabetic_range,hba1c_elevated`)

Warning codes include:
- `fbs_prediabetic_range` (FBS 100-125 mg/dL)
- `fbs_diabetic_range` (FBS ≥126 mg/dL)
- `hba1c_prediabetic` (HbA1c 5.7-6.4%)
- `hba1c_diabetic` (HbA1c ≥6.5%)
- `bp_elevated` (systolic 120-139 mmHg)
- `bp_hypertensive` (systolic ≥140 mmHg)
- `bmi_overweight` (BMI 25-29.9)
- `bmi_obese` (BMI ≥30)
- `cholesterol_high`, `ldl_elevated`, `hdl_low`, `triglycerides_high`
