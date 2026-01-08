# DIANA ML Methodology Rationale

A thesis-defense-ready document explaining the scientific reasoning behind every major ML decision.

---

## 0. Population Inclusion: Postmenopausal Women Only

### The Decision
Focus on **postmenopausal women** (12+ months without menstruation) and **exclude perimenopausal women** from the study cohort.

### Rationale

| Factor | Justification |
|--------|---------------|
| **Operational Definition** | NHANES RHQ031=2 provides clear binary classification (menstruated in past 12 months: Yes/No) |
| **Perimenopause Identification** | STRAW+10 staging requires longitudinal FSH measurements and cycle tracking—unavailable in cross-sectional NHANES |
| **Misclassification Risk** | Using age (45-51) as perimenopause proxy would mix early/late perimenopause with pathological amenorrhea |
| **Cohort Homogeneity** | Well-defined postmenopausal cohort reduces noise in ML model training |
| **Reproducibility** | Clear NHANES variable (RHQ031=2) enables study replication |

### Why Not Include Perimenopause By Age?

The critique suggests the 45-60 age range "includes perimenopause." However:

1. **Our filter is RHQ031=2, not age alone** — A 48-year-old still menstruating is excluded
2. **Age ≠ menopausal stage** — Average menopause is 51, but ranges from 40-58
3. **No validated perimenopause variable in NHANES** — Survey lacks FSH levels and cycle pattern data

### STRAW+10 Staging Requirements (Why We Can't Identify Perimenopause)

The Stages of Reproductive Aging Workshop (STRAW+10) criteria require:

| Criterion | NHANES Availability |
|-----------|---------------------|
| FSH levels at multiple time points | ❌ Not collected |
| Menstrual cycle regularity tracking | ❌ Single yes/no question |
| AMH (Anti-Müllerian Hormone) | ❌ Not collected |
| Vasomotor symptom assessment | ⚠️ Limited questions |

Without these, any "perimenopausal" classification would be speculation.

### Addressing the "Early Detection" Concern

The critique asks: *"Does excluding perimenopause align with 'early' detection goals?"*

**Yes.** "Early detection" in DIANA refers to:
- Identifying **prediabetes** before progression to overt diabetes
- Detecting **metabolic dysfunction** before clinical symptoms
- Stratifying **risk clusters** for targeted intervention

Within our postmenopausal cohort, DIANA identifies women at the *early stages of metabolic dysfunction*, not early menopausal transition.

### Defense Script
> "We focused specifically on postmenopausal women rather than the broader menopausal transition for methodological reasons. The NHANES survey uses RHQ031 to identify women who have not menstruated for 12+ consecutive months—the clinical definition of postmenopause.
>
> Reliably identifying perimenopause requires longitudinal menstrual cycle tracking and serial FSH measurements per the STRAW+10 staging criteria, which are not available in cross-sectional NHANES data. Rather than introduce misclassification bias by using age as a proxy for perimenopausal status, we chose to define a homogeneous cohort with confirmed postmenopausal status.
>
> We acknowledge this as a limitation. Future studies with prospective cohorts could extend DIANA's methodology to include the perimenopausal transition phase."

### Panel Q&A Preparation

| Likely Question | Answer |
|-----------------|--------|
| "Why exclude perimenopause if that's when hormonal changes occur?" | "NHANES cannot reliably identify perimenopause. Including unverified women would introduce classification noise." |
| "Your 45-60 range includes perimenopausal ages" | "We filter by RHQ031=2 (postmenopausal), not age. A 48-year-old still menstruating is excluded." |
| "Doesn't this limit generalizability?" | "Yes, acknowledged as a limitation. However, a well-defined cohort is preferable to a noisy one for ML modeling." |
| "How would you extend to perimenopause?" | "Prospective study with STRAW+10 staging protocol, FSH measurements, and cycle tracking." |

### Literature Support
- Harlow et al. (2012) - STRAW+10 staging criteria
- Santoro et al. (2015) - Challenges in perimenopause classification
- Finkelstein et al. (2008) - Bone, SWAN study on menopausal transition biomarkers

