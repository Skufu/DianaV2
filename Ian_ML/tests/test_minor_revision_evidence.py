"""Integrity tests for the post-defense minor-revision evidence pack."""

from __future__ import annotations

import joblib
import numpy as np
import pandas as pd

from scripts.thesis.generate_minor_revision_evidence import (
    CLUSTER_FEATURES,
    DATA_PATH,
    MODEL_DIR,
    RESULTS_DIR,
    build_centroid_evidence,
    build_menstrual_comparator,
    build_information_gain_audit,
    build_model_selection_evidence,
    build_reproductive_status_reason_audit,
    build_target_label_source_audit,
    build_cluster_stability,
    classify_diq010_only,
    classify_hba1c_only,
    information_gain,
    legacy_missing_unsafe_ig,
    load_cluster_inputs,
    reconstruct_raw_nhanes,
    weighted_k_sensitivity_scan,
)


def test_missing_rows_do_not_create_artificial_information_gain() -> None:
    target = pd.Series([0, 1, 0, 1, 0, 1, 0, 1])
    feature = pd.Series([0.0, 0.0, 1.0, 1.0, np.nan, np.nan, np.nan, np.nan])
    explicit_partition = feature.astype("object").where(feature.notna(), "Missing")

    corrected = information_gain(target, explicit_partition)
    legacy = legacy_missing_unsafe_ig(target, feature, bins=2)

    assert corrected == 0.0
    assert legacy > 0.4


def test_information_gain_audit_reduces_missing_heavy_inflation() -> None:
    data = pd.read_csv(DATA_PATH)
    audit, target_entropy = build_information_gain_audit(data)
    crp = audit[audit["feature"] == "crp"].iloc[0]
    insulin = audit[audit["feature"] == "fasting_insulin"].iloc[0]

    assert np.isclose(target_entropy, 0.996773, atol=1e-6)
    assert crp["missing_pct"] > 45
    assert crp["corrected_ig_missing_as_category"] < 0.05
    assert crp["legacy_missing_unsafe_ig"] > 0.45
    assert insulin["corrected_ig_missing_as_category"] < 0.10
    assert insulin["legacy_missing_unsafe_ig"] > 0.30


def test_reproductive_reason_audit_preserves_code_era_boundaries() -> None:
    audit = build_reproductive_status_reason_audit(reconstruct_raw_nhanes())
    counts = {
        (row.era, int(row.response_code)): int(row.count)
        for row in audit.itertuples(index=False)
    }

    assert counts == {
        ("2009-2012", 7): 402,
        ("2009-2012", 8): 6,
        ("2009-2012", 9): 3,
        ("2009-2012", 99): 1,
        ("2013-2023", 3): 310,
        ("2013-2023", 7): 581,
        ("2013-2023", 9): 70,
        ("2013-2023", 99): 3,
    }
    totals = audit.groupby("era")["count"].sum().to_dict()
    assert totals == {"2009-2012": 412, "2013-2023": 964}
    assert int(audit["count"].sum()) == 1376


def test_target_label_source_agreement_flags_circular_hybrid_check() -> None:
    audit = build_target_label_source_audit(reconstruct_raw_nhanes()).set_index(
        "comparison"
    )
    direct = audit.loc["DIQ010-only vs HbA1c-only"]
    hybrid = audit.loc["Hybrid operational label vs HbA1c-only"]

    assert direct["eligible_valid_pair_n"] == 1376
    assert direct["agreement_n"] == 831
    assert np.isclose(direct["agreement_pct"], 60.3924418605)
    assert hybrid["eligible_valid_pair_n"] == 1376
    assert hybrid["agreement_n"] == 1295
    assert np.isclose(hybrid["agreement_pct"], 94.1133720930)
    assert "Circular by construction" in hybrid["interpretation"]


def test_source_only_label_helpers_leave_invalid_values_unclassified() -> None:
    assert classify_diq010_only(1) == "Diabetic"
    assert classify_diq010_only(2) == "Normal"
    assert classify_diq010_only(3) == "Pre-diabetic"
    assert classify_diq010_only(7) is None
    assert classify_diq010_only(np.nan) is None
    assert classify_hba1c_only(5.6) == "Normal"
    assert classify_hba1c_only(5.7) == "Pre-diabetic"
    assert classify_hba1c_only(6.5) == "Diabetic"
    assert classify_hba1c_only("invalid") is None


