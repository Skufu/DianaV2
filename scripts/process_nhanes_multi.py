"""
NHANES Multi-Cycle Data Processing Script
Combines data from multiple NHANES cycles for larger training dataset.

Usage: python scripts/process_nhanes_multi.py
"""

import pandas as pd
import pyreadstat
from pathlib import Path
import sys

RAW_DIR = Path("data/nhanes/raw")
OUT_DIR = Path("data/nhanes/processed")

# Cycles to process: (suffix, year_label)
CYCLES = [
    ("F", "2009-2010"),
    ("G", "2011-2012"),
    ("H", "2013-2014"),
    ("I", "2015-2016"),
    ("J", "2017-2018"),
]


def load_xpt(filename: str) -> pd.DataFrame:
    """Load a NHANES .xpt file, return empty df if not found."""
    path = RAW_DIR / f"{filename}.XPT"
    if not path.exists():
        print(f"  [WARN] Missing: {filename}.XPT")
        return pd.DataFrame()
    df, _ = pyreadstat.read_xport(str(path))
    return df


def process_cycle(suffix: str, year: str) -> pd.DataFrame:
    """Process a single NHANES cycle."""
    print(f"\n[CYCLE] {year} (suffix _{suffix})")
    
    # Load files
    demo = load_xpt(f"DEMO_{suffix}")
    ghb = load_xpt(f"GHB_{suffix}")
    glu = load_xpt(f"GLU_{suffix}")
    tchol = load_xpt(f"TCHOL_{suffix}")
    hdl = load_xpt(f"HDL_{suffix}")
    trigly = load_xpt(f"TRIGLY_{suffix}")
    bmx = load_xpt(f"BMX_{suffix}")
    bpx = load_xpt(f"BPX_{suffix}")
    rhq = load_xpt(f"RHQ_{suffix}")
    
    if demo.empty:
        return pd.DataFrame()
    
    # Start with demographics
    df = demo[['SEQN', 'RIDAGEYR', 'RIAGENDR']].copy()
    
    # Merge biomarkers - handle column name variations
    if not ghb.empty and 'LBXGH' in ghb.columns:
        df = df.merge(ghb[['SEQN', 'LBXGH']], on='SEQN', how='left')
    
    if not glu.empty and 'LBXGLU' in glu.columns:
        df = df.merge(glu[['SEQN', 'LBXGLU']], on='SEQN', how='left')
    
    if not tchol.empty and 'LBXTC' in tchol.columns:
        df = df.merge(tchol[['SEQN', 'LBXTC']], on='SEQN', how='left')
    
    # HDL column name varies: LBDHDD or LBXHDD
    if not hdl.empty:
        hdl_col = 'LBDHDD' if 'LBDHDD' in hdl.columns else 'LBDHDL' if 'LBDHDL' in hdl.columns else None
        if hdl_col:
            df = df.merge(hdl[['SEQN', hdl_col]].rename(columns={hdl_col: 'LBDHDD'}), on='SEQN', how='left')
    
    # Triglycerides
    if not trigly.empty:
        tg_cols = ['SEQN']
        if 'LBXTR' in trigly.columns:
            tg_cols.append('LBXTR')
        if 'LBDLDL' in trigly.columns:
            tg_cols.append('LBDLDL')
        if len(tg_cols) > 1:
            df = df.merge(trigly[tg_cols], on='SEQN', how='left')
    
    if not bmx.empty and 'BMXBMI' in bmx.columns:
        df = df.merge(bmx[['SEQN', 'BMXBMI']], on='SEQN', how='left')
    
    # BP columns: BPXSY1/BPXDI1 or BPXOSY1/BPXODI1
    if not bpx.empty:
        sys_col = 'BPXSY1' if 'BPXSY1' in bpx.columns else 'BPXOSY1' if 'BPXOSY1' in bpx.columns else None
        dia_col = 'BPXDI1' if 'BPXDI1' in bpx.columns else 'BPXODI1' if 'BPXODI1' in bpx.columns else None
        if sys_col and dia_col:
            df = df.merge(bpx[['SEQN', sys_col, dia_col]].rename(
                columns={sys_col: 'BPXSY1', dia_col: 'BPXDI1'}
            ), on='SEQN', how='left')
    
    if not rhq.empty and 'RHQ031' in rhq.columns:
        df = df.merge(rhq[['SEQN', 'RHQ031']], on='SEQN', how='left')
    
    df['cycle'] = year
    print(f"  Raw records: {len(df)}")
    
    return df


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("NHANES Multi-Cycle Data Processing")
    print("=" * 60)
    
    # Process all cycles
    all_dfs = []
    for suffix, year in CYCLES:
        df = process_cycle(suffix, year)
        if not df.empty:
            all_dfs.append(df)
    
    if not all_dfs:
        print("[ERROR] No data processed!")
        return
    
    # Combine all cycles
    df = pd.concat(all_dfs, ignore_index=True)
    print(f"\n[COMBINED] Total raw records: {len(df)}")
    
    # Apply inclusion criteria
    print("\n[FILTER] Applying inclusion criteria...")
    
    # Female only (RIAGENDR == 2)
    df = df[df['RIAGENDR'] == 2]
    print(f"  After female filter: {len(df)}")
    
    # Age 45-60
    df = df[(df['RIDAGEYR'] >= 45) & (df['RIDAGEYR'] <= 60)]
    print(f"  After age 45-60 filter: {len(df)}")
    
    # Postmenopausal (RHQ031 == 2 means no period in past 12 months)
    df = df[df['RHQ031'] == 2]
    print(f"  After postmenopausal filter: {len(df)}")
    
    # Complete FBS + HbA1c (core biomarkers)
    if 'LBXGH' in df.columns and 'LBXGLU' in df.columns:
        df = df.dropna(subset=['LBXGH', 'LBXGLU'])
        print(f"  After complete FBS/HbA1c filter: {len(df)}")
    
    # Rename columns
    rename_map = {
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
    }
    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})
    
    # Select final columns
    final_cols = ['SEQN', 'age', 'hba1c', 'fbs', 'bmi', 'total_cholesterol', 
                  'ldl', 'hdl', 'triglycerides', 'systolic', 'diastolic', 'cycle']
    df = df[[c for c in final_cols if c in df.columns]]
    
    # Save
    output_path = OUT_DIR / "diana_training_data_multi.csv"
    df.to_csv(output_path, index=False)
    
    print(f"\n[SUCCESS] Saved {len(df)} records to {output_path}")
    print(f"  Columns: {list(df.columns)}")
    print(f"\n[STATS] Records per cycle:")
    print(df['cycle'].value_counts())
    print(f"\n[STATS] Biomarker summary:")
    print(df[['age', 'hba1c', 'fbs', 'bmi']].describe().round(2))


if __name__ == "__main__":
    main()