---

## 1. Feature Selection: Mutual Information

### The Decision
Use **sklearn's `mutual_info_classif()`** rather than manual discretization with Information Gain.

### Rationale
| Aspect | Mutual Information | Manual IG with Bins |
|--------|-------------------|---------------------|
| **Handles continuous data** | ✅ Native k-NN estimator | ❌ Requires discretization |
| **Information loss** | None | Loses precision at bin boundaries |
| **Arbitrary decisions** | None | Must justify bin counts and edges |
| **Mathematical equivalence** | Equals IG for discrete variables | Limited to discrete |
| **Reproducibility** | Deterministic with random_state | Depends on binning scheme |

### Defense Script
> "Mutual Information measures the reduction in uncertainty about the target variable given knowledge of the feature. For continuous biomarkers, sklearn's implementation uses a k-nearest neighbors approach to estimate MI without discretization, avoiding the information loss inherent in binning. This is mathematically equivalent to Information Gain for discrete variables, and extends naturally to continuous data."

### Literature Support
- Kraskov et al. (2004) - k-NN estimator for MI
- Ross (2014) - MI for feature selection in healthcare

---

## 1b. Feature Exclusion: Total Cholesterol (TC)

### The Decision
**Exclude TC from predictive model features**, despite being collected as part of the lipid profile.

### Rationale

| Factor | Explanation |
|--------|-------------|
| **Mathematical Redundancy** | TC ≈ LDL + HDL + (TG/5) — derived from features already included |
| **Multicollinearity** | Adding TC would create near-perfect correlation with existing lipid features |
| **No Added Information** | TC provides no discriminative power beyond its constituent components |
| **Clinical Practice** | Clinicians assess LDL and HDL independently for actionable treatment decisions |

**The Friedewald Equation:**
```
TC = LDL + HDL + (TG/5)
```
This mathematical relationship means including TC alongside LDL, HDL, and TG introduces:
- Coefficient instability in Logistic Regression (ill-conditioned design matrix)
- Redundant splits in tree-based models (no information gain)
- Inflated variable importance scores (shared variance)

### Defense Script
> "Total Cholesterol (TC) was collected as part of the lipid profile but was excluded from the final predictive model. This decision was made because TC is mathematically derived from LDL, HDL, and triglycerides (TC ≈ LDL + HDL + TG/5), introducing multicollinearity without providing additional discriminative power. Retaining LDL and HDL as separate features aligns with clinical practice, where these components are assessed independently to guide diabetes risk stratification and treatment decisions."

### Literature Support
- Friedewald et al. (1972) - Original TC estimation formula
- NCEP ATP III Guidelines - Separate LDL/HDL targets for CVD risk
- Dormann et al. (2013) - Collinearity in ecological models (principles apply)

---

## 2. Imputation: Median Strategy

### The Decision
Use **median imputation** for missing biomarker values.

### Rationale
| Strategy | Pros | Cons |
|----------|------|------|
| **Median** ✅ | Robust to outliers, preserves distribution shape | Slightly reduces variance |
| Mean | Simple | Pulled by extreme values (problematic for TG, FBS) |
| KNN Imputation | Uses feature relationships | More complex to justify |
| Drop rows | No assumptions | Loses data, may bias sample |

**Why median for clinical biomarkers:**
- Triglycerides, FBS, and HbA1c often have right-skewed distributions
- A diabetic patient with very high FBS (300+ mg/dL) would artificially inflate mean imputation
- Median is the 50th percentile, unaffected by extreme values

### Defense Script
> "I chose median imputation because clinical biomarkers frequently exhibit right-skewed distributions. For example, fasting blood sugar values can range from 70 mg/dL to over 300 mg/dL, with diabetic patients clustering at the high end. Mean imputation would be biased by these extreme values, while median imputation is robust to outliers and better represents the central tendency of each feature."

---

## 3. Feature Scaling: StandardScaler (Z-score)

