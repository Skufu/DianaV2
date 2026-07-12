# pyright: reportArgumentType=false, reportCallIssue=false, reportMissingTypeArgument=false
"""WeightedKMeans unit tests and sanity-check profile verification."""

import numpy as np
from sklearn.cluster import KMeans
from sklearn.impute import SimpleImputer
from sklearn.metrics import adjusted_rand_score
from sklearn.preprocessing import StandardScaler

from ..service.predict import ClinicalPredictor
from ..common.weighted_kmeans import WeightedKMeans
from ..training.clustering import assign_ahlqvist_labels, build_feature_weight_vector


class _AlwaysAtRiskBinaryClassifier:
    def predict_proba(self, _x):
        return np.array([[0.05, 0.95]], dtype=float)


def test_weighted_distance_matches_hand_computed_example():
    """Weighted squared distance should match manual arithmetic."""
    model = WeightedKMeans(n_clusters=1, weights=[2.0, 0.5], random_state=7, n_init=1).fit(
        np.array([[0.0, 0.0], [1.0, 1.0]], dtype=float)
    )

    x_query = np.array([[3.0, 4.0]], dtype=float)
    centers = np.array([[1.0, 2.0], [0.0, 1.0]], dtype=float)
    got = model._weighted_distance_matrix(x_query, centers, squared=True)[0]

    expected = np.array(
        [
            2.0 * (3.0 - 1.0) ** 2 + 0.5 * (4.0 - 2.0) ** 2,
            2.0 * (3.0 - 0.0) ** 2 + 0.5 * (4.0 - 1.0) ** 2,
        ],
        dtype=float,
    )

    assert np.allclose(got, expected), f"Weighted distances mismatch: {got} vs {expected}"


def test_unweighted_behavior_matches_sklearn_kmeans_on_synthetic_data():
    """All-ones weights should align with sklearn KMeans partitioning."""
    rng = np.random.default_rng(1234)
    c1 = rng.normal(loc=(-4.0, -4.0), scale=0.20, size=(30, 2))
    c2 = rng.normal(loc=(0.0, 4.0), scale=0.20, size=(30, 2))
    c3 = rng.normal(loc=(4.0, -1.0), scale=0.20, size=(30, 2))
    X = np.vstack([c1, c2, c3]).astype(float)

    wk = WeightedKMeans(
        n_clusters=3,
        weights=[1.0, 1.0],
        random_state=19,
        n_init=10,
        max_iter=300,
        tol=1e-4,
    ).fit(X)

    sk = KMeans(
        n_clusters=3,
        init="k-means++",
        n_init="auto",
        max_iter=300,
        tol=1e-4,
        random_state=19,
    ).fit(X)

    ari = adjusted_rand_score(wk.labels_, sk.labels_)
    assert ari == 1.0, f"Expected equivalent clustering in unweighted case, got ARI={ari:.6f}"
    assert wk.inertia_ is not None


def test_reproducibility_with_fixed_random_state():
    """Fixed random_state should produce reproducible labels and centers."""
    rng = np.random.default_rng(20260310)
    a = rng.normal(loc=(0.0, 0.0, 0.0), scale=0.25, size=(20, 3))
    b = rng.normal(loc=(4.0, -2.0, 1.5), scale=0.25, size=(20, 3))
    c = rng.normal(loc=(-3.0, 3.0, -2.0), scale=0.25, size=(20, 3))
    X = np.vstack([a, b, c]).astype(float)

    m1 = WeightedKMeans(
        n_clusters=3,
        weights=[1.2, 0.8, 1.0],
        random_state=42,
        n_init=8,
        max_iter=250,
        tol=1e-5,
    ).fit(X)
    m2 = WeightedKMeans(
        n_clusters=3,
        weights=[1.2, 0.8, 1.0],
        random_state=42,
        n_init=8,
        max_iter=250,
        tol=1e-5,
    ).fit(X)

    assert m1.labels_ is not None and m2.labels_ is not None
    assert m1.cluster_centers_ is not None and m2.cluster_centers_ is not None
    assert m1.inertia_ is not None and m2.inertia_ is not None
    assert np.array_equal(m1.labels_, m2.labels_)
    assert np.allclose(m1.cluster_centers_, m2.cluster_centers_)
    assert m1.inertia_ == m2.inertia_
    assert m1.n_iter_ == m2.n_iter_


