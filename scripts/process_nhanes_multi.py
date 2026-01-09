"""
NHANES Multi-Cycle Data Processing Script (Updated with Lifestyle Factors)
Combines data from multiple NHANES cycles for larger training dataset.
Includes smoking, physical activity, and alcohol consumption.

Usage: python scripts/process_nhanes_multi.py
"""

import pandas as pd
import pyreadstat
from pathlib import Path
import sys

RAW_DIR = Path("data/nhanes/raw")
OUT_DIR = Path("data/nhanes/processed")

# Cycles to process: (suffix, year_label)
# 6 cycles from 2009-2023 (post-ADA HbA1c guidelines era)
# 2021-2023 is a 3-year cycle due to COVID-19 disruption
CYCLES = [
    ("L", "2021-2023"),  # NEW: Most recent (3-year cycle)
    ("J", "2017-2018"),
    ("I", "2015-2016"),
    ("H", "2013-2014"),
    ("G", "2011-2012"),
    ("F", "2009-2010"),
]


def load_xpt(filename: str) -> pd.DataFrame:
    """Load a NHANES .xpt file, return empty df if not found."""
    path = RAW_DIR / f"{filename}.XPT"
    if not path.exists():
        print(f"  [WARN] Missing: {filename}.XPT")
        return pd.DataFrame()
    try:
        # Try with encoding for newer files (2021-2023 uses Windows-1252)
        df, _ = pyreadstat.read_xport(str(path), encoding='latin1')
    except Exception:
        try:
            df, _ = pyreadstat.read_xport(str(path))
        except Exception as e:
            print(f"  [ERROR] Failed to read {filename}.XPT: {e}")
            return pd.DataFrame()
    return df


def derive_smoking_status(df: pd.DataFrame) -> pd.Series:
    """
    Derive smoking status from SMQ020 and SMQ040.
    SMQ020: Ever smoked 100+ cigarettes? (1=Yes, 2=No)
    SMQ040: Current smoking status (1=Daily, 2=Sometimes, 3=Not at all)
    
    Returns: 'Never', 'Former', 'Current', or 'Unknown'
    """
    def classify(row):
        smq020 = row.get('SMQ020')
        smq040 = row.get('SMQ040')
        
        if pd.isna(smq020):
            return 'Unknown'
        if smq020 == 2:  # Never smoked 100+ cigarettes
            return 'Never'
        if smq020 == 1:  # Ever smoked
            if pd.isna(smq040):
                return 'Former'  # Assume former if no current status
            if smq040 in [1, 2]:  # Daily or sometimes
                return 'Current'
            if smq040 == 3:  # Not at all currently
                return 'Former'
        return 'Unknown'
    
    return df.apply(classify, axis=1)


def derive_physical_activity(df: pd.DataFrame) -> pd.Series:
    """
    Derive physical activity level from PAQ variables.
    PAQ605: Vigorous work activity (1=Yes, 2=No)
    PAQ620: Moderate work activity (1=Yes, 2=No)
    PAQ635: Walk or bicycle (1=Yes, 2=No)
    PAQ650: Vigorous recreational activity (1=Yes, 2=No)
    PAQ665: Moderate recreational activity (1=Yes, 2=No)
    
    Returns: 'Active', 'Moderate', 'Sedentary', or 'Unknown'
    """
    def classify(row):
        # Check for vigorous activity (work or recreation)
        paq605 = row.get('PAQ605')
        paq650 = row.get('PAQ650')
        
        # Check for moderate activity
        paq620 = row.get('PAQ620')
        paq635 = row.get('PAQ635')
        paq665 = row.get('PAQ665')
        
        # Any vigorous activity = Active
        if paq605 == 1 or paq650 == 1:
            return 'Active'
        
        # Any moderate activity = Moderate
        if paq620 == 1 or paq635 == 1 or paq665 == 1:
            return 'Moderate'
        
        # Explicitly said no to activities = Sedentary
        if paq605 == 2 and paq650 == 2 and paq665 == 2:
            return 'Sedentary'
        
        # Can't determine
        if pd.isna(paq605) and pd.isna(paq650) and pd.isna(paq665):
            return 'Unknown'
        
        return 'Sedentary'
    
    return df.apply(classify, axis=1)


