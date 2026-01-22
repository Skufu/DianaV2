"""
Test suite for ml/server.py - Flask API Endpoints
"""

import pytest
import sys
import os
import json
from unittest.mock import Mock, MagicMock, patch


@pytest.fixture
def mock_client():
    """Create a test client for Flask API."""
    from ml.server import app
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    
    with app.test_client() as client:
        yield client


@pytest.fixture
def mock_predictor():
    """Mock DianaPredictor for testing."""
    from ml.predict import DianaPredictor

    with patch('ml.predict.DianaPredictor') as mock_ada:
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
    from ml.predict import ClinicalPredictor

    with patch('ml.predict.clinicalPredictor') as mock_clinical:
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
        response = mock_client.post('/predict?model_type=ada',
            json={
                'hbac': 7.0,
                'fbs': 130,
                'bmi': 35.0,
                'triglycerides': 180.0,
                'ldl': 140.0,
                'hdl': 45.0,
                'age': 50
            })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert data['risk_cluster'] == 'SIRD'
        assert data['model_type'] == 'ada'
    
    def test_predict_success_clinical_model(self, mock_client, mock_predictor):
        response = mock_client.post('/predict?model_type=clinical',
            json={
                'hbmi': 32.0,
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


class TestPredictBatchEndpoint:
    
    def test_batch_success(self, mock_client, mock_predictor):
        patients = [
            {'hbac': 7.0, 'fbs': 110, 'bmi': 28.0},
            {'hbac': 9.0, 'fbs': 200.0, 'bmi': 31.0}
        ]
        
        response = mock_client.post('/predict/batch', json={'patients': patients})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] is True
        assert len(data['predictions']) == 2


class TestErrorHandling:

    def test_predict_missing_features(self, mock_client, mock_predictor):
        response = mock_client.post('/predict',
            json={'age': 50})

        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'error' in data
        assert 'error' not in data.get('details', '')


@pytest.fixture
def authenticated_client():
    """Create test client with ML_API_KEY set."""
    os.environ['ML_API_KEY'] = 'test-api-key-12345'
    from ml.server import app
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False

    with app.test_client() as client:
        yield client

    if 'ML_API_KEY' in os.environ:
        del os.environ['ML_API_KEY']


@pytest.fixture
def unauthenticated_client():
    """Create test client without ML_API_KEY set."""
    if 'ML_API_KEY' in os.environ:
        del os.environ['ML_API_KEY']
    from ml.server import app
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False

    with app.test_client() as client:
        yield client


class TestAPIKeyAuthentication:

    def test_predict_without_api_key_returns_401(self, unauthenticated_client):
        """Test that requests without API key return 401."""
        response = unauthenticated_client.post('/predict',
            json={'bmi': 30.0, 'triglycerides': 150.0, 'ldl': 130.0, 'hdl': 50.0, 'age': 50})

        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
        assert 'API key' in data['error']

    def test_predict_with_invalid_api_key_returns_401(self, authenticated_client):
        """Test that requests with invalid API key return 401."""
        response = authenticated_client.post('/predict',
            json={'bmi': 30.0, 'triglycerides': 150.0, 'ldl': 130.0, 'hdl': 50.0, 'age': 50},
            headers={'X-API-Key': 'wrong-api-key'})

        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
        assert 'API key' in data['error']

    def test_predict_with_valid_api_key_succeeds(self, authenticated_client, mock_predictor):
        """Test that requests with valid API key succeed."""
        with patch('ml.server.get_predictor') as mock_get_predictor:
            mock_get_predictor.return_value = mock_predictor
            mock_predictor.predict.return_value = {
                'success': True,
                'risk_cluster': 'SIRD',
                'risk_score': 75,
                'risk_level': 'HIGH',
                'medical_status': 'Diabetic',
                'probability': [0.1, 0.2, 0.7],
                'confidence': 'high',
                'model_type': 'ada'
            }

            response = authenticated_client.post('/predict?model_type=ada',
                json={'hba1c': 7.0, 'fbs': 130, 'bmi': 35.0, 'triglycerides': 180.0, 'ldl': 140.0, 'hdl': 45.0},
                headers={'X-API-Key': 'test-api-key-12345'})

            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['success'] is True

    def test_insights_without_api_key_returns_401(self, unauthenticated_client):
        """Test that insights endpoints without API key return 401."""
        response = unauthenticated_client.get('/insights/metrics')

        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
        assert 'API key' in data['error']

    def test_health_endpoint_works_without_api_key(self, unauthenticated_client):
        """Test that health endpoint doesn't require API key."""
        response = unauthenticated_client.get('/health')

        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['status'] == 'healthy'