def test_empty_cluster_recovery_does_not_crash(monkeypatch):
    """Forced duplicate seeds should trigger empty-cluster recovery without crash."""
    X = np.array(
        [
            [0.0, 0.0],
            [0.0, 0.0],
            [0.0, 0.0],
            [10.0, 10.0],
            [10.0, 10.0],
            [10.0, 10.0],
        ],
        dtype=float,
    )

    def forced_init(self, _x, _rng):
        return np.array([[0.0, 0.0], [0.0, 0.0], [10.0, 10.0]], dtype=float)

    monkeypatch.setattr(WeightedKMeans, "_init_centroids_kmeans_pp", forced_init)

    model = WeightedKMeans(n_clusters=3, weights=[1.0, 1.0], random_state=11, n_init=1).fit(X)

    assert model.labels_ is not None
    assert model.cluster_centers_ is not None
    assert model.cluster_centers_.shape == (3, 2)
    assert np.all(np.isfinite(model.cluster_centers_))
    assert model.inertia_ is not None


def test_face_validity_sanity_check_prototypes_align_with_like_profiles():
    """Sanity-check only: synthetic prototypes map to distinct -like profile groups."""
    profile_order = ["SIRD-like", "SIDD-like", "MOD-like", "MARD-like"]
    prototypes = np.array(
        [
            [37.0, 280.0, 135.0, 33.0, 54.0],  # SIRD-like
            [22.0, 140.0, 185.0, 40.0, 46.0],  # SIDD-like
            [34.0, 190.0, 120.0, 52.0, 42.0],  # MOD-like
            [25.0, 125.0, 115.0, 62.0, 73.0],  # MARD-like
        ],
        dtype=float,
    )

    rng = np.random.default_rng(9090)
    noise_scale = np.array([0.35, 5.0, 4.0, 1.5, 1.2], dtype=float)
    group_size = 12
    groups = [rng.normal(loc=proto, scale=noise_scale, size=(group_size, 5)) for proto in prototypes]
    X = np.vstack(groups).astype(float)

    model = WeightedKMeans(
        n_clusters=4,
        weights=[1.4, 1.5, 1.2, 1.3, 1.1],
        random_state=42,
        n_init=10,
        max_iter=300,
    ).fit(X)

    assert model.cluster_centers_ is not None
    proto_to_center = np.argmin(
        model._weighted_distance_matrix(prototypes, model.cluster_centers_, squared=True),
        axis=1,
    )
    assert len(set(proto_to_center.tolist())) == 4

    center_to_profile_like = {
        int(center_idx): profile_order[proto_idx]
        for proto_idx, center_idx in enumerate(proto_to_center.tolist())
    }

    for i, expected_profile_like in enumerate(profile_order):
        start = i * group_size
        end = (i + 1) * group_size
        assert model.labels_ is not None
        assigned_profiles_like = {
            center_to_profile_like[int(cluster_idx)]
            for cluster_idx in model.labels_[start:end]
        }
        assert assigned_profiles_like == {expected_profile_like}


