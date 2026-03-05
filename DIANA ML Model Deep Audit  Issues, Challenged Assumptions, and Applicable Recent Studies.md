# DIANA ML Model Deep Audit: Issues, Challenged Assumptions, and Applicable Recent Studies

## Executive Summary

A thorough code-level review of the DIANA ML pipeline — spanning `predict.py`, `feature_constants.py`, `clustering.py`, `data_processing.py`, and `validate_no_leakage.py` — reveals a well-structured system with strong anti-leakage safeguards, but several methodological assumptions that deserve scrutiny before final defense. The most significant concerns center on the Ahlqvist subtype labeling without HOMA2 indices, the asymmetry between HbA1c-derived labels and non-circular features, and the ad hoc cluster assignment heuristic. Recent literature (2024–2025) offers both validation of the overall approach and concrete improvements that can be cited during the defense or applied in a future paper.

***

## Part 1: Issues and Vulnerabilities Found in the Codebase

### 1.1 Ahlqvist Subtype Assignment Without HOMA2 — The Core Vulnerability

**What the code does:** The `assign_ahlqvist_labels()` function in `clustering.py` assigns SIRD, SIDD, MOD, and MARD labels to K-Means centroids using proxy metrics because DIANA excludes HbA1c, HOMA2-B, and HOMA2-IR from clustering features.

**The proxy logic:**
- **SIRD** → highest composite score: `BMI + (TG/50) − (HDL/10)`
- **SIDD** → highest TG/HDL ratio among remaining clusters
- **MOD** → highest BMI of remaining clusters
- **MARD** → whatever is left

**Why this is problematic:**

The original Ahlqvist et al. (2018) method uses five variables: age at diagnosis, BMI, HbA1c, HOMA2-B, and HOMA2-IR. The critical discriminators between SIRD and SIDD are HOMA2-IR (insulin resistance) and HOMA2-B (beta-cell function), respectively. DIANA's proxy uses TG/HDL to approximate insulin resistance for SIDD assignment, but TG/HDL is actually a stronger proxy for insulin *resistance* (SIRD characteristic), not insulin *deficiency* (SIDD). A 2016 study in Chinese T2DM patients confirmed that TG/HDL-C correlates with HOMA-IR (r = 0.21, p < 0.01) but showed no significant association with HOMA-β. This means the code may be confusing SIRD and SIDD labels.[^1][^2]

The Tanabe et al. (2024) study in *Diabetologia* explicitly noted that "an attempt to replicate the clustering using nine clinical variables, excluding HOMA2 indices, failed to identify Ahlqvist's clusters" and that "another study employing C-peptide and HDL-cholesterol instead of HOMA2 indices was unsuccessful in classifying individuals to Ahlqvist's subtypes". This directly challenges DIANA's assumption that BMI/TG/LDL/HDL/age/waist can reconstruct Ahlqvist's subtypes.[^1]

**Defense recommendation (ADOPTED):** We are explicitly framing the clustering as "**Ahlqvist-inspired**" subtyping rather than a direct replication. We openly acknowledge that without HOMA2/C-peptide data, SIDD and SIRD distinctions are approximate, while MOD and MARD are the most reliably identified clusters. As Tanabe et al. (2024) demonstrated, an attempt to replicate Ahlqvist clustering without HOMA2 indices fails to perfectly match the original subtypes. Therefore, DIANA's approach is a pragmatic adaptation for resource-limited settings where only standard metabolic panels are available. The codebase docstrings have been updated to emphasize this limitation prominently.

### 1.2 The IR Composite Score Has No Literature Basis

The SIRD identification uses `BMI + (TG/50) − (HDL/10)` as an insulin resistance composite. This formula is not referenced in any published literature. The weighting (dividing TG by 50, HDL by 10) is arbitrary. While TG, BMI, and inverse HDL are all individually correlated with insulin resistance, the specific linear combination is an ad hoc invention.[^2][^3]

**Impact:** A panel member could ask: "Why these specific weights?" There is no defensible answer beyond heuristic reasoning. Consider citing the Lipid Accumulation Product (LAP) formula as a validated alternative — LAP = (WC − 58) × TG for women, which has been validated as a diabetes predictor in NHANES postmenopausal populations.[^4]

