# DIANA ML Methodology

## Data Strategy

### Development Dataset: NHANES
Due to Philippine hospital data collection challenges, we use NHANES (US National Health and Nutrition Examination Survey) 2017-2018 as our development dataset. This allows us to:
1. Build and test the complete ML pipeline
2. Validate the clustering methodology
3. Create a working demo

### Swap to Philippine Data
When Philippine hospital records become available:
1. Format data to match the same schema
2. Re-run `process_nhanes.py` equivalent 
3. Re-run `train_clusters.py`
4. Update cluster profiles (patterns may differ between populations)

---

## Methodology Decisions

### Inclusion Criteria
| Criterion | Value | Source |
|-----------|-------|--------|
| Sex | Female | Paper |
| Age | 45-60 years | Paper |
| Menopausal Status | Postmenopausal | Paper |
| Required Biomarkers | FBS + HbA1c | Paper |

### Feature Preprocessing
- **Method**: Z-score standardization
- **Rationale**: Per paper - "k-means applied to standardized versions of the selected features"
- **Weighting**: Equal (no differential weighting specified)

### K Selection
- **Method**: Elbow method + Silhouette scores
- **K Range**: 2-6
- **Selection**: Highest silhouette score with clinical interpretability

### Cluster Labeling
Clusters labeled post-hoc by comparing profiles to Ahlqvist et al. (2018) criteria:

| Label | Characteristics |
|-------|-----------------|
| SIDD-like | High HbA1c/FBS, lower BMI, younger |
| SIRD-like | High BMI, high TG, low HDL |
| MOD-like | High BMI (>30), moderate HbA1c |
| MARD-like | Older age (>55), mild elevations |

---

## Reproducibility

All random operations use `random_state=42` for reproducibility.

Model artifacts stored in `models/`:
- `scaler.joblib` - StandardScaler parameters
- `kmeans_model.joblib` - Trained K-means model
- `cluster_labels.json` - Label assignments
- `cluster_profiles.csv` - Mean biomarkers per cluster