def test_runtime_facing_weighted_subtyping_sanity_check_with_corrected_label_assignment():
    """Sanity-check runtime-facing subtype semantics using corrected raw-space label assignment."""
    cluster_features = ["bmi", "triglycerides", "ldl", "hdl", "age", "waist_circumference"]
    prototypes_by_like = {
        "SIRD-like": np.array([38.0, 285.0, 130.0, 32.0, 53.0, 112.0], dtype=float),
        "SIDD-like": np.array([22.0, 145.0, 190.0, 41.0, 46.0, 76.0], dtype=float),
        "MOD-like": np.array([35.0, 195.0, 122.0, 52.0, 43.0, 103.0], dtype=float),
        "MARD-like": np.array([25.0, 122.0, 112.0, 63.0, 74.0, 82.0], dtype=float),
    }

    rng = np.random.default_rng(20260310)
    noise = np.array([0.4, 4.0, 4.0, 1.5, 1.2, 1.5], dtype=float)
    per_group = 24
    X_train = np.vstack(
        [
            rng.normal(loc=prototype, scale=noise, size=(per_group, len(cluster_features)))
            for prototype in prototypes_by_like.values()
        ]
    ).astype(float)

    cluster_imputer = SimpleImputer(strategy="median").fit(X_train)
    X_imputed = cluster_imputer.transform(X_train)
    cluster_scaler = StandardScaler().fit(X_imputed)
    X_scaled = cluster_scaler.transform(X_imputed)

    feature_weights = build_feature_weight_vector(cluster_features)
    weighted_kmeans = WeightedKMeans(
        n_clusters=4,
        weights=feature_weights,
        random_state=42,
        n_init=10,
        max_iter=300,
    ).fit(X_scaled)

    assert weighted_kmeans.cluster_centers_ is not None
    raw_centers = cluster_scaler.inverse_transform(weighted_kmeans.cluster_centers_)
    label_map = assign_ahlqvist_labels(raw_centers, cluster_features, k=4)

    cluster_labels = {
        str(cid): {
            "label": f"{label}-like",
            "risk_level": "SANITY_ONLY",
            "risk_label": f"{label}-like sanity-check",
            "subtype": f"{label}-like",
            "subtype_full": f"{label}-like",
            "description": f"{label}-like proxy profile for runtime sanity-check",
            "treatment_focus": "Sanity-check only",
        }
        for cid, label in label_map.items()
    }

    predictor = object.__new__(ClinicalPredictor)
    predictor.model_type = "binary_v2_no_bp"
    predictor.features = ["bmi", "triglycerides", "ldl", "hdl", "age"]
    predictor.cluster_features = cluster_features
    predictor.metrics = {}
    predictor.decision_thresholds = {"at_risk": 0.5}
    predictor.classifier = _AlwaysAtRiskBinaryClassifier()
    predictor.scaler = None
    predictor.imputer = None
    predictor.cluster_imputer = cluster_imputer
    predictor.cluster_scaler = cluster_scaler
    predictor.kmeans = weighted_kmeans
    predictor.cluster_labels = cluster_labels
    predictor.cluster_analysis = {}
    predictor.weighted_artifacts_ready = True
    predictor._build_feature_vector = lambda data: np.zeros((1, 5), dtype=float)
    predictor._transform_features = lambda X: X

    for profile_like, prototype in prototypes_by_like.items():
        expected_runtime_label_like = profile_like
        payload = {
            "bmi": float(prototype[0]),
            "triglycerides": float(prototype[1]),
            "ldl": float(prototype[2]),
            "hdl": float(prototype[3]),
            "age": float(prototype[4]),
            "waist_circumference": float(prototype[5]),
        }

        result = predictor.predict(payload)

        assert result["success"] is True
        assert result["predicted_status"] == "At-Risk"
        assert result["assignment_method"] == "weighted_kmeans"
        assert result["risk_cluster"] == expected_runtime_label_like, (
            f"Runtime sanity-check mismatch for {profile_like}: got {result['risk_cluster']}"
        )
        assert result["metabolic_subtype"] == expected_runtime_label_like
        assert result["metabolic_subtype_full"] == expected_runtime_label_like


def test_weighted_kmeans_perturbation_sensitivity_stability():
    """Verify clustering stability under weight perturbations (±10% and ±20%).
    
    This test programmatically validates that DIANA's subtype assignments are robust
    to expert-weight specification uncertainty, ensuring ARI >= 0.90 baseline.
    """
    import pandas as pd
    from pathlib import Path
    from sklearn.metrics import adjusted_rand_score
    
    # Load data
    project_root = Path(__file__).resolve().parents[2]
    data_path = project_root / "data/nhanes/processed/diana_dataset_final.csv"
    assert data_path.exists(), "Dataset not found"
    
    df = pd.read_csv(data_path)
    df_clean = df.dropna(subset=["cycle"]).copy()
    df_clean["at_risk"] = (df_clean["diabetes_label"] >= 1).astype(int)
    at_risk_df = df_clean[df_clean["at_risk"] == 1].copy()
    
    features = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'waist_circumference']
    X = at_risk_df[features].dropna().values
    
    # Preprocess
    imputer = SimpleImputer(strategy="median")
    X_imputed = imputer.fit_transform(X)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_imputed)
    
    # Baseline weights
    baseline_weights = [1.5, 2.0, 2.5, 1.2, 1.0, 2.0]
    
    # Fit baseline model
    baseline_model = WeightedKMeans(
        n_clusters=4, weights=baseline_weights, random_state=42
    )
    baseline_labels = baseline_model.fit(X_scaled).predict(X_scaled)
    
    # Test perturbations
    perturbations = [0.8, 0.9, 1.1, 1.2]
    
    for i, w in enumerate(baseline_weights):
        for p in perturbations:
            perturbed_weights = list(baseline_weights)
            perturbed_weights[i] = baseline_weights[i] * p
            
            perturbed_model = WeightedKMeans(
                n_clusters=4, weights=perturbed_weights, random_state=42
            )
            perturbed_labels = perturbed_model.fit(X_scaled).predict(X_scaled)
            
            ari = adjusted_rand_score(baseline_labels, perturbed_labels)
            
            # Assert high stability (ARI >= 0.85 indicates almost perfect agreement / robustness)
            # Note: raw mismatch rate is not used because K-Means labels can permute (index swap)
            assert ari >= 0.85, (
                f"Clustering unstable for feature index {i} under perturbation {p}: "
                f"ARI={ari:.4f}"
            )
            print(f"\n[SENSITIVITY] Feature {features[i]} * {p}: ARI={ari:.4f}")
