import pytest
from .predict import DianaPredictor, ClinicalPredictor, get_medical_status, REQUIRED_FEATURES


class TestClinicalPredictor:
    
    @pytest.fixture
    def clinical_predictor(self):
        return ClinicalPredictor()
    
    @pytest.fixture
    def ada_predictor(self):
        return DianaPredictor()
    
    def test_predict_normal_clinical(self, clinical_predictor):
        data = {
            'bmi': 22.0,
            'triglycerides': 100.0,
            'ldl': 100.0,
            'hdl': 65.0,
            'age': 45
        }
        result = clinical_predictor.predict(data)
        
        assert result['success'] is True
        assert result['medical_status'] == 'Normal'
        assert result['risk_level'] == 'LOW'
        assert result['risk_score'] <= 30
    
    def test_predict_prediabetic_clinical(self, clinical_predictor):
        data = {
            'bmi': 27.0,
            'triglycerides': 150.0,
            'ldl': 130.0,
            'hdl': 50.0,
            'age': 55
        }
        result = clinical_predictor.predict(data)
        
        assert result['success'] is True
        assert result['medical_status'] == 'Pre-diabetic'
        assert result['risk_level'] in ['LOW', 'MODERATE']
        assert result['risk_score'] >= 30
    
    def test_predict_diabetic_clinical_mod_cluster(self, clinical_predictor):
        data = {
            'bmi': 31.0,
            'triglycerides': 200.0,
            'ldl': 150.0,
            'hdl': 45.0,
            'age': 50
        }
        result = clinical_predictor.predict(data)
        
        assert result['success'] is True
        assert result['medical_status'] == 'Diabetic'
        assert result['risk_cluster'] == 'MOD'
        assert result['risk_level'] == 'MODERATE'
    
    def test_predict_diabetic_clinical_mard_cluster(self, clinical_predictor):
        data = {
            'bmi': 26.0,
            'triglycerides': 120.0,
            'ldl': 130.0,
            'hdl': 60.0,
            'age': 70
        }
        result = clinical_predictor.predict(data)
        
        assert result['success'] is True
        assert result['medical_status'] == 'Diabetic'
        assert result['risk_cluster'] == 'MARD'
        assert result['risk_level'] == 'LOW'
        assert result['risk_score'] <= 30
    
    def test_predict_diabetic_clinical_sird_cluster(self, clinical_predictor):
        data = {
            'bmi': 35.0,
            'triglycerides': 180.0,
            'ldl': 140.0,
            'hdl': 40.0,
            'age': 50
        }
        result = clinical_predictor.predict(data)
        
        assert result['success'] is True
        assert result['medical_status'] == 'Diabetic'
        assert result['risk_cluster'] == 'SIRD'
        assert result['risk_level'] == 'HIGH'
    
    def test_predict_diabetic_clinical_sidd_cluster(self, clinical_predictor):
        data = {
            'bmi': 30.0,
            'triglycerides': 220.0,
            'ldl': 150.0,
            'hdl': 40.0,
            'age': 45
        }
        result = clinical_predictor.predict(data)
        
        assert result['success'] is True
        assert result['medical_status'] == 'Diabetic'
        assert result['risk_cluster'] == 'SIDD'
        assert result['risk_level'] == 'HIGH'
        assert result['risk_score'] >= 70
    
    def test_predict_missing_clinical_features(self, clinical_predictor):
        """Test prediction with missing clinical features."""
        data = {'bmi': 30.0}
        result = clinical_predictor.predict(data)
        
        assert result['success'] is True
        assert result['medical_status'] in ['Pre-diabetic', 'Diabetic']
        assert 'risk_cluster' in result
        assert 'risk_level' in result
    
    def test_predict_very_high_clinical_risk(self, clinical_predictor):
        """Test prediction for very high clinical risk."""
        data = {
            'bmi': 40.0,
            'triglycerides': 250.0,
            'ldl': 180.0,
            'hdl': 30.0,
            'age': 55
        }
        result = clinical_predictor.predict(data)
        
        assert result['success'] is True
        assert result['medical_status'] == 'Diabetic'
        assert result['risk_score'] >= 85
        assert result['risk_level'] == 'HIGH'
    
    def test_predict_returns_all_fields_clinical(self, clinical_predictor):
        """Test that clinical prediction returns all expected fields."""
        data = {
            'bmi': 30.0,
            'triglycerides': 150.0,
            'ldl': 130.0,
            'hdl': 50.0,
            'age': 50
        }
        result = clinical_predictor.predict(data)
        
        assert result['success'] is True
        assert 'medical_status' in result
        assert 'risk_cluster' in result
        assert 'risk_level' in result
        assert 'risk_score' in result
        assert 'probability' in result
        assert 'confidence' in result
        assert 'model_type' in result
    
    def test_predict_clinical_uses_correct_features(self, clinical_predictor):
        """Test that ClinicalPredictor uses only clinical features."""
        data = {
            'bmi': 30.0,
            'triglycerides': 150.0,
            'ldl': 130.0,
            'hdl': 50.0,
            'age': 50
        }
        result = clinical_predictor.predict(data)
        
        assert result['model_type'] == 'clinical', \
            "ClinicalPredictor should use model_type='clinical'"
