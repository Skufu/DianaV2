"""
NHANES Data Processing Script for DIANA
Processes raw NHANES .xpt files into training-ready format.

Usage: python scripts/process_nhanes.py
"""

import pandas as pd
import pyreadstat
from pathlib import Path
import sys

RAW_DIR = Path("data/nhanes/raw")
OUT_DIR = Path("data/nhanes/processed")


def load_xpt(filename: str) -> pd.DataFrame:
    """Load a NHANES .xpt file."""
    path = RAW_DIR / f"{filename}.XPT"
    if not path.exists():
        print(f"[ERROR] Missing file: {path}")
        sys.exit(1)
    df, _ = pyreadstat.read_xport(str(path))
    return df


def process_nhanes():
    """
    Process NHANES data applying DIANA paper's inclusion criteria:
    - Female only
    - Age 45-60 years
    - Postmenopausal
    - Complete FBS + HbA1c
    """
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    
    print("[INFO] Loading NHANES files...")
    
    # Load all required files
    demo = load_xpt("DEMO_J")
    ghb = load_xpt("GHB_J")
    glu = load_xpt("GLU_J")
    tchol = load_xpt("TCHOL_J")
    hdl = load_xpt("HDL_J")
    trigly = load_xpt("TRIGLY_J")
    bmx = load_xpt("BMX_J")
    bpx = load_xpt("BPX_J")
    rhq = load_xpt("RHQ_J")
    
    print("[INFO] Merging datasets on SEQN...")
    
    # Start with demographics
    df = demo[['SEQN', 'RIDAGEYR', 'RIAGENDR']].copy()
    
    # Merge biomarkers
    df = df.merge(ghb[['SEQN', 'LBXGH']], on='SEQN', how='left')
    df = df.merge(glu[['SEQN', 'LBXGLU']], on='SEQN', how='left')
    df = df.merge(tchol[['SEQN', 'LBXTC']], on='SEQN', how='left')
    df = df.merge(hdl[['SEQN', 'LBDHDD']], on='SEQN', how='left')
    df = df.merge(trigly[['SEQN', 'LBXTR', 'LBDLDL']], on='SEQN', how='left')
    df = df.merge(bmx[['SEQN', 'BMXBMI']], on='SEQN', how='left')
    df = df.merge(bpx[['SEQN', 'BPXSY1', 'BPXDI1']], on='SEQN', how='left')
    df = df.merge(rhq[['SEQN', 'RHQ031']], on='SEQN', how='left')
    
    print(f"   Total records after merge: {len(df)}")
    
    # Apply inclusion criteria
    print("[INFO] Applying inclusion criteria...")
    
    # Female only (RIAGENDR == 2)
    df = df[df['RIAGENDR'] == 2]
    print(f"   After female filter: {len(df)}")
    
    # Age 45-60
    df = df[(df['RIDAGEYR'] >= 45) & (df['RIDAGEYR'] <= 60)]
    print(f"   After age 45-60 filter: {len(df)}")
    
    # Postmenopausal (RHQ031 == 1 means "yes" had period in past 12 months)
    # RHQ031 == 2 means "No" (postmenopausal)
    df = df[df['RHQ031'] == 2]
    print(f"   After postmenopausal filter: {len(df)}")
    
    # Complete FBS + HbA1c (core biomarkers)
    df = df.dropna(subset=['LBXGH', 'LBXGLU'])
    print(f"   After complete FBS/HbA1c filter: {len(df)}")
    
    # Rename columns to match DIANA schema
    df = df.rename(columns={
        'RIDAGEYR': 'age',
        'LBXGH': 'hba1c',
        'LBXGLU': 'fbs',
        'LBXTC': 'total_cholesterol',
        'LBDHDD': 'hdl',
        'LBXTR': 'triglycerides',
        'LBDLDL': 'ldl',
        'BMXBMI': 'bmi',
        'BPXSY1': 'systolic',
        'BPXDI1': 'diastolic'
    })
    
    # Select final columns for model
    final_cols = [
        'SEQN', 'age', 'hba1c', 'fbs', 'bmi',
        'total_cholesterol', 'ldl', 'hdl', 'triglycerides',
        'systolic', 'diastolic'
    ]
    df = df[[c for c in final_cols if c in df.columns]]
    
    # Save processed data
    output_path = OUT_DIR / "diana_training_data.csv"
    df.to_csv(output_path, index=False)
    
    print(f"[SUCCESS] Processed data saved to: {output_path}")
    print(f"   Total records: {len(df)}")
    print(f"   Columns: {list(df.columns)}")
    
    # Print summary statistics
    print("[INFO] Biomarker Summary:")
    print(df[['age', 'hba1c', 'fbs', 'bmi']].describe().round(2))
    
    return df


if __name__ == "__main__":
    process_nhanes()

