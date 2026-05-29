# DIANA Thesis Readiness Audit

Date checked: 2026-05-30

Scope: Chapter 3 and 4 thesis draft, supporting codebase claims, and current local verification status. This audit intentionally ignores stale AGENTS.md guidance and is based on direct codebase inspection and command results.

## Canonical Manuscript Status

Clean thesis-ready chapter file:

- `docs/07-research/thesis-drafts/ch3+4-final-academic-draft.md`

Detailed technical backup:

- `docs/07-research/thesis-drafts/ch3+4.md`

Rule: use `ch3+4-final-academic-draft.md` for thesis-ready Chapter 3+4 wording, citation placement, and final methodology/results prose. Use `ch3+4.md` as the expanded technical backup for implementation evidence and deeper verification details.

Removed stale duplicate chapter variants:

- `docs/07-research/thesis-drafts/ch3+4_academic.md`
- `docs/07-research/thesis-drafts/ch3+4-academic.md`
- `docs/07-research/thesis-drafts/ch3+4-integrated.md`

Reason: the duplicate academic/integrated files contained stale claims such as "three candidate algorithms", Go 1.24, and cached prediction fallback behavior. Keeping them would create thesis submission risk because readers could cite or submit the wrong version.

## Verified Corrections

The Chapter 3+4 draft set has been checked and corrected for the following high-risk claims. Future edits should preserve `ch3+4-final-academic-draft.md` as the clean thesis-ready file and `ch3+4.md` as the detailed technical backup. Citations should remain APA-style author-date in the manuscript text, with full APA-style entries in the reference list.

- NHANES 2021-2023 is described as the August 2021-August 2023 post-pandemic release, not as a standard biennial release or a generic COVID-adapted cycle.
- Reproductive health filtering uses RHQ031, not RHQ060.
- The model comparison section states four candidate algorithms, including XGBoost.
- Outlier handling reflects the active clinical-plausibility-range path, not an IQR-plus-clinical dual method.
- Backend technology is Go 1.25, matching the current module/toolchain.
- ML service failure behavior is described as structured error propagation plus local mock mode when `MODEL_URL` is unset, not cached prediction fallback.
- SHAP explanations are described as transient explainability outputs, not persisted JSONB assessment fields.
- API documentation is described as generated Swagger 2.0 under `backend/docs`, not a missing OpenAPI 3.0 `docs/api-spec.yaml`.
- Clustering validation uses the at-risk subset size n=734.
- Deployment is described as repository-supported topologies: Vercel/Caddy/managed PostgreSQL where configured, or Docker Compose production overlay with Nginx and internal PostgreSQL 16. The draft no longer claims only one absolute hosting stack.
- Deployment/security claims are limited to configuration-level readiness and direct service-port isolation. The optional Nginx `/ml/` reverse-proxy route is now called out as requiring deployment-time controls rather than being hidden under a blanket ML-isolation claim.
- Frontend visualization is described as Recharts-based. Plotly was removed from the manuscript because it is not present in the current frontend dependency set.
- User export is described as the current PDF health report endpoint, not a CSV-export workflow.
- ML proxy routes are described as available when `MODEL_URL` is configured.
- Legacy clinic routes and data-layer code still exist in the repository, but clinics are not presented as an active thesis workflow in the final Chapter 3+4 draft.
- Chapter 4 metrics tables were synchronized to the current `models/binary_v2_no_bp/results` artifacts, including threshold-arbitration counts, information-gain ranking, and model-comparison means.
- Community UAT, formal scored expert review, accessibility contrast testing, and production performance claims are marked as pending where they are not yet supported by collected evidence.
- Fill-in placeholders are retained only for user-supplied future evidence such as UAT dates/results, expert reviewer details/quotes, and formal accessibility-test results.
- Current UI screenshots have a provenance manifest with capture date, local capture endpoints, source views, dimensions, and SHA-256 hashes.

## Command Evidence

