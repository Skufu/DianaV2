# DIANA Paper Requirements - Complete Reference

## Project Overview

**DIANA** = Diabetes Intelligent Analysis for Menopausal Women

A system to predict Type 2 Diabetes risk in menopausal women using machine learning, combining supervised classification with unsupervised clustering.

---

## Target Population

| Criteria | Definition |
|----------|------------|
| **Perimenopausal** | Transitioning, irregular periods, typically ages 45-55 |
| **Postmenopausal** | 12+ consecutive months without menstruation |
| **Age Range** | 45-60 years |
| **Exclusions** | Premenopausal women (regular periods) |

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
| BMI | Numerical (kg/m²) |
| Menopausal Status | Categorical (Peri/Post) |
| Family History of Diabetes | Binary (Yes/No) - optional |
| Smoking Status | Binary (Yes/No) - optional |
| Physical Activity | Categorical (Active/Sedentary) - optional |

---

## Diabetes Classification (Ground Truth Labels)

Based on **HbA1c** (per ADA guidelines):

| Status | HbA1c | FBS (secondary) |
|--------|-------|-----------------|
| **Normal** | < 5.7% | < 100 mg/dL |
| **Pre-diabetic** | 5.7 - 6.4% | 100 - 125 mg/dL |
| **Diabetic** | ≥ 6.5% | ≥ 126 mg/dL |

> **Note**: HbA1c is the PRIMARY classifier. Use FBS for validation only.

---

## Machine Learning Requirements

### 1. Supervised Classification

#### Models Required
| Model | Library | Key Parameters |
|-------|---------|----------------|
| Logistic Regression | sklearn | max_iter=1000, solver='lbfgs' |
| Random Forest | sklearn | n_estimators=100, max_depth=10 |
| XGBoost | xgboost | n_estimators=100, max_depth=5 |

#### Data Splitting
- **Train/Test Split**: 70% / 30% (stratified by diabetes_status)
- **Cross-validation**: K-fold within training set (typically K=5)

#### Performance Metrics (ALL required)
| Metric | Target |
|--------|--------|
| Accuracy | Report value |
| Precision | Report value |
| Recall | Report value |
| F1-Score | Report value |
| AUC-ROC | **> 0.80** (critical threshold) |
| Cross-validation score | Report value |

#### Best Model Selection
1. Compare all 3 models on all metrics
2. Select best based on AUC-ROC + F1
3. Document justification
4. Generate confusion matrix for best model
5. Generate ROC curve for best model

---

### 2. Feature Selection (Information Gain)

| Task | Output |
|------|--------|
| Calculate dataset entropy | Single value |
| Calculate IG for each feature | IG scores |
| Rank features by importance | Ordered list |
| Visualize | Bar chart |

---

### 3. K-Means Clustering (Unsupervised)

**Purpose**: Discover hidden risk patterns independent of diabetes labels

| Parameter | Value |
|-----------|-------|
| Algorithm | K-Means |
| Features | ALL biomarkers (not just HbA1c) |
| Target K | 3 clusters |
| Validation | Elbow method + Silhouette score |

#### Cluster Labels
| Cluster | Description |
|---------|-------------|
| Low Risk | Healthy biomarker profiles |
| Moderate Risk | Borderline values |
| High Risk | Elevated/abnormal values |

#### Required Outputs
- Cluster characteristics (mean values per cluster)
- Heatmap of cluster centroids
- Scatter plot (PCA-reduced)
- Distribution bar chart

---

## Output Files

| File | Format | Contents |
|------|--------|----------|
| `model_comparison.csv` | CSV | All 3 models, all metrics |
| `information_gain_results.json` | JSON | IG scores, entropy, ranking |
| `cluster_analysis.json` | JSON | Cluster centers, sizes, characteristics |
| `best_model_report.json` | JSON | Selected model + justification |

---

## Visualizations Required

| # | Visualization | Purpose |
|---|---------------|---------|
| 1 | K-optimization (elbow/silhouette) | Show optimal K selection |
| 2 | Feature importance (RF) | Show RF feature weights |
| 3 | Information Gain chart | Show IG scores per feature |
| 4 | ROC curve | Show best model performance |
| 5 | Confusion matrix | Show TP/TN/FP/FN |
| 6 | Cluster heatmap | Show cluster centroid values |
| 7 | Cluster scatter (PCA) | Show patient groupings |
| 8 | Cluster distribution | Show cluster sizes |

---

## Model Files to Save

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

The web application should display:

1. **Risk Assessment Interface**
   - Medical Status: "Normal" / "Pre-diabetic" / "Diabetic"
   - Risk Cluster: "Low" / "Moderate" / "High"
   - Probability: "68% risk" (from best classifier)

2. **Analytics Dashboard**
   - Model performance metrics
   - Feature importance (IG scores)
   - Cluster distribution charts
   - Cluster heatmaps

---

## What to Use as Labels

| Use Case | Label Source |
|----------|--------------|
| **Supervised training** | diabetes_status (Normal/Pre-diabetic/Diabetic from HbA1c) |
| **Clustering** | No labels - unsupervised discovery |
| **User display** | BOTH: Medical status + Risk cluster |

---

## Key Quotes from Paper

> "classify into clusters AND predict T2D likelihood"

> "Medical status = what they have NOW, Risk cluster = their risk profile pattern"

> "The primary clustering technique will be K-means, applied to standardized versions of the selected features"

> "Models must be evaluated using Accuracy, Precision, Recall, F1-Score, and AUC-ROC with a target of >0.80"
