"""
Test suite for ml/server.py - Flask API Endpoints
"""

import pytest
import sys
import os
import json
from unittest.mock import Mock, MagicMock


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
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['success'] is False
        assert 'error' in data
        assert 'error' not in data.get('details', '')