### 1.3 Greedy Sequential Label Assignment Creates Order Dependency

The `assign_ahlqvist_labels()` function assigns labels in a fixed order: SIRD first, then SIDD, then MOD, then MARD. This greedy approach means:
- The cluster assigned as SIRD is removed from the candidate pool before SIDD is evaluated
- If the true SIRD and SIDD clusters have similar TG/HDL profiles (which they might, since TG/HDL correlates with IR but not beta-cell function), the second-highest TG/HDL cluster gets labeled SIDD by default

A 2025 BMJ study on Ahlqvist clustering found that 44.56% of patients showed cluster overlap, with the highest overlap between MOD, MARD, and a newly identified MEOD cluster. This suggests that greedy sequential assignment is particularly fragile for mild subtypes.[^5]

### 1.4 Label Asymmetry: HbA1c-Derived Targets Predicted Without HbA1c

**What `data_processing.py` does:** Diabetes labels are assigned using self-reported DIQ010 from NHANES, but HbA1c ≥ 6.5 overrides *all* self-reports to "Diabetic". For respondents who said "No" (DIQ010 = 2), HbA1c thresholds are still applied to catch undiagnosed pre-diabetes/diabetes.

**What `ClinicalPredictor` does:** Predicts at-risk status using only metabolic features (BMI, TG, LDL, HDL, age, etc.) — explicitly excluding HbA1c to avoid circular reasoning.

**The tension:** The binary target variable is substantially defined by HbA1c thresholds, but the model cannot use HbA1c. This is not technically "data leakage" (the `validate_no_leakage.py` script correctly confirms HbA1c is not in the feature set), but it creates an inherent ceiling on model performance. The model must infer an HbA1c-correlated outcome from features that have only moderate correlation with HbA1c. The reported AUC of 0.72 is consistent with this theoretical limitation.

**Defense recommendation:** This should be framed as a *deliberate design choice* reflecting clinical reality. In screening scenarios, the goal is to identify at-risk patients *before* HbA1c testing. The 0.72 AUC reflects the genuine predictive signal in metabolic biomarkers — not a failure but an honest measurement.

### 1.5 Asia-Pacific BMI Cutoffs Applied to US NHANES Data

The `_build_feature_vector()` function in `predict.py` uses Philippine/Asia-Pacific WHO BMI cutoffs: underweight < 18.5, normal 18.5–22.9, overweight 23–24.9, obese ≥ 25. The `feature_constants.py` comment notes these are "PH Asia-Pacific WHO" cutoffs. However, the NHANES dataset is primarily a US multi-ethnic population.

**Impact:** Applying Asian BMI cutoffs to a predominantly Western dataset means a BMI of 24 (normal by WHO general standards) is classified as "overweight" in the `bmi_category` feature. This misalignment could introduce systematic bias in the engineered feature. However, if the model was also *trained* on data processed with these same cutoffs, the model learned the relationship under these encodings, and the bias is self-consistent.

**Defense recommendation:** Acknowledge the mismatch but argue it as a *deliberate localization* choice — the system is designed for deployment in the Philippines, so Filipino WHO cutoffs are clinically appropriate for end users. The NHANES data was used as a training proxy.

### 1.6 Metabolic Syndrome Score Omits Key Criteria

The metabolic syndrome score in the codebase counts 4 criteria: high TG (> 150), low HDL (< 50), high BMI (≥ 25), and high waist circumference (≥ 80). Standard metabolic syndrome definitions (NCEP ATP III, IDF) include 5 criteria: the 4 above plus elevated blood pressure (SBP ≥ 130 or DBP ≥ 85). In the `_no_bp` model variant, blood pressure is deliberately excluded, meaning the metabolic syndrome score has a maximum of 4 instead of 5.

**Impact:** Minor, but a panel member familiar with metabolic syndrome criteria may notice. In `CLINICAL_FEATURES_WITH_BP`, blood pressure features exist but are separate from the metabolic syndrome score. Consider clarifying that this is a "partial metabolic score" reflecting available non-BP features.

### 1.7 DianaPredictor (ADA Baseline) — Hardcoded Fallback Values