| Area | Command | Result |
|------|---------|--------|
| Thesis metrics consistency | `python3 scripts/thesis/check_metrics_consistency.py docs/07-research/thesis-drafts/ch3+4-final-academic-draft.md docs/07-research/thesis-drafts/ch3+4.md` | PASS: 43 checked claims per document match `models/binary_v2_no_bp/results` |
| Chapter 3+4 source-of-truth scan | `rg --files docs/07-research/thesis-drafts \| rg "ch3\\+4"` | Expected: `ch3+4-final-academic-draft.md` is the clean thesis-ready draft; `ch3+4.md` is the technical backup |
| Stale claim scan | `rg -n "Three candidate|Go 1\\.24|cached predictions|RHQ060|COVID-adapted|n=578|Plotly|Download CSV|production VPS" ch3+4-final-academic-draft.md ch3+4.md` | Expected: no stale implementation, visualization, export, deployment, or data-release claims |
| Intentional placeholder scan | `rg -n "PLACEHOLDER|TBD|QUOTE TBD" ch3+4-final-academic-draft.md ch3+4.md` | Expected: only future evidence placeholders |
| Backend tests | `cd backend && GOCACHE=/private/tmp/diana-go-build go test ./...` | PASS; initial sandboxed run was blocked by local `httptest` listener permissions, then passed outside the sandbox |
| ML tests | `cd Ian_ML && ./venv/bin/python -m pytest -q` | PASS: 274 passed |
| Frontend coverage | `cd frontend && npm run test:coverage` | PASS: 15 files, 232 tests; 71.26% lines/statements, 60.55% branches, 44.24% functions |
| Screenshot provenance | `file docs/07-research/thesis-drafts/screenshots/*.png` and `shasum -a 256 docs/07-research/thesis-drafts/screenshots/*.png` | PASS: cited UI screenshots are 1440 x 1000 PNG files and hashes are recorded in `screenshots/README.md` |
| Figure path scan | Markdown image-link scan over `ch3+4-final-academic-draft.md` and `ch3+4.md` | PASS: final draft has 7 image links and technical backup has 9 image links; no missing local image targets |
| Render/export check | `pandoc ... --standalone --mathjax --embed-resources --resource-path=docs/07-research/thesis-drafts:.` for both Chapter 3+4 files | PASS: self-contained HTML files generated under `tmp/thesis-review-render/`; all image tags are embedded resources |
| Bibliography scan | Reference-list scan over `ch3+4-final-academic-draft.md` | PASS: 35 reference entries; no duplicate first-author/year keys; no bare `DOI:` or `PMC####` markers in the clean final bibliography |
| Deployment/security scan | `rg` review of `docker-compose.prod.yml`, `deployment/Caddyfile`, `frontend/nginx-ssl.conf`, and ML/backend security configuration | REVIEWED: manuscript now distinguishes direct service-port isolation from optional reverse-proxy ML routing |

## Remaining Blockers

1. Community UAT and formal scored expert review are not completed.
   - The thesis must not report SUS scores, expert ratings, or expert quotes until real data is collected.
   - The completed doctor walkthrough may be reported only as qualitative face-validity feedback unless formal scoring evidence is added.
   - Current manuscript status is acceptable only if these sections are framed as protocols, qualitative face-validity notes, or future work.

2. Formal accessibility testing is not completed.
   - The manuscript should not claim WCAG conformance without automated contrast/a11y evidence.

3. Frontend E2E coverage is stale.
   - Playwright tests are not currently a reliable submission-quality evidence source.

4. Future UI figures should remain evidence-based.
   - Current Chapter 3+4 image links resolve and render in the self-contained HTML export.
   - Do not add synthetic or placeholder figures for SHAP, result modal, dashboard, or UAT screenshots.

5. Live deployment security has not been audited.
   - Configuration evidence exists, but host firewall rules, live TLS certificates, production CORS values, database TLS mode, and ML API-key enforcement must be verified on the actual deployed endpoint before stronger security claims are made.

## Recommended Correction Order

1. Keep the screenshot manifest synchronized whenever UI figures are replaced.
2. Keep UAT/expert sections as protocols unless data is actually collected before submission.
3. Run the final evidence bundle again immediately before submission: backend tests, ML pytest, frontend coverage, metrics checker, and stale-claim scan.
4. Clean generated local artifacts before submission or commit review.
