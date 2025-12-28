"""
DIANA Dataset Preparation Script
Prepares final dataset with:
- Diabetes status labels (Normal/Pre-diabetic/Diabetic)
- Menopausal status column
- All required biomarkers

Usage: python scripts/prepare_dataset.py
"""

import pandas as pd
import numpy as np
from pathlib import Path

INPUT_PATH = Path("data/nhanes/processed/diana_training_data_multi.csv")
OUTPUT_PATH = Path("data/nhanes/processed/diana_dataset_final.csv")


def classify_diabetes(hba1c):
    """
    Classify diabetes status based on HbA1c (per ADA guidelines).
    
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


def main():
    print("=" * 60)
    print("DIANA Dataset Preparation")
    print("=" * 60)
    
    # Load data
    print(f"\n[LOAD] Reading from {INPUT_PATH}")
    df = pd.read_csv(INPUT_PATH)
    print(f"   Records: {len(df)}")
    
    # Add diabetes status (primary: HbA1c)
    print("\n[LABEL] Adding diabetes_status (HbA1c-based)...")
    df['diabetes_status'] = df['hba1c'].apply(classify_diabetes)
    
    # Add FBS-based status for validation
    df['fbs_status'] = df['fbs'].apply(classify_fbs)
    
    # Check agreement
    agreement = (df['diabetes_status'] == df['fbs_status']).sum()
    total = df['diabetes_status'].notna().sum()
    print(f"   HbA1c/FBS agreement: {agreement}/{total} ({agreement/total*100:.1f}%)")
    
    # Add menopausal status
    print("\n[LABEL] Adding menopausal_status...")
    df['menopausal_status'] = df['age'].apply(assign_menopausal_status)
    
    # Drop rows with missing diabetes_status
    before = len(df)
    df = df.dropna(subset=['diabetes_status'])
    print(f"   Dropped {before - len(df)} rows with missing HbA1c")
    
    # Show class distribution
    print("\n[STATS] Diabetes Status Distribution:")
    print(df['diabetes_status'].value_counts())
    
    print("\n[STATS] Class Proportions:")
    proportions = df['diabetes_status'].value_counts(normalize=True) * 100
    for status, pct in proportions.items():
        print(f"   {status}: {pct:.1f}%")
    
    # Encode labels for ML
    label_map = {"Normal": 0, "Pre-diabetic": 1, "Diabetic": 2}
    df['diabetes_label'] = df['diabetes_status'].map(label_map)
    
    # Select final columns
    final_columns = [
        'SEQN', 'age', 'hba1c', 'fbs', 'bmi',
        'total_cholesterol', 'ldl', 'hdl', 'triglycerides',
        'systolic', 'diastolic', 'cycle',
        'diabetes_status', 'diabetes_label', 'menopausal_status'
    ]
    df = df[[c for c in final_columns if c in df.columns]]
    
    # Save
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)
    
    print(f"\n[SAVE] Dataset saved to {OUTPUT_PATH}")
    print(f"   Total records: {len(df)}")
    print(f"   Columns: {list(df.columns)}")
    
    # Summary stats
    print("\n[STATS] Biomarker Summary:")
    print(df[['age', 'hba1c', 'fbs', 'bmi']].describe().round(2))
    
    return df


if __name__ == "__main__":
    main()
