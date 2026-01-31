# DIANA Paper Requirements - Complete Reference

## Project Overview

**DIANA** = Diabetes Intelligent Analysis for Menopausal Women

A predictive **classification** model-based application that uses selected blood biomarkers to identify **cluster-based** Type 2 Diabetes risk in menopausal women, combining supervised classification with unsupervised clustering (K-Means).

> **Important Clarification**: The term "predictive" refers to classifying **current disease state** (undiagnosed T2DM/prediabetes), NOT forecasting future onset. DIANA is a **risk classification tool for current-state screening**.

---

## Target Population

| Criteria | Definition |
|----------|------------|
| **Cohort** | **Postmenopausal women only** |
| **Definition** | 12+ consecutive months without menstruation (NHANES RHQ031=2) |
| **Age Range** | 45-60 years |
| **Data Source** | NHANES (National Health and Nutrition Examination Survey) |
| **Exclusions** | Premenopausal and perimenopausal women |

> **Rationale for Postmenopausal Only**:
> 1. **Clear clinical definition**: 12+ months amenorrhea is objective and reproducible
> 2. **Stable hormonal state**: Estrogen decline is complete, making metabolic effects (insulin resistance) consistent
> 3. **Reduced confounding**: Perimenopausal women have fluctuating hormones that introduce variability
> 4. **Research precedent**: STRAW+10 staging uses postmenopause as benchmark endpoint

---

## Biomarkers / Features

### Blood Biomarkers (6 Required)
| Biomarker | Full Name | Unit | Normal | Pre-diabetic | Diabetic |
|-----------|-----------|------|--------|--------------|----------|
| **FBS** | Fasting Blood Sugar | mg/dL | <100 | 100-125 | ≥126 |
| **HbA1c** | Hemoglobin A1c | % | <5.7 | 5.7-6.4 | ≥6.5 |
| **TG** | Triglycerides | mg/dL | <150 | 150-199 | ≥200 |
| **LDL-C** | LDL Cholesterol | mg/dL | <100 | 100-159 | ≥160 |
| **HDL-C** | HDL Cholesterol | mg/dL | ≥60 | 40-59 | <40 |
| **TC** | Total Cholesterol | mg/dL | <200 | 200-239 | ≥240 |

> **Note on Clinical Model**: The clinical (non-circular) model **EXCLUDES HbA1c and FBS** since these are used to define the ground truth labels. This leaves: **BMI, TG, LDL, HDL, Age** as predictive features.

### Non-Blood Features (4 Required)
| Feature | Type | Description |
|---------|------|-------------|
| **Age** | Continuous (years) | 45-60 range |
| **BMI** | Continuous (kg/m²) | Calculated from height/weight |
| **Menopausal Status** | Categorical | All Postmenopausal in cohort |
| **Family History** | Binary (Yes/No) | First-degree relative with diabetes |

### Lifestyle Factors (Optional - if structured in records)
| Factor | Type | Description |
|--------|------|-------------|
| Smoking History | Binary | ≥100 cigarettes lifetime |
| Physical Activity | Binary | Activity in past 30 days |
| Hypertension | Binary | Diagnosed hypertension |
| Heart Disease | Binary | Coronary heart disease, angina, MI |

---

## Diabetes Classification (Ground Truth Labels - 3 Classes)

**Outcome Variable Y**: Glycemic Class Label derived from **HbA1c** (primary) and **FBS** (secondary) per ADA guidelines:

| Status | HbA1c | FBS | Label |
|--------|-------|-----|-------|
| **Non-Diabetic** | < 5.7% | < 100 mg/dL | 0 |
| **Pre-diabetic** | 5.7 - 6.4% | 100 - 125 mg/dL | 1 |
| **Diabetic** | ≥ 6.5% | ≥ 126 mg/dL | 2 |

> **Important**: This is a **3-class classification** problem, NOT binary.

---

## Machine Learning Requirements

### Feature Selection: Entropy & Information Gain

Before model training, compute Information Gain (IG) for each feature:

1. Compute overall entropy H(Y) of the class label
2. For each attribute Xⱼ, compute conditional entropy H(Y|Xⱼ)
3. Calculate IG(Y, Xⱼ) = H(Y) − H(Y|Xⱼ)
4. Rank attributes from highest to lowest IG
5. Use top-ranking attributes as core feature set

### Model Architecture

| Aspect | Details |
|--------|---------|
| **Features (Clinical Model)** | BMI, Triglycerides, LDL, HDL, Age (excludes HbA1c/FBS) |
| **Target** | Glycemic status (**3-class**: Non-Diabetic / Pre-diabetic / Diabetic) |
| **Algorithms** | Logistic Regression, Random Forest, XGBoost (SVM optional) |

### AUC Performance Targets

| Model Type | AUC Target | Notes |
|------------|------------|-------|
| **ADA Model** (includes HbA1c/FBS) | ~1.0 | Validates implementation correctness |
| **Clinical Model** (excludes HbA1c/FBS) | ≥ 0.70 | Acceptable for screening (justifiable lower due to removed key biomarkers) |
| **Paper's Ideal** | ≥ 0.80 | Ideal threshold for clinical applications |

> **Note**: The clinical model's AUC is expected to be lower because HbA1c and FBS (the biomarkers used to *define* diabetes) are deliberately excluded to avoid circular reasoning. An AUC of 0.67-0.75 is acceptable and comparable to CDC risk assessment tools.

### Data Splitting
| Split | Percentage | Purpose |
|-------|------------|---------|
| Training Set | 70% | Model training with k-fold CV |
| Test Set | 30% | Held-out for final evaluation |
| Cross-Validation | 5-fold | Hyperparameter tuning within training set |

