package ml

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/skufu/DianaV2/backend/internal/models"
)

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
	input := models.Assessment{HbA1c: 6.5}

	cluster, score, err := p.Predict(context.Background(), input)

	if err != nil {
		t.Errorf("Predict() returned unexpected error: %v", err)
	}
	if cluster != "unknown" {
		t.Errorf("Predict() cluster = %q, want 'unknown'", cluster)
	}
	if score != 0 {
		t.Errorf("Predict() score = %d, want 0", score)
	}
}

func TestHTTPPredictor_Predict_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("Expected POST request, got %s", r.Method)
		}
		if r.URL.Path != "/predict" {
			t.Errorf("Expected path /predict, got %s", r.URL.Path)
		}
		if r.URL.Query().Get("model_type") != "ada" {
			t.Errorf("Expected model_type=ada query param")
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
			"risk_cluster": "SIRD",
			"risk_score":   75,
		})
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "v1.0.0", "", 5*time.Second)
	input := models.Assessment{
		HbA1c:       6.5,
		FBS:         120,
		Cholesterol: 220,
		Systolic:    140,
		Diastolic:   90,
		BMI:         28.5,
	}

	cluster, score, err := p.Predict(context.Background(), input)

	if err != nil {
		t.Errorf("Predict() returned unexpected error: %v", err)
	}
	if cluster != "SIRD" {
		t.Errorf("Predict() cluster = %q, want 'SIRD'", cluster)
	}
	if score != 75 {
		t.Errorf("Predict() score = %d, want 75", score)
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
		})
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "v2.1.0", "", 5*time.Second)
	input := models.Assessment{HbA1c: 7.0}

	cluster, score, err := p.Predict(context.Background(), input)

	if err != nil {
		t.Errorf("Predict() returned unexpected error: %v", err)
	}
	if cluster != "SIDD" {
		t.Errorf("Predict() cluster = %q, want 'SIDD'", cluster)
	}
	if score != 80 {
		t.Errorf("Predict() score = %d, want 80", score)
	}
}

func TestHTTPPredictor_Predict_NetworkError(t *testing.T) {
	p := NewHTTPPredictor("http://invalid-host-that-does-not-exist-12345.com/predict", "v1", "", 1*time.Millisecond)
	input := models.Assessment{HbA1c: 6.5}

	cluster, score, err := p.Predict(context.Background(), input)

	if err == nil {
		t.Errorf("Predict() on network error should return error, got nil")
	}
	if cluster != "error" {
		t.Errorf("Predict() cluster on network error = %q, want 'error'", cluster)
	}
	if score != 0 {
		t.Errorf("Predict() score on network error = %d, want 0", score)
	}
}

func TestHTTPPredictor_Predict_NonOKResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Internal server error"})
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "v1", "", 5*time.Second)
	input := models.Assessment{HbA1c: 6.5}

	cluster, score, err := p.Predict(context.Background(), input)

	if err == nil {
		t.Errorf("Predict() on 500 response should return error, got nil")
	}
	if cluster != "error" {
		t.Errorf("Predict() cluster on 500 response = %q, want 'error'", cluster)
	}
	if score != 0 {
		t.Errorf("Predict() score on 500 response = %d, want 0", score)
	}
}

func TestHTTPPredictor_Predict_InvalidJSONResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("invalid json {{{"))
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "v1", "", 5*time.Second)
	input := models.Assessment{HbA1c: 6.5}

	cluster, score, err := p.Predict(context.Background(), input)

	if err == nil {
		t.Errorf("Predict() on invalid JSON should return error, got nil")
	}
	if cluster != "error" {
		t.Errorf("Predict() cluster on invalid JSON = %q, want 'error'", cluster)
	}
	if score != 0 {
		t.Errorf("Predict() score on invalid JSON = %d, want 0", score)
	}
}

func TestHTTPPredictor_Predict_EmptyClusterResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]any{
			"risk_cluster": "",
			"risk_score":   50,
		})
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "v1", "", 5*time.Second)
	input := models.Assessment{HbA1c: 6.5}

	cluster, score, err := p.Predict(context.Background(), input)

	if err == nil {
		t.Errorf("Predict() with empty cluster should return error, got nil")
	}
	if cluster != "error" {
		t.Errorf("Predict() cluster with empty cluster = %q, want 'error'", cluster)
	}
	if score != 0 {
		t.Errorf("Predict() score with empty cluster = %d, want 0", score)
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
	input := models.Assessment{HbA1c: 6.5}

	cluster, score, err := p.Predict(context.Background(), input)

	if err == nil {
		t.Errorf("Predict() on timeout should return error, got nil")
	}
	if cluster != "error" {
		t.Errorf("Predict() cluster on timeout = %q, want 'error'", cluster)
	}
	if score != 0 {
		t.Errorf("Predict() score on timeout = %d, want 0", score)
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
	}

	cluster, score, err := p.Predict(context.Background(), input)

	if err != nil {
		t.Errorf("Predict() returned unexpected error: %v", err)
	}
	if cluster != "MARD" {
		t.Errorf("Predict() cluster = %q, want 'MARD'", cluster)
	}
	if score != 30 {
		t.Errorf("Predict() score = %d, want 30", score)
	}

	if len(receivedJSON) == 0 {
		t.Error("Expected request body to be sent")
	}

	var decoded models.Assessment
	if err := json.Unmarshal(receivedJSON, &decoded); err != nil {
		t.Errorf("Failed to unmarshal sent JSON: %v", err)
	}
	if decoded.HbA1c != input.HbA1c {
		t.Errorf("Sent HbA1c = %f, want %f", decoded.HbA1c, input.HbA1c)
	}
}

func TestHTTPPredictor_Predict_AllClusters(t *testing.T) {
	clusters := []string{"SIRD", "SIDD", "MOD", "MARD"}

	for _, cluster := range clusters {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			json.NewEncoder(w).Encode(map[string]any{
				"risk_cluster": cluster,
				"risk_score":   50,
			})
		}))

		p := NewHTTPPredictor(server.URL+"/predict", "v1", "", 5*time.Second)
		input := models.Assessment{HbA1c: 6.5}

		receivedCluster, _, err := p.Predict(context.Background(), input)

		if err != nil {
			t.Errorf("Predict() returned unexpected error: %v", err)
		}
		if receivedCluster != cluster {
			t.Errorf("Expected cluster %q, got %q", cluster, receivedCluster)
		}

		server.Close()
	}
}

func TestHTTPPredictor_Predict_NilBiomarkerFields(t *testing.T) {
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

	cluster, score, err := p.Predict(context.Background(), input)

	if err != nil {
		t.Errorf("Predict() returned unexpected error: %v", err)
	}
	if cluster != "SIRD" {
		t.Errorf("Predict() with partial input = %q, want 'SIRD'", cluster)
	}
	if score != 50 {
		t.Errorf("Predict() with partial input = %d, want 50", score)
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
		})
	}))
	defer server.Close()

	p := NewHTTPPredictor(server.URL+"/predict", "v1.5.0", "", 5*time.Second)
	input := models.Assessment{HbA1c: 6.8}

	_, _, err := p.Predict(context.Background(), input)
	if err != nil {
		t.Errorf("Predict() returned unexpected error: %v", err)
	}

	if receivedMethod != http.MethodPost {
		t.Errorf("Expected method POST, got %s", receivedMethod)
	}
	if receivedContentType != "application/json" {
		t.Errorf("Expected Content-Type application/json, got %s", receivedContentType)
	}
	if receivedURL != "/predict?model_type=ada" {
		t.Errorf("Expected URL with query param, got %s", receivedURL)
	}
}
