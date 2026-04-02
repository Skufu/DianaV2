"""
Integration tests for ML service endpoints.

These tests verify the ML service API behavior with actual Flask application
without requiring external model dependencies.
"""

import json
import pytest
from unittest.mock import patch, MagicMock
import numpy as np


@pytest.fixture
def client():
    """Create Flask test client."""
    from ..service.server import app
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False

    with app.test_client() as client:
        yield client


@pytest.fixture
def mock_predictor_with_cluster():
    """Create a mock predictor that returns clustered results."""
    predictor = MagicMock()
    predictor.model_type = 'binary_v2_no_bp'
    predictor.metrics = {'dataset_hash': 'test-dataset-hash-123'}
    predictor.features = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']
    predictor.cluster_features = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'waist_circumference']
    predictor.kmeans = MagicMock()
    predictor.cluster_scaler = MagicMock()
    predictor.cluster_imputer = MagicMock()
    predictor.cluster_labels = {
        '0': {
            'label': 'SIDD',
            'risk_level': 'HIGH',
            'risk_label': 'High Risk',
            'subtype': 'SIDD',
            'subtype_full': 'Severe Insulin-Deficient Diabetes',
            'description': 'Severe insulin deficiency',
            'treatment_focus': 'Insulin therapy required',
        },
        '1': {
            'label': 'SIRD',
            'risk_level': 'HIGH',
            'risk_label': 'High Risk',
            'subtype': 'SIRD',
            'subtype_full': 'Severe Insulin-Resistant Diabetes',
            'description': 'Insulin resistance dominant',
            'treatment_focus': 'Insulin sensitivity control',
        }
    }
    return predictor


@pytest.fixture
def mock_predictor_without_cluster():
    """Create a mock predictor without clustering capability."""
    predictor = MagicMock()
    predictor.model_type = 'binary_v2_no_bp'
    predictor.metrics = {'dataset_hash': 'test-dataset-hash-123'}
    predictor.features = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']
    predictor.cluster_features = []
    predictor.kmeans = None
    predictor.cluster_scaler = None
    predictor.cluster_imputer = None
    predictor.cluster_labels = {}
    return predictor


class TestHealthEndpoint:
    """Integration tests for health check endpoint."""

    def test_health_returns_healthy(self, client):
        """Health endpoint should return status healthy."""
        response = client.get('/health')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'


class TestPredictEndpointIntegration:
    """Integration tests for prediction endpoint."""

    def test_predict_with_valid_input_returns_success(self, client, mock_predictor_with_cluster):
        """Predict endpoint should process valid input."""
        mock_predictor_with_cluster.predict.return_value = {
            'success': True,
            'risk_cluster': 'SIDD',
            'risk_score': 75,
            'risk_level': 'HIGH',
            'predicted_status': 'At-Risk',
            'at_risk_probability': 0.75,
            'prediction_confidence': 'Confident',
            'metabolic_subtype': 'SIDD',
            'metabolic_subtype_full': 'Severe Insulin-Deficient Diabetes',
            'cluster_description': 'Severe insulin deficiency',
            'treatment_focus': 'Insulin therapy required',
        }

        with patch('Ian_ML.service.server.get_clinical_predictor_for', return_value=mock_predictor_with_cluster):
            response = client.post('/predict?model_type=clinical', json={
                'bmi': 30.0,
                'triglycerides': 150.0,
                'ldl': 130.0,
                'hdl': 50.0,
                'age': 55,
                'waist_circumference': 90.0
            })

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['model_version'] == 'binary_v2_no_bp'
        assert data['dataset_hash'] == 'test-dataset-hash-123'
        assert 'drift_baseline' in data

    def test_predict_without_cluster_capability(self, client, mock_predictor_without_cluster):
        """Predict should handle predictor without clustering."""
        mock_predictor_without_cluster.predict.return_value = {
            'success': True,
            'risk_cluster': 'N/A',
            'risk_score': 60,
            'risk_level': 'MODERATE',
            'predicted_status': 'Normal',
            'at_risk_probability': 0.45,
            'prediction_confidence': 'Confident',
            'metabolic_subtype': 'N/A',
            'cluster_description': '',
            'treatment_focus': '',
        }

        with patch('Ian_ML.service.server.get_clinical_predictor_for', return_value=mock_predictor_without_cluster):
            response = client.post('/predict?model_type=clinical', json={
                'bmi': 25.0,
                'triglycerides': 120.0,
                'ldl': 100.0,
                'hdl': 60.0,
                'age': 45,
            })

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['cluster_capability']['supported'] is False

    def test_predict_missing_required_features(self, client, mock_predictor_with_cluster):
        """Predict should handle missing required features gracefully."""
        mock_predictor_with_cluster.predict.side_effect = KeyError("Missing required feature: bmi")

        with patch('Ian_ML.service.server.get_clinical_predictor_for', return_value=mock_predictor_with_cluster):
            response = client.post('/predict?model_type=clinical', json={
                'triglycerides': 150.0,
                'ldl': 130.0,
                'hdl': 50.0,
            })

        assert response.status_code == 200


