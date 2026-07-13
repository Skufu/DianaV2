# pyright: reportGeneralTypeIssues=false, reportArgumentType=false, reportCallIssue=false, reportIndexIssue=false, reportAttributeAccessIssue=false, reportMissingImports=false
"""
NHANES Multi-Cycle Data Processing Script (Updated with Lifestyle Factors)
Combines data from multiple NHANES cycles for larger training dataset.
Includes smoking, physical activity, and alcohol consumption.

Usage: python scripts/process_nhanes_multi.py
"""

import pandas as pd
import numpy as np
import pyreadstat
from pathlib import Path
import sys
from typing import cast

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

MISSING_NUMERIC_CODES = {7, 9, 77, 99, 777, 999, 7777, 9999}
OLD_PAQ_COLS = ['PAQ605', 'PAQ620', 'PAQ635', 'PAQ650', 'PAQ665']
NEW_PAQ_COLS = ['PAD790Q', 'PAD790U', 'PAD800', 'PAD810Q', 'PAD810U', 'PAD820', 'PAD680']
OLD_ALQ_COLS = ['ALQ101', 'ALQ120Q', 'ALQ120U', 'ALQ130']
NEW_ALQ_COLS = ['ALQ111', 'ALQ121', 'ALQ142', 'ALQ270', 'ALQ280', 'ALQ151', 'ALQ170']
BP_FILE_BY_SUFFIX = {"L": "BPXO"}
INS_AVAILABLE_SUFFIXES = {"H", "I", "J", "L"}
HSCRP_AVAILABLE_SUFFIXES = {"I", "J", "L"}
NO_ALCOHOL_LABEL = "Never"


def load_xpt(filename: str) -> pd.DataFrame:
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


def first_existing_column(df: pd.DataFrame, candidates: list[str]) -> str | None:
    for col in candidates:
        if col in df.columns:
            return col
    return None


def clean_numeric(value, invalid_codes: set[int] = MISSING_NUMERIC_CODES):
    if pd.isna(value):
        return np.nan
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return np.nan
    if int(numeric) == numeric and int(numeric) in invalid_codes:
        return np.nan
    return numeric


def has_positive_frequency(row, quantity_col: str, unit_col: str | None = None, duration_col: str | None = None) -> bool | None:
    """Return whether a newer NHANES frequency/duration pair reports activity."""
    quantity = clean_numeric(row.get(quantity_col), {7777, 9999, 77, 99})
    if pd.isna(quantity):
        return None
    if quantity <= 0:
        return False

    if unit_col is not None:
        unit = row.get(unit_col)
        if pd.isna(unit) or str(unit).strip() == "":
            return None

    if duration_col is not None:
        duration = clean_numeric(row.get(duration_col), {7777, 9999, 77, 99})
        if pd.isna(duration):
            return None
        if duration <= 0:
            return False

    return True


def derive_smoking_status(df: pd.DataFrame) -> pd.Series:
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
    
    return cast(pd.Series, df.apply(classify, axis=1))


def derive_physical_activity(df: pd.DataFrame) -> pd.Series:
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
            # 2021-2023 changed from yes/no PAQ605-style variables to
            # frequency + unit + duration variables.
            vigorous = has_positive_frequency(row, 'PAD810Q', 'PAD810U', 'PAD820')
            moderate = has_positive_frequency(row, 'PAD790Q', 'PAD790U', 'PAD800')

            if vigorous is True:
                return 'Active'
            if moderate is True:
                return 'Moderate'
            if vigorous is False and moderate is False:
                return 'Sedentary'
            return 'Unknown'
        
        return 'Sedentary'
    
    return cast(pd.Series, df.apply(classify, axis=1))


