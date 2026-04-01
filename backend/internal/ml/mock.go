package ml

import (
	"context"
	"log"
	"os"

	"github.com/skufu/DianaV2/backend/internal/models"
)

type Predictor interface {
	Predict(ctx context.Context, input models.Assessment) (Prediction, error)
	PredictWithModelType(ctx context.Context, input models.Assessment, modelType string) (Prediction, error)
	GetActiveModelMetadata(ctx context.Context) (*ModelMetadata, error)
	GetDriftStatus(ctx context.Context) (*DriftStatus, error)
	GetDriftAlerts(ctx context.Context, unacknowledgedOnly bool, limit int) (*DriftAlertsEnvelope, error)
	IsAvailable() bool
}

type MockPredictor struct{}

var mockFeatureSet = FeatureSet{
	Features:     []string{"bmi", "triglycerides", "ldl", "hdl", "age"},
	FeatureCount: 5,
	Source:       "mock",
}

var mockClusterCapability = ClusterCapability{
	Supported:      true,
	RequiredInputs: []string{"bmi", "triglycerides", "ldl", "hdl", "age", "waist_circumference"},
	OutputField:    "metabolic_subtype",
	AliasField:     "risk_cluster",
}

var mockOutputCapabilities = OutputCapabilities{
	PredictedStatus:      true,
	RiskScore:            true,
	AtRiskProbability:    true,
	PredictionConfidence: false,
	MetabolicSubtype:     true,
	RiskLabel:            true,
	ClusterDescription:   true,
	TreatmentFocus:       true,
}

func NewMockPredictor() *MockPredictor {
	// Warn when using mock predictor in non-test environments
	if os.Getenv("GO_ENV") != "test" && os.Getenv("ENV") != "test" {
		log.Println("[WARN] Using MockPredictor - real ML service not connected. Set MODEL_URL env var to connect to ML service.")
	}
	return &MockPredictor{}
}

// IsAvailable always returns true for mock predictor since it doesn't depend on external service.
func (m *MockPredictor) IsAvailable() bool {
	return true
}

func (m *MockPredictor) Predict(ctx context.Context, input models.Assessment) (Prediction, error) {
	switch {
	case input.BMI >= 35 && (input.Triglycerides >= 150 || input.LDL >= 130 || (input.HDL > 0 && input.HDL < 45)):
		return Prediction{
			Cluster:            "SIRD",
			RiskScore:          85,
			PredictedStatus:    "high",
			RiskLabel:          "High risk",
			ClusterDescription: "Severe insulin-resistant diabetes profile.",
			TreatmentFocus:     "Focus on insulin sensitivity and cardiovascular risk reduction.",
			AtRiskProbability:  0.85,
			FeatureSet:         mockFeatureSet,
			ClusterCapability:  mockClusterCapability,
			OutputCapabilities: mockOutputCapabilities,
		}, nil
	case input.BMI < 25 && (input.Triglycerides >= 200 || input.LDL >= 160):
		return Prediction{
			Cluster:            "SIDD",
			RiskScore:          78,
			PredictedStatus:    "high",
			RiskLabel:          "High risk",
			ClusterDescription: "Severe insulin-deficient diabetes profile.",
			TreatmentFocus:     "Prioritize glycemic control and beta-cell preservation.",
			AtRiskProbability:  0.78,
			FeatureSet:         mockFeatureSet,
			ClusterCapability:  mockClusterCapability,
			OutputCapabilities: mockOutputCapabilities,
		}, nil
	case input.BMI >= 30:
		return Prediction{
			Cluster:            "MOD",
			RiskScore:          60,
			PredictedStatus:    "moderate",
			RiskLabel:          "Moderate risk",
			ClusterDescription: "Mild obesity-related diabetes profile.",
			TreatmentFocus:     "Weight management and lifestyle optimization.",
			AtRiskProbability:  0.60,
			FeatureSet:         mockFeatureSet,
			ClusterCapability:  mockClusterCapability,
			OutputCapabilities: mockOutputCapabilities,
		}, nil
	// High metabolic risk despite moderate BMI (25-30) with elevated biomarkers
	case input.BMI >= 25 && (input.Triglycerides >= 200 || input.LDL >= 160 || input.HDL > 0 && input.HDL < 40):
		return Prediction{
			Cluster:            "SIDD",
			RiskScore:          75,
			PredictedStatus:    "high",
			RiskLabel:          "High risk",
			ClusterDescription: "Severe insulin-deficient diabetes profile with metabolic syndrome markers.",
			TreatmentFocus:     "Prioritize glycemic control and address metabolic syndrome markers (lipids, BMI).",
			AtRiskProbability:  0.75,
			FeatureSet:         mockFeatureSet,
			ClusterCapability:  mockClusterCapability,
			OutputCapabilities: mockOutputCapabilities,
		}, nil
	case input.PatientID%2 == 0:
		return Prediction{
			Cluster:            "MARD",
			RiskScore:          45,
			PredictedStatus:    "low",
			RiskLabel:          "Lower risk",
			ClusterDescription: "Mild age-related diabetes profile.",
			TreatmentFocus:     "Maintain current health habits and monitor risk factors.",
			AtRiskProbability:  0.45,
			FeatureSet:         mockFeatureSet,
			ClusterCapability:  mockClusterCapability,
			OutputCapabilities: mockOutputCapabilities,
		}, nil
	default:
		return Prediction{
			Cluster:            "MOD",
			RiskScore:          30,
			PredictedStatus:    "low",
			RiskLabel:          "Lower risk",
			ClusterDescription: "Mild obesity-related diabetes profile.",
			TreatmentFocus:     "Maintain healthy weight and regular activity.",
			AtRiskProbability:  0.30,
			FeatureSet:         mockFeatureSet,
			ClusterCapability:  mockClusterCapability,
			OutputCapabilities: mockOutputCapabilities,
		}, nil
	}
}

