## Model inference contract

See `docs/03-ml/api-contract.md` for the full contract. Summary:
- POST `MODEL_URL` with JSON shaped like `models.Assessment`.
- Headers: `Content-Type: application/json`; `X-Model-Version` when set.
- Success 200 includes model outputs such as:
  - `risk_cluster`, `metabolic_subtype`, `risk_score`
  - `risk_level`, `risk_label`, `cluster_description`, `treatment_focus`
  - `at_risk_probability`, `predicted_status`
- Any non-200/timeout/decode error -> backend returns error response and does NOT create the assessment.
- Successful predictions are persisted with `cluster`, `risk_score`, `risk_level`, and ML metadata.
- After successful prediction, backend queues a non-blocking drift check in background.
- Timeout: `MODEL_TIMEOUT_MS` applies to the entire request.
- If `MODEL_URL` is empty, the mock predictor is used (no external call).
