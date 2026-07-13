# Post-Defense Model Experiments

This directory contains reproducible, non-promoting sensitivity evidence. None
of these files is loaded by the DIANA inference service.

## Reproduce

From the repository root with `.venv` activated:

```bash
python Ian_ML/training/explore_expanded_non_circular.py
python Ian_ML/training/explore_unlabeled_centroids.py --stability-runs 30
```

They can also run after the isolated core retrain:

```bash
DIANA_MODEL_OUTPUT_DIR=models/experiments/minor_revision_retest \
DIANA_RUN_EXPANDED_FEATURE_TEST=1 \
DIANA_RUN_UNLABELED_CLUSTER_TEST=1 \
bash scripts/dev/retrain-binary.sh
```

`DIANA_MODEL_OUTPUT_DIR` prevents the retrain from replacing
`models/binary_v2_no_bp`. Local model artifacts under `models/experiments/` are
ignored by Git; the evidence tables and figures in this directory are retained.

## Expanded non-circular classifier test

`expanded-non-circular/` compares fixed Logistic Regression feature contracts
under nested survey-cycle-grouped cross-validation. The complete condition uses
15 raw predictor concepts and includes CRP, fasting insulin, blood pressure,
total cholesterol, and family history. HbA1c, FBS, DIQ010, outcome derivatives,
identifiers, cycle, the legacy reproductive-cohort field, the target-derived
outlier flag, and duplicate engineered variables are forbidden predictors.

All 1,376 rows remain. Median imputation and scaling are fitted inside each
training fold. The complete 15-feature condition reached mean fold AUC 0.7426
versus 0.7360 for the current-content nine-feature baseline. The all-cycle CRP
increment was approximately 0.0002 AUC, and the paired CRP-assayed-cycle result
slightly favored the no-CRP condition. This does not establish either CRP benefit
or equivalence.

Primary files:

- `feature_set_comparison.csv`: aggregate and fold-level comparison summary.
- `outer_fold_metrics.csv`: held-out-cycle metrics and inner-derived thresholds.
- `fold_fitted_imputer_statistics.csv`: learned training-only medians by fold.
- `missingness_by_cycle.csv`: assay-availability and non-response breakdown.
- `run_manifest.json`: data hash, exact allow/ban lists, versions, and method.

## Anonymous broad-K clustering test

`unlabeled-centroids/` reports numeric centroid IDs only. It does not assign
clinical, risk, treatment, or Ahlqvist subtype names and does not create serving
artifacts.

The scan evaluates:

- all 1,376 records, six core features, equal weights, K=2-20;
- 734 operational-positive records, current weighted geometry, K=2-20; and
- 728 records from CRP/insulin-assayed cycles, eight features, equal weights,
  K=2-15.

K=2 led silhouette and 30-bootstrap stability in every specification. The
current weighted operational-positive K=4 remained locally stable, but it was
not uniquely optimal. The expanded K=5 centroids suggested different lipid/
insulin and adiposity/inflammation patterns, but median bootstrap ARI was 0.5263,
so those patterns are hypothesis-generating only.

In the expanded view, triglycerides, fasting insulin, and CRP are modeled after
`log1p`; their exported raw center is the inverse-transformed geometric-scale
center, not the arithmetic member mean. Member medians and quartiles are stored
beside each center in `centroids_raw.csv`.

Primary files:

- `k_scan_all.csv`: every K and all internal/stability metrics.
- `centroids_raw_all_k.csv`: raw anonymous centroid coordinates for every K.
- `centroids_z_all_k.csv`: standardized anonymous centroid coordinates.
- `stability_all.csv`: bootstrap-refit and leave-cycle-out ARI records.
- `run_manifest.json`: exact specifications, exclusions, data hash, and versions.

## Dated core-retrain snapshot

`core-retrain-20260712/` freezes the manuscript-facing report, fold metrics, and
figures from the isolated core retrain. Its manifest records the exact command,
base commit, script and data hashes, untracked binary hashes, and the unchanged
active-model aggregate hash. The cluster heatmap uses feature-wise standardized
colors with raw-unit annotations, so unlike the superseded plot it does not
compare BMI, lipids, age, and waist on one raw numeric color scale.

## Interpretation boundary

These experiments support methodological transparency, not diagnosis, treatment
selection, biological subtype claims, menopause causation, or external Filipino
validity. DIQ010 is a diabetes-history variable and supplies no menopause
evidence. The development cohort is an operational no-period cohort, not a
uniformly clinically confirmed natural-postmenopause cohort.
