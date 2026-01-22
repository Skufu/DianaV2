# UI Requirements Reference

> Web application functionality per paper

---

## Target Users

- **Primary**: Healthcare professionals (endocrinologists, OB-GYN, internal medicine)
- **Secondary**: Researchers, clinicians
- **Scope**: Decision-support tool (NOT automated diagnosis)

---

## Required Tabs/Sections

### 1. Dashboard Tab
| Feature | Description |
|---------|-------------|
| Total patients | Count of registered patients |
| Recent additions | Newly added patient summary |
| Summary statistics | Aggregate metrics |
| Biomarker trends | Population-level graphs (HbA1c, FBS, etc.) |

### 2. Patient History Tab
| Feature | Description |
|---------|-------------|
| Patient list | Name, age, last assessment date |
| Detail view | Full profile on click/hover |
| Historical readings | Previous biomarker values |
| Trend overlay | Line graph comparing readings over time |
| Risk assessment | Probability (0-100%) + category (Low/Moderate/High) |

### 3. Analytics Tab
| Feature | Description |
|---------|-------------|
| Risk factor chart | Feature importance (IG scores) |
| Correlation charts | BMI vs Glucose, etc. |
| Cluster distribution | Pie/bar of SIRD/SIDD/MOD/MARD |
| Model metrics | AUC, accuracy, etc. |

### 4. Export Tab
| Feature | Description |
|---------|-------------|
| Export participant data | CSV/Excel with all records |
| Export analytics report | Summary PDF/formatted file |
| Filtered export | By menopausal stage, risk level |

### 5. Assessment Interface
| Feature | Description |
|---------|-------------|
| Data input form | Biomarker entry fields |
| Real-time prediction | Immediate risk calculation |
| Results display | Risk category + probability |

---

## Visualization Requirements

| # | Visualization | Purpose |
|---|---------------|---------|
| 1 | K-optimization (elbow/silhouette) | Show optimal K selection |
| 2 | Feature importance (RF) | Random Forest weights |
| 3 | Information Gain chart | IG scores per feature |
| 4 | ROC curve | Best model performance |
| 5 | Confusion matrix | TP/TN/FP/FN |
| 6 | Cluster heatmap | Centroid biomarker values |
| 7 | Cluster scatter (PCA) | Patient groupings |
| 8 | Cluster distribution | Cluster sizes |

---

## Risk Display

| Risk Level | Probability | Color (suggested) |
|------------|-------------|-------------------|
| Low Risk | 0-33% | Green |
| Moderate Risk | 34-66% | Yellow/Orange |
| High Risk | 67-100% | Red |

---

## Doctor's Requirements (from interviews)

1. **Graph-based visualization** - Show trends over time
2. **One-picture summary** - HbA1c, cholesterol, creatinine on single view
3. **Simple login** - Quick access to patient dashboard
4. **Risk categorization** - Clear Low/Moderate/High tags
5. **Trend tracking** - Historical comparison (e.g., 1st year vs now)

---

## Current Implementation Status

| Feature | Component | Status |
|---------|-----------|--------|
| Dashboard | `frontend/src/components/dashboard/Dashboard.jsx` | ✅ Implemented |
| Patient History | `frontend/src/components/patients/Patients.jsx` | ✅ Implemented |
| Analytics | `frontend/src/components/analytics/Analytics.jsx` | ✅ Implemented |
| Assessment | `frontend/src/components/assessment/Assessment.jsx` | ✅ Implemented |
| Risk Trends | `frontend/src/components/analytics/RiskTrends.jsx` | ✅ Implemented |
| Export | - | ⚠️ Partial |

---

## Keywords

`dashboard` `analytics` `visualization` `patient history` `risk assessment` `chart` `graph` `trend` `export` `UI` `frontend` `React`
