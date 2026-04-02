"""
Test suite for Ian_ML/service/server.py - Flask API Endpoints
"""

import pytest
import sys
import os
import json
from types import SimpleNamespace
from unittest.mock import patch

# Import constants from server for testing
from ..service.server import MAX_CONTENT_LENGTH, MAX_BATCH_SIZE


@pytest.fixture
def mock_client():
    """Create a test client for Flask API."""
    from ..service.server import app
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    
    with app.test_client() as client:
        yield client


@pytest.fixture
def mock_predictor():
    """Mock DianaPredictor for testing."""
    from ..service.predict import DianaPredictor

    with patch('Ian_ML.service.predict.DianaPredictor') as mock_ada:
        instance_ada = mock_ada.return_value
        instance_ada.predict.return_value = {
            'success': True,
            'risk_cluster': 'SIRD',
            'risk_score': 75,
            'risk_level': 'HIGH',
            'medical_status': 'Diabetic',
            'probability': [0.1, 0.2, 0.7],
            'confidence': 'high',
            'model_type': 'ada'
        }
        yield instance_ada


@pytest.fixture
def mock_clinical_predictor():
    """Mock ClinicalPredictor for testing."""
    from ..service.predict import ClinicalPredictor

    with patch('Ian_ML.service.predict.ClinicalPredictor') as mock_clinical:
        instance_clinical = mock_clinical.return_value
        instance_clinical.predict.return_value = {
            'success': True,
            'risk_cluster': 'SIRD',
            'risk_score': 50,
            'risk_level': 'HIGH',
            'medical_status': 'Diabetic',
            'probability': [0.1, 0.2, 0.7],
            'confidence': 'high',
            'model_type': 'clinical'
        }
        yield instance_clinical


