package ml

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/skufu/DianaV2/backend/internal/models"
)

func validAssessmentInput() models.Assessment {
	return models.Assessment{
		HbA1c:         5.8,
		FBS:           100,
		LDL:           120,
		HDL:           50,
		Triglycerides: 150,
		Systolic:      120,
		Diastolic:     80,
		BMI:           25.0,
		Age:           55,
	}
}

func TestNewHTTPPredictor(t *testing.T) {
	tests := []struct {
		name    string
		url     string
		version string
		timeout time.Duration
		wantURL string
		wantVer string
	}{
		{
			name:    "with all params",
			url:     "http://localhost:5000/predict",
			version: "v1.2.3",
			timeout: 5 * time.Second,
			wantURL: "http://localhost:5000/predict",
			wantVer: "v1.2.3",
		},
		{
			name:    "empty version",
			url:     "http://localhost:5000/predict",
			version: "",
			timeout: 2 * time.Second,
			wantURL: "http://localhost:5000/predict",
			wantVer: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			p := NewHTTPPredictor(tt.url, tt.version, "", tt.timeout)
			if p.url != tt.wantURL {
				t.Errorf("NewHTTPPredictor() url = %v, want %v", p.url, tt.wantURL)
			}
			if p.version != tt.wantVer {
				t.Errorf("NewHTTPPredictor() version = %v, want %v", p.version, tt.wantVer)
			}
		})
	}
}

func TestHTTPPredictor_Predict_EmptyURL(t *testing.T) {
	p := NewHTTPPredictor("", "v1", "", 5*time.Second)
	input := validAssessmentInput()

	prediction, err := p.Predict(context.Background(), input)

	if err == nil {
		t.Errorf("Predict() expected error when URL is empty")
	}
	if prediction.Cluster != "" {
		t.Errorf("Predict() cluster = %q, want ''", prediction.Cluster)
	}
	if prediction.RiskScore != 0 {
		t.Errorf("Predict() score = %d, want 0", prediction.RiskScore)
	}
}

func TestHTTPPredictor_Predict_Success(t *testing.T) {
	version := "v1.0.0"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("Expected POST request, got %s", r.Method)
		}
		if r.URL.Path != "/predict" {
			t.Errorf("Expected path /predict, got %s", r.URL.Path)
		}
		if r.URL.Query().Get("model_type") != version {
			t.Errorf("Expected model_type=%s query param, got %s", version, r.URL.Query().Get("model_type"))
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("Expected Content-Type application/json")
		}

		var input models.Assessment
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			t.Errorf("Failed to decode request: %v", err)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"risk_cluster":  "SIRD",
			"risk_score":    75,
			"model_version": "binary_v2_no_bp@2026.03",
			"dataset_hash":  "dataset-sha-abc",
			"drift_baseline": map[string]any{
				"baseline_id":            "baseline-2026q1",
				"baseline_version":       "3",
				"model_version":          "binary_v2_no_bp@2026.03",
				"dataset_hash":           "dataset-sha-abc",
				"feature_schema_version": "features:9",
				"source_kind":            "release_holdout",
				"created_at":             "2026-03-01T00:00:00Z",
				"stale_after":            "2026-06-01T00:00:00Z",
				"sample_count":           412,
				"reference_features":     []string{"bmi", "triglycerides", "ldl", "hdl", "age"},
				"lineage_status":         "healthy",
			},
			"feature_set": map[string]any{
				"features":      []string{"bmi", "triglycerides", "ldl", "hdl", "age"},
				"feature_count": 5,
				"source":        "features.json",
			},
			"cluster_capability": map[string]any{
				"supported":       true,
				"required_inputs": []string{"bmi", "triglycerides", "ldl", "hdl", "age", "waist_circumference"},
				"output_field":    "metabolic_subtype",
				"alias_field":     "risk_cluster",
			},
			"output_capabilities": map[string]any{
				"predicted_status":    true,
				"risk_score":          true,
				"at_risk_probability": true,
				"metabolic_subtype":   true,
			},
		})
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "v1.0.0", "", 5*time.Second)
	input := validAssessmentInput()
	input.HbA1c = 6.5
	input.FBS = 120
	input.Cholesterol = 220
	input.Systolic = 140
	input.Diastolic = 90
	input.BMI = 28.5

	prediction, err := p.Predict(context.Background(), input)

	if err != nil {
		t.Errorf("Predict() returned unexpected error: %v", err)
	}
	if prediction.Cluster != "SIRD" {
		t.Errorf("Predict() cluster = %q, want 'SIRD'", prediction.Cluster)
	}
	if prediction.RiskScore != 75 {
		t.Errorf("Predict() score = %d, want 75", prediction.RiskScore)
	}
	if prediction.ModelVersion != "binary_v2_no_bp@2026.03" {
		t.Errorf("Predict() model_version = %q, want %q", prediction.ModelVersion, "binary_v2_no_bp@2026.03")
	}
	if prediction.DatasetHash != "dataset-sha-abc" {
		t.Errorf("Predict() dataset_hash = %q, want %q", prediction.DatasetHash, "dataset-sha-abc")
	}
	if prediction.DriftBaseline.BaselineID != "baseline-2026q1" {
		t.Errorf("Predict() drift baseline id = %q, want %q", prediction.DriftBaseline.BaselineID, "baseline-2026q1")
	}
	if prediction.FeatureSet.FeatureCount != 5 {
		t.Errorf("Predict() feature_count = %d, want 5", prediction.FeatureSet.FeatureCount)
	}
	if !prediction.ClusterCapability.Supported {
		t.Errorf("Predict() cluster capability supported = false, want true")
	}
	if !prediction.OutputCapabilities.RiskScore {
		t.Errorf("Predict() output_capabilities.risk_score = false, want true")
	}
}