func (m *MockPredictor) PredictWithModelType(ctx context.Context, input models.Assessment, modelType string) (Prediction, error) {
	return m.Predict(ctx, input)
}

func (m *MockPredictor) GetActiveModelMetadata(ctx context.Context) (*ModelMetadata, error) {
	return &ModelMetadata{
		ModelVersion:       "mock_v1",
		DatasetHash:        "mock_hash",
		Notes:              "Mock models metadata",
		Features:           []string{"mock_feature"},
		FeatureSet:         mockFeatureSet,
		ClusterCapability:  mockClusterCapability,
		OutputCapabilities: mockOutputCapabilities,
		DriftBaseline: DriftBaselineMetadata{
			BaselineID:           "mock-baseline",
			BaselineVersion:      "v1",
			ModelVersion:         "mock_v1",
			DatasetHash:          "mock_hash",
			FeatureSchemaVersion: "features:5",
			SourceKind:           "mock_reference",
			CreatedAt:            "2026-03-08T00:00:00Z",
			StaleAfter:           "2026-06-08T00:00:00Z",
			SampleCount:          128,
			ReferenceFeatures:    mockFeatureSet.Features,
			LineageStatus:        "healthy",
		},
		Metrics: map[string]interface{}{"accuracy": 0.99},
	}, nil
}

func (m *MockPredictor) GetDriftStatus(ctx context.Context) (*DriftStatus, error) {
	lastCheck := "2026-03-08T00:00:00Z"
	return &DriftStatus{
		ReferenceFeatures:    mockFeatureSet.Features,
		ReferenceSet:         true,
		TotalAlerts:          1,
		UnacknowledgedAlerts: 1,
		LastCheck:            &lastCheck,
		ScipyAvailable:       true,
		ActiveLineage: DriftActiveLineage{
			ModelVersion:         "mock_v1",
			DatasetHash:          "mock_hash",
			FeatureSchemaVersion: "features:5",
		},
		DriftBaseline: DriftBaselineMetadata{
			BaselineID:           "mock-baseline",
			BaselineVersion:      "v1",
			ModelVersion:         "mock_v1",
			DatasetHash:          "mock_hash",
			FeatureSchemaVersion: "features:5",
			SourceKind:           "mock_reference",
			CreatedAt:            "2026-03-08T00:00:00Z",
			StaleAfter:           "2026-06-08T00:00:00Z",
			SampleCount:          128,
			ReferenceFeatures:    mockFeatureSet.Features,
			LineageStatus:        "healthy",
		},
	}, nil
}

func (m *MockPredictor) GetDriftAlerts(ctx context.Context, unacknowledgedOnly bool, limit int) (*DriftAlertsEnvelope, error) {
	alerts := []DriftAlert{
		{
			Timestamp:    "2026-03-08T00:00:00Z",
			AlertType:    "drift",
			Severity:     "medium",
			Message:      "Drift detected in 1 feature(s): bmi",
			Details:      map[string]any{"features": []string{"bmi"}},
			Acknowledged: false,
		},
	}
	if unacknowledgedOnly {
		alerts = []DriftAlert{alerts[0]}
	}
	if limit > 0 && limit < len(alerts) {
		alerts = alerts[:limit]
	}

	return &DriftAlertsEnvelope{
		Alerts: alerts,
		ActiveLineage: DriftActiveLineage{
			ModelVersion:         "mock_v1",
			DatasetHash:          "mock_hash",
			FeatureSchemaVersion: "features:5",
		},
		DriftBaseline: DriftBaselineMetadata{
			BaselineID:           "mock-baseline",
			BaselineVersion:      "v1",
			ModelVersion:         "mock_v1",
			DatasetHash:          "mock_hash",
			FeatureSchemaVersion: "features:5",
			SourceKind:           "mock_reference",
			CreatedAt:            "2026-03-08T00:00:00Z",
			StaleAfter:           "2026-06-08T00:00:00Z",
			SampleCount:          128,
			ReferenceFeatures:    mockFeatureSet.Features,
			LineageStatus:        "healthy",
		},
	}, nil
}
