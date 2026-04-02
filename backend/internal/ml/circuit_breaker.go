package ml

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
	"github.com/skufu/DianaV2/backend/internal/models"
)

// CircuitState represents the current state of the circuit breaker
type CircuitState int

const (
	// CircuitClosed - normal operation, requests pass through
	CircuitClosed CircuitState = 0
	// CircuitOpen - failure threshold reached, requests fail fast
	CircuitOpen CircuitState = 1
	// CircuitHalfOpen - testing if service has recovered
	CircuitHalfOpen CircuitState = 2
)

func (s CircuitState) String() string {
	switch s {
	case CircuitClosed:
		return "closed"
	case CircuitOpen:
		return "open"
	case CircuitHalfOpen:
		return "half-open"
	default:
		return "unknown"
	}
}

// CircuitBreakerConfig configures the circuit breaker behavior
type CircuitBreakerConfig struct {
	// FailureThreshold - number of failures before opening circuit
	FailureThreshold int
	// SuccessThreshold - number of successes in half-open state to close circuit
	SuccessThreshold int
	// Timeout - duration to wait before attempting half-open
	Timeout time.Duration
	// MaxRetries - maximum number of retries for failed requests
	MaxRetries int
	// RetryBackoff - base backoff duration between retries
	RetryBackoff time.Duration
}

// DefaultCircuitBreakerConfig returns sensible defaults
func DefaultCircuitBreakerConfig() CircuitBreakerConfig {
	return CircuitBreakerConfig{
		FailureThreshold: 5,
		SuccessThreshold: 2,
		Timeout:          30 * time.Second,
		MaxRetries:       3,
		RetryBackoff:     100 * time.Millisecond,
	}
}

// CircuitBreaker implements the circuit breaker pattern for ML service calls
type CircuitBreaker struct {
	config    CircuitBreakerConfig
	state     CircuitState
	failures  int
	successes int
	lastFail  time.Time
	mutex     sync.RWMutex
}

// NewCircuitBreaker creates a new circuit breaker with the given configuration
func NewCircuitBreaker(config CircuitBreakerConfig) *CircuitBreaker {
	return &CircuitBreaker{
		config:    config,
		state:     CircuitClosed,
		failures:  0,
		successes: 0,
	}
}

// State returns the current circuit state
func (cb *CircuitBreaker) State() CircuitState {
	cb.mutex.RLock()
	defer cb.mutex.RUnlock()
	return cb.state
}

// Stats returns current circuit breaker statistics
func (cb *CircuitBreaker) Stats() map[string]interface{} {
	cb.mutex.RLock()
	defer cb.mutex.RUnlock()
	return map[string]interface{}{
		"state":          cb.state.String(),
		"failures":       cb.failures,
		"successes":      cb.successes,
		"last_fail":      cb.lastFail,
		"failure_thresh": cb.config.FailureThreshold,
		"success_thresh": cb.config.SuccessThreshold,
		"timeout":        cb.config.Timeout.String(),
	}
}

// Allow checks if a request should be allowed through
func (cb *CircuitBreaker) Allow() bool {
	cb.mutex.Lock()
	defer cb.mutex.Unlock()

	switch cb.state {
	case CircuitClosed:
		return true
	case CircuitOpen:
		// Check if timeout has elapsed to transition to half-open
		if time.Since(cb.lastFail) > cb.config.Timeout {
			cb.state = CircuitHalfOpen
			cb.successes = 0
			log.Info().
				Str("component", "circuit_breaker").
				Msg("Circuit breaker transitioning to half-open state")
			return true
		}
		return false
	case CircuitHalfOpen:
		return true
	}
	return false
}

// RecordSuccess records a successful request
func (cb *CircuitBreaker) RecordSuccess() {
	cb.mutex.Lock()
	defer cb.mutex.Unlock()

	switch cb.state {
	case CircuitClosed:
		cb.failures = 0
	case CircuitHalfOpen:
		cb.successes++
		if cb.successes >= cb.config.SuccessThreshold {
			log.Info().
				Str("component", "circuit_breaker").
				Int("successes", cb.successes).
				Msg("Circuit breaker closing after successful recovery")
			cb.state = CircuitClosed
			cb.failures = 0
			cb.successes = 0
		}
	}
}

// RecordFailure records a failed request
func (cb *CircuitBreaker) RecordFailure(err error) {
	cb.mutex.Lock()
	defer cb.mutex.Unlock()

	cb.lastFail = time.Now()

	switch cb.state {
	case CircuitClosed:
		cb.failures++
		if cb.failures >= cb.config.FailureThreshold {
			log.Warn().
				Str("component", "circuit_breaker").
				Int("failures", cb.failures).
				Err(err).
				Msg("Circuit breaker opening due to failures")
			cb.state = CircuitOpen
		}
	case CircuitHalfOpen:
		log.Warn().
			Str("component", "circuit_breaker").
			Err(err).
			Msg("Circuit breaker opening after failure in half-open state")
		cb.state = CircuitOpen
		cb.failures = cb.config.FailureThreshold
		cb.successes = 0
	}
}

// CircuitBreakerPredictor wraps a predictor with circuit breaker logic
type CircuitBreakerPredictor struct {
	predictor Predictor
	breaker   *CircuitBreaker
	mock      Predictor // fallback mock predictor
}

