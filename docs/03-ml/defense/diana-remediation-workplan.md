# DIANA ML Remediation Work Plan

**Version:** 1.0  
**Date:** 2026-03-07  
**Status:** Execution-Ready  
**Purpose:** Actionable roadmap to address identified ML defensibility and technical gaps for thesis defense.

---

## 1. Pre-Defense (Minimum Defensible)
*Critical items required to ensure the model and methodology can withstand adversarial questioning from the thesis panel.*

### 1.1 Cluster Stability Analysis (High Priority)
- **Problem:** No evidence exists to prove the stability of assigned K=4 clusters. Assignment could be random noise without bootstrap verification.
- **Target files:**
  - `Ian_ML/training/clustering.py` (Implementation)
  - `scripts/train/train_clusters.py` (CLI update)
- **Remediation:** Implement Bootstrap Resampling with Adjusted Rand Index (ARI) to quantify cluster assignment stability.
- **Verification:** console output and `cluster_analysis.json` report ARI > 0.60 across 100 bootstrap iterations.
- **Risk if skipped:** Panel may invalidate clustering results as "stochastic artifacts" rather than stable metabolic subtypes.
- **Rollback Step:** Revert `clustering.py` to baseline commit `4fa9777d6f`; ARI metrics are non-breaking and stored in side-car JSON.

### 1.2 Multi-Metric Cluster Quality Validation
- **Problem:** Current validation relies solely on Silhouette Score, which is insufficient for consensus validation of cluster separation.
- **Target files:** 
  - `Ian_ML/training/clustering.py`
  - `Ian_ML/training/visualizations.py` (if exists, otherwise `clustering.py` plot logic)
- **Remediation:** Calculate Davies-Bouldin Index (DBI) and Calinski-Harabasz Index (CHI) during K-optimization.
- **Verification:** `k_optimization.png` updated to include DBI and CHI curves; metrics persisted in `cluster_analysis.json`.
- **Risk if skipped:** Weak separation evidence makes the Ahlqvist adaptation harder to defend against "overfitting to noise" critiques.
- **Rollback Step:** Delete CHI/DBI plotting code block in `clustering.py`; revert `cluster_analysis.json` schema.

### 1.3 SHAP Interpretation Clarity (Frontend)
- **Problem:** Users/Clinicians may misinterpret SHAP values as raw biomarker magnitudes rather than contributions in standardized feature space.
- **Target files:**
  - `frontend/src/components/common/SHAPExplanation.jsx`
- **Remediation:** Update Info tooltip to explicitly mention the "standardized feature space" context.
- **Verification:** Tooltip text contains: "...computed on the model's standardized feature space (mean=0, std=1)."
- **Risk if skipped:** Misinterpretation of feature impact direction vs. raw value magnitude during the live demo.
- **Rollback Step:** Revert string change in `SHAPExplanation.jsx` line 214.

### 1.4 Feature Engineering Parity Test
- **Problem:** No automated verification that training's `engineer_features()` matches serving's `_build_feature_vector()`.
- **Target files:**
  - `Ian_ML/tests/test_parity.py` (New file)
- **Remediation:** Create a parity test script that compares output vectors for identical raw inputs between training and serving modules.
- **Verification:** `pytest Ian_ML/tests/test_parity.py` passes with zero epsilon difference.
- **Risk if skipped:** Silent transformation drift could lead to incorrect production predictions that differ from reported thesis metrics.
- **Rollback Step:** Delete `Ian_ML/tests/test_parity.py`.

---

## 2. Post-Defense (Ideal State)
*Enhancements to improve system robustness, maintainability, and clinical utility post-graduation.*

### 2.1 Backend-ML Schema Contract (High Effort)
- **Problem:** Manual sync required between Go `models.Assessment` and Python dict. Vulnerable to silent field name drift.
- **Target files:**
  - `backend/internal/ml/http_predictor.go`
  - `Ian_ML/service/server.py`
- **Remediation:** Implement OpenAPI/JSON Schema validation for the `/predict` endpoint.
- **Verification:** Invalid field names in Go struct trigger 400 Bad Request with explicit schema violation details in Python logs.
- **Risk if skipped:** High maintenance burden; technical debt accumulates with every biomarker addition/rename.

### 2.2 Automated Drift Monitoring
- **Problem:** Model performance in production is not tracked against training baseline.
- **Target files:**
  - `Ian_ML/service/drift_detection.py`
  - `backend/internal/store/postgres.go` (Audit log extension)
- **Remediation:** Connect `drift_detection.py` to the live assessment stream to monitor feature distribution shifts (PSI/K-S test).
- **Verification:** MLflow dashboard displays real-time PSI (Population Stability Index) for core biomarkers.
- **Risk if skipped:** Model becomes stale as population demographics (e.g., NHANES updates) shift over time.

### 2.3 Comprehensive HOMA2 Integration
- **Problem:** Current SIRD/SIDD clusters use proxy metrics (LAP/LDL) due to missing HOMA2 data.
- **Target files:**
  - `Ian_ML/training/clustering.py`
  - `frontend/src/components/user/AssessmentForm.jsx`
- **Remediation:** Add optional C-peptide and Insulin fields to the assessment form to allow true Ahlqvist subtype replication.
- **Verification:** Clustering logic detects presence of HOMA2 inputs and prioritizes them over LAP/LDL proxies.
- **Risk if skipped:** The "Ahlqvist-inspired" label remains a permanent methodological limitation rather than a clinical breakthrough.

---

## 3. Prioritization Matrix

| Severity | Effort | Item | Phase |
|----------|--------|------|-------|
| Critical | Low | 1.3 SHAP Interpretation Clarity | Pre-Defense |
| Critical | Medium | 1.1 Cluster Stability Analysis | Pre-Defense |
| High | Medium | 1.4 Feature Engineering Parity Test | Pre-Defense |
| High | Low | 1.2 Multi-Metric Cluster Quality | Pre-Defense |
| Medium | High | 2.1 Backend-ML Schema Contract | Post-Defense |
| Low | High | 2.3 HOMA2 Integration | Post-Defense |
| Low | Medium | 2.2 Automated Drift Monitoring | Post-Defense |