def derive_alcohol_use(df: pd.DataFrame) -> pd.Series:
    """
    Derive alcohol use from ALQ variables.
    ALQ101: Had 12+ drinks in past year? (1=Yes, 2=No)
    ALQ120Q: How often drink? (number)
    ALQ120U: Frequency unit (1=Week, 2=Month, 3=Year)
    ALQ130: Average drinks per occasion
    
    Returns: 'None', 'Light', 'Moderate', 'Heavy', or 'Unknown'
    """
    def classify(row):
        alq101 = row.get('ALQ101')
        alq130 = row.get('ALQ130')
        alq120q = row.get('ALQ120Q')
        alq120u = row.get('ALQ120U')
        
        if pd.isna(alq101):
            return 'Unknown'
        
        if alq101 == 2:  # No drinking
            return 'None'
        
        if alq101 == 1:  # Drinks
            # Try to estimate weekly drinks
            if not pd.isna(alq120q) and not pd.isna(alq120u) and not pd.isna(alq130):
                if alq120u == 1:  # per week
                    weekly_drinks = alq120q * alq130
                elif alq120u == 2:  # per month
                    weekly_drinks = (alq120q * alq130) / 4
                elif alq120u == 3:  # per year
                    weekly_drinks = (alq120q * alq130) / 52
                else:
                    weekly_drinks = 0
                
                # CDC guidelines: Heavy = >7 drinks/week for women
                if weekly_drinks > 7:
                    return 'Heavy'
                elif weekly_drinks > 3:
                    return 'Moderate'
                else:
                    return 'Light'
            
            # If we can't calculate, assume light
            return 'Light'
        
        return 'Unknown'
    
    return df.apply(classify, axis=1)


def process_cycle(suffix: str, year: str) -> pd.DataFrame:
    """Process a single NHANES cycle."""
    print(f"\n[CYCLE] {year} (suffix _{suffix})")
    
    # Load core files
    demo = load_xpt(f"DEMO_{suffix}")
    ghb = load_xpt(f"GHB_{suffix}")
    glu = load_xpt(f"GLU_{suffix}")
    tchol = load_xpt(f"TCHOL_{suffix}")
    hdl = load_xpt(f"HDL_{suffix}")
    trigly = load_xpt(f"TRIGLY_{suffix}")
    bmx = load_xpt(f"BMX_{suffix}")
    # BP file: try BPX first, then BPXO (oscillometric, used in 2021-2023)
    bpx = load_xpt(f"BPX_{suffix}")
    if bpx.empty:
        bpx = load_xpt(f"BPXO_{suffix}")  # Fallback for 2021-2023
    rhq = load_xpt(f"RHQ_{suffix}")
    
    # Load lifestyle files
    smq = load_xpt(f"SMQ_{suffix}")
    paq = load_xpt(f"PAQ_{suffix}")
    alq = load_xpt(f"ALQ_{suffix}")
    
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
    
    # Merge lifestyle questionnaires
    if not smq.empty:
        smq_cols = ['SEQN']
        for col in ['SMQ020', 'SMQ040']:
            if col in smq.columns:
                smq_cols.append(col)
        if len(smq_cols) > 1:
            df = df.merge(smq[smq_cols], on='SEQN', how='left')
    
    if not paq.empty:
        paq_cols = ['SEQN']
        for col in ['PAQ605', 'PAQ620', 'PAQ635', 'PAQ650', 'PAQ665']:
            if col in paq.columns:
                paq_cols.append(col)
        if len(paq_cols) > 1:
            df = df.merge(paq[paq_cols], on='SEQN', how='left')
    
    if not alq.empty:
        alq_cols = ['SEQN']
        for col in ['ALQ101', 'ALQ120Q', 'ALQ120U', 'ALQ130']:
            if col in alq.columns:
                alq_cols.append(col)
        if len(alq_cols) > 1:
            df = df.merge(alq[alq_cols], on='SEQN', how='left')
    
    df['cycle'] = year
    print(f"  Raw records: {len(df)}")
    
    return df


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("NHANES Multi-Cycle Data Processing (with Lifestyle Factors)")
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
    
    # Derive lifestyle features
    print("\n[LIFESTYLE] Deriving lifestyle features...")
    df['smoking_status'] = derive_smoking_status(df)
    df['physical_activity'] = derive_physical_activity(df)
    df['alcohol_use'] = derive_alcohol_use(df)
    
    print(f"  Smoking status: {df['smoking_status'].value_counts().to_dict()}")
    print(f"  Physical activity: {df['physical_activity'].value_counts().to_dict()}")
    print(f"  Alcohol use: {df['alcohol_use'].value_counts().to_dict()}")
    
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
    
    # Select final columns (including lifestyle)
    final_cols = ['SEQN', 'age', 'hba1c', 'fbs', 'bmi', 'total_cholesterol', 
                  'ldl', 'hdl', 'triglycerides', 'systolic', 'diastolic',
                  'smoking_status', 'physical_activity', 'alcohol_use', 'cycle']
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
    
    print(f"\n[STATS] Lifestyle summary:")
    print(f"  Smoking: {df['smoking_status'].value_counts().to_dict()}")
    print(f"  Physical Activity: {df['physical_activity'].value_counts().to_dict()}")
    print(f"  Alcohol: {df['alcohol_use'].value_counts().to_dict()}")


if __name__ == "__main__":
    main()
