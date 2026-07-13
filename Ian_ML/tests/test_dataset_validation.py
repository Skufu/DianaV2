"""
Automated Dataset Integrity & Demographic Validation Tests.
Validates the NHANES operational no-period analytic cohort properties.

Run: python -m pytest Ian_ML/tests/test_dataset_validation.py -v
"""

import pytest
import pandas as pd
import numpy as np
from pathlib import Path

# Setup paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATA_PATH = PROJECT_ROOT / "data/nhanes/processed/diana_dataset_final.csv"

@pytest.fixture(scope="module")
def dataset():
    """Load the processed NHANES analytic cohort dataset."""
    assert DATA_PATH.exists(), f"Analytical dataset not found at {DATA_PATH}"
    df = pd.read_csv(DATA_PATH)
    return df

class TestDatasetStructure:
    """Verify dataset dimensions and essential column headers."""

    def test_record_count(self, dataset):
        # Assert total cohort size matches exactly the thesis analytic cohort size of 1,376
        assert len(dataset) == 1376, f"Expected exactly 1,376 records, found {len(dataset)}"

    def test_required_columns_present(self, dataset):
        required = {
            "age", "hba1c", "fbs", "bmi", "ldl", "hdl", "triglycerides",
            "waist_circumference", "smoking_status", "physical_activity",
            "alcohol_use", "cycle", "diabetes_status", "diabetes_label",
            "menopausal_status"
        }
        columns = set(dataset.columns)
        missing = required - columns
        assert not missing, f"Missing required columns in dataset: {missing}"


class TestDemographicInclusionCriteria:
    """Verify the operational no-period development-cohort contract."""

    def test_menopausal_status(self, dataset):
        # This legacy column name must not overstate natural-menopause evidence.
        statuses = dataset["menopausal_status"].unique()
        assert len(statuses) == 1, f"Expected only one status, found: {statuses}"
        assert statuses[0] == "Operational no-period cohort", (
            f"Expected the operational no-period label, found: {statuses[0]}"
        )

    def test_age_range(self, dataset):
        # Inclusion criteria: women aged 45 to 60 in the processed cohort.
        min_age = dataset["age"].min()
        max_age = dataset["age"].max()
        assert min_age >= 45, f"Expected minimum age of at least 45, found: {min_age}"
        assert max_age <= 60, f"Expected maximum age of at most 60, found: {max_age}"


class TestClassBalanceAndPrevalence:
    """Verify class balance and target labels match reported study values."""

    def test_class_counts(self, dataset):
        # 0 = Normal, 1 = Pre-diabetic, 2 = Diabetic
        counts = dataset["diabetes_label"].value_counts().to_dict()
        
        normal_count = counts.get(0, 0)
        prediabetic_count = counts.get(1, 0)
        diabetic_count = counts.get(2, 0)
        at_risk_count = prediabetic_count + diabetic_count
        
        # Verify exact counts from thesis
        assert normal_count == 642, f"Expected exactly 642 normal records, found {normal_count}"
        assert at_risk_count == 734, f"Expected exactly 734 at-risk records, found {at_risk_count}"
        
        # Verify positive class prevalence: 734 / 1376 = 53.34%
        prevalence = (at_risk_count / len(dataset)) * 100
        assert np.isclose(prevalence, 53.343, atol=1e-2), f"Expected prevalence around 53.34%, found {prevalence:.2f}%"


class TestDataQualityAndMissingness:
    """Audit data missingness and outlier patterns."""

    def test_missing_waist_circumference(self, dataset):
        # Verify that waist circumference has some missing values, justifying the serving-time imputer
        missing_count = dataset["waist_circumference"].isna().sum()
        assert missing_count > 0, "Expected some missing values for waist circumference to validate imputation need"
        missing_pct = (missing_count / len(dataset)) * 100
        print(f"\n[AUDIT] Waist Circumference missingness: {missing_count} cases ({missing_pct:.2f}%)")

    def test_no_missing_critical_labels(self, dataset):
        # Label must never be missing
        assert dataset["diabetes_label"].isna().sum() == 0, "Found missing values in target 'diabetes_label'"
        assert dataset["diabetes_status"].isna().sum() == 0, "Found missing values in target 'diabetes_status'"

    def test_outlier_rates(self, dataset):
        # Outlier flag should be present and reasonable (typically around 2.5%)
        assert "has_outlier" in dataset.columns
        outliers = dataset["has_outlier"].sum()
        outlier_pct = (outliers / len(dataset)) * 100
        assert outliers <= 50, f"Outlier count unexpectedly high: {outliers}"
        print(f"\n[AUDIT] Outliers flagged in dataset: {outliers} cases ({outlier_pct:.2f}%)")


class TestLeakageIsolation:
    """Verify that feature matrices do not contain any diagnostic biomarkers."""

    def test_hba1c_correlation_limits(self, dataset):
        # Compute Pearson correlation of all non-diagnostic predictors with HbA1c
        # Ensure no predictor exceeds the proxy-leakage threshold of |r| >= 0.95
        predictors = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'waist_circumference']
        
        # Clean NaNs for correlation calculation
        df_clean = dataset[predictors + ['hba1c']].dropna()
        
        for pred in predictors:
            corr = np.corrcoef(df_clean[pred], df_clean['hba1c'])[0, 1]
            abs_corr = abs(corr)
            assert abs_corr < 0.95, f"Feature '{pred}' has high correlation with HbA1c (r={corr:.4f}). Potential diagnostic leakage!"
            print(f"\n[AUDIT] Correlation of '{pred}' with HbA1c: r={corr:.4f}")