def derive_alcohol_use(df: pd.DataFrame) -> pd.Series:
    def classify_new_alq(row):
        """Classify 2017+ alcohol questionnaire variables."""
        alq111 = clean_numeric(row.get('ALQ111'), {7, 9, 77, 99})
        alq121 = clean_numeric(row.get('ALQ121'), {77, 99})
        alq130 = clean_numeric(row.get('ALQ130'), {777, 999})

        if pd.isna(alq111):
            return None
        if alq111 == 2:
            return NO_ALCOHOL_LABEL
        if alq111 != 1:
            return 'Unknown'

        # ALQ121 frequency codes: 1=daily, 2=nearly daily, 3=3-4/week,
        # 4=2/week, 5=1/week, 6=2-3/month, 7=monthly, 8=7-11/year,
        # 9=3-6/year, 10=1-2/year, 0=never in past year.
        frequency_per_week = {
            0: 0.0,
            1: 7.0,
            2: 5.0,
            3: 3.5,
            4: 2.0,
            5: 1.0,
            6: 2.5 / 4.345,
            7: 1.0 / 4.345,
            8: 9.0 / 52.0,
            9: 4.5 / 52.0,
            10: 1.5 / 52.0,
        }

        if pd.isna(alq121):
            return 'Light'
        weekly_frequency = frequency_per_week.get(int(alq121))
        if weekly_frequency is None:
            return 'Unknown'
        if weekly_frequency == 0:
            return NO_ALCOHOL_LABEL
        if pd.isna(alq130):
            return 'Light'

        weekly_drinks = weekly_frequency * alq130
        if weekly_drinks > 7:
            return 'Heavy'
        if weekly_drinks > 3:
            return 'Moderate'
        return 'Light'

    def classify(row):
        new_status = classify_new_alq(row)
        if new_status is not None:
            return new_status

        alq101 = row.get('ALQ101')
        alq130 = row.get('ALQ130')
        alq120q = row.get('ALQ120Q')
        alq120u = row.get('ALQ120U')
        
        if pd.isna(alq101):
            return 'Unknown'
        
        if alq101 == 2:  # No drinking
            return NO_ALCOHOL_LABEL
        
        if alq101 == 1:  # Drinks
            # Try to estimate weekly drinks
            alq120q = clean_numeric(alq120q, {777, 999, 77, 99})
            alq120u = clean_numeric(alq120u, {7, 9, 77, 99})
            alq130 = clean_numeric(alq130, {777, 999, 77, 99})

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
    
    return cast(pd.Series, df.apply(classify, axis=1))


def derive_family_history_diabetes(mcq: pd.DataFrame) -> pd.Series:
    if 'MCQ300C' not in mcq.columns:
        return pd.Series([np.nan] * len(mcq))
    return (mcq['MCQ300C'] == 1).astype(float).where(mcq['MCQ300C'].notna())