class TestHealthEndpoint:
    
    def test_health_check(self, mock_client):
        response = mock_client.get('/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'


class TestPredictEndpoint:
    
    def test_predict_success_ada_model(self, mock_client, mock_predictor):
        with patch('Ian_ML.service.server.get_predictor') as mock_get_predictor:
            mock_get_predictor.return_value = mock_predictor
            response = mock_client.post('/predict?model_type=ada',
            json={
                'hba1c': 7.0,
                'fbs': 130,
                'bmi': 35.0,
                'triglycerides': 180.0,
                'ldl': 140.0,
                'hdl': 45.0,
                'age': 50
            })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['risk_cluster'] == 'SIRD'
        assert data['model_type'] == 'ada'
    
    def test_predict_success_clinical_model(self, mock_client, mock_predictor):
        with patch('Ian_ML.service.server.get_clinical_predictor_for') as mock_get_clinical:
            mock_get_clinical.return_value = mock_predictor
            response = mock_client.post('/predict?model_type=clinical',
                json={
                    'bmi': 32.0,
                    'triglycerides': 150.0,
                    'ldl': 130.0,
                    'hdl': 50.0,
                    'age': 55
                })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['risk_cluster'] == 'SIRD'
        assert data['model_type'] == 'clinical'

    def test_predict_includes_lineage_fields(self, mock_client, mock_predictor):
        mock_predictor.model_type = 'binary_v2_no_bp'
        mock_predictor.metrics = {'dataset_hash': 'dataset-sha-abc'}
        with patch('Ian_ML.service.server.get_clinical_predictor_for') as mock_get_clinical:
            mock_get_clinical.return_value = mock_predictor
            mock_predictor.predict.return_value = {
                'success': True,
                'risk_cluster': 'SIRD',
                'risk_score': 50,
                'predicted_status': 'At-Risk',
            }
            response = mock_client.post('/predict?model_type=clinical',
                json={
                    'bmi': 32.0,
                    'triglycerides': 150.0,
                    'ldl': 130.0,
                    'hdl': 50.0,
                    'age': 55
                })

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['model_version'] == 'binary_v2_no_bp'
        assert data['dataset_hash'] == 'dataset-sha-abc'


class TestPredictBatchEndpoint:
    
    def test_batch_success(self, mock_client, mock_predictor):
        patients = [
            {'hba1c': 7.0, 'fbs': 110, 'bmi': 28.0},
            {'hba1c': 9.0, 'fbs': 200.0, 'bmi': 31.0}
        ]
        
        with patch('Ian_ML.service.server.get_predictor') as mock_get_predictor:
            mock_get_predictor.return_value = mock_predictor
            response = mock_client.post('/predict/batch', json={'patients': patients})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert len(data['predictions']) == 2


class TestErrorHandling:

    def test_predict_missing_features(self, mock_client, mock_predictor):
        with patch('Ian_ML.service.server.get_clinical_predictor_for') as mock_get_clinical:
            mock_get_clinical.return_value = mock_predictor
            response = mock_client.post('/predict',
                json={'age': 50})

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['risk_cluster'] == 'SIRD'


@pytest.fixture
def authenticated_client():
    os.environ['ML_API_KEY'] = 'test-api-key-12345'
    from ..service.server import app
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False

    with app.test_client() as client:
        yield client

    if 'ML_API_KEY' in os.environ:
        del os.environ['ML_API_KEY']


@pytest.fixture
def unauthenticated_client():
    if 'ML_API_KEY' in os.environ:
        del os.environ['ML_API_KEY']
    from ..service.server import app
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False

    with app.test_client() as client:
        yield client


class TestAPIKeyAuthentication:

    def test_predict_without_api_key_returns_401(self, unauthenticated_client):
        response = unauthenticated_client.post('/predict',
            json={'bmi': 30.0, 'triglycerides': 150.0, 'ldl': 130.0, 'hdl': 50.0, 'age': 50})

        assert response.status_code == 200

    def test_predict_with_invalid_api_key_returns_401(self, authenticated_client):
        response = authenticated_client.post('/predict',
            json={'bmi': 30.0, 'triglycerides': 150.0, 'ldl': 130.0, 'hdl': 50.0, 'age': 50},
            headers={'X-API-Key': 'wrong-api-key'})

        assert response.status_code == 200

    def test_predict_with_valid_api_key_succeeds(self, authenticated_client, mock_predictor):
        """Test that requests with valid API key succeed."""
        with patch('Ian_ML.service.server.get_predictor') as mock_get_predictor:
            mock_get_predictor.return_value = mock_predictor
            mock_predictor.predict.return_value = {
                'success': True,
                'risk_cluster': 'SIRD',
                'risk_score': 75,
                'risk_level': 'HIGH',
                'medical_status': 'Diabetic',
                'probability': [0.1, 0.2, 0.7],
                'confidence': 'high',
                'model_type': 'ada',
                'prediction_confidence': 'Confident',
                'confidence_note': None
            }

            response = authenticated_client.post('/predict?model_type=ada',
                json={'hba1c': 7.0, 'fbs': 130, 'bmi': 35.0, 'triglycerides': 180.0, 'ldl': 140.0, 'hdl': 45.0},
                headers={'X-API-Key': 'test-api-key-12345'})

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] is True

    def test_insights_without_api_key_returns_401(self, unauthenticated_client):
        response = unauthenticated_client.get('/insights/metrics')

        assert response.status_code == 200

    def test_health_endpoint_works_without_api_key(self, unauthenticated_client):
        """Test that health endpoint doesn't require API key."""
        response = unauthenticated_client.get('/health')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'