### The Decision
Apply **z-score standardization** (mean=0, std=1) to all features.

### Rationale

| Model | Needs Scaling? | Why |
|-------|----------------|-----|
| **Logistic Regression** | ✅ Yes | Regularization penalizes coefficient magnitudes |
| **Random Forest** | ❌ No | Tree splits are scale-invariant |
| **XGBoost** | ❌ No | Tree-based, uses split points |
| **K-Means** | ✅ Yes | Euclidean distance dominated by large-range features |

**Critical for K-Means:**
- Age ranges 45-60 (15-unit span)
- Triglycerides range 50-400 (350-unit span)
- Without scaling, TG would dominate cluster formation

### Implementation Rule
```python
# CORRECT: Fit on train only, transform both
scaler.fit(X_train)
X_train_scaled = scaler.transform(X_train)
X_test_scaled = scaler.transform(X_test)

# WRONG: Fitting on full data causes data leakage
scaler.fit(X)  # Information from test set leaks into training
```

### Defense Script
> "StandardScaler transforms features to zero mean and unit variance. This is essential for K-Means clustering, which uses Euclidean distance—without scaling, features with larger ranges like triglycerides (50-400 mg/dL) would dominate over features like HbA1c (4-12%). For Logistic Regression, scaling ensures that L2 regularization penalizes coefficients fairly across features."

---

## 4. Class Imbalance: Balanced Class Weights

### The Decision
Use **`class_weight='balanced'`** in classifiers rather than resampling.

### Rationale

| Approach | Mechanism | Pros | Cons |
|----------|-----------|------|------|
| **Balanced weights** ✅ | Adjust loss function | No synthetic data, built-in | May reduce majority class accuracy |
| SMOTE | Generate synthetic minority samples | Increases minority representation | Creates artificial samples, harder to justify |
| Undersampling | Remove majority samples | Simple | Loses information |
| Oversampling | Duplicate minority samples | Simple | Can cause overfitting |

**Why balanced weights for clinical data:**
- Biomarkers have complex multivariate relationships
- Synthetic samples (SMOTE) may not represent realistic biomarker combinations
- `class_weight='balanced'` gives minority class (diabetics) higher penalty for misclassification

### Formula
```
weight[class] = n_samples / (n_classes × n_samples_in_class)
```

For a dataset with 800 Normal, 200 Pre-diabetic, 100 Diabetic:
- Normal weight: 1100 / (3 × 800) = 0.46
- Pre-diabetic weight: 1100 / (3 × 200) = 1.83
- Diabetic weight: 1100 / (3 × 100) = 3.67

### Defense Script
> "Rather than generating synthetic samples with SMOTE, I used balanced class weights which are mathematically equivalent to adjusting the decision threshold. This approach gives higher penalty to misclassifying rare diabetic cases without creating artificial biomarker combinations that may not exist in the real population."

---

## 5. Model Selection: LR, RF, XGBoost

### The Decision
Compare three models: **Logistic Regression, Random Forest, XGBoost**.

### Rationale

| Model | Complexity | Interpretability | Performance | Thesis Value |
|-------|------------|------------------|-------------|--------------|
| **Logistic Regression** | Low | High (coefficients = feature effects) | Baseline | Shows linear relationships |
| **Random Forest** | Medium | Moderate (feature importance) | Good | Captures non-linear patterns |
| **XGBoost** | High | Low (many trees) | State-of-art | Best tabular data performance |

**Why exactly three models:**
- Logistic Regression = interpretable baseline (can explain odds ratios)
- Random Forest = industry standard ensemble
- XGBoost = current best-practice for structured clinical data
- More models = more work with diminishing thesis value

**Why NOT neural networks:**
- Overkill for ~1,100 records and 7 features
- Requires extensive hyperparameter tuning
- Harder to explain to non-technical panel members
- XGBoost typically outperforms NNs on tabular data anyway