func TestHTTPPredictor_Predict_WithVersionHeader(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		version := r.Header.Get("X-Model-Version")
		if version != "v2.1.0" {
			t.Errorf("Expected X-Model-Version header v2.1.0, got %s", version)
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"risk_cluster": "SIDD",
			"risk_score":   80,
			"cluster_capability": map[string]any{
				"supported": true,
			},
			"output_capabilities": map[string]any{
				"metabolic_subtype": true,
			},
		})
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "v2.1.0", "", 5*time.Second)
	input := validAssessmentInput()
	input.HbA1c = 7.0

	prediction, err := p.Predict(context.Background(), input)

	if err != nil {
		t.Errorf("Predict() returned unexpected error: %v", err)
	}
	if prediction.Cluster != "SIDD" {
		t.Errorf("Predict() cluster = %q, want 'SIDD'", prediction.Cluster)
	}
	if prediction.RiskScore != 80 {
		t.Errorf("Predict() score = %d, want 80", prediction.RiskScore)
	}
}

func TestHTTPPredictor_Predict_PrefersMetabolicSubtypeAlias(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"metabolic_subtype": "  sidd ",
			"risk_cluster":      "MOD",
			"risk_score":        80,
			"cluster_capability": map[string]any{
				"supported": true,
			},
			"output_capabilities": map[string]any{
				"metabolic_subtype": true,
			},
		})
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "v1", "", 5*time.Second)
	input := validAssessmentInput()

	prediction, err := p.Predict(context.Background(), input)
	if err != nil {
		t.Fatalf("Predict() returned unexpected error: %v", err)
	}
	if prediction.Cluster != "SIDD" {
		t.Fatalf("Predict() cluster = %q, want 'SIDD'", prediction.Cluster)
	}
}

func TestHTTPPredictor_Predict_NetworkError(t *testing.T) {
	p := NewHTTPPredictor("http://invalid-host-that-does-not-exist-12345.com/predict", "v1", "", 1*time.Millisecond)
	input := validAssessmentInput()

	_, err := p.Predict(context.Background(), input)

	if err == nil {
		t.Errorf("Predict() should return error on network failure")
	}
}

func TestHTTPPredictor_Predict_NonOKResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error"})
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "v1", "", 5*time.Second)
	input := validAssessmentInput()

	_, err := p.Predict(context.Background(), input)

	if err == nil {
		t.Errorf("Predict() should return error on 500 response")
	}
}