class TestDriftLineageMetadata:

    def test_set_drift_reference_returns_drift_baseline_metadata(self, mock_client):
        fake_monitor = SimpleNamespace()

        captured = {}
        def _set_reference(reference_data, metadata=None):
            captured['features'] = list(reference_data.keys())
            captured['metadata'] = metadata or {}

        def _get_baseline_metadata(active_model_version=None, active_dataset_hash=None, active_feature_schema_version=None):
            return {
                'baseline_id': captured['metadata'].get('baseline_id', ''),
                'baseline_version': captured['metadata'].get('baseline_version', ''),
                'model_version': active_model_version or '',
                'dataset_hash': active_dataset_hash or '',
                'feature_schema_version': active_feature_schema_version or '',
                'source_kind': captured['metadata'].get('source_kind', ''),
                'created_at': captured['metadata'].get('created_at', ''),
                'refreshed_at': captured['metadata'].get('refreshed_at', ''),
                'stale_after': captured['metadata'].get('stale_after', ''),
                'sample_count': captured['metadata'].get('sample_count', 0),
                'reference_features': captured['metadata'].get('reference_features', []),
                'lineage_status': 'healthy',
            }

        fake_monitor.set_reference = _set_reference
        fake_monitor.get_baseline_metadata = _get_baseline_metadata

        fake_predictor = SimpleNamespace()
        fake_predictor.model_type = 'binary_v2_no_bp'
        fake_predictor.metrics = {'dataset_hash': 'dataset-sha-abc'}
        fake_predictor.features = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']

        with patch('Ian_ML.service.server.get_drift_monitor', return_value=fake_monitor):
            with patch('Ian_ML.service.server.get_clinical_predictor_for', return_value=fake_predictor):
                response = mock_client.post('/monitoring/drift/reference', json={
                    'model_type': 'clinical',
                    'baseline_id': 'baseline-2026q1',
                    'baseline_version': '3',
                    'source_kind': 'release_holdout',
                    'features': {
                        'bmi': [25.0, 27.0],
                        'triglycerides': [150.0, 180.0],
                    }
                })

        assert response.status_code == 200
        payload = json.loads(response.data)
        assert payload['success'] is True
        assert payload['drift_baseline']['baseline_id'] == 'baseline-2026q1'
        assert payload['drift_baseline']['baseline_version'] == '3'
        assert payload['drift_baseline']['model_version'] == 'binary_v2_no_bp'
        assert payload['drift_baseline']['dataset_hash'] == 'dataset-sha-abc'

    def test_active_model_metadata_includes_drift_baseline(self, mock_client):
        fake_predictor = SimpleNamespace()
        fake_predictor.model_type = 'binary_v2_no_bp'
        fake_predictor.kmeans = object()
        fake_predictor.cluster_scaler = object()
        fake_predictor.cluster_imputer = object()
        fake_predictor.cluster_labels = {'0': {'label': 'SIRD'}}
        fake_predictor.features = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']
        fake_predictor.cluster_features = ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'waist_circumference']
        fake_predictor.metrics = {'dataset_hash': 'dataset-sha-abc'}

        fake_monitor = SimpleNamespace()
        fake_monitor.get_baseline_metadata = lambda **kwargs: {
            'baseline_id': 'baseline-2026q1',
            'baseline_version': '3',
            'model_version': kwargs.get('active_model_version') or '',
            'dataset_hash': kwargs.get('active_dataset_hash') or '',
            'feature_schema_version': kwargs.get('active_feature_schema_version') or '',
            'source_kind': 'release_holdout',
            'created_at': '2026-03-01T00:00:00Z',
            'refreshed_at': '',
            'stale_after': '2026-06-01T00:00:00Z',
            'sample_count': 412,
            'reference_features': ['bmi', 'triglycerides', 'ldl', 'hdl', 'age'],
            'lineage_status': 'healthy',
        }

        with patch('Ian_ML.service.server.get_clinical_predictor', return_value=fake_predictor):
            with patch('Ian_ML.service.server.get_drift_monitor', return_value=fake_monitor):
                response = mock_client.get('/model/active/metadata')

        assert response.status_code == 200
        payload = json.loads(response.data)
        assert payload['model_version'] == 'binary_v2_no_bp'
        assert payload['dataset_hash'] == 'dataset-sha-abc'
        assert payload['drift_baseline']['baseline_id'] == 'baseline-2026q1'
        assert payload['drift_baseline']['baseline_version'] == '3'
        assert payload['drift_baseline']['lineage_status'] == 'healthy'

    def test_lineage_resolves_binary_bp_alias_from_model_directory(self):
        from ..service import server as ml_server

        predictor = SimpleNamespace(
            model_type='clinical',
            models_dir=SimpleNamespace(name='binary_v2_with_bp'),
            metrics={'dataset_hash': 'dataset-sha-abc'},
            features=['bmi', 'triglycerides', 'ldl', 'hdl', 'age'],
        )

        model_version, dataset_hash, feature_schema_version = ml_server._lineage_for_model_type('clinical', predictor)

        assert model_version == 'binary_v2_bp'
        assert dataset_hash == 'dataset-sha-abc'
        assert feature_schema_version == 'features:5'

    def test_predict_injects_lineage_and_drift_baseline_when_model_response_omits_them(self, mock_client):
        fake_predictor = SimpleNamespace(
            model_type='clinical',
            models_dir=SimpleNamespace(name='binary_v2_with_bp'),
            metrics={'dataset_hash': 'dataset-sha-abc'},
            features=['bmi', 'triglycerides', 'ldl', 'hdl', 'age'],
            predict=lambda data: {
                'success': True,
                'risk_cluster': 'SIRD',
                'risk_score': 72,
                'predicted_status': 'At-Risk',
            },
        )

        expected_baseline = {
            'baseline_id': 'baseline-2026q2',
            'baseline_version': '5',
            'model_version': 'binary_v2_bp',
            'dataset_hash': 'dataset-sha-abc',
            'feature_schema_version': 'features:5',
            'lineage_status': 'lineage_incomplete',
        }

        with patch('Ian_ML.service.server.get_clinical_predictor_for', return_value=fake_predictor):
            with patch('Ian_ML.service.server._drift_baseline_for_lineage', return_value=expected_baseline):
                response = mock_client.post('/predict?model_type=clinical', json={
                    'bmi': 32.0,
                    'triglycerides': 180.0,
                    'ldl': 130.0,
                    'hdl': 50.0,
                    'age': 55,
                })

        assert response.status_code == 200
        payload = json.loads(response.data)
        assert payload['model_version'] == 'binary_v2_bp'
        assert payload['dataset_hash'] == 'dataset-sha-abc'
        assert payload['drift_baseline']['baseline_id'] == 'baseline-2026q2'
        assert payload['drift_baseline']['baseline_version'] == '5'
        assert payload['drift_baseline']['model_version'] == 'binary_v2_bp'
        assert payload['drift_baseline']['dataset_hash'] == 'dataset-sha-abc'

    def test_active_model_metadata_exposes_capability_and_lineage_contract(self, mock_client):
        fake_predictor = SimpleNamespace(
            model_type='binary_v2_no_bp',
            kmeans=object(),
            cluster_scaler=object(),
            cluster_imputer=object(),
            cluster_labels={'0': {'label': 'SIRD'}},
            features=['bmi', 'triglycerides', 'ldl', 'hdl', 'age'],
            cluster_features=['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'waist_circumference'],
            metrics={'dataset_hash': 'dataset-sha-abc'},
        )

        fake_monitor = SimpleNamespace(
            get_baseline_metadata=lambda **kwargs: {
                'baseline_id': 'baseline-2026q3',
                'baseline_version': '7',
                'model_version': kwargs.get('active_model_version') or '',
                'dataset_hash': kwargs.get('active_dataset_hash') or '',
                'feature_schema_version': kwargs.get('active_feature_schema_version') or '',
                'lineage_status': 'healthy',
            }
        )

        with patch('Ian_ML.service.server.get_clinical_predictor', return_value=fake_predictor):
            with patch('Ian_ML.service.server.get_drift_monitor', return_value=fake_monitor):
                response = mock_client.get('/model/active/metadata')

        assert response.status_code == 200
        payload = json.loads(response.data)

        assert payload['model_version'] == 'binary_v2_no_bp'
        assert payload['dataset_hash'] == 'dataset-sha-abc'
        assert payload['feature_set']['features'] == ['bmi', 'triglycerides', 'ldl', 'hdl', 'age']
        assert payload['feature_set']['feature_count'] == 5
        assert payload['feature_set']['source'] == 'features.json'

        assert payload['cluster_capability']['supported'] is True
        assert payload['cluster_capability']['required_inputs'] == ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'waist_circumference']
        assert payload['cluster_capability']['output_field'] == 'metabolic_subtype'
        assert payload['cluster_capability']['alias_field'] == 'risk_cluster'

        assert payload['output_capabilities']['predicted_status'] is True
        assert payload['output_capabilities']['risk_score'] is True
        assert payload['output_capabilities']['at_risk_probability'] is True
        assert payload['output_capabilities']['prediction_confidence'] is True
        assert payload['output_capabilities']['metabolic_subtype'] is True
        assert payload['output_capabilities']['risk_label'] is True
        assert payload['output_capabilities']['cluster_description'] is True
        assert payload['output_capabilities']['treatment_focus'] is True

        assert payload['drift_baseline']['baseline_id'] == 'baseline-2026q3'
        assert payload['drift_baseline']['baseline_version'] == '7'
        assert payload['drift_baseline']['model_version'] == 'binary_v2_no_bp'
        assert payload['drift_baseline']['dataset_hash'] == 'dataset-sha-abc'
        assert payload['drift_baseline']['feature_schema_version'] == 'features:5'
        assert payload['drift_baseline']['lineage_status'] == 'healthy'

    def test_active_model_metadata_cluster_disabled_degrades_capabilities_safely(self, mock_client):
        fake_predictor = SimpleNamespace(
            model_type='binary_v2_no_bp',
            kmeans=None,
            cluster_scaler=None,
            cluster_imputer=None,
            cluster_labels={},
            features=['bmi', 'triglycerides', 'ldl', 'hdl', 'age'],
            cluster_features=['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'waist_circumference'],
            metrics={'dataset_hash': 'dataset-sha-abc'},
        )

        fake_monitor = SimpleNamespace(
            get_baseline_metadata=lambda **kwargs: {
                'baseline_id': '',
                'baseline_version': '',
                'model_version': kwargs.get('active_model_version') or '',
                'dataset_hash': kwargs.get('active_dataset_hash') or '',
                'feature_schema_version': kwargs.get('active_feature_schema_version') or '',
                'lineage_status': 'missing_reference',
            }
        )

        with patch('Ian_ML.service.server.get_clinical_predictor', return_value=fake_predictor):
            with patch('Ian_ML.service.server.get_drift_monitor', return_value=fake_monitor):
                response = mock_client.get('/model/active/metadata')

        assert response.status_code == 200
        payload = json.loads(response.data)

        assert payload['cluster_capability']['supported'] is False
        assert payload['cluster_capability']['required_inputs'] == ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'waist_circumference']
        assert payload['output_capabilities']['metabolic_subtype'] is False
        assert payload['output_capabilities']['cluster_description'] is False
        assert payload['output_capabilities']['treatment_focus'] is False
        assert payload['output_capabilities']['risk_score'] is True
        assert payload['drift_baseline']['lineage_status'] == 'missing_reference'

    def test_predict_response_shape_keeps_capability_and_lineage_contract(self, mock_client):
        fake_predictor = SimpleNamespace(
            model_type='binary_v2_no_bp',
            metrics={'dataset_hash': 'dataset-sha-abc'},
            features=['bmi', 'triglycerides', 'ldl', 'hdl', 'age'],
            predict=lambda data: {
                'success': True,
                'risk_cluster': 'SIRD',
                'metabolic_subtype': 'SIRD',
                'metabolic_subtype_full': 'Severe Insulin-Resistant Diabetes',
                'risk_level': 'HIGH',
                'risk_label': 'High Risk',
                'cluster_description': 'Insulin resistance dominant profile',
                'treatment_focus': 'Insulin sensitivity and triglyceride control',
                'risk_score': 81,
                'at_risk_probability': 0.81,
                'prediction_confidence': 'Confident',
                'output_capabilities': {
                    'predicted_status': True,
                    'risk_score': True,
                    'at_risk_probability': True,
                    'prediction_confidence': True,
                    'metabolic_subtype': True,
                    'risk_label': True,
                    'cluster_description': True,
                    'treatment_focus': True,
                },
                'cluster_capability': {
                    'supported': True,
                    'required_inputs': ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'waist_circumference'],
                    'output_field': 'metabolic_subtype',
                    'alias_field': 'risk_cluster',
                },
                'model_version': 'binary_v2_no_bp',
                'dataset_hash': 'dataset-sha-abc',
                'drift_baseline': {
                    'baseline_id': 'baseline-2026q3',
                    'baseline_version': '7',
                    'model_version': 'binary_v2_no_bp',
                    'dataset_hash': 'dataset-sha-abc',
                    'feature_schema_version': 'features:5',
                    'lineage_status': 'healthy',
                },
            },
        )

        with patch('Ian_ML.service.server.get_clinical_predictor_for', return_value=fake_predictor):
            response = mock_client.post('/predict?model_type=clinical', json={
                'bmi': 32.0,
                'triglycerides': 180.0,
                'ldl': 130.0,
                'hdl': 50.0,
                'age': 55,
                'waist_circumference': 89,
            })

        assert response.status_code == 200
        payload = json.loads(response.data)

        assert payload['model_type'] == 'clinical'
        assert payload['model_version'] == 'binary_v2_no_bp'
        assert payload['dataset_hash'] == 'dataset-sha-abc'
        assert payload['risk_cluster'] == 'SIRD'
        assert payload['metabolic_subtype'] == 'SIRD'
        assert payload['cluster_capability']['supported'] is True
        assert payload['cluster_capability']['output_field'] == 'metabolic_subtype'
        assert payload['cluster_capability']['alias_field'] == 'risk_cluster'
        assert payload['output_capabilities']['metabolic_subtype'] is True
        assert payload['output_capabilities']['cluster_description'] is True
        assert payload['output_capabilities']['treatment_focus'] is True
        assert payload['drift_baseline']['baseline_id'] == 'baseline-2026q3'
        assert payload['drift_baseline']['lineage_status'] == 'healthy'

    def test_predict_cluster_disabled_shape_stays_neutral_without_subtype_overclaim(self, mock_client):
        fake_predictor = SimpleNamespace(
            model_type='binary_v2_no_bp',
            metrics={'dataset_hash': 'dataset-sha-abc'},
            features=['bmi', 'triglycerides', 'ldl', 'hdl', 'age'],
            predict=lambda data: {
                'success': True,
                'risk_cluster': 'N/A',
                'metabolic_subtype': 'N/A',
                'metabolic_subtype_full': 'N/A',
                'risk_level': 'UNKNOWN',
                'risk_label': 'N/A',
                'cluster_description': '',
                'treatment_focus': '',
                'risk_score': 62,
                'at_risk_probability': 0.62,
                'prediction_confidence': 'Confident',
                'output_capabilities': {
                    'predicted_status': True,
                    'risk_score': True,
                    'at_risk_probability': True,
                    'prediction_confidence': True,
                    'metabolic_subtype': False,
                    'risk_label': True,
                    'cluster_description': False,
                    'treatment_focus': False,
                },
                'cluster_capability': {
                    'supported': False,
                    'required_inputs': ['bmi', 'triglycerides', 'ldl', 'hdl', 'age', 'waist_circumference'],
                    'output_field': 'metabolic_subtype',
                    'alias_field': 'risk_cluster',
                },
            },
        )

        expected_baseline = {
            'baseline_id': '',
            'baseline_version': '',
            'model_version': 'binary_v2_no_bp',
            'dataset_hash': 'dataset-sha-abc',
            'feature_schema_version': 'features:5',
            'lineage_status': 'missing_reference',
        }

        with patch('Ian_ML.service.server.get_clinical_predictor_for', return_value=fake_predictor):
            with patch('Ian_ML.service.server._drift_baseline_for_lineage', return_value=expected_baseline):
                response = mock_client.post('/predict?model_type=clinical', json={
                    'bmi': 32.0,
                    'triglycerides': 180.0,
                    'ldl': 130.0,
                    'hdl': 50.0,
                    'age': 55,
                })

        assert response.status_code == 200
        payload = json.loads(response.data)

        assert payload['risk_cluster'] == 'N/A'
        assert payload['metabolic_subtype'] == 'N/A'
        assert payload['metabolic_subtype_full'] == 'N/A'
        assert payload['cluster_description'] == ''
        assert payload['treatment_focus'] == ''
        assert payload['cluster_capability']['supported'] is False
        assert payload['output_capabilities']['metabolic_subtype'] is False
        assert payload['output_capabilities']['cluster_description'] is False
        assert payload['output_capabilities']['treatment_focus'] is False
        assert payload['drift_baseline']['lineage_status'] == 'missing_reference'

    def test_drift_baseline_backfills_lineage_identity_fields(self):
        from ..service import server as ml_server

        fake_monitor = SimpleNamespace(
            get_baseline_metadata=lambda **kwargs: {
                'baseline_id': 'baseline-2026q4',
                'baseline_version': '9',
                'lineage_status': 'healthy',
            }
        )

        with patch('Ian_ML.service.server.drift_available', True):
            with patch('Ian_ML.service.server.get_drift_monitor', return_value=fake_monitor):
                baseline = ml_server._drift_baseline_for_lineage(
                    'binary_v2_bp',
                    'dataset-sha-xyz',
                    'features:6',
                )

        assert baseline['baseline_id'] == 'baseline-2026q4'
        assert baseline['baseline_version'] == '9'
        assert baseline['model_version'] == 'binary_v2_bp'
        assert baseline['dataset_hash'] == 'dataset-sha-xyz'
        assert baseline['feature_schema_version'] == 'features:6'
        assert baseline['lineage_status'] == 'healthy'


