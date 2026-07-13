"""Persistent proof for fold-local imputation and exploratory feature contracts."""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold, LeaveOneGroupOut

from Ian_ML.common.paths import MODELS_ROOT, NHANES_PROCESSED_ROOT
from Ian_ML.service.predict import ClinicalPredictor
from Ian_ML.training.explore_expanded_non_circular import (
    EXPANDED_FEATURES,
    EXPANDED_RAW_CONCEPTS,
    FORBIDDEN_PREDICTORS,
    build_preprocessor as build_expanded_preprocessor,
    encode_allowed_lifestyle_fields,
    evaluate_feature_set,
    feature_sets,
)
from Ian_ML.training.explore_unlabeled_centroids import (
    FORBIDDEN_CLUSTER_FEATURES,
    CohortPreprocessor,
    specifications,
    validate_specification,
)
from Ian_ML.training.train_binary_v2_no_bp import (
    MODEL_FEATURES,
    create_binary_v2_no_bp_target,
    engineer_features,
    get_preprocessing_pipeline,
)
from Ian_ML.training.validate_no_leakage import rank_features_by_ig


DATA_PATH = NHANES_PROCESSED_ROOT / "diana_dataset_final.csv"
ACTIVE_MODELS_DIR = MODELS_ROOT / "binary_v2_no_bp"


def _training_arrays() -> tuple[pd.DataFrame, np.ndarray, np.ndarray]:
    frame = create_binary_v2_no_bp_target(engineer_features(pd.read_csv(DATA_PATH)))
    frame = frame.dropna(subset=["at_risk_binary_v2_no_bp", "cycle"]).copy()
    X = frame[MODEL_FEATURES].to_numpy(dtype=float)
    groups = frame["cycle"].astype(str).to_numpy()
    return frame, X, groups


def _continuous_statistics(preprocessor) -> np.ndarray:
    return np.asarray(
        preprocessor.named_transformers_["continuous"].named_steps["imputer"].statistics_,
        dtype=float,
    )


def test_bmi_and_waist_imputation_is_fitted_inside_every_outer_logo_fold():
    _, X, groups = _training_arrays()
    bmi_index = MODEL_FEATURES.index("bmi")
    waist_index = MODEL_FEATURES.index("waist_circumference")

    folds = 0
    for train_idx, test_idx in LeaveOneGroupOut().split(X, groups=groups):
        preprocessor = get_preprocessing_pipeline().fit(X[train_idx])
        statistics = _continuous_statistics(preprocessor)
        assert statistics[bmi_index] == np.nanmedian(X[train_idx, bmi_index])
        assert statistics[waist_index] == np.nanmedian(X[train_idx, waist_index])
        transformed = preprocessor.transform(X[test_idx])
        assert transformed.shape == (len(test_idx), len(MODEL_FEATURES))
        assert np.isfinite(transformed).all()
        folds += 1

    assert folds == len(np.unique(groups)) == 6


def test_bmi_and_waist_imputation_is_fitted_inside_every_inner_training_split():
    _, X, groups = _training_arrays()
    bmi_index = MODEL_FEATURES.index("bmi")
    waist_index = MODEL_FEATURES.index("waist_circumference")
    inner_fits = 0

    for outer_train, _ in LeaveOneGroupOut().split(X, groups=groups):
        X_outer = X[outer_train]
        groups_outer = groups[outer_train]
        inner = GroupKFold(n_splits=3)
        for inner_train, inner_valid in inner.split(X_outer, groups=groups_outer):
            preprocessor = get_preprocessing_pipeline().fit(X_outer[inner_train])
            statistics = _continuous_statistics(preprocessor)
            assert statistics[bmi_index] == np.nanmedian(X_outer[inner_train, bmi_index])
            assert statistics[waist_index] == np.nanmedian(X_outer[inner_train, waist_index])
            assert np.isfinite(preprocessor.transform(X_outer[inner_valid])).all()
            inner_fits += 1

    assert inner_fits == 18


def test_saved_classifier_is_pipeline_with_training_fitted_bmi_waist_imputer():
    _, X, _ = _training_arrays()
    artifact = joblib.load(ACTIVE_MODELS_DIR / "best_model.joblib")
    assert list(artifact.named_steps)[:2] == ["preprocessor", "model"]
    statistics = _continuous_statistics(artifact.named_steps["preprocessor"])
    assert statistics[MODEL_FEATURES.index("bmi")] == np.nanmedian(
        X[:, MODEL_FEATURES.index("bmi")]
    )
    assert statistics[MODEL_FEATURES.index("waist_circumference")] == np.nanmedian(
        X[:, MODEL_FEATURES.index("waist_circumference")]
    )

    missing = X[:2].copy()
    missing[0, MODEL_FEATURES.index("bmi")] = np.nan
    missing[1, MODEL_FEATURES.index("waist_circumference")] = np.nan
    assert np.isfinite(artifact.predict_proba(missing)).all()


def test_serving_missing_waist_uses_saved_pipeline_not_bmi_ratio_override():
    predictor = ClinicalPredictor(models_dir=ACTIVE_MODELS_DIR)
    patient = {
        "bmi": 21.5,
        "triglycerides": 100.0,
        "ldl": 90.0,
        "hdl": 55.0,
        "age": 40.0,
        "smoking_status": "Never",
        "physical_activity": "Moderate",
        "alcohol_use": "None",
    }
    vector = predictor._build_feature_vector(patient)
    waist_index = predictor.features.index("waist_circumference")
    assert np.isnan(vector[0, waist_index])

    direct_probability = float(predictor.classifier.predict_proba(vector)[0, 1])
    served = predictor.predict(patient)
    assert served["success"] is True
    assert served["at_risk_probability"] == round(direct_probability, 3)