func TestHTTPPredictor_Predict_InvalidJSONResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("invalid json {{{"))
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "v1", "", 5*time.Second)
	input := validAssessmentInput()

	_, err := p.Predict(context.Background(), input)

	if err == nil {
		t.Errorf("Predict() should return error on invalid JSON response")
	}
}

func TestHTTPPredictor_Predict_EmptyClusterResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"risk_cluster": "",
			"risk_score":   50,
			"cluster_capability": map[string]any{
				"supported": true,
			},
			"output_capabilities": map[string]any{
				"metabolic_subtype": true,
			},
		})
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "v1", "", 5*time.Second)
	input := validAssessmentInput()

	_, err := p.Predict(context.Background(), input)

	if err == nil {
		t.Errorf("Predict() should return error on empty risk cluster")
	}
}

func TestHTTPPredictor_Predict_RejectsUnsupportedMetabolicSubtype(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"metabolic_subtype": "unknown",
			"risk_cluster":      "SIRD",
			"risk_score":        50,
			"cluster_capability": map[string]any{
				"supported": true,
			},
			"output_capabilities": map[string]any{
				"metabolic_subtype": true,
			},
		})
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "v1", "", 5*time.Second)
	input := validAssessmentInput()

	_, err := p.Predict(context.Background(), input)
	if err == nil {
		t.Fatalf("Predict() should return error on unsupported metabolic_subtype")
	}
}

func TestHTTPPredictor_Predict_Timeout(t *testing.T) {
	delay := 100 * time.Millisecond
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(delay)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"risk_cluster": "MOD",
			"risk_score":   40,
		})
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "v1", "", 10*time.Millisecond)
	input := validAssessmentInput()

	_, err := p.Predict(context.Background(), input)

	if err == nil {
		t.Errorf("Predict() should return error on timeout")
	}
}

func TestHTTPPredictor_Predict_MarshaledInput(t *testing.T) {
	var receivedJSON []byte
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedJSON, _ = io.ReadAll(r.Body)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"risk_cluster": "MARD",
			"risk_score":   30,
			"cluster_capability": map[string]any{
				"supported": true,
			},
			"output_capabilities": map[string]any{
				"metabolic_subtype": true,
			},
		})
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "v1", "", 5*time.Second)
	input := models.Assessment{
		HbA1c:         5.5,
		FBS:           95,
		Cholesterol:   180,
		LDL:           110,
		HDL:           50,
		Triglycerides: 120,
		Systolic:      120,
		Diastolic:     80,
		BMI:           24.5,
		Age:           56,
	}

	prediction, err := p.Predict(context.Background(), input)

	if err != nil {
		t.Errorf("Predict() returned unexpected error: %v", err)
	}
	if prediction.Cluster != "MARD" {
		t.Errorf("Predict() cluster = %q, want 'MARD'", prediction.Cluster)
	}
	if prediction.RiskScore != 30 {
		t.Errorf("Predict() score = %d, want 30", prediction.RiskScore)
	}

	if len(receivedJSON) == 0 {
		t.Error("Expected request body to be sent")
	}

	var decoded models.Assessment
	if err := json.Unmarshal(receivedJSON, &decoded); err != nil {
		t.Errorf("Failed to unmarshal sent JSON: %v", err)
	}
	if decoded.BMI != input.BMI {
		t.Errorf("Sent BMI = %f, want %f", decoded.BMI, input.BMI)
	}
}

func TestHTTPPredictor_Predict_AllClusters(t *testing.T) {
	clusters := []string{"SIRD", "SIDD", "MOD", "MARD"}

	for _, cluster := range clusters {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			json.NewEncoder(w).Encode(map[string]any{
				"risk_cluster": cluster,
				"risk_score":   50,
				"cluster_capability": map[string]any{
					"supported": true,
				},
				"output_capabilities": map[string]any{
					"metabolic_subtype": true,
				},
			})
		}))

		p := NewHTTPPredictor(server.URL+"/predict", "v1", "", 5*time.Second)
		input := validAssessmentInput()
		input.HbA1c = 6.5

		prediction, err := p.Predict(context.Background(), input)

		if err != nil {
			t.Errorf("Predict() returned unexpected error: %v", err)
		}
		if prediction.Cluster != cluster {
			t.Errorf("Expected cluster %q, got %q", cluster, prediction.Cluster)
		}

		server.Close()
	}
}

