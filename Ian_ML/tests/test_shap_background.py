"""Tests for SHAP background data loading and validation."""
import tempfile
from pathlib import Path
from unittest import mock

import numpy as np
import joblib
import pytest

from Ian_ML.service.predict import ClinicalPredictor


class TestSHAPBackgroundLoading:
    """Tests for get_shap_background() method."""

    def test_missing_file_returns_none(self, tmp_path):
        """Missing background file should return None."""
        predictor = object.__new__(ClinicalPredictor)
        predictor.models_dir = tmp_path
        predictor.features = ["a", "b", "c"]

        result = predictor.get_shap_background()
        assert result is None

    def test_valid_artifact_returns_dict(self, tmp_path):
        """Valid artifact should return dict with background array."""
        predictor = object.__new__(ClinicalPredictor)
        predictor.models_dir = tmp_path
        predictor.features = ["bmi", "triglycerides", "ldl", "hdl", "age", "waist_circumference",
                              "smoking_encoded", "activity_encoded", "alcohol_encoded"]

        artifact = {
            "background": np.random.randn(100, len(predictor.features)),
            "feature_names": predictor.features,
            "n_features": len(predictor.features),
            "n_samples": 100,
            "model_type": "binary_v2_no_bp",
            "artifact_version": "1.0",
        }
        joblib.dump(artifact, tmp_path / "shap_background.joblib")

        result = predictor.get_shap_background()

        assert result is not None
        assert "background" in result
        assert result["background"].shape == (100, len(predictor.features))

    def test_feature_count_mismatch_returns_none(self, tmp_path):
        """Background with wrong feature count should return None."""
        predictor = object.__new__(ClinicalPredictor)
        predictor.models_dir = tmp_path
        predictor.features = ["bmi", "triglycerides", "ldl", "hdl", "age", "waist_circumference",
                              "smoking_encoded", "activity_encoded", "alcohol_encoded"]

        artifact = {
            "background": np.random.randn(100, 5),
            "feature_names": ["a", "b", "c", "d", "e"],
            "n_features": 5,
            "n_samples": 100,
            "model_type": "binary_v2_no_bp",
            "artifact_version": "1.0",
        }
        joblib.dump(artifact, tmp_path / "shap_background.joblib")

        result = predictor.get_shap_background()

        assert result is None

    def test_feature_order_mismatch_returns_none(self, tmp_path):
        """Background with mismatched feature order should return None."""
        predictor = object.__new__(ClinicalPredictor)
        predictor.models_dir = tmp_path
        predictor.features = ["a", "b", "c", "d", "e"]

        artifact = {
            "background": np.random.randn(100, 5),
            "feature_names": ["e", "d", "c", "b", "a"],
            "n_features": 5,
            "n_samples": 100,
            "model_type": "binary_v2_no_bp",
            "artifact_version": "1.0",
        }
        joblib.dump(artifact, tmp_path / "shap_background.joblib")

        result = predictor.get_shap_background()

        assert result is None

    def test_nan_values_returns_none(self, tmp_path):
        """Background with NaN should return None."""
        predictor = object.__new__(ClinicalPredictor)
        predictor.models_dir = tmp_path
        predictor.features = ["a", "b", "c"]

        background = np.random.randn(100, len(predictor.features))
        background[0, 0] = np.nan

        artifact = {
            "background": background,
            "feature_names": predictor.features,
            "n_features": len(predictor.features),
            "n_samples": 100,
            "model_type": "binary_v2_no_bp",
            "artifact_version": "1.0",
        }
        joblib.dump(artifact, tmp_path / "shap_background.joblib")

        result = predictor.get_shap_background()

        assert result is None

    def test_inf_values_returns_none(self, tmp_path):
        """Background with Inf should return None."""
        predictor = object.__new__(ClinicalPredictor)
        predictor.models_dir = tmp_path
        predictor.features = ["a", "b", "c"]

        background = np.random.randn(100, len(predictor.features))
        background[0, 0] = np.inf

        artifact = {
            "background": background,
            "feature_names": predictor.features,
            "n_features": len(predictor.features),
            "n_samples": 100,
            "model_type": "binary_v2_no_bp",
            "artifact_version": "1.0",
        }
        joblib.dump(artifact, tmp_path / "shap_background.joblib")

        result = predictor.get_shap_background()

        assert result is None

    def test_n_features_mismatch_returns_none(self, tmp_path):
        """Background with n_features != len(feature_names) should return None."""
        predictor = object.__new__(ClinicalPredictor)
        predictor.models_dir = tmp_path
        predictor.features = ["a", "b", "c"]

        artifact = {
            "background": np.random.randn(100, 3),
            "feature_names": ["a", "b", "c"],
            "n_features": 5,
            "n_samples": 100,
            "model_type": "binary_v2_no_bp",
            "artifact_version": "1.0",
        }
        joblib.dump(artifact, tmp_path / "shap_background.joblib")

        result = predictor.get_shap_background()

        assert result is None

    def test_not_dict_returns_none(self, tmp_path):
        """Artifact that is not a dict should return None."""
        predictor = object.__new__(ClinicalPredictor)
        predictor.models_dir = tmp_path
        predictor.features = ["a", "b", "c"]

        joblib.dump(np.random.randn(100, 3), tmp_path / "shap_background.joblib")

        result = predictor.get_shap_background()

        assert result is None

    def test_missing_keys_returns_none(self, tmp_path):
        """Artifact missing required keys should return None."""
        predictor = object.__new__(ClinicalPredictor)
        predictor.models_dir = tmp_path
        predictor.features = ["a", "b", "c"]

        artifact = {
            "background": np.random.randn(100, 3),
        }
        joblib.dump(artifact, tmp_path / "shap_background.joblib")

        result = predictor.get_shap_background()

        assert result is None


