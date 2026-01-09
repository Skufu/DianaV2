#!/usr/bin/env python3
"""
Debug script to find why 2021-2023 cycle is being dropped during training.
Run: source venv/bin/activate && python scripts/debug_data.py
"""

import pandas as pd
import numpy as np

print("=" * 60)
print("DIANA Data Debug - Finding Missing 2021-2023 Cycle")
print("=" * 60)

# Load imputed data
df = pd.read_csv('data/nhanes/processed/diana_dataset_imputed.csv')
print(f"\n[LOAD] Total records: {len(df)}")
print(f"Cycles: {df['cycle'].unique()}")

# Check 2021-2023 specifically
df_2021 = df[df['cycle'] == '2021-2023']
print(f"\n[2021-2023] Records: {len(df_2021)}")

# Simulate train.py feature engineering
print("\n[FEATURE ENGINEERING] Checking each step...")

BASE_FEATURES = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'systolic', 'diastolic']
TARGET = 'diabetes_label'

# Step 1: Base dropna
df_clean = df.dropna(subset=BASE_FEATURES + [TARGET, 'cycle'])
print(f"After base dropna: {len(df_clean)} total, {len(df_clean[df_clean['cycle'] == '2021-2023'])} from 2021-2023")

# Step 2: Add engineered features
df_clean = df_clean.copy()
df_clean['bmi_category'] = df_clean['bmi'].apply(lambda x: 3 if x >= 30 else (2 if x >= 25 else (1 if x >= 18.5 else 0)))
df_clean['tg_hdl_ratio'] = df_clean['triglycerides'] / df_clean['hdl'].replace(0, np.nan)
df_clean['ldl_hdl_ratio'] = df_clean['ldl'] / df_clean['hdl'].replace(0, np.nan)
df_clean['age_group'] = pd.cut(df_clean['age'], bins=[0, 50, 55, 60, 100], labels=[0, 1, 2, 3]).astype(float)

# BP category
df_clean['bp_category'] = 0  # simplified
df_clean.loc[(df_clean['systolic'] >= 120) | (df_clean['diastolic'] >= 80), 'bp_category'] = 1
df_clean.loc[(df_clean['systolic'] >= 140) | (df_clean['diastolic'] >= 90), 'bp_category'] = 2
df_clean['hypertension'] = ((df_clean['systolic'] >= 140) | (df_clean['diastolic'] >= 90)).astype(float)

# Lifestyle encoding - THIS IS THE PROBLEM AREA
print("\n[LIFESTYLE] Checking encoding...")
print(f"smoking_status unique: {df_clean['smoking_status'].unique()}")
print(f"physical_activity unique: {df_clean['physical_activity'].unique()}")
print(f"alcohol_use unique: {df_clean['alcohol_use'].unique()}")

# Check the mappings used in train.py
smoking_map = {'Never': 0, 'Former': 1, 'Current': 2}
activity_map = {'Sedentary': 0, 'Light': 1, 'Moderate': 2, 'Active': 3}  # 'Light' doesn't exist!
alcohol_map = {'Never': 0, 'Light': 1, 'Moderate': 2, 'Heavy': 3}  # 'Never' doesn't exist!

df_clean['smoking_encoded'] = df_clean['smoking_status'].map(smoking_map)
df_clean['activity_encoded'] = df_clean['physical_activity'].map(activity_map)
df_clean['alcohol_encoded'] = df_clean['alcohol_use'].map(alcohol_map)

print("\n[ENCODING RESULTS]")
print(f"smoking_encoded NaN: {df_clean['smoking_encoded'].isna().sum()}")
print(f"activity_encoded NaN: {df_clean['activity_encoded'].isna().sum()}")
print(f"alcohol_encoded NaN: {df_clean['alcohol_encoded'].isna().sum()}")

# Combined risk
df_clean['metabolic_risk'] = ((df_clean['tg_hdl_ratio'] > 3.5).astype(float) + 
                               df_clean['hypertension'] + 
                               (df_clean['bmi'] >= 30).astype(float))

# Check each feature for NaN
new_features = ['bmi_category', 'tg_hdl_ratio', 'ldl_hdl_ratio', 'age_group', 
                'bp_category', 'hypertension', 'smoking_encoded', 'activity_encoded',
                'alcohol_encoded', 'metabolic_risk']

print("\n[NAN CHECK] Per engineered feature:")
for feat in new_features:
    nan_count = df_clean[feat].isna().sum()
    nan_2021 = df_clean[df_clean['cycle'] == '2021-2023'][feat].isna().sum()
    print(f"  {feat}: {nan_count} total NaN, {nan_2021} in 2021-2023")

# Simulate the dropna loop in train.py
print("\n[DROPNA SIMULATION]")
for feat in new_features:
    before = len(df_clean)
    before_2021 = len(df_clean[df_clean['cycle'] == '2021-2023'])
    df_clean = df_clean.dropna(subset=[feat])
    after = len(df_clean)
    after_2021 = len(df_clean[df_clean['cycle'] == '2021-2023'])
    if before != after:
        print(f"  {feat}: {before} → {after} (lost {before-after}, 2021-2023: {before_2021} → {after_2021})")

print(f"\n[FINAL] Records: {len(df_clean)}")
print(f"Cycles remaining: {df_clean['cycle'].unique()}")
print(f"2021-2023 remaining: {len(df_clean[df_clean['cycle'] == '2021-2023'])}")

print("\n" + "=" * 60)
print("FIX: Update train.py activity_map and alcohol_map:")
print("  activity_map = {'Sedentary': 0, 'Moderate': 1, 'Active': 2, 'Unknown': np.nan}")
print("  alcohol_map = {'None': 0, 'Light': 1, 'Moderate': 2, 'Heavy': 3}")
print("=" * 60)