func TestHTTPPredictor_Predict_InvalidClinicalPayload(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"risk_cluster": "SIRD",
			"risk_score":   50,
		})
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "v1", "", 5*time.Second)
	input := models.Assessment{
		HbA1c: 6.5,
	}

	prediction, err := p.Predict(context.Background(), input)

	if err == nil {
		t.Errorf("Predict() should return error for invalid clinical payload")
	}
	if prediction.Cluster != "" {
		t.Errorf("Predict() with partial input = %q, want ''", prediction.Cluster)
	}
	if prediction.RiskScore != 0 {
		t.Errorf("Predict() with partial input = %d, want 0", prediction.RiskScore)
	}
}

func TestResolveClusterAlias(t *testing.T) {
	clusterCapable := predictResp{
		ClusterCapability: ClusterCapability{Supported: true},
		OutputCapabilities: OutputCapabilities{
			MetabolicSubtype: true,
		},
	}

	tests := []struct {
		name    string
		resp    predictResp
		want    string
		wantErr bool
	}{
		{
			name: "prefer canonical metabolic subtype when both present",
			resp: predictResp{
				MetabolicSubtype:   "SIRD",
				RiskCluster:        "MOD",
				ClusterCapability:  clusterCapable.ClusterCapability,
				OutputCapabilities: clusterCapable.OutputCapabilities,
			},
			want: "SIRD",
		},
		{
			name: "accept normalized canonical subtype",
			resp: predictResp{
				MetabolicSubtype:   "  sidd  ",
				RiskCluster:        "mard",
				ClusterCapability:  clusterCapable.ClusterCapability,
				OutputCapabilities: clusterCapable.OutputCapabilities,
			},
			want: "SIDD",
		},
		{
			name: "fallback to risk cluster when canonical alias empty",
			resp: predictResp{
				MetabolicSubtype:   " ",
				RiskCluster:        " mod ",
				ClusterCapability:  clusterCapable.ClusterCapability,
				OutputCapabilities: clusterCapable.OutputCapabilities,
			},
			want: "MOD",
		},
		{
			name: "reject unsupported canonical subtype even with fallback alias",
			resp: predictResp{
				MetabolicSubtype:   "unknown",
				RiskCluster:        "SIRD",
				ClusterCapability:  clusterCapable.ClusterCapability,
				OutputCapabilities: clusterCapable.OutputCapabilities,
			},
			wantErr: true,
		},
		{
			name: "reject unsupported fallback alias",
			resp: predictResp{
				RiskCluster:        "unknown",
				ClusterCapability:  clusterCapable.ClusterCapability,
				OutputCapabilities: clusterCapable.OutputCapabilities,
			},
			wantErr: true,
		},
		{
			name: "reject missing aliases",
			resp: predictResp{
				ClusterCapability:  clusterCapable.ClusterCapability,
				OutputCapabilities: clusterCapable.OutputCapabilities,
			},
			wantErr: true,
		},
		{
			name: "disable clustering semantics when capability unsupported",
			resp: predictResp{
				MetabolicSubtype: "SIRD",
				RiskCluster:      "MOD",
				ClusterCapability: ClusterCapability{
					Supported: false,
				},
				OutputCapabilities: OutputCapabilities{
					MetabolicSubtype: false,
				},
			},
			want: "",
		},
		{
			name: "disable clustering semantics when capability metadata inconsistent",
			resp: predictResp{
				MetabolicSubtype: "SIRD",
				RiskCluster:      "SIRD",
				ClusterCapability: ClusterCapability{
					Supported: true,
				},
				OutputCapabilities: OutputCapabilities{
					MetabolicSubtype: false,
				},
			},
			want: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := resolveClusterAlias(tt.resp)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("resolveClusterAlias() error = nil, want error")
				}
				return
			}

			if err != nil {
				t.Fatalf("resolveClusterAlias() unexpected error = %v", err)
			}
			if got != tt.want {
				t.Fatalf("resolveClusterAlias() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestHTTPPredictor_Predict_DisablesClusterSemanticsWhenCapabilityUnsupported(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"risk_cluster":        "SIRD",
			"metabolic_subtype":   "SIRD",
			"risk_score":          62,
			"cluster_description": "Should be hidden when unsupported",
			"treatment_focus":     "Should be hidden when unsupported",
			"at_risk_probability": 0.62,
			"predicted_status":    "At-Risk",
			"cluster_capability":  map[string]any{"supported": false},
			"output_capabilities": map[string]any{"metabolic_subtype": false, "cluster_description": true, "treatment_focus": true},
		})
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "binary_v2_no_bp", "", 5*time.Second)
	prediction, err := p.Predict(context.Background(), validAssessmentInput())
	if err != nil {
		t.Fatalf("Predict() returned unexpected error: %v", err)
	}

	if prediction.Cluster != "" {
		t.Fatalf("expected cluster to be blank when unsupported, got %q", prediction.Cluster)
	}
	if prediction.ClusterDescription != "" {
		t.Fatalf("expected cluster description to be blank when unsupported, got %q", prediction.ClusterDescription)
	}
	if prediction.TreatmentFocus != "" {
		t.Fatalf("expected treatment focus to be blank when unsupported, got %q", prediction.TreatmentFocus)
	}
	if prediction.ClusterCapability.Supported {
		t.Fatalf("expected cluster capability supported=false when unsupported")
	}
	if prediction.OutputCapabilities.MetabolicSubtype {
		t.Fatalf("expected metabolic_subtype capability=false when unsupported")
	}
	if prediction.OutputCapabilities.ClusterDescription {
		t.Fatalf("expected cluster_description capability=false when unsupported")
	}
	if prediction.OutputCapabilities.TreatmentFocus {
		t.Fatalf("expected treatment_focus capability=false when unsupported")
	}
}

