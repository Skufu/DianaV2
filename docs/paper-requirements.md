# DIANA Paper Requirements - Complete Reference

## Project Overview

**DIANA** = Diabetes Intelligent Analysis for Menopausal Women

A system to predict Type 2 Diabetes risk in postmenopausal women using machine learning, combining supervised classification with unsupervised clustering.

---

## Target Population

| Criteria | Definition |
|----------|------------|
| **Cohort** | Postmenopausal women only |
| **Definition** | 12+ consecutive months without menstruation (NHANES RHQ031=2) |
| **Age Range** | 45-60 years |
| **Exclusions** | Premenopausal and perimenopausal women |

> **Note:** Perimenopause was excluded due to NHANES classification limitations. 
> Reliable perimenopause staging per STRAW+10 requires longitudinal cycle data 
> not available in cross-sectional NHANES surveys.

---

## Biomarkers / Features

### Blood Biomarkers (Required)
| Biomarker | Full Name | Unit |
|-----------|-----------|------|
| FBS | Fasting Blood Sugar | mg/dL |
| HbA1c | Hemoglobin A1c | % |
| TC | Total Cholesterol | mg/dL |
| HDL-C | HDL Cholesterol | mg/dL |
| LDL-C | LDL Cholesterol | mg/dL |
| TG | Triglycerides | mg/dL |

### Non-Blood Features
| Feature | Type |
|---------|------|
| Age | Numerical (years) |
| BMI | Numerical (kg/m²) - calculated from height/weight |
| Menopausal Status | Cohort descriptor (all Postmenopausal) |

---

## Diabetes Classification (Ground Truth Labels)

Based on **HbA1c** (per ADA guidelines):

| Status | HbA1c | FBS (secondary) |
|--------|-------|-----------------|
| **Normal** | < 5.7% | < 100 mg/dL |
| **Pre-diabetic** | 5.7 - 6.4% | 100 - 125 mg/dL |
| **Diabetic** | ≥ 6.5% | ≥ 126 mg/dL |

> **Note**: HbA1c is the PRIMARY classifier per ADA guidelines.

---

## Machine Learning Requirements

### Model Architecture

| Aspect | Details |
|--------|---------|
| **Features** | All 7 biomarkers: HbA1c, FBS, BMI, Triglycerides, LDL, HDL, Age |
| **Target** | Diabetes status (3-class: Normal/Pre-diabetic/Diabetic) |
| **Algorithms** | Logistic Regression, Random Forest, XGBoost |
| **Expected Performance** | AUC ~1.0 (model correctly applies ADA diagnostic criteria) |

> **Why 100% accuracy?** The model includes HbA1c as a feature, and diabetes 
> labels are defined by HbA1c thresholds per ADA guidelines. This perfect 
> alignment validates the implementation correctly applies clinical criteria.

### Algorithms Required
| Model | Library | Key Parameters |
|-------|---------|----------------|
| Logistic Regression | sklearn | max_iter=1000, solver='lbfgs' |
| Random Forest | sklearn | n_estimators=100, max_depth=10 |
| XGBoost | xgboost | n_estimators=100, max_depth=5 |

### Data Splitting
- **Train/Test Split**: 70% / 30% (stratified by diabetes_status)
- **Cross-validation**: K-fold within training set (K=5)

### Performance Metrics
| Metric | Target |
|--------|--------|
| Accuracy | Report value |
| Precision | Report value |
| Recall | Report value |
| F1-Score | Report value |
| AUC-ROC | > 0.95 |
| Cross-validation score | Report value |

### Best Model Selection
1. Compare Logistic Regression, Random Forest, XGBoost
2. Select best based on AUC-ROC (primary) + F1-Score (secondary)
3. Generate confusion matrix and ROC curve for best model
4. Document justification in `best_model_report.json`

---

## Feature Selection (Information Gain)

| Task | Output |
|------|--------|
| Calculate dataset entropy | Single value |
| Calculate IG for each feature | IG scores |
| Rank features by importance | Ordered list |
| Visualize | Bar chart |

---

## K-Means Clustering (Unsupervised)

**Purpose**: Classify patients into diabetes subtype risk clusters

| Parameter | Value |
|-----------|-------|
| Algorithm | K-Means |
| Features | All biomarkers |
| K | 4 clusters (based on diabetes subtypes) |
| Validation | Elbow method + Silhouette score |

### Cluster Labels (per Ahlqvist Classification)
| Cluster | Full Name | Characteristics |
|---------|-----------|-----------------|
| SIRD | Severe Insulin-Resistant Diabetes | High BMI, insulin resistance |
| SIDD | Severe Insulin-Deficient Diabetes | Low BMI, high HbA1c |
| MOD | Mild Obesity-Related Diabetes | Moderate BMI elevation |
| MARD | Mild Age-Related Diabetes | Older onset, mild dysfunction |

---

## Output Files

| File | Format | Contents |
|------|--------|----------|
| `model_comparison.csv` | CSV | All models, all metrics |
| `information_gain_results.json` | JSON | IG scores, entropy, ranking |
| `cluster_analysis.json` | JSON | Cluster centers, sizes |
| `best_model_report.json` | JSON | Selected model + justification |

---

## Visualizations Required

| # | Visualization | Purpose |
|---|---------------|---------|
| 1 | K-optimization (elbow/silhouette) | Show optimal K selection |
| 2 | Feature importance (RF) | RF feature weights |
| 3 | Information Gain chart | IG scores per feature |
| 4 | ROC curve | Best model performance |
| 5 | Confusion matrix | TP/TN/FP/FN |
| 6 | Cluster heatmap | Cluster centroid values |
| 7 | Cluster scatter (PCA) | Patient groupings |
| 8 | Cluster distribution | Cluster sizes |

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

## Dashboard / UI Requirements

1. **Risk Assessment Interface**
   - Medical Status: "Normal" / "Pre-diabetic" / "Diabetic"
   - Risk Cluster: "SIRD" / "SIDD" / "MOD" / "MARD"
   - Probability: Risk score from classifier

2. **Analytics Dashboard**
   - Model performance metrics
   - Feature importance (IG scores)
   - Cluster distribution charts
   - Cluster heatmaps

---

## Implementation Details

### Dataset Source
- **Database:** NHANES (National Health and Nutrition Examination Survey)
- **Cycles:** 2009-2018
- **Total Records:** ~1,111 postmenopausal women
- **Age Range:** 45-60 years

### Software Stack
- **ML Framework:** Python 3.10+, scikit-learn, XGBoost
- **Backend:** Go 1.21+, PostgreSQL
- **Frontend:** React, Vite
- **ML Server:** Flask (Python)
