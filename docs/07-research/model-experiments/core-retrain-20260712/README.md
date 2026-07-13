# Core retrain snapshot — 2026-07-12

This directory freezes the manuscript-facing outputs from the isolated
post-defense core retrain. The run used `DIANA_MODEL_OUTPUT_DIR`, so it did not
replace the active model directory. The classifier and cluster binaries are not
duplicated here; their hashes and production-parity check are recorded in
`run_manifest.json`.

Use `results/best_model_report.json` for the explicit model-selection rule and
metric-aggregation definitions, `results/logo_fold_metrics.csv` for fold-level
evidence, and the dated figures under `visualizations/` for manuscript links.
The cluster heatmap colors feature-wise standardized centroid deviations and
annotates raw clinical centers, avoiding cross-unit color comparisons.