func TestHTTPPredictor_Predict_RequestConstruction(t *testing.T) {
	var receivedURL string
	var receivedMethod string
	var receivedContentType string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedURL = r.URL.String()
		receivedMethod = r.Method
		receivedContentType = r.Header.Get("Content-Type")

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"risk_cluster": "SIRD",
			"risk_score":   65,
			"cluster_capability": map[string]any{
				"supported": true,
			},
			"output_capabilities": map[string]any{
				"metabolic_subtype": true,
			},
		})
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "v1.5.0", "", 5*time.Second)
	input := validAssessmentInput()
	input.HbA1c = 6.8

	_, err := p.Predict(context.Background(), input)
	if err != nil {
		t.Errorf("Predict() returned unexpected error: %v", err)
	}

	if receivedMethod != http.MethodPost {
		t.Errorf("Expected method POST, got %s", receivedMethod)
	}
	if receivedContentType != "application/json" {
		t.Errorf("Expected Content-Type application/json, got %s", receivedContentType)
	}
	expectedURL := "/predict?model_type=v1.5.0"
	if receivedURL != expectedURL {
		t.Errorf("Expected URL with query param %s, got %s", expectedURL, receivedURL)
	}
}

func TestHTTPPredictor_Predict_QueuesDriftCheck(t *testing.T) {
	t.Helper()

	driftCalled := make(chan struct{}, 1)
	var predictCalls atomic.Int32
	var driftCalls atomic.Int32

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/predict":
			predictCalls.Add(1)
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"risk_cluster": "SIRD",
				"risk_score":   75,
				"cluster_capability": map[string]any{
					"supported": true,
				},
				"output_capabilities": map[string]any{
					"metabolic_subtype": true,
				},
			})
		case "/monitoring/drift/check":
			driftCalls.Add(1)
			if r.Method != http.MethodPost {
				t.Fatalf("expected POST drift request, got %s", r.Method)
			}

			var payload struct {
				Features     map[string][]float64 `json:"features"`
				ModelVersion string               `json:"model_version"`
				Source       string               `json:"source"`
			}
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				t.Fatalf("failed decoding drift payload: %v", err)
			}
			if payload.ModelVersion != "binary_v2_no_bp" {
				t.Fatalf("expected model_version binary_v2_no_bp, got %q", payload.ModelVersion)
			}
			if payload.Source != "prediction_workflow" {
				t.Fatalf("expected source prediction_workflow, got %q", payload.Source)
			}
			if len(payload.Features["bmi"]) != 1 || payload.Features["bmi"][0] != 25 {
				t.Fatalf("expected bmi feature in drift payload, got %#v", payload.Features["bmi"])
			}
			if len(payload.Features["age"]) != 1 || payload.Features["age"][0] != 55 {
				t.Fatalf("expected age feature in drift payload, got %#v", payload.Features["age"])
			}

			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{"has_drift": false})
			select {
			case driftCalled <- struct{}{}:
			default:
			}
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "binary_v2_no_bp", "", 5*time.Second)
	input := validAssessmentInput()

	prediction, err := p.Predict(context.Background(), input)
	if err != nil {
		t.Fatalf("Predict() returned unexpected error: %v", err)
	}
	if prediction.Cluster != "SIRD" {
		t.Fatalf("Predict() cluster = %q, want SIRD", prediction.Cluster)
	}

	select {
	case <-driftCalled:
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for drift check request")
	}

	if predictCalls.Load() != 1 {
		t.Fatalf("expected 1 predict call, got %d", predictCalls.Load())
	}
	if driftCalls.Load() != 1 {
		t.Fatalf("expected 1 drift call, got %d", driftCalls.Load())
	}
}