def test_frozen_cluster_artifacts_assign_all_734_at_risk_records() -> None:
    data = pd.read_csv(DATA_PATH)
    cluster = load_cluster_inputs(data)
    centroids, mapping = build_centroid_evidence(cluster)

    assert len(cluster["labels"]) == 734
    assert int(centroids["count"].sum()) == 734
    assert set(mapping.values()) == {
        "SIRD-like",
        "SIDD-like",
        "MOD-like",
        "MARD-like",
    }

    expected = {
        "SIRD-like": 77,
        "SIDD-like": 199,
        "MOD-like": 226,
        "MARD-like": 232,
    }
    got = centroids.set_index("assigned_proxy_label")["count"].to_dict()
    assert got == expected


def test_centroid_waterfall_matches_saved_label_metadata() -> None:
    data = pd.read_csv(DATA_PATH)
    cluster = load_cluster_inputs(data)
    _, mapping = build_centroid_evidence(cluster)
    saved = pd.read_json(MODEL_DIR / "cluster_labels.json", orient="index")
    saved_mapping = {
        int(cluster_id): f"{row['label']}-like" for cluster_id, row in saved.iterrows()
    }
    assert mapping == saved_mapping


def test_full_734_weight_perturbation_stability_is_high() -> None:
    data = pd.read_csv(DATA_PATH)
    cluster = load_cluster_inputs(data)
    _, mapping = build_centroid_evidence(cluster)
    perturbations, seeds = build_cluster_stability(cluster, mapping)

    assert perturbations["adjusted_rand_index"].min() >= 0.90
    assert perturbations["semantic_label_agreement"].min() >= 0.95
    assert seeds["adjusted_rand_index"].min() >= 0.94


def test_weighted_k_scan_matches_manuscript_table() -> None:
    data = pd.read_csv(DATA_PATH)
    scan = weighted_k_sensitivity_scan(load_cluster_inputs(data)).set_index("k")

    expected = {
        2: (0.2176053, 1.6605460, 209.03067),
        3: (0.2068368, 1.5582676, 193.20809),
        4: (0.2079213, 1.3833672, 187.42947),
        5: (0.1760811, 1.4415339, 170.42361),
        6: (0.1632142, 1.4960109, 155.52674),
    }
    assert scan.index.tolist() == [2, 3, 4, 5, 6]
    for k, values in expected.items():
        got = scan.loc[
            k,
            [
                "silhouette_weighted_geometry",
                "davies_bouldin_weighted_geometry",
                "calinski_harabasz_weighted_geometry",
            ],
        ].to_numpy(dtype=float)
        assert np.allclose(got, values, atol=1e-5)
    assert int(scan["silhouette_weighted_geometry"].idxmax()) == 2
    assert int(scan["davies_bouldin_weighted_geometry"].idxmin()) == 4


def test_menstrual_comparator_uses_operational_development_group_name() -> None:
    raw = reconstruct_raw_nhanes()
    data = pd.read_csv(DATA_PATH)
    cluster = load_cluster_inputs(data)
    _, mapping = build_centroid_evidence(cluster)
    profiles, _, summary = build_menstrual_comparator(raw, cluster, mapping)

    assert set(profiles["group"]) == {
        "No period in prior year (development)",
        "Menstruating comparison",
    }
    assert summary["development_eligible_n"] == 1376
    assert summary["development_at_risk_n"] == 734


def test_logistic_regression_wins_outer_auc_and_inner_selection_in_all_cycles() -> None:
    fold_metrics = pd.read_csv(RESULTS_DIR / "logo_fold_metrics.csv")
    _, comparisons, inner_selection = build_model_selection_evidence(fold_metrics)

    assert comparisons["lr_wins_out_of_6"].eq(6).all()
    assert inner_selection["inner_selected_model"].eq("Logistic Regression").all()


def test_saved_cluster_model_uses_expected_feature_width() -> None:
    model = joblib.load(MODEL_DIR / "weighted_kmeans_model.joblib")
    assert model.n_features_in_ == len(CLUSTER_FEATURES)
    assert len(model.weights_) == len(CLUSTER_FEATURES)
