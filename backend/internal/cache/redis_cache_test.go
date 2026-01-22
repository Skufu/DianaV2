package cache

import (
	"context"
	"testing"
	"time"
)

func TestCacheMetrics_Tracking(t *testing.T) {
	ctx := context.Background()

	cache, err := NewCache("localhost:6379", "", 0)
	if err != nil {
		t.Skip("Redis not available, skipping test")
	}
	defer cache.Close()

	type testData struct {
		Name  string
		Value int
	}

	testKey := "metrics-test-key"
	testValue := testData{Name: "test", Value: 42}

	err = cache.Set(ctx, testKey, testValue, time.Minute)
	if err != nil {
		t.Fatalf("Failed to set cache value: %v", err)
	}

	metrics := cache.GetMetrics()
	if metrics.Hits != 0 || metrics.Misses != 0 {
		t.Errorf("Expected zero initial metrics, got Hits=%d, Misses=%d", metrics.Hits, metrics.Misses)
	}

	var result testData
	err = cache.Get(ctx, testKey, &result)
	if err != nil {
		t.Fatalf("Failed to get cache value: %v", err)
	}

	metrics = cache.GetMetrics()
	if metrics.Hits != 1 {
		t.Errorf("Expected 1 hit, got %d", metrics.Hits)
	}
	if metrics.Misses != 0 {
		t.Errorf("Expected 0 misses, got %d", metrics.Misses)
	}

	if result.Name != testValue.Name || result.Value != testValue.Value {
		t.Errorf("Data mismatch: got %+v, want %+v", result, testValue)
	}
}

func TestCacheMetrics_Miss(t *testing.T) {
	ctx := context.Background()

	cache, err := NewCache("localhost:6379", "", 0)
	if err != nil {
		t.Skip("Redis not available, skipping test")
	}
	defer cache.Close()

	type testData struct {
		Name  string
		Value int
	}

	testKey := "metrics-miss-test-key"
	var result testData

	err = cache.Get(ctx, testKey, &result)
	if err != nil {
		t.Fatalf("Get should not error on miss, got: %v", err)
	}

	metrics := cache.GetMetrics()
	if metrics.Hits != 0 {
		t.Errorf("Expected 0 hits, got %d", metrics.Hits)
	}
	if metrics.Misses != 1 {
		t.Errorf("Expected 1 miss, got %d", metrics.Misses)
	}
}

func TestCacheMetrics_MultipleOperations(t *testing.T) {
	ctx := context.Background()

	cache, err := NewCache("localhost:6379", "", 0)
	if err != nil {
		t.Skip("Redis not available, skipping test")
	}
	defer cache.Close()

	type testData struct {
		ID    int
		Label string
	}

	testKey := "metrics-multi-test-key"
	testValue := testData{ID: 123, Label: "test"}

	err = cache.Set(ctx, testKey, testValue, time.Minute)
	if err != nil {
		t.Fatalf("Failed to set cache value: %v", err)
	}

	for i := 0; i < 5; i++ {
		var result testData
		err = cache.Get(ctx, testKey, &result)
		if err != nil {
			t.Fatalf("Failed to get cache value on iteration %d: %v", i, err)
		}
	}

	metrics := cache.GetMetrics()
	if metrics.Hits != 5 {
		t.Errorf("Expected 5 hits, got %d", metrics.Hits)
	}
	if metrics.Misses != 0 {
		t.Errorf("Expected 0 misses, got %d", metrics.Misses)
	}
}

func TestCacheMetrics_NonExistentKey(t *testing.T) {
	ctx := context.Background()

	cache, err := NewCache("localhost:6379", "", 0)
	if err != nil {
		t.Skip("Redis not available, skipping test")
	}
	defer cache.Close()

	type testData struct {
		Value string
	}

	var result testData
	err = cache.Get(ctx, "non-existent-key", &result)
	if err != nil {
		t.Fatalf("Get should not error on non-existent key, got: %v", err)
	}

	metrics := cache.GetMetrics()
	if metrics.Hits != 0 {
		t.Errorf("Expected 0 hits, got %d", metrics.Hits)
	}
	if metrics.Misses != 1 {
		t.Errorf("Expected 1 miss, got %d", metrics.Misses)
	}
}
