package ml

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/skufu/DianaV2/backend/internal/models"
	"github.com/stretchr/testify/assert"
)

func TestCircuitState_String(t *testing.T) {
	tests := []struct {
		name     string
		state    CircuitState
		expected string
	}{
		{"closed", CircuitClosed, "closed"},
		{"open", CircuitOpen, "open"},
		{"half-open", CircuitHalfOpen, "half-open"},
		{"unknown", CircuitState(99), "unknown"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.state.String())
		})
	}
}

func TestDefaultCircuitBreakerConfig(t *testing.T) {
	config := DefaultCircuitBreakerConfig()

	assert.Equal(t, 5, config.FailureThreshold)
	assert.Equal(t, 2, config.SuccessThreshold)
	assert.Equal(t, 30*time.Second, config.Timeout)
	assert.Equal(t, 3, config.MaxRetries)
	assert.Equal(t, 100*time.Millisecond, config.RetryBackoff)
}

func TestNewCircuitBreaker(t *testing.T) {
	config := DefaultCircuitBreakerConfig()
	cb := NewCircuitBreaker(config)

	assert.NotNil(t, cb)
	assert.Equal(t, CircuitClosed, cb.State())
}

func TestCircuitBreaker_Allow(t *testing.T) {
	config := CircuitBreakerConfig{
		FailureThreshold: 2,
		SuccessThreshold: 1,
		Timeout:          50 * time.Millisecond,
		MaxRetries:       1,
		RetryBackoff:     10 * time.Millisecond,
	}
	cb := NewCircuitBreaker(config)

	// Initially should allow
	assert.True(t, cb.Allow())

	// Record failures to open circuit
	cb.RecordFailure(errors.New("error 1"))
	assert.Equal(t, CircuitClosed, cb.State()) // Still closed, threshold not reached
	assert.True(t, cb.Allow())

	cb.RecordFailure(errors.New("error 2"))
	assert.Equal(t, CircuitOpen, cb.State()) // Now open
	assert.False(t, cb.Allow()) // Should not allow when open

	// Wait for timeout
	time.Sleep(60 * time.Millisecond)
	assert.True(t, cb.Allow()) // Should allow (half-open)
	assert.Equal(t, CircuitHalfOpen, cb.State())
}

func TestCircuitBreaker_RecordSuccess(t *testing.T) {
	config := CircuitBreakerConfig{
		FailureThreshold: 2,
		SuccessThreshold: 2,
		Timeout:          50 * time.Millisecond,
		MaxRetries:       1,
		RetryBackoff:     10 * time.Millisecond,
	}
	cb := NewCircuitBreaker(config)

	// Open the circuit
	cb.RecordFailure(errors.New("error 1"))
	cb.RecordFailure(errors.New("error 2"))
	assert.Equal(t, CircuitOpen, cb.State())

	// Wait for timeout to go half-open
	time.Sleep(60 * time.Millisecond)
	cb.Allow() // Transition to half-open

	// Record successes to close circuit
	cb.RecordSuccess()
	assert.Equal(t, CircuitHalfOpen, cb.State()) // Still half-open

	cb.RecordSuccess()
	assert.Equal(t, CircuitClosed, cb.State()) // Now closed
}

func TestCircuitBreaker_Stats(t *testing.T) {
	config := DefaultCircuitBreakerConfig()
	cb := NewCircuitBreaker(config)

	stats := cb.Stats()

	assert.NotNil(t, stats)
	assert.Equal(t, "closed", stats["state"])
	assert.Equal(t, 0, stats["failures"])
	assert.Equal(t, 0, stats["successes"])
}

// Mock predictor for testing CircuitBreakerPredictor
type mockCircuitBreakerPredictor struct {
	predictFunc        func(ctx context.Context, input models.Assessment) (Prediction, error)
	predictModelFunc   func(ctx context.Context, input models.Assessment, modelType string) (Prediction, error)
	metadataFunc       func(ctx context.Context) (*ModelMetadata, error)
}

func (m *mockCircuitBreakerPredictor) Predict(ctx context.Context, input models.Assessment) (Prediction, error) {
	if m.predictFunc != nil {
		return m.predictFunc(ctx, input)
	}
	return Prediction{}, errors.New("not implemented")
}

func (m *mockCircuitBreakerPredictor) PredictWithModelType(ctx context.Context, input models.Assessment, modelType string) (Prediction, error) {
	if m.predictModelFunc != nil {
		return m.predictModelFunc(ctx, input, modelType)
	}
	return Prediction{}, errors.New("not implemented")
}

