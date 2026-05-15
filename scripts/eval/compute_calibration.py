"""
Compute calibration metrics for the binary_v2_no_bp model.

Calibration measures how well predicted probabilities match actual outcomes.
For a screening tool, well-calibrated probabilities are essential for 
clinical decision-making.

Metrics computed:
- Brier Score: Mean squared error of predicted probabilities (lower = better)
- Expected Calibration Error (ECE): Average deviation from perfect calibration
- Calibration curve data for reliability diagram
"""

import json
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.calibration import calibration_curve
from sklearn.metrics import brier_score_loss
import joblib
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "Ian_ML"))

from common.paths import MODELS_ROOT
from common.feature_constants import CLINICAL_FEATURES


def compute_ece(y_true: np.ndarray, y_proba: np.ndarray, n_bins: int = 10) -> float:
    """
    Compute Expected Calibration Error (ECE).
    
    ECE measures the weighted average of the difference between 
    predicted probability and actual accuracy in each bin.
    """
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    
    for i in range(n_bins):
        in_bin = (y_proba >= bin_boundaries[i]) & (y_proba < bin_boundaries[i + 1])
        prop_in_bin = in_bin.mean()
        
        if prop_in_bin > 0:
            accuracy_in_bin = y_true[in_bin].mean()
            avg_confidence_in_bin = y_proba[in_bin].mean()
            ece += np.abs(avg_confidence_in_bin - accuracy_in_bin) * prop_in_bin
    
    return ece


def compute_calibration_metrics():
    """Compute and save calibration metrics for the model."""
    
    models_dir = MODELS_ROOT / "binary_v2_no_bp"
    results_dir = models_dir / "results"
    
    model = joblib.load(models_dir / "best_model.joblib")
    
    df = pd.read_csv("data/nhanes/processed/diana_dataset_final.csv")
    
    df_clean = df.dropna(subset=['diabetes_label']).copy()
    
    df_clean['at_risk_binary_v2_no_bp'] = (df_clean['diabetes_label'] >= 1).astype(int)
    
    df_clean['smoking_encoded'] = df_clean['smoking_status'].fillna('Unknown').map(
        {'Never': 0, 'Former': 1, 'Current': 2, 'Unknown': 1}
    )
    df_clean['activity_encoded'] = df_clean['physical_activity'].fillna('Unknown').map(
        {'Sedentary': 0, 'Moderate': 1, 'Active': 2, 'Unknown': 1}
    )
    df_clean['alcohol_encoded'] = df_clean['alcohol_use'].fillna('Unknown').map(
        {
            'None': 0,
            'Never': 0,
            'No Alcohol': 0,
            'Abstinent': 0,
            'Light': 1,
            'Moderate': 2,
            'Heavy': 3,
            'Unknown': 1,
        }
    ).fillna(1)
    
    available_features = [f for f in CLINICAL_FEATURES if f in df_clean.columns]
    # The production model is a sklearn Pipeline with an embedded imputer, so
    # calibration should evaluate the same missing-data behavior used at serving
    # time instead of silently dropping incomplete feature rows.
    df_clean = df_clean.dropna(subset=['at_risk_binary_v2_no_bp'])
    
    X = df_clean[available_features].values
    y = df_clean['at_risk_binary_v2_no_bp'].values
    
    y_proba = model.predict_proba(X)[:, 1]
    
    brier = brier_score_loss(y, y_proba)
    ece = compute_ece(y, y_proba, n_bins=10)
    prob_true, prob_pred = calibration_curve(y, y_proba, n_bins=10, strategy='uniform')
    
    df_cal = pd.DataFrame({'y_true': y, 'y_proba': y_proba})
    df_cal['decile'] = pd.qcut(y_proba, q=10, labels=False, duplicates='drop')
    
    hl_stats = []
    for decile in df_cal['decile'].unique():
        subset = df_cal[df_cal['decile'] == decile]
        observed = subset['y_true'].sum()
        expected = subset['y_proba'].sum()
        n = len(subset)
        if expected > 0 and (n - expected) > 0:
            hl_stats.append((observed - expected)**2 / (expected * (n - expected) / n))
    
    hl_stat = sum(hl_stats) if hl_stats else 0
    
    calibration_report = {
        "brier_score": round(brier, 4),
        "expected_calibration_error": round(ece, 4),
        "hosmer_lemeshow_statistic": round(hl_stat, 4),
        "n_samples": len(y),
        "n_positive": int(y.sum()),
        "prevalence": round(y.mean(), 4),
        "calibration_curve": {
            "prob_true": [round(p, 4) for p in prob_true.tolist()],
            "prob_pred": [round(p, 4) for p in prob_pred.tolist()]
        },
        "interpretation": {
            "brier": "Lower is better. 0 = perfect, 0.25 = random guess for binary classification.",
            "ece": "Lower is better. Measures average deviation from perfect calibration.",
            "hl_stat": "Lower is better. Chi-square-like measure of calibration fit."
        }
    }
    
    output_path = results_dir / "calibration_report.json"
    with open(output_path, 'w') as f:
        json.dump(calibration_report, f, indent=2)
    
    print("=" * 60)
    print("CALIBRATION ANALYSIS RESULTS")
    print("=" * 60)
    print(f"Dataset: n={len(y)}, {y.sum()} positive ({y.mean()*100:.1f}%)")
    print()
    print("Calibration Metrics:")
    print(f"  Brier Score:                 {brier:.4f}")
    print(f"  Expected Calibration Error:  {ece:.4f}")
    print(f"  Hosmer-Lemeshow Statistic:   {hl_stat:.4f}")
    print()
    print("Interpretation:")
    print(f"  - Brier Score {brier:.4f} indicates ", end="")
    if brier < 0.15:
        print("excellent calibration")
    elif brier < 0.20:
        print("good calibration")
    elif brier < 0.25:
        print("acceptable calibration")
    else:
        print("poor calibration")
    
    print(f"  - ECE {ece:.4f} indicates ", end="")
    if ece < 0.05:
        print("excellent calibration")
    elif ece < 0.10:
        print("good calibration")
    elif ece < 0.15:
        print("acceptable calibration")
    else:
        print("moderate calibration")
    
    print()
    print(f"Results saved to: {output_path}")
    
    return calibration_report


if __name__ == "__main__":
    compute_calibration_metrics()