class TestBatchPredictEndpointIntegration:
    """Integration tests for batch prediction endpoint."""

    def test_batch_predict_processes_multiple_patients(self, client, mock_predictor_with_cluster):
        """Batch endpoint should process multiple patients."""
        mock_predictor_with_cluster.predict.side_effect = [
            {
                'success': True,
                'risk_cluster': 'SIDD',
                'risk_score': 75,
                'predicted_status': 'At-Risk',
            },
            {
                'success': True,
                'risk_cluster': 'SIRD',
                'risk_score': 80,
                'predicted_status': 'At-Risk',
            },
        ]

        patients = [
            {'bmi': 30.0, 'triglycerides': 150.0, 'ldl': 130.0, 'hdl': 50.0, 'age': 55},
            {'bmi': 35.0, 'triglycerides': 180.0, 'ldl': 140.0, 'hdl': 45.0, 'age': 60},
        ]

        with patch('Ian_ML.service.server.get_predictor', return_value=mock_predictor_with_cluster):
            response = client.post('/predict/batch', json={'patients': patients})

        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['predictions']) == 2


class TestModelMetadataEndpointIntegration:
    """Integration tests for model metadata endpoint."""

    def test_active_model_metadata_returns_full_contract(self, client, mock_predictor_with_cluster):
        """Metadata endpoint should return complete model contract."""
        mock_monitor = MagicMock()
        mock_monitor.get_baseline_metadata.return_value = {
            'baseline_id': 'test-baseline-123',
            'baseline_version': '1',
            'model_version': 'binary_v2_no_bp',
            'dataset_hash': 'test-dataset-hash',
            'feature_schema_version': 'features:5',
            'source_kind': 'test',
            'created_at': '2026-01-01T00:00:00Z',
            'refreshed_at': '',
            'stale_after': '2026-04-01T00:00:00Z',
            'sample_count': 1000,
            'reference_features': ['bmi', 'triglycerides', 'ldl', 'hdl', 'age'],
            'lineage_status': 'healthy',
        }

        with patch('Ian_ML.service.server.get_clinical_predictor', return_value=mock_predictor_with_cluster):
            with patch('Ian_ML.service.server.get_drift_monitor', return_value=mock_monitor):
                response = client.get('/model/active/metadata')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['model_version'] == 'binary_v2_no_bp'
        assert data['dataset_hash'] == 'test-dataset-hash-123'
        assert 'feature_set' in data
        assert 'cluster_capability' in data
        assert 'output_capabilities' in data
        assert 'drift_baseline' in data
        assert data['cluster_capability']['supported'] is True

    def test_model_metadata_without_cluster(self, client, mock_predictor_without_cluster):
        """Metadata should indicate cluster not supported."""
        mock_monitor = MagicMock()
        mock_monitor.get_baseline_metadata.return_value = {
            'baseline_id': '',
            'baseline_version': '',
            'model_version': 'binary_v2_no_bp',
            'dataset_hash': 'test-dataset-hash',
            'feature_schema_version': 'features:5',
            'lineage_status': 'missing_reference',
        }

        with patch('Ian_ML.service.server.get_clinical_predictor', return_value=mock_predictor_without_cluster):
            with patch('Ian_ML.service.server.get_drift_monitor', return_value=mock_monitor):
                response = client.get('/model/active/metadata')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['cluster_capability']['supported'] is False
        assert data['output_capabilities']['metabolic_subtype'] is False


