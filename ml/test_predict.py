import pytest
from ml.predict import DianaPredictor, get_medical_status, REQUIRED_FEATURES


class TestGetMedicalStatus:
    def test_normal_hba1c(self):
        assert get_medical_status(5.0) == "Normal"
        assert get_medical_status(5.6) == "Normal"

    def test_prediabetic_hba1c(self):
        assert get_medical_status(5.7) == "Pre-diabetic"
        assert get_medical_status(6.4) == "Pre-diabetic"

    def test_diabetic_hba1c(self):
        assert get_medical_status(6.5) == "Diabetic"
        assert get_medical_status(10.0) == "Diabetic"


class TestDianaPredictor:
    @pytest.fixture
    def predictor(self):
        return DianaPredictor()

    def test_predict_sidd_cluster(self, predictor):
        data = {
            'hba1c': 9.5,
            'fbs': 220,
            'bmi': 35,
            'triglycerides': 160,
            'ldl': 120,
            'hdl': 45
        }
        result = predictor.predict(data)
        assert result['success'] is True
        assert result['risk_cluster'] == 'SIDD'
        assert result['risk_level'] == 'HIGH'
        assert result['medical_status'] == 'Diabetic'
        assert result['risk_score'] >= 70

    def test_predict_sird_cluster(self, predictor):
        data = {
            'hba1c': 6.0,
            'fbs': 110,
            'bmi': 38,
            'triglycerides': 100,
            'ldl': 110,
            'hdl': 50
        }
        result = predictor.predict(data)
        assert result['success'] is True
        assert result['risk_cluster'] == 'SIRD'
        assert result['risk_level'] == 'HIGH'

    def test_predict_mod_cluster(self, predictor):
        data = {
            'hba1c': 5.9,
            'fbs': 108,
            'bmi': 30,
            'triglycerides': 200,
            'ldl': 150,
            'hdl': 45
        }
        result = predictor.predict(data)
        assert result['success'] is True
        assert result['risk_cluster'] == 'MOD'
        assert result['risk_level'] == 'MODERATE'

    def test_predict_mard_cluster(self, predictor):
        data = {
            'hba1c': 5.2,
            'fbs': 95,
            'bmi': 24,
            'triglycerides': 75,
            'ldl': 120,
            'hdl': 70
        }
        result = predictor.predict(data)
        assert result['success'] is True
        assert result['risk_cluster'] == 'MARD'
        assert result['risk_level'] == 'LOW'
        assert result['medical_status'] == 'Normal'
        assert result['risk_score'] <= 30

    def test_predict_missing_features(self, predictor):
        data = {'hba1c': 6.0, 'fbs': 100}
        result = predictor.predict(data)
        assert result['success'] is False
        assert 'error' in result

    def test_predict_out_of_range_values(self, predictor):
        data = {
            'hba1c': 25.0,
            'fbs': 100,
            'bmi': 30,
            'triglycerides': 150,
            'ldl': 120,
            'hdl': 50
        }
        result = predictor.predict(data)
        assert result['success'] is False

    def test_predict_returns_required_fields(self, predictor):
        data = {
            'hba1c': 6.0,
            'fbs': 110,
            'bmi': 30,
            'triglycerides': 150,
            'ldl': 120,
            'hdl': 55
        }
        result = predictor.predict(data)
        assert result['success'] is True
        assert 'medical_status' in result
        assert 'risk_cluster' in result
        assert 'risk_level' in result
        assert 'risk_score' in result
        assert 'probability' in result
        assert 'confidence' in result

    def test_kmeans_uses_correct_feature_count(self, predictor):
        assert predictor.kmeans.n_features_in_ == len(REQUIRED_FEATURES)
        assert predictor.scaler.n_features_in_ == len(REQUIRED_FEATURES)


class TestPredictBatch:
    @pytest.fixture
    def predictor(self):
        return DianaPredictor()

    def test_batch_prediction(self, predictor):
        patients = [
            {'hba1c': 5.5, 'fbs': 95, 'bmi': 25, 'triglycerides': 80, 'ldl': 110, 'hdl': 65},
            {'hba1c': 9.0, 'fbs': 200, 'bmi': 35, 'triglycerides': 180, 'ldl': 140, 'hdl': 40},
        ]
        results = predictor.predict_batch(patients)
        assert len(results) == 2
        assert results[0]['risk_cluster'] == 'MARD'
        assert results[1]['risk_cluster'] == 'SIDD'