class TestSHAPExplainEndpoint:
    """Tests for /predict/explain endpoint."""

    @pytest.fixture
    def app(self):
        from Ian_ML.service.server import app
        return app

    @pytest.fixture
    def client(self, app):
        app.config['TESTING'] = True
        return app.test_client()

    def test_explain_returns_shap_metadata(self, client):
        """Response should include shap_metadata with background_source."""
        with mock.patch('Ian_ML.service.server.get_clinical_predictor_for') as mock_get:
            mock_predictor = mock.MagicMock()
            mock_predictor.predict.return_value = {
                "success": True,
                "predicted_status": "At-Risk",
                "risk_score": 70,
            }
            mock_predictor.features = ["a", "b", "c"]
            mock_predictor._build_feature_vector.return_value = np.array([[1.0, 2.0, 3.0]])
            mock_predictor._transform_features.return_value = np.array([[1.0, 2.0, 3.0]])
            mock_predictor.classifier = mock.MagicMock()
            mock_predictor.get_shap_background.return_value = None
            mock_get.return_value = mock_predictor

            with mock.patch('Ian_ML.service.server.SHAPExplainer') as mock_explainer_cls:
                mock_explainer = mock.MagicMock()
                mock_explainer.is_available = True
                mock_explainer.explain.return_value = {
                    "base_value": 0.5,
                    "shap_values": [0.1, 0.2, 0.3],
                    "feature_values": [1.0, 2.0, 3.0],
                    "feature_names": ["a", "b", "c"],
                    "contributions": [],
                }
                mock_explainer_cls.return_value = mock_explainer

                response = client.post(
                    '/predict/explain?model_type=clinical',
                    json={
                        "bmi": 28,
                        "triglycerides": 150,
                        "ldl": 120,
                        "hdl": 45,
                        "age": 55,
                    }
                )

                assert response.status_code == 200
                mock_get.assert_called_once_with('clinical')
                data = response.get_json()

                assert "shap_metadata" in data
                assert "background_source" in data["shap_metadata"]
                assert data["shap_metadata"]["background_source"] in [
                    "saved_training_data", "patient_data_fallback", "none"
                ]

    def test_explain_with_saved_background(self, client):
        """When saved background exists, should use 'saved_training_data'."""
        with mock.patch('Ian_ML.service.server.get_clinical_predictor_for') as mock_get:
            mock_predictor = mock.MagicMock()
            mock_predictor.predict.return_value = {
                "success": True,
                "predicted_status": "At-Risk",
                "risk_score": 70,
            }
            mock_predictor.features = ["a", "b", "c"]
            mock_predictor._build_feature_vector.return_value = np.array([[1.0, 2.0, 3.0]])
            mock_predictor._transform_features.return_value = np.array([[1.0, 2.0, 3.0]])
            mock_predictor.classifier = mock.MagicMock()
            mock_predictor.get_shap_background.return_value = {
                "background": np.random.randn(100, 3),
                "feature_names": ["a", "b", "c"],
                "n_features": 3,
            }
            mock_get.return_value = mock_predictor

            with mock.patch('Ian_ML.service.server.SHAPExplainer') as mock_explainer_cls:
                mock_explainer = mock.MagicMock()
                mock_explainer.is_available = False
                mock_kernel_explainer = mock.MagicMock()
                mock_kernel_explainer.is_available = True
                mock_kernel_explainer.explain.return_value = {
                    "base_value": 0.5,
                    "shap_values": [0.1, 0.2, 0.3],
                    "feature_values": [1.0, 2.0, 3.0],
                    "feature_names": ["a", "b", "c"],
                    "contributions": [],
                }
                
                def create_explainer(*args, **kwargs):
                    if kwargs.get("model_type") == "tree":
                        return mock_explainer
                    return mock_kernel_explainer
                
                mock_explainer_cls.side_effect = create_explainer

                response = client.post(
                    '/predict/explain?model_type=clinical',
                    json={
                        "bmi": 28,
                        "triglycerides": 150,
                        "ldl": 120,
                        "hdl": 45,
                        "age": 55,
                    }
                )

                assert response.status_code == 200
                mock_get.assert_called_once_with('clinical')
                data = response.get_json()

                assert data["shap_metadata"]["background_source"] == "saved_training_data"

    def test_explain_fallback_sets_source_patient_data(self, client):
        """When no saved background, should use 'patient_data_fallback'."""
        with mock.patch('Ian_ML.service.server.get_clinical_predictor_for') as mock_get:
            mock_predictor = mock.MagicMock()
            mock_predictor.predict.return_value = {
                "success": True,
                "predicted_status": "At-Risk",
                "risk_score": 70,
            }
            mock_predictor.features = ["a", "b", "c"]
            mock_predictor._build_feature_vector.return_value = np.array([[1.0, 2.0, 3.0]])
            mock_predictor._transform_features.return_value = np.array([[1.0, 2.0, 3.0]])
            mock_predictor.classifier = mock.MagicMock()
            mock_predictor.get_shap_background.return_value = None
            mock_get.return_value = mock_predictor

            with mock.patch('Ian_ML.service.server.SHAPExplainer') as mock_explainer_cls:
                mock_tree_explainer = mock.MagicMock()
                mock_tree_explainer.is_available = False
                
                mock_kernel_explainer = mock.MagicMock()
                mock_kernel_explainer.is_available = True
                mock_kernel_explainer.explain.return_value = {
                    "base_value": 0.5,
                    "shap_values": [0.1, 0.2, 0.3],
                    "feature_values": [1.0, 2.0, 3.0],
                    "feature_names": ["a", "b", "c"],
                    "contributions": [],
                }
                
                def create_explainer(*args, **kwargs):
                    if kwargs.get("model_type") == "tree":
                        return mock_tree_explainer
                    return mock_kernel_explainer
                
                mock_explainer_cls.side_effect = create_explainer

                response = client.post(
                    '/predict/explain?model_type=clinical',
                    json={
                        "bmi": 28,
                        "triglycerides": 150,
                        "ldl": 120,
                        "hdl": 45,
                        "age": 55,
                    }
                )

                assert response.status_code == 200
                mock_get.assert_called_once_with('clinical')
                data = response.get_json()

                assert data["shap_metadata"]["background_source"] == "patient_data_fallback"

    @pytest.mark.parametrize("model_type", ["binary_v2_no_bp", "binary_v2_bp"])
    def test_explain_supports_explicit_canonical_screening_model_types(self, client, model_type):
        """/predict/explain should explicitly route canonical screening model IDs through clinical predictor."""
        with mock.patch('Ian_ML.service.server.get_clinical_predictor_for') as mock_get:
            mock_predictor = mock.MagicMock()
            mock_predictor.predict.return_value = {
                "success": True,
                "predicted_status": "At-Risk",
                "risk_score": 70,
            }
            mock_predictor.features = ["a", "b", "c"]
            mock_predictor._build_feature_vector.return_value = np.array([[1.0, 2.0, 3.0]])
            mock_predictor._transform_features.return_value = np.array([[1.0, 2.0, 3.0]])
            mock_predictor.classifier = mock.MagicMock()
            mock_get.return_value = mock_predictor

            with mock.patch('Ian_ML.service.server.SHAPExplainer') as mock_explainer_cls:
                mock_tree_explainer = mock.MagicMock()
                mock_tree_explainer.is_available = True
                mock_tree_explainer.explain.return_value = {
                    "base_value": 0.5,
                    "shap_values": [0.1, 0.2, 0.3],
                    "feature_values": [1.0, 2.0, 3.0],
                    "feature_names": ["a", "b", "c"],
                    "contributions": [],
                }
                mock_explainer_cls.return_value = mock_tree_explainer

                response = client.post(
                    f'/predict/explain?model_type={model_type}',
                    json={
                        "bmi": 28,
                        "triglycerides": 150,
                        "ldl": 120,
                        "hdl": 45,
                        "age": 55,
                    }
                )

                assert response.status_code == 200
                mock_get.assert_called_once_with(model_type)
                data = response.get_json()
                assert data["model_type"] == model_type
                assert data["shap_metadata"]["explainer_type"] == "tree"