### Defense Script
> "I compared three progressively complex algorithms. Logistic Regression provides an interpretable baseline where coefficients represent log-odds ratios. Random Forest captures non-linear feature interactions through ensemble learning. XGBoost represents the current state-of-the-art for structured clinical data, consistently winning Kaggle competitions on tabular datasets. This progression from simple to complex allows us to determine if the added complexity is justified by improved performance."

---

## 6. Evaluation Metrics: AUC-ROC Primary, Recall Secondary

### The Decision
Prioritize **AUC-ROC ≥ 0.80** as primary metric, with **Recall** as clinical secondary.

### Rationale

| Metric | What It Measures | Clinical Importance |
|--------|------------------|---------------------|
| **AUC-ROC** | Discrimination across all thresholds | How well model separates classes |
| **Recall (Sensitivity)** | True positive rate | Catching actual diabetics |
| Precision | Positive predictive value | Reducing false alarms |
| F1-Score | Harmonic mean of precision/recall | Balanced measure |
| Accuracy | Overall correctness | Misleading with imbalanced classes |

**Why Recall matters clinically:**
- Missing a diabetic patient (false negative) → delayed treatment → complications
- False alarm (false positive) → additional testing → inconvenience, not harm
- Clinical cost of FN > clinical cost of FP

**Why AUC ≥ 0.80:**
- 0.50 = random guessing
- 0.70 = acceptable discrimination
- 0.80 = good discrimination (standard clinical threshold)
- 0.90+ = excellent (rare in non-imaging clinical ML)

### Defense Script
> "I prioritized AUC-ROC because it measures the model's ability to discriminate between classes across all possible decision thresholds. The target of 0.80 is the standard threshold for 'good discrimination' in clinical literature. I also tracked Recall (sensitivity) because in diabetes screening, missing an actual diabetic patient poses greater clinical risk than a false positive, which simply leads to additional confirmatory testing."

---

## 7. Clustering: K=4 (Recommended) with K=3 Comparison

### My Recommendation: **Use K=4 with SIRD/SIDD/MOD/MARD labels**

### Rationale

| Factor | K=3 | K=4 |
|--------|-----|-----|
| **Literature alignment** | ❌ Novel | ✅ Matches Ahlqvist et al. (2018) |
| **Panel questions** | "Why deviate from literature?" | "Following established framework" |
| **Clinical interpretability** | Generic (Low/Mod/High) | Specific treatment implications |
| **Defense complexity** | Must justify deviation | Standard reference |

### Why K=4 Despite Possibly Lower Silhouette
1. **Literature backing**: Ahlqvist et al. (2018) in Lancet Diabetes & Endocrinology identified 4 subtypes in 8,980 Swedish patients
2. **Clinical utility**: Each subtype has treatment implications:
   - **SIRD** → insulin sensitizers (metformin)
   - **SIDD** → may need early insulin
   - **MOD** → weight management focus
   - **MARD** → conservative management
3. **Panel expectation**: Your proposal references 4 subtypes
4. **Silhouette difference is usually small**: Moving from K=3 to K=4 typically drops silhouette by 0.02-0.05, which is acceptable

### Presenting Both (Best Approach)
```
Present K=2 through K=6 analysis:
- Show elbow method (where WCSS curve bends)
- Show silhouette scores for each K
- Document that silhouette suggests K=3
- Explain that you use K=4 to match clinical literature
- Discuss this as a finding: "Menopausal population may have less distinct subclusters"
```

### Defense Script
> "The Ahlqvist et al. (2018) study identified four T2DM subtypes in a Swedish cohort. While our silhouette analysis suggested K=3 may provide slightly better cluster separation, I chose K=4 to align with established clinical literature. This enables comparison with published research and provides clinically actionable subtype classifications. The slight difference in silhouette score (e.g., 0.35 vs 0.38) may reflect characteristics specific to our postmenopausal population, which is an interesting finding in itself."

---

## 8. Train-Test Split: 70/30 Stratified

### The Decision
Use **70% training / 30% testing** with **stratified sampling**.

### Rationale