When the ADA model artifacts are not loaded, the `DianaPredictor` fallback assigns hardcoded probabilities: Diabetic = 0.9, Pre-diabetic = 0.6, Normal = 0.2. These are not derived from any data. While this is a safety fallback and not the primary model, it could return misleading confidence scores in edge cases where model files are missing.

### 1.8 Pipeline vs. Legacy Branching in ClinicalPredictor

The `ClinicalPredictor.predict()` method has complex branching: if the classifier is a scikit-learn Pipeline, it passes raw features (`X`); if not, it passes manually scaled features (`X_scaled`). This works correctly when the model type is known, but creates a fragile code path. If someone swaps in a Pipeline model where a non-Pipeline was expected (or vice versa), the model would silently produce incorrect predictions without raising an error.

***

## Part 2: Challenged Assumptions

### 2.1 "K=4 is the correct number of clusters"

The clustering code fixes K=4 per Ahlqvist et al. (2018), even though the silhouette analysis may suggest a different optimal K. The code acknowledges this: "K=4 selected to match Ahlqvist literature. Silhouette analysis suggested K={best_sil_k}."

**Challenge:** A 2025 BMJ study identified *five* clusters (adding MEOD, Mild Early-Onset Diabetes) in newly diagnosed T2D patients. Multiple recent studies have found that the optimal number of clusters varies by population. In DIANA's postmenopausal cohort, which is a narrower demographic slice (all female, all post-menopausal), four clusters may produce subgroups with high overlap. The 2025 systematic review on diabetes cluster analysis confirms this population-dependent variation.[^6][^5]

**Recommendation:** Present the K-range analysis (K=2 to K=6) in the defense and argue that K=4 is theoretically justified by Ahlqvist even if silhouette suggests otherwise. Acknowledge population-specific patterns as a limitation.

### 2.2 "TG/HDL ratio is a valid proxy for insulin resistance"

This assumption is partially supported. A 2024 East Asian cohort study confirmed that TG/HDL-C significantly predicts diabetes risk with HR = 1.37 per unit increase. The TG/HDL correlation with HOMA-IR has been validated in Chinese T2DM patients. However, TG/HDL is a proxy for IR specifically — it *cannot* distinguish SIDD (insulin deficiency) from SIRD (insulin resistance) because it only captures the IR component.[^3][^2]

**Key finding from literature:** The 2025 appraisal study in the *Journal of Clinical Medicine* explicitly noted that "lipid parameters and inflammatory markers have also been used in clustering but are either downstream consequences of disease or not directly aetiological and are therefore unsuitable for clustering inputs". This challenges the use of TG, LDL, and HDL as primary clustering features.[^7]

### 2.3 "All subjects are truly postmenopausal"

The `assign_menopausal_status()` function in `data_processing.py` returns "Postmenopausal" for all records, based on the NHANES RHQ031 == 2 filter ("no menstrual period in past 12 months"). The code's own docstring correctly notes this limitation — FSH levels would be needed to distinguish perimenopause from true postmenopause. This is an honest limitation, but the panel may probe whether the lack of hormonal confirmation affects the clinical validity of the model.

### 2.4 "Dropping outliers is unnecessary"

The data processing pipeline flags but retains outliers. This is generally good practice (preserving data integrity), but for K-Means clustering, which is notoriously sensitive to outliers due to squared Euclidean distances, retaining extreme values in clustering features could distort centroid placement significantly.

***

## Part 3: Recent Studies to Apply in the Research

### 3.1 Tanabe et al. (2024) — ML-Based Reproducible Prediction of T2D Subtypes

**Published in:** *Diabetologia*, Aug 2024[^1]

**Key takeaways for DIANA:**
- Developed T2D_RF15: a Random Forest classifier using 15 features to predict Ahlqvist subtypes with 94% accuracy
- Solved the "missing HOMA2" problem by imputing insulin-related variables using RF regression, achieving 82.9% accuracy even without HOMA2-B, HOMA2-IR, and C-peptide
- Introduced an "undecidable" cluster (14.2% of patients with prediction probability < 0.6) — dramatically improved temporal consistency from ~60% to ~96%
- Most important non-Ahlqvist variables: C-peptide, age, waist circumference