def process_cycle(suffix: str, year: str) -> pd.DataFrame:
    print(f"\n[CYCLE] {year} (suffix _{suffix})")
    
    # Load core files
    demo = load_xpt(f"DEMO_{suffix}")
    ghb = load_xpt(f"GHB_{suffix}")
    glu = load_xpt(f"GLU_{suffix}")
    tchol = load_xpt(f"TCHOL_{suffix}")
    hdl = load_xpt(f"HDL_{suffix}")
    trigly = load_xpt(f"TRIGLY_{suffix}")
    bmx = load_xpt(f"BMX_{suffix}")
    # BP file: 2021-2023 uses oscillometric BPXO instead of BPX.
    bpx_file_base = BP_FILE_BY_SUFFIX.get(suffix, "BPX")
    bpx = load_xpt(f"{bpx_file_base}_{suffix}")
    if bpx.empty and bpx_file_base != "BPX":
        bpx = load_xpt(f"BPX_{suffix}")
    rhq = load_xpt(f"RHQ_{suffix}")
    
    # Load lifestyle files
    smq = load_xpt(f"SMQ_{suffix}")
    paq = load_xpt(f"PAQ_{suffix}")
    alq = load_xpt(f"ALQ_{suffix}")
    
    # Load diabetes questionnaire (self-reported diagnosis)
    diq = load_xpt(f"DIQ_{suffix}")
    
    # Load new enrichment files
    mcq = load_xpt(f"MCQ_{suffix}")    # Medical conditions (family history)
    ins = load_xpt(f"INS_{suffix}") if suffix in INS_AVAILABLE_SUFFIXES else pd.DataFrame()
    hscrp = load_xpt(f"HSCRP_{suffix}") if suffix in HSCRP_AVAILABLE_SUFFIXES else pd.DataFrame()
    
    if demo.empty:
        return pd.DataFrame()
    
    demo_cols = ['SEQN', 'RIDAGEYR', 'RIAGENDR']
    df = cast(pd.DataFrame, demo[demo_cols].copy())
    
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
        if hdl_col is not None:
            rename_cols = cast(dict[str, str], {hdl_col: 'LBDHDD'})
            df = df.merge(hdl[['SEQN', hdl_col]].rename(columns=rename_cols), on='SEQN', how='left')
    
    # Triglycerides
    if not trigly.empty:
        tg_cols = ['SEQN']
        trigly_col = first_existing_column(trigly, ['LBXTR', 'LBXTLG'])
        if trigly_col is not None:
            tg_cols.append(trigly_col)
        if 'LBDLDL' in trigly.columns:
            tg_cols.append('LBDLDL')
        if len(tg_cols) > 1:
            trigly_merge = trigly[tg_cols].copy()
            if trigly_col is not None and trigly_col != 'LBXTR':
                trigly_merge = trigly_merge.rename(columns={trigly_col: 'LBXTR'})
            df = df.merge(trigly_merge, on='SEQN', how='left')
    
    # BMI and waist circumference (both from BMX file)
    if not bmx.empty:
        bmx_cols = ['SEQN']
        if 'BMXBMI' in bmx.columns:
            bmx_cols.append('BMXBMI')
        if 'BMXWAIST' in bmx.columns:
            bmx_cols.append('BMXWAIST')
        if len(bmx_cols) > 1:
            df = df.merge(bmx[bmx_cols], on='SEQN', how='left')
            if 'BMXWAIST' in df.columns:
                print(f"  Waist circumference available: {df['BMXWAIST'].notna().sum()} records")
    
    # BP columns: BPXSY1/BPXDI1 or BPXOSY1/BPXODI1
    if not bpx.empty:
        sys_col = 'BPXSY1' if 'BPXSY1' in bpx.columns else 'BPXOSY1' if 'BPXOSY1' in bpx.columns else None
        dia_col = 'BPXDI1' if 'BPXDI1' in bpx.columns else 'BPXODI1' if 'BPXODI1' in bpx.columns else None
        if sys_col is not None and dia_col is not None:
            rename_cols = cast(dict[str, str], {sys_col: 'BPXSY1', dia_col: 'BPXDI1'})
            df = df.merge(bpx[['SEQN', sys_col, dia_col]].rename(
                columns=rename_cols
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
        for col in OLD_PAQ_COLS + NEW_PAQ_COLS:
            if col in paq.columns:
                paq_cols.append(col)
        if len(paq_cols) > 1:
            df = df.merge(paq[paq_cols], on='SEQN', how='left')
    
    if not alq.empty:
        alq_cols = ['SEQN']
        for col in OLD_ALQ_COLS + NEW_ALQ_COLS:
            if col in alq.columns:
                alq_cols.append(col)
        if len(alq_cols) > 1:
            df = df.merge(alq[alq_cols], on='SEQN', how='left')
    
    # Merge DIQ010 (self-reported diabetes diagnosis)
    if not diq.empty and 'DIQ010' in diq.columns:
        df = df.merge(diq[['SEQN', 'DIQ010']], on='SEQN', how='left')
        print(f"  DIQ010 available: {df['DIQ010'].notna().sum()} records")
    
    # Merge MCQ300C (family history of diabetes)
    if not mcq.empty:
        fh = derive_family_history_diabetes(mcq)
        mcq_merge = mcq[['SEQN']].copy()
        mcq_merge['family_history_diabetes'] = fh.values
        df = df.merge(mcq_merge, on='SEQN', how='left')
        fh_available = df['family_history_diabetes'].notna().sum()
        print(f"  Family history diabetes available: {fh_available} records")
    else:
        df['family_history_diabetes'] = np.nan
        print(f"  Family history diabetes: NOT AVAILABLE for {year}")
    
    # Merge LBXIN (fasting insulin)
    if not ins.empty and 'LBXIN' in ins.columns:
        df = df.merge(ins[['SEQN', 'LBXIN']], on='SEQN', how='left')
        print(f"  Fasting insulin available: {df['LBXIN'].notna().sum()} records")
    
    # Merge high-sensitivity C-reactive protein.
    # 2015+ files use LBXHSCRP; older code expected LBXCRP.
    if not hscrp.empty:
        crp_col = first_existing_column(hscrp, ['LBXCRP', 'LBXHSCRP'])
        if crp_col is not None:
            crp_merge = hscrp[['SEQN', crp_col]].copy()
            if crp_col != 'LBXCRP':
                crp_merge = crp_merge.rename(columns={crp_col: 'LBXCRP'})
            df = df.merge(crp_merge, on='SEQN', how='left')
            print(f"  CRP available: {df['LBXCRP'].notna().sum()} records")
    
    df['cycle'] = year
    print(f"  Raw records: {len(df)}")
    
    return df


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("NHANES Multi-Cycle Data Processing (with Lifestyle Factors)")
    print("=" * 60)
    
    # Process all cycles
    all_dfs: list[pd.DataFrame] = []
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
    
    # Operational no-period cohort. RHQ031 == 2 means no period in the
    # past 12 months; it does not by itself establish natural menopause.
    df = df[df['RHQ031'] == 2]
    print(f"  After no-period (RHQ031=2) filter: {len(df)}")
    
    # Complete HbA1c is required for reference-label construction. Complete FBS
    # is used here as the fasting-lab availability gate because the active
    # model depends on measured fasting-subsample lipid predictors (TG/LDL).
    # FBS itself remains excluded from the non-circular model feature set.
    if 'LBXGH' in df.columns:
        before_hba1c = len(df)
        df = df.dropna(subset=['LBXGH'])
        dropped_hba1c = before_hba1c - len(df)
        print(f"  After complete HbA1c filter: {len(df)}")
        if 'LBXGLU' in df.columns:
            before_fasting_lab = len(df)
            df = df.dropna(subset=['LBXGLU'])
            print(f"  After fasting-lab availability filter: {len(df)}")
            print(f"  Dropped {before_fasting_lab - len(df)} records missing FBS/fasting-lab linkage")
        print(f"  Dropped {dropped_hba1c} records missing HbA1c")
    
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
        'BMXWAIST': 'waist_circumference',
        'BPXSY1': 'systolic',
        'BPXDI1': 'diastolic',
        'LBXIN': 'fasting_insulin',
        'LBXCRP': 'crp',
    }
    rename_cols = {k: v for k, v in rename_map.items() if k in df.columns}
    df = df.rename(columns=rename_cols)
    
    # Select final columns (including lifestyle, enrichment features, and self-reported diabetes)
    final_cols = ['SEQN', 'age', 'hba1c', 'fbs', 'bmi', 'total_cholesterol',
                  'ldl', 'hdl', 'triglycerides', 'systolic', 'diastolic',
                  'waist_circumference', 'fasting_insulin', 'crp',
                  'family_history_diabetes',
                  'smoking_status', 'physical_activity', 'alcohol_use',
                  'DIQ010', 'cycle']
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
    
    print(f"\n[STATS] Enrichment features:")
    for col in ['waist_circumference', 'fasting_insulin', 'crp', 'family_history_diabetes']:
        if col in df.columns:
            n_avail = df[col].notna().sum()
            print(f"  {col}: {n_avail}/{len(df)} available ({n_avail/len(df)*100:.1f}%)")
        else:
            print(f"  {col}: NOT IN DATASET")


if __name__ == "__main__":
    main()
