# DIANA Defensibility Memo

**Version:** 1.0  
**Date:** 2026-03-07  
**Baseline Commit:** `4fa9777d6ff1f97fb9c501a9dea7e04a98ac7157`  
**Purpose:** Thesis defense evidence mapping and panel preparation for DIANA ML methodology.

---

## 1. Executive Summary

The DIANA (Diabetes Risk Assessment for Menopausal Women) platform provides a defensible screening methodology by combining rigorous statistical validation with clinically grounded explainability. This memo synthesizes the evidence for the system's three core ML pillars:
1. **Clinical Subtyping:** Identifying metabolic phenotypes inspired by the Ahlqvist et al. (2018) taxonomy.
2. **Predictive Performance:** Leveraging nested Cross-Validation and bootstrap analysis for unbiased risk estimation.
3. **Model Interpretability:** Providing SHAP-based feature attribution aligned with clinical biomarkers.

The system is designed not as a standalone diagnostic tool, but as a "clinician-in-the-loop" decision support system, adhering to WHO AI Ethics Guidance (2021).

---

## 2. Risk Matrix (Technical & Clinical)

| Risk Area | Mitigation Strategy | Evidence Source | Residual Risk |
|-----------|---------------------|-----------------|---------------|
| **Training-Serving Skew** | Serialization of entire `Pipeline` object (imputation + scaling + classifier). | `predict.py:526`, `train_binary_v2_no_bp.py:1084` | Low: Manual sync required for cross-language field names. |
| **Clustering Stability** | Systematic K-selection (K=2-6) with silhouette and elbow analysis. | `clustering.py:45-64`, `k_optimization.png` | Medium: K=4 chosen for clinical alignment despite K=2-3 data optimum. |
| **Explanation Fidelity** | SHAP values computed on the exact standardized feature space used by the model. | `server.py:410`, `explainability.py:273` | Low: Minimal semantic gap between scaled computation and raw display. |
| **Biomarker Leakage** | Exclusion of diagnostic markers (HbA1c, FBS) from the primary screening model. | `train_binary_v2_no_bp.py:67-72` | Very Low: Features are limited to anthropometric and metabolic biomarkers. |

---

## 3. Evidence Index (Key Artifacts)

### 3.1 Subtype Clustering (Ahlqvist-Inspired)
- **K-Optimization:** Silhouette analysis across K=2-6 demonstrated in `k_optimization.png`. While K=4 is the literature standard, we transparently report the data-driven optimum (typically K=2-3).
- **Proxy Validation:** SIRD identified via LAP score `(WC-58)*TG`, a validated insulin resistance proxy for women (Wang et al. 2024).
- **Transparency:** The absence of HOMA2-B/C-peptide is explicitly acknowledged as a limitation in `clustering.py:72-77`.

### 3.2 Predictive Integrity
- **Nested CV:** Model performance (AUC/Recall) estimated via nested cross-validation to prevent hyperparameter overfitting (Vabalas et al. 2019).
- **Artifact Reuse:** Inference server loads `best_model.joblib` directly, ensuring 100% parity with training transformations.

### 3.3 Explainability (SHAP)
- **Fidelity:** SHAP values measure importance in the model's decision space (scaled), as required for mathematical correctness (Lundberg & Lee 2017).
- **Interpretability:** Raw clinical values (e.g., "BMI=28.5") are substituted in the UI display to maintain clinical relevance without compromising attribution accuracy.

---

## 4. Panel Q&A (Defense Preparation)

### Q1: "Why use K=4 clusters if silhouette analysis suggests K=2 or K=3 is the data-driven optimum?"
**Response:** "Our selection of K=4 is a theory-driven choice to align with the established Ahlqvist et al. (2018) diabetes subtype taxonomy (SIRD, SIDD, MOD, MARD). While we transparently report the silhouette-optimal K for the postmenopausal cohort in our documentation ([Evidence: `k_optimization.png`]), K=4 provides superior clinical interpretability and follows established research precedents in metabolic subtyping."

### Q2: "How can you defend the use of SIRD/SIDD labels without HOMA2-B or C-peptide data?"
**Response:** "We frame our subtyping as an 'Ahlqvist-inspired' pragmatic adaptation. To identify the Severe Insulin-Resistant (SIRD) phenotype, we use the Lipid Accumulation Product (LAP) formula, which has been validated as a reliable insulin resistance proxy in NHANES cohorts ([Evidence: Wang et al. 2024]). We explicitly document the absence of HOMA2 as a limitation in our methodology ([Evidence: `clustering.py:72-77`])."

### Q3: "If SHAP is computed on scaled features, aren't you misleading the clinician by showing raw values?"
**Response:** "No, we are preserving both mathematical fidelity and clinical utility. SHAP values *must* be computed on the feature space the model actually uses (standardized) to be accurate ([Evidence: Lundberg & Lee 2017]). We display the raw values merely as labels for interpretability. The UI includes a tooltip explaining that these bars show feature *contribution* to the risk, not raw magnitude ([Evidence: `SHAPExplanation.jsx:212`])."

---

## 5. Limitations & Future Work

While DIANA provides a robust defensible baseline, we acknowledge the following constraints:
1. **Assignment Stability:** Bootstrap Adjusted Rand Index (ARI) analysis for cluster stability was not performed in this version and is recommended for future validation.
2. **Longitudinal Validation:** Current models are trained on cross-sectional NHANES data; longitudinal outcome tracking would further strengthen risk calibration.
3. **Proxy Metrics:** The reliance on LAP/LDL as proxies for HOMA2 metrics is a pragmatic necessity of routine screening that warrants further calibration against gold-standard diagnostic data.

---

**Verdict Summary:**  
✅ **Clinically Aligned** — Subtypes follow established literature (Ahlqvist 2018).  
✅ **Technically Sound** — High parity and SHAP fidelity verified in code.  
✅ **Defense Ready** — Limitations are documented; evidence is cited; Q&A is prepared.
