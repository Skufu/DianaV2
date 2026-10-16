# ADR-001 — Synchronous HTTP ML Inference Call

- **Status:** Accepted
- **Date:** 2026-08-11 (re-derived on macbook-air-2, supersedes the Windows draft)
- **Deciders:** Adrian (author), future Hermes agents
- **Related:** `docs/06-operations/data-lineage.md`, `backend/internal/ml/` (Predictor interface, circuit breaker), `Ian_ML/service/predict.py`

## Context

DianaV2 serves ML risk scores through a Flask inference service called by the Go API. The natural question is whether the call should be synchronous (request → ML server → response) or asynchronous (queue + poll/callback). The data pipeline work (manifest, gates) has no bearing on this call — it is a serving-layer decision — but it was documented alongside the pipeline changes because both are Ch 1-3 "architecture as contracts" lessons.

The ML call is the only satellite service in an otherwise modular-monolith platform. Loose-coupling machinery already exists: the `Predictor` interface, `MockPredictor` fallback for dev/test, `circuit_breaker.go`, and `api-contract.md`.

## Decision

**Keep the ML inference call synchronous (HTTP request/response) between the Go API and the Flask ML service.**

Rationale:

1. **Latency budget:** a single risk assessment must feel interactive (target < 2s end-to-end). The model itself is a fast tabular inference (joblib, no deep learning); the sync round-trip is well inside the budget.
2. **Failure semantics are already handled:** the circuit breaker + `MockPredictor` fallback gives degraded-but-available behavior when the ML service is down. This is fail-open decoupling, which is exactly what a sync call needs to be safe.
3. **Operational simplicity:** a queue (Redis/RabbitMQ) + worker + result store adds moving parts with zero user-visible benefit at this scale (single-user-to-small-clinic concurrency). Async would be justified only at sustained high concurrency or long-running inference.
4. **Consistent with the codebase:** the rest of the platform is a modular monolith with sync APIs; introducing the only async boundary in the ML path would raise cognitive load without a payoff.

## Consequences

- **Positive:** simpler ops, one fewer infrastructure dependency, natural request-scoped error propagation, no staleness problem (a queued result can be stale by the time it's read).
- **Negative:** the Go API blocks on the ML service; under ML-service outage the API relies on circuit breaker + fallback (degraded mode) rather than graceful queueing. Long-running model swaps (retraining) must be coordinated outside the request path.
- **Risk:** if inference latency ever grows (larger model, batch of assessments), revisit this ADR — the `Predictor` interface keeps the swap to an async implementation a local change.

## Revisit triggers

- Model inference time exceeds the interactive budget at p95.
- Concurrent assessment volume grows to the point where blocking requests queue in the Go API.
- A second ML service (e.g., clustering) joins the platform and shares infrastructure that would benefit from a queue.