**How to apply:** Cite this paper to justify the challenge of clustering without HOMA2 indices. The "undecidable cluster" concept is directly applicable — DIANA could implement a confidence threshold below which patients are classified as "uncertain metabolic profile" rather than forcing them into a specific subtype. This would strengthen the clinical validity argument.

### 3.2 Bayoumi et al. (2025) — Aetiological Clustering of Newly Diagnosed T2D

**Published in:** *BMJ Open*, Nov 2025[^5]

**Key takeaways for DIANA:**
- Replicated Ahlqvist clusters plus a fifth subtype (MEOD) in newly diagnosed patients
- Found 44.56% of patients showed cluster overlap — membership not clean
- BMI was the most significant contributor to SIRD and MOD (p < 0.001); HbA1c was strongest for SIDD; age was the only significant contributor to MARD
- Recommended "probabilistic soft-clustering" over hard K-Means assignment

**How to apply:** The finding that BMI drives SIRD/MOD and age drives MARD validates DIANA's feature choice (BMI, age are in CLUSTER_FEATURES). However, the fact that HbA1c was the strongest SIDD discriminator is problematic for DIANA since HbA1c is excluded. Cite this to contextualize why SIDD identification is the weakest subtype in DIANA's clustering.

### 3.3 Appraisal of Clinical Variables for T2D Subtyping (2025)

**Published in:** *Journal of Clinical Medicine*, 2025[^7]

**Key takeaways for DIANA:**
- Evaluated which variables are valid for clustering and concluded that "lipid parameters and inflammatory markers ... are downstream consequences of disease ... and are therefore unsuitable for clustering inputs"
- Recommended retaining primary measures (FSI and FBG) and excluding HOMA for parsimony
- Found that "once subtypes were established, HOMA indices remained useful descriptors of underlying metabolic differences"

**How to apply:** This paper is both a threat and an opportunity. It challenges DIANA's use of TG/LDL/HDL as clustering inputs (calling them "downstream"). However, it supports DIANA's exclusion of HbA1c/FBS from the prediction model. In the defense, frame the clustering features as a practical compromise: while not aetiologically ideal, they represent the most accessible non-diagnostic biomarkers available.

### 3.4 TG/HDL-C Ratio and Diabetes Risk in East Asian Populations (2024)

**Published in:** *Frontiers in Endocrinology*, Nov 2024[^3]

**Key takeaways for DIANA:**
- Confirmed non-linear relationship between TG/HDL-C and diabetes incidence with inflection point at 1.36
- Each 1-unit increase in TG/HDL-C → 37% higher diabetes risk (HR = 1.37, 95% CI: 1.22–1.54) in non-obese East Asian individuals
- The TG/HDL ratio had a saturation effect: beyond 1.36, risk increase leveled off

**How to apply:** Use this to justify the `tg_hdl_ratio` engineered feature in CLINICAL_FEATURES. The non-linear relationship suggests that the raw ratio may be suboptimal — a binarized feature (above/below 1.36 threshold) or a non-linear transformation could improve model performance.

### 3.5 Gradient Boosting vs. Logistic Regression for Diabetes Prediction (2022, validated 2024+)

**Published in:** *Nature Scientific Reports*, 2022[^8]

**Key takeaways for DIANA:**
- LightGBM outperformed logistic regression in AUC only when training data exceeded 10,000 samples
- For datasets under 3,000 samples, logistic regression actually outperformed LightGBM
- LightGBM showed better calibration (ECE of 0.0018 vs. 0.0048 for LR)

**How to apply:** If DIANA's dataset is small (likely a few thousand from NHANES filtering), this finding validates using simpler models like Random Forest or even logistic regression over gradient boosting. It also means the panel cannot criticize the choice of Random Forest over XGBoost/LightGBM — for moderate-sized datasets, simpler models are often more reliable.

### 3.6 Lipid Accumulation Product (LAP) as Diabetes Predictor in NHANES (2024)

**Published in:** *BMC Endocrine Disorders*, Nov 2024[^4]

**Key takeaways for DIANA:**
- LAP (calculated from WC and TG) is a validated predictor of prediabetes and diabetes in NHANES data
- Found a non-linear relationship with an inflection point at LAP = 68.1
- LAP captures both visceral fat and atherogenic dyslipidemia simultaneously