| Split Ratio | Training Size | Testing Size | Thesis Appropriateness |
|-------------|---------------|--------------|------------------------|
| **70/30** ✅ | ~770 | ~330 | Standard for medium datasets |
| 80/20 | ~880 | ~220 | Better training, smaller test |
| 60/40 | ~660 | ~440 | More robust test estimate |

**Why stratified:**
- Preserves class proportions in both sets
- Prevents "unlucky" splits where test set has no diabetics
- Ensures evaluation is representative

**Current implementation is even better:**
Your `train.py` uses Leave-One-Cycle-Out validation (testing on one NHANES survey cycle, training on others). This is temporal validation and tests generalization to future data.

### Defense Script
> "I used a 70/30 stratified split, which is standard for datasets of approximately 1,100 records. Stratification ensures both training and test sets maintain the same class distribution as the original data. Additionally, I employed Leave-One-Cycle-Out validation using NHANES survey cycles (2009-2010 through 2017-2018), which tests whether models generalize to future time periods—a stronger validation than random splitting."

---

## 9. Cross-Validation: 5-Fold Stratified

### The Decision
Use **5-fold stratified cross-validation** within the training set.

### Rationale

| K | Computation | Variance | Bias |
|---|-------------|----------|------|
| 3-fold | Fast | High | Low |
| **5-fold** ✅ | Moderate | Moderate | Moderate |
| 10-fold | Slow | Low | Higher |
| LOOCV | Very slow | Lowest | Highest |

**Why 5-fold:**
- Good balance of computational cost and estimate stability
- Standard in ML literature (Kohavi, 1995)
- With ~770 training samples, each fold has ~154 samples (sufficient)

### Defense Script
> "I used 5-fold stratified cross-validation, which is the standard approach in machine learning literature. This provides five different train/validation splits, giving a more robust estimate of model performance than a single split. Stratification ensures each fold maintains the original class distribution."

---

## 10. Clinical vs ADA Model Distinction

### The Critical Distinction

| Model | Features | Expected AUC | Purpose |
|-------|----------|--------------|---------|
| **ADA Predictor** | HbA1c, FBS + all others | ~1.0 | Validate implementation |
| **Clinical Predictor** | BMI, TG, LDL, HDL, Age | 0.70-0.80 | Realistic screening |

### Why ADA Model Has Perfect AUC
- HbA1c is both a feature AND defines the target label (per ADA guidelines)
- The model "learns" the threshold: HbA1c ≥ 6.5% = Diabetic
- This is expected and validates correct implementation

### Why Clinical Model Is The Real Thesis Contribution
- Excludes HbA1c and FBS (the diagnostic tests)
- Predicts diabetes risk from metabolic profile before lab testing
- AUC 0.70-0.80 is realistic and clinically useful

### Defense Script
> "We maintain two model types. The ADA Predictor includes HbA1c and achieves near-perfect AUC because HbA1c thresholds directly define diabetes status per ADA guidelines—this validates our implementation. The Clinical Predictor excludes diagnostic biomarkers (HbA1c, FBS) and predicts risk from the metabolic profile alone, achieving a realistic AUC of approximately 0.75. This model provides actual clinical value for screening patients who haven't yet received glucose-specific testing."

---

## Quick Reference: Panel Q&A

| Likely Question | One-Line Answer |
|-----------------|-----------------|
| "Why Mutual Information?" | "Handles continuous features without arbitrary binning" |
| "Why median imputation?" | "Robust to outliers in skewed clinical distributions" |
| "Why balanced weights?" | "Penalizes missing diabetics without synthetic samples" |
| "Why these three models?" | "Progression from interpretable baseline to state-of-art" |
| "Why AUC threshold 0.80?" | "Standard clinical threshold for good discrimination" |
| "Why K=4 clusters?" | "Matches Ahlqvist et al. T2DM subtype classification" |
| "Why is ADA model perfect?" | "HbA1c defines both feature and label—validates implementation" |
| "What's the real contribution?" | "Clinical Predictor screens without glucose testing at 0.75 AUC" |