def test_expanded_contract_includes_crp_and_all_declared_non_circular_concepts():
    declared = feature_sets()
    assert len(EXPANDED_RAW_CONCEPTS) == 15
    assert len(EXPANDED_FEATURES) == 15
    assert "crp" in EXPANDED_FEATURES
    assert "fasting_insulin" in EXPANDED_FEATURES
    assert "systolic" in EXPANDED_FEATURES and "diastolic" in EXPANDED_FEATURES
    assert set(declared["expanded_all_15"]) == set(EXPANDED_FEATURES)
    assert not (set(EXPANDED_FEATURES) & FORBIDDEN_PREDICTORS)


def test_expanded_fold_imputer_learns_bmi_waist_crp_from_training_rows_only():
    raw = pd.read_csv(DATA_PATH)
    frame = encode_allowed_lifestyle_fields(raw)
    groups = frame["cycle"].astype(str).to_numpy()
    tracked = ["bmi", "waist_circumference", "crp"]

    for train_idx, test_idx in LeaveOneGroupOut().split(frame, groups=groups):
        train = frame.iloc[train_idx]
        test = frame.iloc[test_idx]
        preprocessor = build_expanded_preprocessor(EXPANDED_FEATURES).fit(train[EXPANDED_FEATURES])
        continuous_columns = list(preprocessor.transformers_[0][2])
        statistics = _continuous_statistics(preprocessor)
        for feature in tracked:
            learned = statistics[continuous_columns.index(feature)]
            assert learned == np.nanmedian(train[feature].to_numpy(dtype=float))
        transformed = preprocessor.transform(test[EXPANDED_FEATURES])
        assert transformed.shape == (len(test), len(EXPANDED_FEATURES))
        assert np.isfinite(transformed).all()


def test_expanded_preprocessor_keeps_width_when_training_crp_is_entirely_missing():
    raw = encode_allowed_lifestyle_fields(pd.read_csv(DATA_PATH)).iloc[:80].copy()
    raw["crp"] = np.nan
    preprocessor = build_expanded_preprocessor(EXPANDED_FEATURES)
    transformed = preprocessor.fit_transform(raw[EXPANDED_FEATURES])
    assert transformed.shape == (len(raw), len(EXPANDED_FEATURES))
    assert np.isfinite(transformed).all()


def test_expanded_crp_all_feature_pipeline_trains_end_to_end_across_six_cycles():
    frame = encode_allowed_lifestyle_fields(pd.read_csv(DATA_PATH))
    frame["target"] = (frame["diabetes_label"] >= 1).astype(int)
    folds, predictions, imputations = evaluate_feature_set(
        frame,
        list(EXPANDED_FEATURES),
        "expanded_all_15",
        "regression_test",
    )
    assert len(folds) == 6
    assert len(predictions) == len(frame) == 1376
    assert len(imputations) == 6
    assert {row["test_cycle"] for row in folds} == set(frame["cycle"].astype(str).unique())
    assert all(np.isfinite(row["roc_auc"]) for row in folds)
    assert all("median_crp" in row and "median_waist_circumference" in row for row in imputations)


def test_expanded_experiment_retains_all_rows_instead_of_complete_case_deletion():
    raw = pd.read_csv(DATA_PATH)
    frame = encode_allowed_lifestyle_fields(raw)
    frame["target"] = (frame["diabetes_label"] >= 1).astype(int)
    retained = frame.dropna(subset=["target", "cycle"])
    assert len(raw) == len(retained) == 1376
    assert retained["bmi"].isna().any()
    assert retained["waist_circumference"].isna().any()
    assert retained["crp"].isna().any()


def test_retrain_gate_information_gain_counts_missing_rows_explicitly():
    frame = pd.read_csv(DATA_PATH)
    frame["target"] = (frame["diabetes_label"] >= 1).astype(str)
    audit = rank_features_by_ig(
        frame,
        ["crp", "fasting_insulin", "family_history_diabetes"],
        "target",
    ).set_index("Feature")
    assert audit.loc["crp", "Missing_Percentage"] == 48.26
    assert audit.loc["crp", "Information_Gain"] == 0.024212
    assert audit.loc["fasting_insulin", "Information_Gain"] == 0.060456
    assert audit.loc["family_history_diabetes", "Information_Gain"] == 0.014425


def test_unlabeled_cluster_specs_scan_broad_k_and_never_use_outcomes_as_features():
    declared = specifications()
    assert declared["core6_all_equal"]["k_max"] == 20
    assert declared["core6_operational_positive_weighted"]["k_max"] == 20
    assert declared["expanded8_recent_equal"]["k_max"] == 15
    assert "crp" in declared["expanded8_recent_equal"]["features"]
    assert "fasting_insulin" in declared["expanded8_recent_equal"]["features"]
    for spec in declared.values():
        validate_specification(spec)
        assert not (set(spec["features"]) & FORBIDDEN_CLUSTER_FEATURES)


def test_unlabeled_cluster_preprocessor_imputes_before_transform_and_scaling():
    raw = pd.read_csv(DATA_PATH).iloc[:100].copy()
    features = list(specifications()["expanded8_recent_equal"]["features"])
    raw.loc[:, "crp"] = np.nan
    preprocessor = CohortPreprocessor(
        features,
        list(specifications()["expanded8_recent_equal"]["log_features"]),
    )
    transformed = preprocessor.fit_transform(raw)
    assert transformed.shape == (len(raw), len(features))
    assert np.isfinite(transformed).all()
