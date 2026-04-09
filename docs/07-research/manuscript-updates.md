# Manuscript Updates: ML & Discussion (UPDATED - ALIGNED)

## Chapter 4: Results

### 4.2 Model Performance
"Models were trained with a **nested Leave-One-Group-Out (NHANES cycle) validation**: outer LOGO for unbiased generalization, and inner GroupKFold for tuning. Class imbalance was handled using **`class_weight='balanced'`** to avoid synthetic biomarker combinations.

Two algorithms were evaluated for the screening model: **Logistic Regression** and **Random Forest**, both trained on the **13-feature non-circular contract** (excluding HbA1c/FBS). The screening task is **binary** (Normal vs At‑Risk), combining pre‑diabetic and diabetic cases into a single risk class.

**Binary Screening Results (AUC‑ROC):**
- **Logistic Regression**: **0.727** (best, selected)
- **Random Forest**: ~0.714 (close but not superior)

The selected **Logistic Regression** model (binary_v2_no_bp) achieved:
- **AUC‑ROC**: **0.727**
- **Accuracy**: **0.673**
- **Sensitivity (Recall)**: **0.711**
- **F1‑Score**: **0.699**
- **Decision Threshold**: **0.478** (At‑Risk)

This aligns with DIANA’s goal as a **screening** tool: prioritize sensitivity and interpretability while avoiding circular features (HbA1c/FBS) that define labels." 

### 4.3 Subtype Clustering
"**Weighted K-Means clustering (k=4)** was applied to the at-risk subset (n=734), identifying four phenotypic subgroups aligning with the Ahlqvist et al. (2018) T2DM subtypes. The clustering uses an expert-elicited weighted Euclidean distance metric rather than equal-feature weighting. Feature weights were elicited through single-expert clinical consultation to prioritize biomarkers with stronger pathophysiological relevance to insulin resistance and metabolic dysfunction.

**Expert-Specified Feature Weights (Single-Expert):**
- `triglycerides`: 2.0 (lipid dysregulation marker)
- `ldl`: 2.5 (atherogenic risk - highest weight)
- `hdl`: 1.2 (protective lipid factor)
- `bmi`: 1.5 (obesity driver)
- `waist_circumference`: 2.0 (visceral adiposity proxy)
- `age`: 1.0 (baseline weight)

**Weighted Distance Computation:** Distance is computed post-standardization as: `d(x, c) = sqrt(sum(w_j * (x_j - c_j)^2))` for each sample x and centroid c, where w_j is the expert-specified weight for feature j. This preserves the mathematical properties of K-Means while incorporating domain-informed feature importance.

**Expert Elicitation Limitation:** The weight configuration represents single-expert elicitation, not multi-specialist consensus or clinical validation. This is a methodological limitation acknowledged openly—weights reflect one specialist's clinical judgment rather than empirically validated importance.

| Subtype | n (% | Mean HbA1c | Mean FBS | Mean BMI | Mean TG | Mean HDL |
|---------|-------|------------|----------|----------|---------|----------|
| **SIDD-like** | 97 (7.1%) | **9.24%** | **223.78** | 34.81 | 192.91 | 48.31 |
| **SIRD-like** | 404 (29.4%) | 5.93% | 109.63 | **38.28** | 114.68 | 51.84 |
| **MOD-like** | 370 (26.9%) | 5.80% | 104.56 | 29.58 | **176.37** | 50.24 |
| **MARD-like** | 505 (36.7%) | 5.51% | 97.91 | 25.74 | 80.36 | **72.98** |

**Note on '-like' Suffix:** DIANA-generated outward-facing subtype semantics use the \"SIRD-like / SIDD-like / MOD-like / MARD-like\" framing to emphasize heuristic proxy status rather than validated subtype diagnosis. These are screening stratification tools for identifying dominant metabolic patterns within at-risk populations, not definitive treatment prescriptions.

**Note on SIRD/MOD BMI values**: While the original Ahlqvist cohort found MOD to have the highest BMI, our menopausal population shows SIRD with the highest BMI (38.28 vs 29.58). This is explained by the compounding effects of severe insulin resistance and postmenopausal metabolic changes. The SIRD-like label was assigned based on ranking the highest composite metabolic risk score (TG/HDL ratio, low HDL) in inverse-transformed raw clinical units, not BMI alone."

## Chapter 5: Discussion

### 5.1 Defense of Model Performance (AUC ~0.72)
"**Why AUC ~0.72 is acceptable for a non‑circular screening tool:**

1. **Non-circular prediction is inherently harder**: By excluding HbA1c and FBS (which define the target variable), we are predicting diabetes risk from *surrogate markers only*. This is a clinically meaningful but challenging task.

2. **Comparable to established tools**: The CDC Prediabetes Risk Test achieves AUC 0.72‑0.79, but it includes age, family history, and gestational diabetes history—factors not uniformly available in our NHANES subset. Our AUC of ~0.72 using biomarkers, lipids, BMI, and demographics is within the expected range for surrogate‑only screening.

3. **Focused model comparison**: Logistic Regression and Random Forest were evaluated for the binary screening objective. Logistic Regression achieved the best AUC while remaining clinically interpretable, suggesting we are near the ceiling of what can be predicted from non‑circular features.

4. **Screening vs. Diagnosis**: DIANA is a *negative screening tool*, designed to identify low-risk individuals who can be deprioritized for costly HbA1c testing. High NPV (Negative Predictive Value) is more relevant than raw AUC for this use case.

5. **Biological limits**: Lipid profiles and BMI measure *insulin resistance*, not *insulin deficiency*. The SIDD subtype is inherently harder to predict without glucose markers, which explains the ceiling on predictive performance."

### 5.2 Strengths
"By avoiding circular features (HbA1c, FBS), this study provides a realistic assessment of phenotypic risk factors, rather than simply learning to read a blood glucose threshold. The comparison of Logistic Regression and Random Forest keeps the methodology defensible and interpretable, with Logistic Regression selected based on empirical performance. The 13‑feature contract (ratios, categories, demographics) maximizes predictive signal while preserving clinical explainability."
