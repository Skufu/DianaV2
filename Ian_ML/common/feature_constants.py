"""
FEATURE_CONSTANTS.py - Single Source of Truth for Feature Definitions

This module centralizes ALL feature definitions to prevent the boot loop bug
caused by mismatched feature counts between training and serving code.

IMPORTANT: Import from this file instead of hardcoding feature lists.
Never define feature lists in multiple places.

Bug History:
- Boot loop occurred when training used 13 features but serving expected 5
- Root cause: CLUSTER_FEATURES hardcoded in multiple files without synchronization

Usage:
    from Ian_ML.common.feature_constants import (
        CLUSTER_FEATURES,
        CLINICAL_FEATURES,
        ADA_FEATURES,
        CLUSTER_FEATURE_COUNT,
        CLINICAL_FEATURE_COUNT,
    )
"""

from typing import List

# =============================================================================
# CLUSTER FEATURES - K-Means Clustering (Ahlqvist Subtypes)
# =============================================================================
# 6 features used for K-Means clustering to identify T2DM subtypes
# Base clinical biomarkers (non-circular, no HbA1c/FBS)
# waist_circumference added per Diabetologia 2024 ML study showing it
# significantly improves SIRD identification in Ahlqvist-style clustering
CLUSTER_FEATURES: List[str] = [
    'bmi',
    'triglycerides',
    'ldl',
    'hdl',
    'age',
    'waist_circumference',
]

CLUSTER_FEATURE_COUNT: int = len(CLUSTER_FEATURES)

# =============================================================================
# CLINICAL FEATURES - Binary/Classification Models (Non-Circular)
# =============================================================================
# Active binary_v2_no_bp production contract (artifact-aligned):
# 6 continuous + 3 ordinal LR-safe features.
CLINICAL_FEATURES_NO_BP: List[str] = [
    'bmi',
    'triglycerides',
    'ldl',
    'hdl',
    'age',
    'waist_circumference',
    'smoking_encoded',
    'activity_encoded',
    'alcohol_encoded',
]

CLINICAL_FEATURES_WITH_BP: List[str] = [
    'bmi',
    'triglycerides',
    'ldl',
    'hdl',
    'age',
    'systolic',
    'diastolic',
    'bmi_category',
    'tg_hdl_ratio',
    'smoking_encoded',
    'activity_encoded',
    'alcohol_encoded',
    'metabolic_syndrome_score',
    'waist_circumference',
    'family_history_diabetes',
]

CLINICAL_FEATURES_WITH_BP_NO_FAMILY: List[str] = [
    'bmi',
    'triglycerides',
    'ldl',
    'hdl',
    'age',
    'systolic',
    'diastolic',
    'bmi_category',
    'tg_hdl_ratio',
    'smoking_encoded',
    'activity_encoded',
    'alcohol_encoded',
    'metabolic_syndrome_score',
    'waist_circumference',
]

CLINICAL_FEATURES: List[str] = CLINICAL_FEATURES_NO_BP

CLINICAL_FEATURE_COUNT: int = len(CLINICAL_FEATURES)
CLINICAL_FEATURE_COUNT_NO_BP: int = len(CLINICAL_FEATURES_NO_BP)
CLINICAL_FEATURE_COUNT_WITH_BP: int = len(CLINICAL_FEATURES_WITH_BP)
CLINICAL_FEATURE_COUNT_WITH_BP_NO_FAMILY: int = len(CLINICAL_FEATURES_WITH_BP_NO_FAMILY)

# =============================================================================
# ADA FEATURES - Baseline Diagnostic Model
# =============================================================================
# 6 features for ADA baseline diagnostic model
# Includes HbA1c and FBS (appropriate for diagnostic confirmation)
ADA_FEATURES: List[str] = [
    'hba1c',
    'fbs',
    'bmi',
    'triglycerides',
    'ldl',
    'hdl',
]

ADA_FEATURE_COUNT: int = len(ADA_FEATURES)

# =============================================================================
# RAW INPUT FEATURES - User Input Fields
# =============================================================================
# These are the raw input fields required from the user
# (before feature engineering)
RAW_FEATURES: List[str] = [
    'bmi',
    'triglycerides',
    'ldl',
    'hdl',
    'age',
    'smoking_status',
    'physical_activity',
    'alcohol_use',
    'waist_circumference',
]

RAW_FEATURE_COUNT: int = len(RAW_FEATURES)

# =============================================================================
# VALIDATION RANGES
# =============================================================================
# Acceptable feature count ranges for model validation
# Training must produce models within these bounds
MIN_CLINICAL_FEATURES: int = 9
MAX_CLINICAL_FEATURES: int = 17

# =============================================================================
# AHLQVIST SUBTYPE CONFIGURATION
# =============================================================================
KMEANS_K: int = 4  # Fixed per Ahlqvist et al. (2018) methodology

AHLQVIST_SUBTYPES = {
    'SIRD': {
        'full_name': 'Severe Insulin-Resistant Diabetes',
        'characteristics': 'High BMI, high TG, low HDL (metabolic syndrome pattern)',
        'clinical_implication': 'Responds well to insulin sensitizers (metformin)',
        'risk_level': 'HIGH',
    },
    'SIDD': {
        'full_name': 'Atherogenic / Lipid-Driven Diabetes',
        'subtype': 'ATH',
        'characteristics': 'High LDL cholesterol, severe dyslipidemia (atherogenic phenotype)',
        'clinical_implication': 'Statin therapy indicated; cardiovascular risk management primary; identified via LDL proxy without HOMA2 (adaptation per Tanabe 2024)',
        'risk_level': 'HIGH',
    },
    'MOD': {
        'full_name': 'Mild Obesity-Related Diabetes',
        'characteristics': 'High BMI (>=25 Asia-Pacific WHO cutoff), moderate metabolic markers',
        'clinical_implication': 'Weight management primary intervention',
        'risk_level': 'MODERATE',
    },
    'MARD': {
        'full_name': 'Mild Age-Related Diabetes',
        'characteristics': 'Older age at diagnosis, mild metabolic dysfunction',
        'clinical_implication': 'Conservative management, slower progression',
        'risk_level': 'LOW',
    },
}