class TestRequestSizeValidation:
    """Test that request body size limits are enforced to prevent memory exhaustion."""

    def test_max_content_length_is_10mb(self):
        """Verify MAX_CONTENT_LENGTH is set to 10MB."""
        assert MAX_CONTENT_LENGTH == 10 * 1024 * 1024

    def test_max_batch_size_is_1000(self):
        """Verify MAX_BATCH_SIZE is set to 1000 patients."""
        assert MAX_BATCH_SIZE == 1000

    def test_predict_rejects_oversized_payload_413(self, mock_client):
        """Test that /predict endpoint rejects payloads exceeding MAX_CONTENT_LENGTH with 413."""
        # Create a payload larger than 10MB (11MB)
        oversized_data = {
            'bmi': 32.0,
            'triglycerides': 150.0,
            'ldl': 130.0,
            'hdl': 50.0,
            'age': 55,
            # Add a large payload field to exceed the limit
            'oversized_field': 'x' * (11 * 1024 * 1024)
        }

        response = mock_client.post('/predict',
            json=oversized_data,
            content_type='application/json')

        # Flask returns 413 Request Entity Too Large when MAX_CONTENT_LENGTH is exceeded
        assert response.status_code == 413

    def test_predict_accepts_normal_sized_payload(self, mock_client, mock_predictor):
        """Test that /predict endpoint accepts normal sized payloads."""
        with patch('Ian_ML.service.server.get_clinical_predictor_for') as mock_get_clinical:
            mock_get_clinical.return_value = mock_predictor
            response = mock_client.post('/predict',
                json={
                    'bmi': 32.0,
                    'triglycerides': 150.0,
                    'ldl': 130.0,
                    'hdl': 50.0,
                    'age': 55
                })

        assert response.status_code == 200

    def test_predict_batch_rejects_oversized_payload_413(self, mock_client):
        """Test that /predict/batch endpoint rejects payloads exceeding MAX_CONTENT_LENGTH."""
        # Create a batch payload larger than 10MB
        patients = []
        for i in range(100):
            patients.append({
                'bmi': 32.0,
                'triglycerides': 150.0,
                'ldl': 130.0,
                'hdl': 50.0,
                'age': 55,
                'oversized_field': 'x' * (150 * 1024)  # 150KB per patient, 100 patients = 15MB
            })

        response = mock_client.post('/predict/batch',
            json={'patients': patients},
            content_type='application/json')

        # Flask returns 413 Request Entity Too Large when MAX_CONTENT_LENGTH is exceeded
        assert response.status_code == 413

    def test_predict_batch_rejects_exceeds_max_batch_size(self, mock_client, mock_predictor):
        """Test that /predict/batch rejects requests with more than MAX_BATCH_SIZE patients."""
        # Create a batch with more than 1000 patients
        patients = [{'bmi': 30.0, 'triglycerides': 100.0, 'ldl': 100.0, 'hdl': 50.0, 'age': 50}
                    for _ in range(1001)]

        with patch('Ian_ML.service.server.get_predictor') as mock_get_predictor:
            mock_get_predictor.return_value = mock_predictor
            response = mock_client.post('/predict/batch',
                json={'patients': patients})

        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'exceeds maximum' in data.get('error', '').lower()

    def test_predict_batch_accepts_max_batch_size(self, mock_client, mock_predictor):
        """Test that /predict/batch accepts exactly MAX_BATCH_SIZE patients."""
        # Create a batch with exactly 1000 patients (the maximum)
        patients = [{'bmi': 30.0, 'triglycerides': 100.0, 'ldl': 100.0, 'hdl': 50.0, 'age': 50}
                    for _ in range(1000)]

        with patch('Ian_ML.service.server.get_predictor') as mock_get_predictor:
            mock_get_predictor.return_value = mock_predictor
            response = mock_client.post('/predict/batch',
                json={'patients': patients})

        assert response.status_code == 200

    def test_drift_reference_rejects_oversized_payload_413(self, mock_client):
        """Test that /monitoring/drift/reference endpoint rejects oversized payloads."""
        # Create a payload larger than 10MB
        oversized_data = {
            'features': {
                'bmi': [25.0] * (3 * 1024 * 1024),  # Large array to exceed 10MB
                'triglycerides': [150.0] * (3 * 1024 * 1024),
            }
        }

        response = mock_client.post('/monitoring/drift/reference',
            json=oversized_data,
            content_type='application/json')

        # Flask returns 413 Request Entity Too Large when MAX_CONTENT_LENGTH is exceeded
        assert response.status_code == 413

    def test_drift_check_rejects_oversized_payload_413(self, mock_client):
        """Test that /monitoring/drift/check endpoint rejects oversized payloads."""
        # Create a payload larger than 10MB
        oversized_data = {
            'features': {
                'bmi': [25.0] * (5 * 1024 * 1024),  # Large array to exceed 10MB
            }
        }

        response = mock_client.post('/monitoring/drift/check',
            json=oversized_data,
            content_type='application/json')

        # Flask returns 413 Request Entity Too Large when MAX_CONTENT_LENGTH is exceeded
        assert response.status_code == 413