func TestHTTPPredictor_Predict_DriftFailureIsLoggedAndNonBlocking(t *testing.T) {
	t.Helper()

	var logBuffer bytes.Buffer
	originalWriter := log.Writer()
	defer log.SetOutput(originalWriter)
	log.SetOutput(&logBuffer)

	driftCalled := make(chan struct{}, 1)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/predict":
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"risk_cluster": "MOD",
				"risk_score":   60,
				"cluster_capability": map[string]any{
					"supported": true,
				},
				"output_capabilities": map[string]any{
					"metabolic_subtype": true,
				},
			})
		case "/monitoring/drift/check":
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write([]byte(`{"error":"drift unavailable"}`))
			select {
			case driftCalled <- struct{}{}:
			default:
			}
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "binary_v2_no_bp", "", 5*time.Second)

	prediction, err := p.Predict(context.Background(), validAssessmentInput())
	if err != nil {
		t.Fatalf("Predict() returned unexpected error: %v", err)
	}
	if prediction.Cluster != "MOD" {
		t.Fatalf("Predict() cluster = %q, want MOD", prediction.Cluster)
	}

	select {
	case <-driftCalled:
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for drift failure request")
	}

	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if strings.Contains(logBuffer.String(), "[ML][DRIFT] drift check failed") {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}

	t.Fatalf("expected drift failure log, got logs: %s", logBuffer.String())
}

