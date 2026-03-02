"""
DIANA Dataset Preparation Script
Prepares final dataset with:
- Diabetes status labels (Normal/Pre-diabetic/Diabetic)
- Menopausal status column
- All required biomarkers
- Data quality checks (outliers, duplicates)

Usage: python Ian_ML/training/data_processing.py
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import pandas as pd
import numpy as np
from Ian_ML.common.paths import NHANES_PROCESSED_ROOT

INPUT_PATH = NHANES_PROCESSED_ROOT / "diana_training_data_multi.csv"
OUTPUT_PATH = NHANES_PROCESSED_ROOT / "diana_dataset_final.csv"

# Biomarkers to check for outliers (clinical ranges)
BIOMARKER_RANGES = {
    'bmi': (15.0, 60.0),               # Extreme but possible BMI range
    'triglycerides': (20.0, 800.0),     # mg/dL
    'ldl': (20.0, 300.0),              # mg/dL
    'hdl': (10.0, 120.0),              # mg/dL
    'hba1c': (3.5, 15.0),              # %
    'fbs': (50.0, 400.0),              # mg/dL
    'age': (18, 100),                  # years
    'waist_circumference': (50.0, 180.0),  # cm
    'fasting_insulin': (1.0, 300.0),       # µU/mL
    'crp': (0.01, 30.0),                   # mg/dL
}


def classify_diabetes_self_reported(diq010, hba1c):
    """
    Classify diabetes using self-reported diagnosis (DIQ010).
    
    DIQ010 Response Codes (NHANES Diabetes Questionnaire):
      1 = Yes (doctor told them they have diabetes)
      2 = No
      3 = Borderline (prediabetes)
    
    For those who said "No" (DIQ010=2), we use HbA1c to distinguish
    between Normal and undiagnosed Pre-diabetic, but this is secondary.
    
    Returns: 'Normal', 'Pre-diabetic', 'Diabetic', or None
    """
    # ADA override: diabetic-range HbA1c is diabetic regardless of questionnaire response.
    if not pd.isna(hba1c) and hba1c >= 6.5:
        return "Diabetic"

    if pd.isna(diq010):
        return None  # Require self-report - don't impute
    
    diq010 = int(diq010)
    
    if diq010 == 1:
        # Doctor diagnosed diabetes
        return "Diabetic"
    elif diq010 == 3:
        # Borderline / prediabetes
        return "Pre-diabetic"
    elif diq010 == 2:
        # Said "No" to diabetes diagnosis.
        # Apply ADA glycemic cutoffs so undiagnosed diabetic HbA1c is not mislabeled.
        if pd.isna(hba1c):
            return "Normal"
        if hba1c >= 6.5:
            return "Diabetic"
        if hba1c >= 5.7:
            return "Pre-diabetic"
        return "Normal"
    
    return None


def classify_diabetes_hba1c(hba1c):
    """
    LEGACY: Classify diabetes based on HbA1c (per ADA guidelines).
    Used only for validation/comparison, NOT for primary labels.
    
    Normal: < 5.7%
    Pre-diabetic: 5.7 - 6.4%
    Diabetic: >= 6.5%
    """
    if pd.isna(hba1c):
        return None
    if hba1c < 5.7:
        return "Normal"
    elif hba1c < 6.5:
        return "Pre-diabetic"
    else:
        return "Diabetic"


def classify_fbs(fbs):
    """Secondary classification using FBS for validation."""
    if pd.isna(fbs):
        return None
    if fbs < 100:
        return "Normal"
    elif fbs < 126:
        return "Pre-diabetic"
    else:
        return "Diabetic"


def assign_menopausal_status(age):
    """
    Assign menopausal status based on age.
    All women in our dataset are postmenopausal (filtered earlier).
    For perimenopause, would need period regularity data.
    """
    # Since we filtered for RHQ031 == 2 (no period in 12 months),
    # all are postmenopausal
    return "Postmenopausal"


def detect_outliers_iqr(df, column, multiplier=1.5):
    """
    Detect outliers using IQR method.
    
    Args:
        df: DataFrame
        column: Column name to check
        multiplier: IQR multiplier (1.5 = standard, 3.0 = extreme only)
    
    Returns:
        Boolean mask where True = outlier
    """
    if column not in df.columns:
        return pd.Series([False] * len(df))
    
    data = df[column].dropna()
    if len(data) == 0:
        return pd.Series([False] * len(df))
    
    Q1 = data.quantile(0.25)
    Q3 = data.quantile(0.75)
    IQR = Q3 - Q1
    
    lower_bound = Q1 - multiplier * IQR
    upper_bound = Q3 + multiplier * IQR
    
    # Also apply clinical ranges if defined
    if column in BIOMARKER_RANGES:
        clinical_low, clinical_high = BIOMARKER_RANGES[column]
        lower_bound = max(lower_bound, clinical_low)
        upper_bound = min(upper_bound, clinical_high)
    
    return (df[column] < lower_bound) | (df[column] > upper_bound)


def detect_outliers_clinical(df, column):
    """
    Detect outliers based on clinical plausibility ranges.
    
    Returns:
        Boolean mask where True = outlier (clinically implausible)
    """
    if column not in df.columns or column not in BIOMARKER_RANGES:
        return pd.Series([False] * len(df))
    
    low, high = BIOMARKER_RANGES[column]
    return (df[column] < low) | (df[column] > high)


def data_quality_report(df, stage=""):
    """Print data quality statistics."""
    print(f"\n{'='*50}")
    print(f"DATA QUALITY REPORT {stage}")
    print(f"{'='*50}")
    
    print(f"\n[SHAPE] {len(df)} rows, {len(df.columns)} columns")
    
    # Missing values
    print("\n[MISSING VALUES]")
    missing = df.isnull().sum()
    missing_pct = (missing / len(df) * 100).round(1)
    for col in missing[missing > 0].index:
        print(f"   {col}: {missing[col]} ({missing_pct[col]}%)")
    
    # Biomarker statistics
    biomarker_cols = [c for c in ['bmi', 'triglycerides', 'ldl', 'hdl', 'hba1c', 'fbs', 'age'] 
                      if c in df.columns]
    if biomarker_cols:
        print("\n[BIOMARKER STATS]")
        stats = df[biomarker_cols].describe().round(2)
        print(stats.to_string())
    
    return df


def main():
    print("=" * 60)
    print("DIANA Dataset Preparation (with Data Cleaning)")
    print("=" * 60)
    
    # Load data
    print(f"\n[LOAD] Reading from {INPUT_PATH}")
    df = pd.read_csv(INPUT_PATH)
    print(f"   Records: {len(df)}")
    
    # Initial quality report
    data_quality_report(df, "(BEFORE CLEANING)")
    
    # =========================================
    # STEP 1: Duplicate Detection
    # =========================================
    print("\n[CLEAN] Checking for duplicates...")
    if 'SEQN' in df.columns:
        duplicates = df.duplicated(subset=['SEQN'], keep='first')
        n_duplicates = duplicates.sum()
        if n_duplicates > 0:
            print(f"   Found {n_duplicates} duplicate SEQN entries - removing")
            df = df[~duplicates]
        else:
            print("   No duplicate SEQN entries found")
    
    # =========================================
    # STEP 2: Outlier Detection & Handling
    # =========================================
    print("\n[CLEAN] Detecting outliers (clinical ranges)...")
    
    outlier_counts = {}
    total_outliers = pd.Series([False] * len(df))
    
    for col in BIOMARKER_RANGES.keys():
        if col in df.columns:
            # Use clinical range detection (more conservative)
            outliers = detect_outliers_clinical(df, col)
            n_outliers = outliers.sum()
            if n_outliers > 0:
                outlier_counts[col] = n_outliers
                total_outliers = total_outliers | outliers
                print(f"   {col}: {n_outliers} outliers (outside {BIOMARKER_RANGES[col]})")
    
    # Flag outliers but don't remove (preserve data, let model handle)
    df['has_outlier'] = total_outliers
    n_with_outliers = total_outliers.sum()
    print(f"   Total rows with any outlier: {n_with_outliers} ({n_with_outliers/len(df)*100:.1f}%)")
    print("   [NOTE] Outliers flagged but not removed - preserving data integrity")
    
    # =========================================
    # STEP 3: Add Diabetes Labels (Self-Reported)
    # =========================================
    print("\n[LABEL] Adding diabetes_status (DIQ010 self-reported)...")
    
    if 'DIQ010' in df.columns:
        # Use self-reported diagnosis (primary)
        df['diabetes_status'] = df.apply(
            lambda row: classify_diabetes_self_reported(
                row.get('DIQ010'), row.get('hba1c')
            ),
            axis=1
        )
        
        # Report DIQ010 distribution
        diq_counts = df['DIQ010'].value_counts().to_dict()
        print(f"   DIQ010 distribution: {diq_counts}")
        print(f"   (1=Diabetic, 2=No, 3=Borderline)")
        
        # Add HbA1c-based status for validation comparison
        df['hba1c_status'] = df['hba1c'].apply(classify_diabetes_hba1c)
        
        # Check agreement between self-reported and HbA1c
        both_valid = df['diabetes_status'].notna() & df['hba1c_status'].notna()
        if both_valid.sum() > 0:
            agreement = (df.loc[both_valid, 'diabetes_status'] == df.loc[both_valid, 'hba1c_status']).sum()
            total = both_valid.sum()
            print(f"   Self-reported/HbA1c agreement: {agreement}/{total} ({agreement/total*100:.1f}%)")
            print(f"   [NOTE] Lower agreement = less data leakage (good!)")
    else:
        # Fallback to HbA1c if DIQ010 not available
        print("   [WARN] DIQ010 not found - falling back to HbA1c-based labels")
        df['diabetes_status'] = df['hba1c'].apply(classify_diabetes_hba1c)
    
    # Add FBS-based status for validation
    df['fbs_status'] = df['fbs'].apply(classify_fbs)
    
    # =========================================
    # STEP 4: Add Menopausal Status
    # =========================================
    print("\n[LABEL] Adding menopausal_status...")
    df['menopausal_status'] = df['age'].apply(assign_menopausal_status)
    
    # =========================================
    # STEP 5: Drop Missing Target
    # =========================================
    before = len(df)
    df = df.dropna(subset=['diabetes_status'])
    dropped = before - len(df)
    if dropped > 0:
        print(f"   Dropped {dropped} rows with missing HbA1c")
    
    # =========================================
    # STEP 6: Class Distribution
    # =========================================
    print("\n[STATS] Diabetes Status Distribution:")
    print(df['diabetes_status'].value_counts())
    
    print("\n[STATS] Class Proportions:")
    proportions = df['diabetes_status'].value_counts(normalize=True) * 100
    for status, pct in proportions.items():
        print(f"   {status}: {pct:.1f}%")
    
    # Encode labels for ML
    label_map = {"Normal": 0, "Pre-diabetic": 1, "Diabetic": 2}
    df['diabetes_label'] = df['diabetes_status'].map(label_map)
    
    # =========================================
    # STEP 7: Select Final Columns
    # =========================================
    final_columns = [
        'SEQN', 'age', 'hba1c', 'fbs', 'bmi',
        'total_cholesterol', 'ldl', 'hdl', 'triglycerides',
        'systolic', 'diastolic',
        'waist_circumference', 'fasting_insulin', 'crp',       # Enrichment biomarkers
        'family_history_diabetes',            # Enrichment categorical
        'smoking_status', 'physical_activity', 'alcohol_use',   # Lifestyle features
        'cycle',
        'diabetes_status', 'diabetes_label', 'menopausal_status',
        'has_outlier'  # Keep outlier flag for analysis
    ]
    df = df[[c for c in final_columns if c in df.columns]]
    
    # Final quality report
    data_quality_report(df, "(AFTER CLEANING)")
    
    # =========================================
    # STEP 8: Save
    # =========================================
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)
    
    print(f"\n[SAVE] Dataset saved to {OUTPUT_PATH}")
    print(f"   Total records: {len(df)}")
    print(f"   Columns: {list(df.columns)}")
    
    print("\n[DONE] Data processing complete!")
    
    return df


if __name__ == "__main__":
    main()
