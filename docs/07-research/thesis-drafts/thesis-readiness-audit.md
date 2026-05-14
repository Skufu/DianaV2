# DIANA Thesis Readiness Audit

Date checked: 2026-05-14

Scope: Chapter 3 and 4 thesis draft, supporting codebase claims, and current local verification status. This audit intentionally ignores stale AGENTS.md guidance and is based on direct codebase inspection and command results.

## Canonical Manuscript Status

Canonical chapter file:

- `docs/07-research/thesis-drafts/ch3+4.md`

Removed stale duplicate chapter variants:

- `docs/07-research/thesis-drafts/ch3+4_academic.md`
- `docs/07-research/thesis-drafts/ch3+4-academic.md`
- `docs/07-research/thesis-drafts/ch3+4-integrated.md`

Reason: the duplicate academic/integrated files contained stale claims such as "three candidate algorithms", Go 1.24, and cached prediction fallback behavior. Keeping them would create thesis submission risk because readers could cite or submit the wrong version.

## Verified Corrections

The canonical `ch3+4.md` has been checked and corrected for the following high-risk claims:

- NHANES 2021-2023 is described as a COVID-adapted three-year release, not a standard two-year cycle.
- Reproductive health filtering uses RHQ031, not RHQ060.
- The model comparison section states four candidate algorithms, including XGBoost.
- Outlier handling reflects the active clinical-plausibility-range path, not an IQR-plus-clinical dual method.
- Backend technology is Go 1.25, matching the current module/toolchain.
- ML service failure behavior is described as structured error propagation plus local mock mode when `MODEL_URL` is unset, not cached prediction fallback.
- SHAP explanations are described as transient explainability outputs, not persisted JSONB assessment fields.
- API documentation is described as generated Swagger 2.0 under `backend/docs`, not a missing OpenAPI 3.0 `docs/api-spec.yaml`.
- Clustering validation uses the at-risk subset size n=734.
- UAT, expert review, accessibility contrast testing, and production performance claims are marked as pending where they are not yet supported by collected evidence.
- Fill-in placeholders are retained only for user-supplied future evidence such as screenshots, UAT dates/results, expert reviewer details/quotes, and formal accessibility-test results.

## Command Evidence

| Area | Command | Result |
|------|---------|--------|
| Thesis metrics consistency | `python3 scripts/thesis/check_metrics_consistency.py` | PASS: 42 checked claims match `models/binary_v2_no_bp/results` |
| Duplicate chapter scan | `rg --files docs/07-research/thesis-drafts \| rg "ch3\\+4"` | PASS: only `ch3+4.md` remains |
| Stale claim scan | `rg -n "Three candidate|Go 1\\.24|cached predictions|RHQ060|2021-2023 \\| 2-year|n=578" ch3+4.md` | PASS: no matches |
| Intentional placeholder scan | `rg -n "PLACEHOLDER|TBD|QUOTE TBD" ch3+4.md` | Expected: only future evidence placeholders |
| Backend tests | `cd backend && go test ./...` | PASS |
| Backend server smoke | `go run ./cmd/server` plus `curl http://localhost:8080/api/v1/healthz` | PASS after freeing port 8080 |
| ML tests | `cd Ian_ML && ./venv/bin/python -m pytest -q` | PASS: 270 passed |
| Frontend unit/contract tests | `cd frontend && npm test` | PASS: 214 passed |
| Frontend build | `cd frontend && npm run build` | PASS with one large chunk warning |
| Frontend lint | `cd frontend && npm run lint` | PASS with warnings |
| Frontend coverage | `cd frontend && npm run test:coverage` | FAIL: tests pass, coverage thresholds are not met |

## Remaining Blockers

1. Frontend coverage is the main technical readiness blocker.
   - Current coverage run passes all tests but fails configured thresholds.
   - This must be fixed by adding meaningful tests, recalibrating thresholds, or explicitly documenting coverage as incomplete.

2. UAT and expert review are not completed.
   - The thesis must not report SUS scores, expert ratings, or expert quotes until real data is collected.
   - Current manuscript status is acceptable only if these sections are framed as protocols or future work.

3. Formal accessibility testing is not completed.
   - The manuscript should not claim WCAG conformance without automated contrast/a11y evidence.

4. Frontend E2E coverage is stale.
   - Playwright tests are not currently a reliable submission-quality evidence source.

5. Final UI figures should be captured from the running application.
   - Do not use synthetic or placeholder figures for SHAP, result modal, dashboard, or UAT screenshots.
   - The manuscript contains figure placeholders only as insertion markers for real screenshots.

## Recommended Correction Order

1. Fix or formally scope the frontend coverage failure.
2. Capture real screenshots from the running app and insert only verified figures.
3. Keep UAT/expert sections as protocols unless data is actually collected before submission.
4. Run the final evidence bundle: backend tests, ML pytest, frontend tests, frontend build, metrics checker, and stale-claim scan.
5. Clean generated local artifacts before submission or commit review.
