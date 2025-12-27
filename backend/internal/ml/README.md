## Model inference contract

See `docs/ml-api-contract.md` for the full contract. Summary:
- POST `MODEL_URL` with JSON shaped like `models.Assessment`.
- Headers: `Content-Type: application/json`; `X-Model-Version` when set.
- Success 200: `{ "cluster": "<string>", "risk_score": <int> }`.
- Any non-200/timeout/decode/empty cluster -> backend records `cluster="error", risk_score=0`.
- Timeout: `MODEL_TIMEOUT_MS` applies to the entire request.
- If `MODEL_URL` is empty, the mock predictor is used (no external call).

