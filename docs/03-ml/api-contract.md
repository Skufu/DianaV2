# ML Inference API Contract

This document specifies the HTTP contract between DianaV2 and the external ML inference service used to score patient assessments.

## Endpoint & Transport
- Method/URL: `POST /predict` with optional query parameter `?model_type=clinical` (default) or `?model_type=ada`
- Timeout: `MODEL_TIMEOUT_MS` (ms) applies to the entire HTTP request.
- Auth: API key authentication via `X-API-Key` header (required in production when `ML_API_KEY` is set; skipped in development mode)

## Headers
- `Content-Type: application/json`
- `X-Model-Version: <string>` (sent when `MODEL_VERSION` is non-empty)

## Request Schema (JSON)

### Clinical Model (Default) - 5 Required Fields

The Clinical model (non-circular, no HbA1c/FBS) accepts these 5 fields:

| Field | Type | Units / Notes | Required |
| --- | --- | --- | --- |
| bmi | number | kg/m² (Body mass index) | ✅ Yes |
| triglycerides | integer | mg/dL | ✅ Yes |
| ldl | integer | mg/dL (Low-density lipoprotein) | ✅ Yes |
| hdl | integer | mg/dL (High-density lipoprotein) | ✅ Yes |
| age | integer | years (optional in request, defaults to 54 if not provided) | No |

Example request:
```json
{
  "bmi": 29.4,
  "triglycerides": 180,
  "ldl": 132,
  "hdl": 48,
  "age": 55
}
```

### ADA Model - 6 Required Fields

The ADA model accepts these 6 biomarker fields:

| Field | Type | Units / Notes | Required |
| --- | --- | --- | --- |
| hba1c | number | % (Glycated hemoglobin) | ✅ Yes |
| fbs | number | mg/dL (Fasting blood glucose) | ✅ Yes |
| bmi | number | kg/m² (Body mass index) | ✅ Yes |
| triglycerides | integer | mg/dL | ✅ Yes |
| ldl | integer | mg/dL (Low-density lipoprotein) | ✅ Yes |
| hdl | integer | mg/dL (High-density lipoprotein) | ✅ Yes |

Example request:
```json
{
  "hba1c": 6.2,
  "fbs": 118,
  "bmi": 29.4,
  "triglycerides": 180,
  "ldl": 132,
  "hdl": 48
}
```

## Response Schema

### Success Response (HTTP 200)

The API returns different response structures depending on the model type:

#### Clinical Model Response (Default)
```json
{
  "success": true,
  "model_type": "binary",
  "predicted_status": "Pre-diabetic",
  "risk_cluster": "MOD",
  "metabolic_subtype": "MOD",
  "metabolic_subtype_full": "Mild Obesity-Related Diabetes",
  "risk_level": "MODERATE",
  "risk_label": "Moderate risk",
  "cluster_description": "Mild obesity-related diabetes profile with moderate metabolic dysfunction.",
  "treatment_focus": "Weight management through diet and exercise; monitor metabolic markers quarterly.",
  "probability": 0.58,
  "at_risk_probability": 0.72,
  "risk_score": 58,
  "confidence": 0.65,
  "model_info": {
    "classifier": "XGBoost",
    "auc_roc": 0.72,
    "features_used": ["bmi", "triglycerides", "ldl", "hdl", "age", "systolic", "diastolic", ...],
    "note": "Binary at-risk screening model (AUC 0.72, 99.5% sensitivity) - no HbA1c/FBS"
  }
}
```

#### ADA Model Response
```json
{
  "success": true,
  "medical_status": "Pre-diabetic",
  "risk_cluster": "MODERATE",
  "risk_level": "MODERATE",
  "risk_score": 65,
  "probability": 0.652,
  "confidence": 0.652,
  "model_info": {
    "n_clusters": 4,
    "classifier_accuracy": 0.85
  }
}
```