class TestDriftMonitoringIntegration:
    """Integration tests for drift monitoring endpoints."""

    def test_set_drift_reference_with_valid_data(self, client, mock_predictor_with_cluster):
        """Drift reference should accept valid feature data."""
        mock_monitor = MagicMock()
        mock_monitor.set_reference.return_value = None
        mock_monitor.get_baseline_metadata.return_value = {
            'baseline_id': 'baseline-2026q1',
            'baseline_version': '3',
            'model_version': 'binary_v2_no_bp',
            'dataset_hash': 'test-dataset-hash',
            'feature_schema_version': 'features:5',
            'source_kind': 'test_data',
            'created_at': '2026-01-01T00:00:00Z',
            'lineage_status': 'healthy',
        }

        with patch('Ian_ML.service.server.get_drift_monitor', return_value=mock_monitor):
            with patch('Ian_ML.service.server.get_clinical_predictor_for', return_value=mock_predictor_with_cluster):
                response = client.post('/monitoring/drift/reference', json={
                    'model_type': 'clinical',
                    'baseline_id': 'test-baseline',
                    'baseline_version': '1',
                    'source_kind': 'test_data',
                    'features': {
                        'bmi': [25.0, 27.0, 30.0],
                        'triglycerides': [150.0, 160.0, 180.0],
                    }
                })

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert 'drift_baseline' in data

    def test_drift_reference_missing_features(self, client):
        """Drift reference should handle missing features gracefully."""
        response = client.post('/monitoring/drift/reference', json={
            'model_type': 'clinical',
        })

        assert response.status_code == 400


class TestErrorHandlingIntegration:
    """Integration tests for error handling."""

    def test_predict_with_invalid_json(self, client):
        """Predict should handle invalid JSON gracefully."""
        response = client.post('/predict',
                               data='invalid json {',
                               content_type='application/json')

        assert response.status_code == 400

    def test_predict_with_empty_body(self, client):
        """Predict should handle empty request body."""
        response = client.post('/predict',
                               data='',
                               content_type='application/json')

        assert response.status_code == 400

    def test_nonexistent_endpoint(self, client):
        """Nonexistent endpoints should return 404."""
        response = client.get('/nonexistent/endpoint')

        assert response.status_code == 404


class TestRequestValidationIntegration:
    """Integration tests for request validation."""

    def test_predict_with_negative_values(self, client, mock_predictor_with_cluster):
        """Predict should handle negative biomarker values."""
        mock_predictor_with_cluster.predict.return_value = {
            'success': True,
            'risk_cluster': 'SIDD',
            'risk_score': 50,
            'predicted_status': 'At-Risk',
        }

        with patch('Ian_ML.service.server.get_clinical_predictor_for', return_value=mock_predictor_with_cluster):
            response = client.post('/predict?model_type=clinical', json={
                'bmi': -5.0,
                'triglycerides': 150.0,
                'ldl': 130.0,
                'hdl': 50.0,
                'age': 55,
            })

        assert response.status_code == 200

    def test_predict_with_extreme_values(self, client, mock_predictor_with_cluster):
        """Predict should handle extreme biomarker values."""
        mock_predictor_with_cluster.predict.return_value = {
            'success': True,
            'risk_cluster': 'SIDD',
            'risk_score': 99,
            'predicted_status': 'At-Risk',
        }

        with patch('Ian_ML.service.server.get_clinical_predictor_for', return_value=mock_predictor_with_cluster):
            response = client.post('/predict?model_type=clinical', json={
                'bmi': 100.0,
                'triglycerides': 1000.0,
                'ldl': 500.0,
                'hdl': 10.0,
                'age': 120,
            })

        assert response.status_code == 200
