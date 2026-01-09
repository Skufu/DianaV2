"""
DIANA Data Imputation Script
Fills missing values to maximize usable training records.

Strategies:
- KNN Imputation for continuous biomarkers (triglycerides, BP, BMI, lipids)
- Mode imputation for categorical lifestyle features
- Validates imputation quality with distribution checks

Usage: python scripts/impute_missing_data.py
"""

import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.impute import KNNImputer
from sklearn.preprocessing import StandardScaler

INPUT_PATH = Path("data/nhanes/processed/diana_dataset_final.csv")
OUTPUT_PATH = Path("data/nhanes/processed/diana_dataset_imputed.csv")

# Columns to impute
CONTINUOUS_COLS = ['bmi', 'triglycerides', 'ldl', 'hdl', 'total_cholesterol', 
                   'systolic', 'diastolic']
CATEGORICAL_COLS = ['smoking_status', 'physical_activity', 'alcohol_use']


def summarize_missing(df, stage=""):
    """Print missing value summary."""
    print(f"\n{'='*50}")
    print(f"MISSING VALUES {stage}")
    print(f"{'='*50}")
    missing = df.isnull().sum()
    total = len(df)
    for col in missing[missing > 0].index:
        pct = missing[col] / total * 100
        print(f"  {col}: {missing[col]} ({pct:.1f}%)")
    if missing.sum() == 0:
        print("  No missing values!")
    return missing


def validate_imputation(original, imputed, col):
    """Check if imputed values are within reasonable range."""
    orig_vals = original[col].dropna()
    imp_mask = original[col].isna() & imputed[col].notna()
    imp_vals = imputed.loc[imp_mask, col]
    
    if len(imp_vals) == 0:
        return True, "No values imputed"
    
    # Check if imputed values are within original range (with 10% buffer)
    orig_min, orig_max = orig_vals.min(), orig_vals.max()
    buffer = (orig_max - orig_min) * 0.1
    
    in_range = ((imp_vals >= orig_min - buffer) & (imp_vals <= orig_max + buffer)).all()
    
    stats = f"Original: {orig_vals.mean():.2f}±{orig_vals.std():.2f}, Imputed: {imp_vals.mean():.2f}±{imp_vals.std():.2f}"
    
    return in_range, stats


def impute_continuous_knn(df, cols, n_neighbors=5):
    """
    Impute continuous variables using KNN.
    KNN finds similar patients based on available features and uses their values.
    """
    print(f"\n[KNN IMPUTATION] Using {n_neighbors} neighbors...")
    
    # Work with copy
    df_work = df.copy()
    
    # Get columns that exist in the dataframe
    valid_cols = [c for c in cols if c in df_work.columns]
    
    if not valid_cols:
        print("  No valid columns to impute")
        return df_work
    
    # Store original for validation
    original = df_work[valid_cols].copy()
    
    # Standardize for better KNN distance calculation
    scaler = StandardScaler()
    
    # Only use rows with at least some data for fitting
    data = df_work[valid_cols].values
    
    # Fit scaler on non-missing values
    non_missing_mask = ~np.isnan(data)
    if non_missing_mask.any():
        # Normalize each column independently
        for i, col in enumerate(valid_cols):
            col_data = data[:, i]
            valid_mask = ~np.isnan(col_data)
            if valid_mask.sum() > 0:
                mean = col_data[valid_mask].mean()
                std = col_data[valid_mask].std()
                if std > 0:
                    data[:, i] = (col_data - mean) / std
    
    # Apply KNN imputation
    imputer = KNNImputer(n_neighbors=n_neighbors, weights='distance')
    imputed_data = imputer.fit_transform(data)
    
    # Reverse standardization
    for i, col in enumerate(valid_cols):
        orig_col = original[col]
        valid_mask = ~orig_col.isna()
        if valid_mask.sum() > 0:
            mean = orig_col[valid_mask].mean()
            std = orig_col[valid_mask].std()
            if std > 0:
                imputed_data[:, i] = imputed_data[:, i] * std + mean
            else:
                imputed_data[:, i] = mean
    
    # Update dataframe
    for i, col in enumerate(valid_cols):
        df_work[col] = imputed_data[:, i]
        
        # Validate
        valid, stats = validate_imputation(original, df_work, col)
        n_imputed = original[col].isna().sum()
        status = "✓" if valid else "⚠"
        print(f"  {status} {col}: {n_imputed} values imputed - {stats}")
    
    return df_work