func TestHTTPPredictor_GetDriftStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("expected GET request, got %s", r.Method)
		}
		if r.URL.Path != "/monitoring/drift" {
			t.Fatalf("expected path /monitoring/drift, got %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"reference_features":    []string{"bmi", "ldl"},
			"reference_set":         true,
			"total_alerts":          3,
			"unacknowledged_alerts": 2,
			"last_check":            "2026-03-08T09:00:00Z",
			"scipy_available":       true,
			"active_lineage": map[string]any{
				"model_version":          "binary_v2_no_bp",
				"dataset_hash":           "dataset-123",
				"feature_schema_version": "features:5",
			},
			"drift_baseline": map[string]any{
				"baseline_id":            "baseline-2026q1",
				"baseline_version":       "7",
				"model_version":          "binary_v2_no_bp",
				"dataset_hash":           "dataset-123",
				"feature_schema_version": "features:5",
				"source_kind":            "release_holdout",
				"created_at":             "2026-03-01T00:00:00Z",
				"stale_after":            "2026-06-01T00:00:00Z",
				"sample_count":           500,
				"reference_features":     []string{"bmi", "ldl"},
				"lineage_status":         "healthy",
			},
		})
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "binary_v2_no_bp", "", 5*time.Second)
	status, err := p.GetDriftStatus(context.Background())
	if err != nil {
		t.Fatalf("GetDriftStatus() returned unexpected error: %v", err)
	}
	if !status.ReferenceSet {
		t.Fatalf("GetDriftStatus() reference_set = false, want true")
	}
	if status.TotalAlerts != 3 {
		t.Fatalf("GetDriftStatus() total_alerts = %d, want 3", status.TotalAlerts)
	}
	if status.ActiveLineage.ModelVersion != "binary_v2_no_bp" {
		t.Fatalf("GetDriftStatus() active lineage model_version = %q, want binary_v2_no_bp", status.ActiveLineage.ModelVersion)
	}
	if status.DriftBaseline.BaselineVersion != "7" {
		t.Fatalf("GetDriftStatus() baseline_version = %q, want 7", status.DriftBaseline.BaselineVersion)
	}
	if status.LastCheck == nil || *status.LastCheck != "2026-03-08T09:00:00Z" {
		t.Fatalf("GetDriftStatus() last_check = %#v, want 2026-03-08T09:00:00Z", status.LastCheck)
	}
}

func TestHTTPPredictor_GetDriftAlerts(t *testing.T) {
	var alertsQuery string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/monitoring/alerts":
			alertsQuery = r.URL.RawQuery
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"alerts": []map[string]any{{
					"timestamp":    "2026-03-08T09:00:00Z",
					"alert_type":   "drift",
					"severity":     "high",
					"message":      "Drift detected in bmi",
					"details":      map[string]any{"features": []string{"bmi"}},
					"acknowledged": false,
				}},
			})
		case "/monitoring/drift":
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]any{
				"reference_features":    []string{"bmi"},
				"reference_set":         true,
				"total_alerts":          1,
				"unacknowledged_alerts": 1,
				"scipy_available":       true,
				"active_lineage": map[string]any{
					"model_version":          "binary_v2_no_bp",
					"dataset_hash":           "dataset-123",
					"feature_schema_version": "features:5",
				},
				"drift_baseline": map[string]any{
					"baseline_id":            "baseline-2026q1",
					"baseline_version":       "7",
					"model_version":          "binary_v2_no_bp",
					"dataset_hash":           "dataset-123",
					"feature_schema_version": "features:5",
					"lineage_status":         "healthy",
				},
			})
		default:
			t.Fatalf("unexpected path: %s", r.URL.Path)
		}
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "binary_v2_no_bp", "", 5*time.Second)
	alerts, err := p.GetDriftAlerts(context.Background(), true, 10)
	if err != nil {
		t.Fatalf("GetDriftAlerts() returned unexpected error: %v", err)
	}
	if alertsQuery != "unacknowledged=true&limit=10" {
		t.Fatalf("GetDriftAlerts() query = %q, want %q", alertsQuery, "unacknowledged=true&limit=10")
	}
	if len(alerts.Alerts) != 1 {
		t.Fatalf("GetDriftAlerts() alerts len = %d, want 1", len(alerts.Alerts))
	}
	if alerts.Alerts[0].Severity != "high" {
		t.Fatalf("GetDriftAlerts() alert severity = %q, want high", alerts.Alerts[0].Severity)
	}
	if alerts.DriftBaseline.BaselineID != "baseline-2026q1" {
		t.Fatalf("GetDriftAlerts() baseline_id = %q, want baseline-2026q1", alerts.DriftBaseline.BaselineID)
	}
	if alerts.ActiveLineage.ModelVersion != "binary_v2_no_bp" {
		t.Fatalf("GetDriftAlerts() active lineage model_version = %q, want binary_v2_no_bp", alerts.ActiveLineage.ModelVersion)
	}
}