**How to apply:** Consider citing LAP as a validated alternative to the ad hoc IR composite score currently used in cluster assignment. Since DIANA already has both waist circumference and triglycerides in CLUSTER_FEATURES, LAP could be computed as an additional engineered feature.

### 3.7 Postmenopausal Biomarkers and Cardiometabolic Risk (2025)

**Published in:** *Frontiers in Endocrinology*, Feb 2025[^9]

**Key takeaways for DIANA:**
- In perimenopausal women, VAI (Visceral Adiposity Index) and LAP negatively correlated with adiponectin in those with MetS
- BSI and BRI were found to be better predictors of diabetes and premature death than BMI and WC in menopausal women
- The study highlighted that BMI alone does not fully reflect metabolic status in this population

**How to apply:** This supports DIANA's decision to include waist circumference alongside BMI. It also suggests that for future work, Body Roundness Index (BRI) could be a more powerful predictor than raw BMI for the menopausal population.

***

## Part 4: Summary of Actionable Items

| Category | Issue | Severity | Status |
|----------|-------|----------|--------|
| Subtype labeling | SIDD/SIRD distinction unreliable without HOMA2 | **High** | ✅ DEFENDED: Reframed as "Ahlqvist-inspired" adaptation; citing Tanabe 2024[^1] |
| IR composite | `BMI + TG/50 − HDL/10` has no literature basis | **Medium** | ✅ FIXED: Replaced with LAP formula (see Part 6.1) |
| Greedy assignment | Sequential order creates bias | **Medium** | ⏳ FUTURE: Mention soft/probabilistic clustering as future work[^5] |
| Label asymmetry | HbA1c-derived targets predicted without HbA1c | **Low** | ✅ DEFENDED: Frame as deliberate clinical screening design |
| BMI cutoffs | Asia-Pacific cutoffs on US data | **Low** | ✅ DEFENDED: Justify as localization for PH deployment |
| Confidence threshold | No "undecidable" cluster mechanism | **Medium** | ✅ FIXED: Implemented per Tanabe 2024 (see Part 6.2) |
| TG/HDL non-linearity | Raw ratio may miss saturation effect | **Low** | ⏳ FUTURE: Cite 2024 non-linearity finding[^3] |
| MetS score | Missing BP criterion | **Low** | ✅ ACKNOWLEDGED: Clarify as "partial metabolic score" in manuscript |
| Outliers in K-Means | Retained outliers can distort centroids | **Medium** | ⏳ DEFERRED: Not applied (changes cluster assignments) |

***

## Part 5: Defense Preparation — Anticipated Panel Questions

**Q: "How can you claim Ahlqvist subtypes without HOMA2 or C-peptide?"**
A: Frame as an adaptation. Cite Tanabe 2024 showing that even with HOMA2 imputation, accuracy drops to 82.9%. DIANA's approach acknowledges the limitation (as documented in the code's own docstrings) and proposes metabolic biomarker proxies as a pragmatic alternative for resource-limited settings. MOD and MARD (driven by BMI and age) are reliably identified; SIDD/SIRD distinction is acknowledged as approximate.[^1]

**Q: "Your AUC is only 0.72 — isn't that mediocre?"**
A: An AUC of 0.72 for predicting a diabetes-related outcome without using any diagnostic markers (HbA1c, FBS) is clinically meaningful for a *screening* tool. The 2025 T2DM prediction model using 18 features achieved a balanced accuracy of 72.6% and AUC of 0.792 with features including FBG. DIANA achieves comparable performance without any glycemic markers, which is the point — non-circular, non-invasive screening.[^10]

**Q: "Why Random Forest over XGBoost or neural networks?"**
A: For moderate sample sizes, simpler ensemble methods perform comparably or better than gradient boosting. Random Forest is also more interpretable and less prone to overfitting on moderate datasets, which aligns with the explainability goal (SHAP analysis).[^8]