def impute_categorical_mode(df, cols):
    """
    Impute categorical variables using mode (most frequent value).
    For lifestyle factors, this is a reasonable assumption.
    """
    print("\n[MODE IMPUTATION] For categorical features...")
    
    df_work = df.copy()
    
    for col in cols:
        if col not in df_work.columns:
            continue
            
        n_missing = df_work[col].isna().sum()
        if n_missing == 0:
            continue
            
        # Get mode (excluding 'Unknown' if present)
        values = df_work[col].dropna()
        non_unknown = values[values != 'Unknown']
        
        if len(non_unknown) > 0:
            mode_val = non_unknown.mode().iloc[0]
        else:
            mode_val = values.mode().iloc[0] if len(values) > 0 else 'Unknown'
        
        # Also replace 'Unknown' with mode for lifestyle features
        unknown_mask = df_work[col] == 'Unknown'
        n_unknown = unknown_mask.sum()
        
        # Fill missing
        df_work[col] = df_work[col].fillna(mode_val)
        
        # Replace 'Unknown' with mode
        df_work.loc[unknown_mask, col] = mode_val
        
        print(f"  ✓ {col}: {n_missing} missing + {n_unknown} 'Unknown' → '{mode_val}'")
    
    return df_work


def main():
    print("=" * 60)
    print("DIANA Data Imputation")
    print("KNN for biomarkers | Mode for lifestyle")
    print("=" * 60)
    
    # Load data
    print(f"\n[LOAD] Reading from {INPUT_PATH}")
    df = pd.read_csv(INPUT_PATH)
    print(f"   Total records: {len(df)}")
    
    # Before imputation stats
    summarize_missing(df, "(BEFORE)")
    
    # Count complete records before
    core_cols = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'systolic', 'diastolic']
    complete_before = df.dropna(subset=core_cols)
    print(f"\n   Complete core records before: {len(complete_before)}")
    
    # Step 1: KNN imputation for continuous variables
    df = impute_continuous_knn(df, CONTINUOUS_COLS, n_neighbors=5)
    
    # Step 2: Mode imputation for categorical variables
    df = impute_categorical_mode(df, CATEGORICAL_COLS)
    
    # After imputation stats
    summarize_missing(df, "(AFTER)")
    
    # Count complete records after
    complete_after = df.dropna(subset=core_cols)
    print(f"\n   Complete core records after: {len(complete_after)}")
    print(f"   Improvement: +{len(complete_after) - len(complete_before)} records")
    
    # Add imputation flag
    df['imputed'] = True
    
    # Save
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)
    
    print(f"\n[SAVE] Imputed dataset saved to {OUTPUT_PATH}")
    print(f"   Total records: {len(df)}")
    
    # Final stats
    print("\n" + "=" * 60)
    print("IMPUTATION SUMMARY")
    print("=" * 60)
    print(f"   Records before: {len(complete_before)} complete")
    print(f"   Records after:  {len(complete_after)} complete")
    print(f"   Gain: +{len(complete_after) - len(complete_before)} ({(len(complete_after) - len(complete_before)) / len(complete_before) * 100:.1f}%)")
    
    # Class distribution check
    print("\n   Diabetes class distribution:")
    print(df['diabetes_status'].value_counts())
    
    print("\n[DONE] Imputation complete!")


if __name__ == "__main__":
    main()