func (m *mockCircuitBreakerPredictor) GetActiveModelMetadata(ctx context.Context) (*ModelMetadata, error) {
	if m.metadataFunc != nil {
		return m.metadataFunc(ctx)
	}
	return nil, errors.New("not implemented")
}

func (m *mockCircuitBreakerPredictor) GetDriftStatus(ctx context.Context) (*DriftStatus, error) {
	return nil, errors.New("not implemented")
}

func (m *mockCircuitBreakerPredictor) GetDriftAlerts(ctx context.Context, unacknowledgedOnly bool, limit int) (*DriftAlertsEnvelope, error) {
	return nil, errors.New("not implemented")
}

func (m *mockCircuitBreakerPredictor) IsAvailable() bool {
	return true
}

func TestCircuitBreakerPredictor_Success(t *testing.T) {
	config := DefaultCircuitBreakerConfig()
	
	// Create successful predictor
	successPredictor := &mockCircuitBreakerPredictor{
		predictFunc: func(ctx context.Context, input models.Assessment) (Prediction, error) {
			return Prediction{RiskScore: 50, RiskLabel: "medium"}, nil
		},
	}
	
	// Create fallback mock predictor
	fallbackPredictor := NewMockPredictor()
	
	cbp := NewCircuitBreakerPredictor(successPredictor, fallbackPredictor, config)
	
	ctx := context.Background()
	input := models.Assessment{Age: 50, BMI: 25, Triglycerides: 120, LDL: 100, HDL: 50}
	
	result, err := cbp.Predict(ctx, input)
	
	assert.NoError(t, err)
	assert.Equal(t, 50, result.RiskScore)
	assert.Equal(t, CircuitClosed, cbp.State())
}

func TestCircuitBreakerPredictor_Fallback(t *testing.T) {
	config := CircuitBreakerConfig{
		FailureThreshold: 1,
		SuccessThreshold: 1,
		Timeout:          50 * time.Millisecond,
		MaxRetries:       0, // No retries for faster test
		RetryBackoff:     10 * time.Millisecond,
	}
	
	// Create failing predictor
	failPredictor := &mockCircuitBreakerPredictor{
		predictFunc: func(ctx context.Context, input models.Assessment) (Prediction, error) {
			return Prediction{}, errors.New("service unavailable")
		},
	}
	
	// Create fallback mock predictor
	fallbackPredictor := NewMockPredictor()
	
	cbp := NewCircuitBreakerPredictor(failPredictor, fallbackPredictor, config)
	
	ctx := context.Background()
	input := models.Assessment{Age: 50, BMI: 25, Triglycerides: 120, LDL: 100, HDL: 50}
	
	// First call should fail and trigger fallback
	result, err := cbp.Predict(ctx, input)
	
	// Should return fallback result (from mock predictor)
	assert.NoError(t, err) // Fallback succeeded
	assert.NotNil(t, result)
}

func TestCircuitBreakerPredictor_CircuitOpen(t *testing.T) {
	config := CircuitBreakerConfig{
		FailureThreshold: 1,
		SuccessThreshold: 1,
		Timeout:          500 * time.Millisecond, // Long timeout
		MaxRetries:       0,
		RetryBackoff:     10 * time.Millisecond,
	}
	
	// Create failing predictor
	failPredictor := &mockCircuitBreakerPredictor{
		predictFunc: func(ctx context.Context, input models.Assessment) (Prediction, error) {
			return Prediction{}, errors.New("service unavailable")
		},
	}
	
	cbp := NewCircuitBreakerPredictor(failPredictor, nil, config) // No fallback
	
	ctx := context.Background()
	input := models.Assessment{Age: 50, BMI: 25, Triglycerides: 120, LDL: 100, HDL: 50}
	
	// First call should fail and open circuit
	_, err := cbp.Predict(ctx, input)
	assert.Error(t, err)
	assert.Equal(t, CircuitOpen, cbp.State())
	
	// Second call should fail fast due to open circuit
	_, err = cbp.Predict(ctx, input)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "circuit breaker open")
}

func TestCircuitBreakerPredictor_Stats(t *testing.T) {
	config := DefaultCircuitBreakerConfig()
	successPredictor := &mockCircuitBreakerPredictor{
		predictFunc: func(ctx context.Context, input models.Assessment) (Prediction, error) {
			return Prediction{RiskScore: 50}, nil
		},
	}
	cbp := NewCircuitBreakerPredictor(successPredictor, nil, config)
	
	stats := cbp.Stats()
	
	assert.NotNil(t, stats)
	assert.Equal(t, "closed", stats["state"])
}