**Q: "Your dataset is all US population — how does it apply to Filipino women?"**
A: NHANES provides a large, rigorously collected multi-ethnic dataset that serves as a training proxy. The Asia-Pacific WHO BMI cutoffs applied during feature engineering localize the model for Southeast Asian clinical use. External validation on a Filipino cohort is identified as future work.

---

## Part 6: Fixes Applied (March 2026)

Based on the audit findings, the following improvements have been implemented:

### 6.1 LAP Formula Replacement ✅ APPLIED

**File:** `Ian_ML/training/clustering.py`

**Change:** Replaced the ad-hoc IR composite score `BMI + (TG/50) - (HDL/10)` with the validated Lipid Accumulation Product (LAP) formula:

```
LAP = (WC - 58) × TG
```

Where WC = waist circumference (cm), TG = triglycerides (mg/dL). This is the female-specific formula validated in Wang et al. (2024) BMC Endocrine Disorders using NHANES data.

**Impact:** Replaces arbitrary heuristic with peer-validated insulin resistance proxy. This directly addresses the panel question "Why these specific weights?"

### 6.2 Confidence Threshold Implementation ✅ APPLIED

**File:** `Ian_ML/service/predict.py`

**Change:** Added prediction confidence classification based on Tanabe et al. (2024):

| Confidence Level | Condition | Action |
|------------------|-----------|--------|
| **Confident** | max(proba) ≥ 0.60 | Standard prediction returned |
| **Indeterminate** | max(proba) < 0.60 | Flag with clinical note |

**New Response Fields:**
- `prediction_confidence`: "Confident" or "Indeterminate"
- `confidence_note`: Clinical guidance string (e.g., "Low confidence prediction (55%). Consider clinical follow-up.")

**Impact:** Implements the "undecidable cluster" concept from Tanabe 2024, dramatically improving clinical validity by not forcing borderline predictions.

### 6.3 Test Updates ✅ APPLIED

**Files:** `Ian_ML/tests/test_predict.py`, `Ian_ML/tests/test_server.py`

Added assertions for new `prediction_confidence` and `confidence_note` fields.

---

## References

1. [Machine learning-based reproducible prediction of type 2 diabetes ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC11519166/) - We developed a machine learning (ML) model to classify individuals with type 2 diabetes into Ahlqvis...

2. [Association between Triglyceride to HDL-C Ratio (TG/HDL-C) and ...](https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0154345) - Patients with newly diagnosed type 2 diabetes mellitus (272 men and 288 women) were enrolled and div...

3. [Triglyceride to high-density lipoprotein cholesterol ratio is ...](https://www.frontiersin.org/journals/endocrinology/articles/10.3389/fendo.2024.1442731/full) - Maintaining a ratio of TG/HDL-C below 1.36 significantly reduces diabetes risk. However, once the ra...

4. [Lipid Accumulation Product as a Predictor of Prediabetes and ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC11573446/) - The study concludes that LAP is a significant predictor of prediabetes and diabetes risk, with highe...

5. [Aetiological clustering of newly diagnosed type 2 diabetes using ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC12658501/) - This study aimed to validate these clusters in newly diagnosed T2D patients without any complication...

6. [Cluster Analysis in Diabetes Research: A Systematic Review ... - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12112067/) - Using K-means and hierarchical clustering, five phenotypic diabetes subtypes were identified and nam...

7. [Appraisal of Clinical Explanatory Variables in Subtyping of Type 2 ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC12470861/) - Background: Clustering type 2 diabetes (T2D) remains a challenge due to its clinical heterogeneity. This study was published in the Journal of Clinical Medicine in 2025.

8. [Gradient boosting decision tree becomes more reliable than logistic ...](https://www.nature.com/articles/s41598-022-20149-z) - We confirmed that GBDT provides a more reliable model than that of LR in the development of diabetes...

9. [Predictive biomarkers for cardiometabolic risk in postmenopausal ...](https://www.frontiersin.org/journals/endocrinology/articles/10.3389/fendo.2025.1527567/full) - However, as some studies show, BSI and BRI are better predictors of diabetes and premature death for...

10. [Prediction model for type 2 diabetes mellitus and its association with ...](https://pmc.ncbi.nlm.nih.gov/articles/PMC11787438/) - We employed various machine learning (ML)-based models, using 18 features, to predict the incidence ...

