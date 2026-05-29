# Chapter 3+4 Academic Wording Bank Audit

Scope: `docs/07-research/thesis-drafts/ch3+4-academic-wording-bank.md`, checked against the canonical Chapter 3+4 draft and direct codebase evidence. This audit does not rely on stale AGENTS.md files.

## Overall Rating

Current rating: **8.6/10, paper-ready as a wording bank after source-checking, but not a standalone final chapter.**

The file is strong for copy-paste academic phrasing because it uses a formal methodology tone, avoids Chapter 1 and Chapter 2 material, preserves the corrected NHANES cycle wording, uses four candidate algorithms, and frames DIANA as a screening-support system rather than a diagnostic tool. It is intentionally compressed, so the canonical Chapter 3+4 draft remains necessary for tables, figures, exact implementation references, and full defense detail.

## Rating Breakdown

| Criterion | Rating | Checker Note |
|---|---:|---|
| Chapter scope control | 9.5/10 | Limited to Chapters 3 and 4; no abstract, introduction, or literature-review material was detected. |
| Codebase/source alignment | 8.5/10 | Core facts match the model artifacts, Go routes, ML serving behavior, and canonical chapter. Remaining caution applies to planned UAT and accessibility evidence. |
| Academic tone | 8.5/10 | Formal, procedural, and suitable for thesis prose. Some paragraphs are concise by design and should be expanded with tables in the final manuscript. |
| Completeness versus canonical Chapter 3+4 | 7.8/10 | Captures the major narrative, but omits many detailed tables, figures, citations, endpoint matrices, and full UAT templates. |
| Evidence restraint | 9/10 | Pending UAT, expert review, accessibility testing, and load testing are not overstated. |
| Copy-paste readiness | 8.5/10 | Prose can be copied into the thesis with minimal editing, provided placeholders and exact tables are taken from the canonical chapter. |

## Present And Code-Backed

- Correct NHANES wording: six releases from 2009-2010 through 2021-2023, excluding disrupted 2019-2020 and treating 2021-2023 as the August 2021-August 2023 post-pandemic release.
- Correct postmenopausal filtering language using RHQ031 rather than stale RHQ060 wording.
- Correct binary cohort size: 1,376 total, 734 at-risk, and 642 normal.
- Correct final feature set: BMI, triglycerides, LDL, HDL, age, waist circumference, smoking, physical activity, and alcohol use.
- Correct four candidate algorithms: Logistic Regression, Random Forest, LightGBM, and XGBoost.
- Correct deployed model rationale: Logistic Regression selected for discrimination, interpretability, thresholding, and deployment simplicity.
- Correct threshold and performance language: threshold 0.465, pooled AUC-ROC 0.7366, sensitivity 0.748, specificity 0.590, F1 0.710.
- Correct clustering language: at-risk-only weighted K-Means, K = 4, 734 cases, heuristic SIRD-like/SIDD-like/MOD-like/MARD-like labels.
- Correct SHAP persistence claim: SHAP outputs are transient explanation artifacts and are not stored as JSONB assessment fields.
- Correct implementation framing: React frontend, Go/Gin backend, Python/Flask ML service, PostgreSQL persistence, Redis-backed caching, and Go middleware rate limiting.
- Correct caution on UAT, expert review, accessibility testing, and production load testing as pending or readiness-level evidence.

## Previously Missing And Now Added

- The phase list now matches the actual section order.
- Inference-time waist-circumference handling is described as BMI x 3.33 and framed as a usability guardrail, not a validated estimator.
- NHANES survey weights are explicitly discussed as not used for model training.
- The Metabolic Syndrome serving-layer risk guardrail is now included with the code-backed criteria and probability adjustment behavior.
- SHAP graceful fallback behavior is now included so the manuscript does not imply fabricated explanations.
- Core API route coverage is now summarized, including assessment CRUD, account deletion, admin user management, and ML explainability proxy routes.
- Bootstrap confidence-interval methodology is now included.
- Calibration sample size is now included.
- Benchmark comparator numbers are now stated directly rather than summarized too broadly.
- Screenshot and UAT placeholders are now explicitly preserved for final manuscript assembly.

## Still Missing From The Wording Bank

- Full tables from the canonical chapter, including NHANES source files, variable mappings, model hyperparameter grids, UAT result structures, UAT test cases, and expert feedback templates.
- Full figure captions and insertion points for architecture diagrams, data-flow diagrams, model visualizations, screenshots, and SHAP plots.
- Full citation handling. The wording bank intentionally does not reproduce the references list from the canonical chapter.
- Exact implementation references by file and line number. These are useful for defense notes but should be used sparingly in the final thesis body.
- Full database schema details, including entity-relationship diagram discussion and SQLC query-generation explanation.
- Full deployment and observability detail, including drift endpoints, model traceability views, and A/B testing infrastructure.

## Claims That Must Stay Qualified

- UAT and expert review are planned, not completed, unless data are collected later.
- Accessibility should be described as readiness, not WCAG certification, until formal contrast and assistive-technology testing are completed.
- Production performance should not be overstated because concurrent load testing remains pending.
- External benchmark comparison is an internal NHANES reconstruction, not proof of superiority over published tools.
- Metabolic subtype labels are heuristic proxy labels, not validated biological subtypes or treatment directives.
- The Metabolic Syndrome risk floor and waist-imputation rule are engineered safeguards requiring ablation, calibration, and clinical review.

## Recommended Use

Use `ch3+4-academic-wording-bank.md` as the copy-paste prose bank for Chapter 3 and Chapter 4. Use `ch3+4.md` as the source of truth for evidence, tables, figures, exact metric provenance, and placeholders that still need real screenshots or collected study results.