### Algorithms Required
| Model | Library | Purpose |
|-------|---------|---------|
| Logistic Regression | sklearn | Interpretable baseline, probability outputs |
| Random Forest | sklearn | Nonlinear relationships, feature importance |
| XGBoost | xgboost | Strong performance on structured data |

### Performance Metrics
| Metric | Description |
|--------|-------------|
| **Accuracy** | Overall correct predictions |
| **Precision** | Correctly identified at-risk among predicted positive |
| **Recall (Sensitivity)** | Detected all actual positive cases (clinical priority) |
| **F1-Score** | Harmonic mean of precision and recall |
| **AUC-ROC** | Discrimination ability across thresholds |
| **Classification Error Rate** | 1 - Accuracy |

### Best Model Selection Criteria
1. **Primary**: AUC-ROC score
2. **Secondary**: F1-Score
3. **Tertiary**: Clinical interpretability and computational efficiency

---

## K-Means Clustering (Unsupervised)

**Purpose**: Classify patients into diabetes subtype risk clusters based on Ahlqvist et al. (2018) classification

| Parameter | Value |
|-----------|-------|
| Algorithm | K-Means |
| Features | All biomarkers (standardized) |
| K | 4 clusters (fixed based on clinical evidence) |
| Distance Metric | Euclidean |
| Validation | Elbow method + Silhouette score |

### Cluster Labels (per Paper Table 4)
| Cluster | Full Name | Defining Features |
|---------|-----------|-------------------|
| **SOIRD** | Severe Obesity-Related and Insulin-Resistant Diabetes | Highest BMI, highest HOMA-β, highest HOMA-IR; moderate HbA1c; youngest age |
| **SIDD** | Severe Insulin-Deficient Diabetes | Highest HbA1c, lowest HOMA-β; relatively high HOMA-IR; moderate BMI and age |
| **MARD** | Mild Age-Associated Diabetes Mellitus | Oldest age at diagnosis; moderate BMI and HbA1c; moderate insulin release/resistance |
| **MIDD** | Mild Insulin-Deficient Diabetes | Lowest BMI, HbA1c, HOMA-IR; moderate age and HOMA-β |

> **Note**: Final cluster labels will be validated by licensed physicians/endocrinologists.

---

## Output Files

| File | Format | Contents |
|------|--------|----------|
| `model_comparison.csv` | CSV | All models, all metrics |
| `information_gain_results.json` | JSON | IG scores, entropy, ranking |
| `cluster_analysis.json` | JSON | Cluster centers, sizes, profiles |
| `best_model_report.json` | JSON | Selected model + justification |

---

## Visualizations Required

| # | Visualization | Purpose |
|---|---------------|---------|
| 1 | K-optimization (elbow/silhouette) | Show optimal K selection |
| 2 | Feature importance chart | RF weights + IG scores |
| 3 | Information Gain bar chart | IG scores per feature |
| 4 | ROC curve | Best model performance |
| 5 | Confusion matrix | TP/TN/FP/FN per class |
| 6 | Cluster heatmap | Cluster centroid values |
| 7 | Cluster scatter (PCA) | Patient groupings |
| 8 | Cluster distribution | Cluster sizes |
| 9 | BMI vs Glucose correlation | Risk associations |

---

## Model Files

| File | Format |
|------|--------|
| `scaler.joblib` | StandardScaler |
| `logistic_regression.joblib` | LR model |
| `random_forest.joblib` | RF model |
| `xgboost.joblib` | XGB model |
| `kmeans_model.joblib` | K-Means |
| `best_model.joblib` | Copy of best |

---

## Web Application Features (DIANA)

### Dashboard Tab
- Total registered patients count
- Recent additions summary
- Graphical representations of collective biomarker levels
- Trend detection for diabetes risk prevalence

### Patient History Tab
- Systematic patient records archive
- Detailed profile view with historical biomarker readings
- Line graph overlay of previous vs current assessments
- Risk probability score (0-100%)
- Risk category: Low (0-33%) / Moderate (34-66%) / High (67-100%)

### Analytics Tab
- Risk factor importance chart (IG-based)
- BMI vs Glucose correlation plot
- Cluster analysis visualizations
- Interactive data exploration

### Export Tab
- Export participant data (CSV/Excel)
- Export analytics report (formatted summary)
- Filtered export by menopausal stage or risk level

---

## Implementation Details

### Dataset Source
- **Database**: NHANES (National Health and Nutrition Examination Survey)
- **Cycles**: 2009-2023 (multiple cycles merged)
- **Total Records**: 1,376 postmenopausal women
- **Age Range**: 45-60 years
- **Inclusion Criteria**: RHQ031=2 (12+ months without menstruation)

### Software Stack
| Component | Technology |
|-----------|------------|
| ML Framework | Python 3.10+, scikit-learn, XGBoost |
| Backend | Go 1.21+, PostgreSQL |
| Frontend | React, Vite |
| ML Server | Flask (Python) |

### Software Methodology
- **Rapid Prototyping** with iterative stakeholder feedback
- **5 Phases**: Data Acquisition → Model Development → Web Integration → Technical Testing → Clinical Evaluation

---

## RAG Reference Index

| Topic | Document |
|-------|----------|
| Biomarkers | [biomarkers.md](biomarkers.md) |
| T2DM Subgroups | [diabetes_subgroups.md](diabetes_subgroups.md) |
| ML Algorithms | [ml_algorithms.md](ml_algorithms.md) |
| Feature Selection | [feature_selection.md](feature_selection.md) |
| Data Pipeline | [data_pipeline.md](data_pipeline.md) |
| Metrics | [metrics.md](metrics.md) |
| UI Requirements | [ui_requirements.md](ui_requirements.md) |
| Code Alignment | [codebase_alignment.md](codebase_alignment.md) |
