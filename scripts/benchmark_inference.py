#!/usr/bin/env python3
"""
DIANA ML Inference Benchmark Script
Measures inference latency for Logistic Regression, Random Forest, and LightGBM.

Usage:
    python scripts/benchmark_inference.py

Output:
    - Prints timing statistics to console
    - Saves results to models/binary_v2_no_bp/results/inference_benchmark.json
"""

import sys
import time
import json
import numpy as np
from pathlib import Path
from datetime import datetime

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib

# Try to import LightGBM
try:
    from lightgbm import LGBMClassifier
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False
    print("[WARN] LightGBM not installed. Skipping LightGBM benchmark.")

# Model paths
MODELS_DIR = PROJECT_ROOT / "models" / "binary_v2_no_bp"
RESULTS_DIR = MODELS_DIR / "results"
DATA_DIR = PROJECT_ROOT / "Ian_ML" / "training"

# Sample input for benchmarking
SAMPLE_INPUT = {
    "bmi": 28.5,
    "triglycerides": 180,
    "ldl": 140,
    "hdl": 45,
    "waist_circumference": 95,
    "age": 54,
    "smoking_encoded": 1,
    "activity_encoded": 1,
    "alcohol_encoded": 1,
}

FEATURE_NAMES = [
    "bmi", "triglycerides", "ldl", "hdl", "age", "waist_circumference",
    "smoking_encoded", "activity_encoded", "alcohol_encoded"
]


def load_deployed_model():
    """Load the deployed Logistic Regression model."""
    model_path = MODELS_DIR / "best_model.joblib"
    scaler_path = MODELS_DIR / "scaler.joblib"
    
    if not model_path.exists():
        raise FileNotFoundError(f"Model not found at {model_path}")
    
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path) if scaler_path.exists() else None
    
    return model, scaler


def train_comparison_models(X_sample, y_sample=None):
    """Train RF and LightGBM for comparison (using synthetic data if no labels)."""
    np.random.seed(42)
    
    # Create synthetic training data if no labels provided
    if y_sample is None:
        n_samples = 1000
        X_train = np.random.randn(n_samples, len(FEATURE_NAMES))
        # Scale to realistic ranges
        X_train[:, 0] = np.clip(X_train[:, 0] * 5 + 28, 15, 50)  # BMI
        X_train[:, 1] = np.clip(X_train[:, 1] * 80 + 150, 20, 500)  # TG
        X_train[:, 2] = np.clip(X_train[:, 2] * 40 + 120, 20, 300)  # LDL
        X_train[:, 3] = np.clip(X_train[:, 3] * 15 + 50, 10, 100)  # HDL
        X_train[:, 4] = np.clip(X_train[:, 4] * 10 + 55, 18, 100)  # Age
        X_train[:, 5] = np.clip(X_train[:, 5] * 15 + 95, 50, 180)  # Waist
        y_train = np.random.randint(0, 2, n_samples)
    else:
        X_train = X_sample
        y_train = y_sample
    
    # Train RF
    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=6,
        min_samples_leaf=15,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train, y_train)
    
    models = {"Random Forest": rf}
    
    # Train LightGBM
    if HAS_LIGHTGBM:
        lgb = LGBMClassifier(
            n_estimators=400,
            max_depth=5,
            learning_rate=0.1,
            min_child_samples=20,
            is_unbalance=True,
            random_state=42,
            n_jobs=-1,
            verbose=-1
        )
        lgb.fit(X_train, y_train)
        models["LightGBM"] = lgb
    
    return models


def benchmark_model(model, X, scaler=None, n_iterations=100):
    """Benchmark model inference time."""
    if scaler is not None:
        X_scaled = scaler.transform(X)
    else:
        X_scaled = X
    
    times = []
    
    # Warmup
    for _ in range(5):
        _ = model.predict_proba(X_scaled[:1])
    
    # Benchmark
    for _ in range(n_iterations):
        start = time.perf_counter()
        _ = model.predict_proba(X_scaled[:1])
        end = time.perf_counter()
        times.append((end - start) * 1000)  # Convert to ms
    
    return {
        "mean_ms": float(np.mean(times)),
        "std_ms": float(np.std(times)),
        "min_ms": float(np.min(times)),
        "max_ms": float(np.max(times)),
        "median_ms": float(np.median(times)),
        "p95_ms": float(np.percentile(times, 95)),
        "p99_ms": float(np.percentile(times, 99)),
        "n_iterations": n_iterations,
    }