// NewCircuitBreakerPredictor creates a new circuit breaker predictor
func NewCircuitBreakerPredictor(predictor Predictor, mock Predictor, config CircuitBreakerConfig) *CircuitBreakerPredictor {
	return &CircuitBreakerPredictor{
		predictor: predictor,
		breaker:   NewCircuitBreaker(config),
		mock:      mock,
	}
}

// Predict implements the Predictor interface with circuit breaker
func (cbp *CircuitBreakerPredictor) Predict(ctx context.Context, input models.Assessment) (Prediction, error) {
	return cbp.predictWithFallback(ctx, input, "")
}

// PredictWithModelType implements the Predictor interface with circuit breaker
func (cbp *CircuitBreakerPredictor) PredictWithModelType(ctx context.Context, input models.Assessment, modelType string) (Prediction, error) {
	return cbp.predictWithFallback(ctx, input, modelType)
}

func (cbp *CircuitBreakerPredictor) predictWithFallback(ctx context.Context, input models.Assessment, modelType string) (Prediction, error) {
	// Check if circuit allows the request
	if !cbp.breaker.Allow() {
		log.Warn().
			Str("component", "circuit_breaker").
			Str("state", cbp.breaker.State().String()).
			Msg("Circuit breaker open, using fallback mock predictor")
		
		if cbp.mock != nil {
			return cbp.mock.Predict(ctx, input)
		}
		return Prediction{}, fmt.Errorf("circuit breaker open and no fallback available")
	}

	// Attempt prediction with retries
	var lastErr error
	for attempt := 0; attempt <= cbp.breaker.config.MaxRetries; attempt++ {
		if attempt > 0 {
			backoff := cbp.breaker.config.RetryBackoff * time.Duration(attempt)
			log.Debug().
				Str("component", "circuit_breaker").
				Int("attempt", attempt).
				Dur("backoff", backoff).
				Msg("Retrying prediction after backoff")
			time.Sleep(backoff)
		}

		var prediction Prediction
		var err error
		
		if modelType != "" {
			prediction, err = cbp.predictor.PredictWithModelType(ctx, input, modelType)
		} else {
			prediction, err = cbp.predictor.Predict(ctx, input)
		}

		if err == nil {
			cbp.breaker.RecordSuccess()
			return prediction, nil
		}

		lastErr = err
		log.Warn().
			Str("component", "circuit_breaker").
			Int("attempt", attempt+1).
			Err(err).
			Msg("Prediction failed")
	}

	// All retries failed, record failure
	cbp.breaker.RecordFailure(lastErr)

	// Try fallback if available
	if cbp.mock != nil {
		log.Info().
			Str("component", "circuit_breaker").
			Msg("Using fallback mock predictor after retries exhausted")
		return cbp.mock.Predict(ctx, input)
	}

	return Prediction{}, fmt.Errorf("prediction failed after %d attempts: %w", cbp.breaker.config.MaxRetries+1, lastErr)
}

// GetActiveModelMetadata implements the Predictor interface
func (cbp *CircuitBreakerPredictor) GetActiveModelMetadata(ctx context.Context) (*ModelMetadata, error) {
	if !cbp.breaker.Allow() {
		if cbp.mock != nil {
			return cbp.mock.GetActiveModelMetadata(ctx)
		}
		return nil, fmt.Errorf("circuit breaker open and no fallback available")
	}

	metadata, err := cbp.predictor.GetActiveModelMetadata(ctx)
	if err != nil {
		cbp.breaker.RecordFailure(err)
		if cbp.mock != nil {
			return cbp.mock.GetActiveModelMetadata(ctx)
		}
		return nil, err
	}
	
	cbp.breaker.RecordSuccess()
	return metadata, nil
}

// GetDriftStatus implements the Predictor interface
func (cbp *CircuitBreakerPredictor) GetDriftStatus(ctx context.Context) (*DriftStatus, error) {
	if !cbp.breaker.Allow() {
		return nil, fmt.Errorf("circuit breaker open")
	}

	status, err := cbp.predictor.GetDriftStatus(ctx)
	if err != nil {
		cbp.breaker.RecordFailure(err)
		return nil, err
	}
	
	cbp.breaker.RecordSuccess()
	return status, nil
}

// GetDriftAlerts implements the Predictor interface
func (cbp *CircuitBreakerPredictor) GetDriftAlerts(ctx context.Context, unacknowledgedOnly bool, limit int) (*DriftAlertsEnvelope, error) {
	if !cbp.breaker.Allow() {
		return nil, fmt.Errorf("circuit breaker open")
	}

	alerts, err := cbp.predictor.GetDriftAlerts(ctx, unacknowledgedOnly, limit)
	if err != nil {
		cbp.breaker.RecordFailure(err)
		return nil, err
	}
	
	cbp.breaker.RecordSuccess()
	return alerts, nil
}

// Stats returns circuit breaker statistics
func (cbp *CircuitBreakerPredictor) Stats() map[string]interface{} {
	return cbp.breaker.Stats()
}

// State returns the current circuit state
func (cbp *CircuitBreakerPredictor) State() CircuitState {
	return cbp.breaker.State()
}