### Response Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the prediction was successful |
| `model_type` | string | "binary" for clinical model, "ada" for baseline model |
| `predicted_status` | string | Diabetes classification: "Normal", "Pre-diabetic", or "At-Risk" |
| `risk_cluster` | string | Metabolic subtype cluster (SIRD, SIDD, MOD, MARD) |
| `metabolic_subtype` | string | Short code for metabolic subtype |
| `metabolic_subtype_full` | string | Full name of the metabolic subtype |
| `risk_level` | string | Simplified risk level: "HIGH", "MODERATE", or "LOW" |
| `risk_label` | string | Human-readable risk label (e.g., "High risk", "Moderate risk") |
| `cluster_description` | string | Clinical description of the cluster phenotype |
| `treatment_focus` | string | Recommended treatment approach based on subtype |
| `risk_score` | integer | Risk score from 0-100 (derived from at-risk probability) |
| `probability` | float | Diabetes probability (0.0 to 1.0) from classifier |
| `at_risk_probability` | float | Combined probability of pre-diabetic + diabetic (0.0 to 1.0) |
| `confidence` | float | Confidence score (max probability from classifier) |
| `model_info` | object | Model metadata including classifier type, accuracy, and feature information |
| `error` | string | Error message if `success` is false |

## Error & Timeout Handling (backend behavior)
- Any non-200 status, network error, timeout, JSON decode failure, or empty `cluster` results in the backend treating the model call as failed.
- Failure mapping: `cluster="error"`, `risk_score=0`. The assessment is still stored with these values.

## Versioning & Mock Mode
- `X-Model-Version` header and `model_version` body field are populated from `MODEL_VERSION` when set.
- If `MODEL_URL` is empty, the backend uses an internal mock predictor and does not call the external model (dev/test only).

## Expectations for Model Service
- Respond with HTTP 200 and the response schema above for valid requests.
- Prefer returning meaningful 4xx/5xx on validation/server errors; the backend will map any non-200 to the failure behavior described above.
- Keep latency within `MODEL_TIMEOUT_MS`; otherwise the backend will time out and record the failure mapping.

## Cluster Definitions

### Clinical Model Cluster Labels
The clinical model returns cluster labels based on Ahlqvist diabetes subtypes:

| Cluster | Full Name | Description | Treatment Focus |
|---------|-----------|-------------|-----------------|
| **SIRD** | Severe Insulin-Resistant Diabetes | High BMI, severe insulin resistance, obesity-related | Focus on insulin sensitivity and cardiovascular risk reduction; consider metformin + lifestyle |
| **SIDD** | Severe Insulin-Deficient Diabetes | Low BMI, high HbA1c, insulin deficiency | Prioritize glycemic control and beta-cell preservation; consider insulin therapy |
| **MOD** | Mild Obesity-Related Diabetes | Moderate BMI elevation, mild glucose intolerance | Weight management and lifestyle optimization; monitor quarterly |
| **MARD** | Mild Age-Related Diabetes | Older onset, mild metabolic dysfunction | Maintain current health habits and regular monitoring |

### Risk Level Mapping
Each cluster is mapped to a risk level:
- **SIRD**: HIGH risk
- **SIDD**: HIGH risk  
- **MOD**: MODERATE risk
- **MARD**: LOW risk

## Input Validation

The backend performs input validation before calling the model. Valid input ranges:

| Field | Valid Range |
|-------|-------------|
| `hba1c` | 2.0 - 20.0 % |
| `fbs` | 20 - 600 mg/dL |
| `bmi` | 10 - 80 kg/m² |
| `triglycerides` | 20 - 1500 mg/dL |
| `ldl` | 10 - 400 mg/dL |
| `hdl` | 10 - 150 mg/dL |
| `age` | 18 - 120 years |

Warning codes for borderline values:
- `fbs_prediabetic_range` (FBS 100-125 mg/dL)
- `fbs_diabetic_range` (FBS ≥126 mg/dL)
- `hba1c_prediabetic` (HbA1c 5.7-6.4%)
- `hba1c_diabetic` (HbA1c ≥6.5%)
- `bp_elevated` (systolic 120-139 mmHg)
- `bp_hypertensive` (systolic ≥140 mmHg)
- `bmi_overweight` (BMI 25-29.9)
- `bmi_obese` (BMI ≥30)
- `cholesterol_high`, `ldl_elevated`, `hdl_low`, `triglycerides_high`