def main():
    print("=" * 70)
    print("DIANA ML INFERENCE BENCHMARK")
    print("=" * 70)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Platform: {sys.platform}")
    print(f"Models Directory: {MODELS_DIR}")
    print()
    
    # Prepare sample input
    X = np.array([[SAMPLE_INPUT[f] for f in FEATURE_NAMES]])
    
    # Load deployed model (Logistic Regression)
    print("[1/3] Loading deployed Logistic Regression model...")
    lr_model, scaler = load_deployed_model()
    print(f"      Model type: {type(lr_model).__name__}")
    print(f"      Scaler: {type(scaler).__name__ if scaler else 'None'}")
    print()
    
    # Train comparison models
    print("[2/3] Training comparison models (RF, LightGBM)...")
    comparison_models = train_comparison_models(X)
    print(f"      Trained: {list(comparison_models.keys())}")
    print()
    
    # Benchmark all models
    print("[3/3] Running benchmarks (100 iterations each)...")
    print()
    
    results = {}
    
    # Benchmark Logistic Regression
    print("  Benchmarking Logistic Regression...")
    results["Logistic Regression"] = benchmark_model(lr_model, X, scaler, n_iterations=100)
    
    # Benchmark comparison models
    for name, model in comparison_models.items():
        print(f"  Benchmarking {name}...")
        results[name] = benchmark_model(model, X, scaler=None, n_iterations=100)
    
    print()
    print("=" * 70)
    print("RESULTS SUMMARY")
    print("=" * 70)
    print()
    
    # Print table header
    print(f"{'Algorithm':<25} {'Mean (ms)':>12} {'Std (ms)':>10} {'Min (ms)':>10} {'Max (ms)':>10} {'P95 (ms)':>10}")
    print("-" * 77)
    
    # Print results
    for name, stats in results.items():
        print(f"{name:<25} {stats['mean_ms']:>12.3f} {stats['std_ms']:>10.3f} {stats['min_ms']:>10.3f} {stats['max_ms']:>10.3f} {stats['p95_ms']:>10.3f}")
    
    print()
    print("=" * 70)
    
    # Calculate overhead ratios
    lr_mean = results["Logistic Regression"]["mean_ms"]
    print()
    print("INFERENCE TIME RATIOS (relative to Logistic Regression):")
    print("-" * 50)
    for name, stats in results.items():
        ratio = stats["mean_ms"] / lr_mean
        print(f"  {name}: {ratio:.2f}x")
    
    # Save results
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    output_file = RESULTS_DIR / "inference_benchmark.json"
    
    output_data = {
        "timestamp": datetime.now().isoformat(),
        "platform": sys.platform,
        "n_iterations": 100,
        "sample_input": SAMPLE_INPUT,
        "feature_names": FEATURE_NAMES,
        "results": results,
        "ratios": {
            name: stats["mean_ms"] / lr_mean
            for name, stats in results.items()
        }
    }
    
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print()
    print(f"[SAVED] Results saved to: {output_file}")
    print()
    
    # Print conclusion
    print("=" * 70)
    print("CONCLUSION")
    print("=" * 70)
    print()
    print(f"Logistic Regression inference time: {lr_mean:.3f} ms (mean)")
    print()
    print("For ch3+4.md line 652, update to:")
    print()
    print(f'  2. **Computational efficiency** (inference time: {lr_mean:.1f} ms vs.')
    for name, stats in list(results.items())[1:]:
        print(f'     {stats["mean_ms"]:.1f} ms for {name},')
    print("     )")
    print()
    
    return results


if __name__ == "__main__":
    main()