#!/usr/bin/env python3
"""
Generate model_hashes.json for ML model integrity verification.
Run this after training models and before deployment.
"""
import hashlib
import json
from pathlib import Path


def compute_file_hash(filepath: Path) -> str:
    """Compute SHA256 hash of a file."""
    sha256 = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            sha256.update(chunk)
    return sha256.hexdigest()


def generate_model_hashes(models_dir: Path) -> dict:
    """Generate hashes for all model files."""
    model_files = [
        "best_model.joblib",
        "best_model_calibrated.joblib",
        "best_model_uncalibrated.joblib",
        "scaler.joblib",
        "imputer.joblib",
        "kmeans_model.joblib",
        "cluster_scaler.joblib",
        "features.json",
        "cluster_labels.json",
    ]
    
    hashes = {}
    for filename in model_files:
        filepath = models_dir / filename
        if filepath.exists():
            hashes[filename] = compute_file_hash(filepath)
            print(f"✓ Hashed: {filename}")
        else:
            print(f"⚠ Skipped (not found): {filename}")
    
    return hashes


def main():
    # Find project root
    script_dir = Path(__file__).parent
    if script_dir.name == "dev":
        project_dir = script_dir.parent.parent
    else:
        project_dir = Path.cwd()
    
    models_dir = project_dir / "models" / "clinical_3class"
    output_file = models_dir / "model_hashes.json"
    
    if not models_dir.exists():
        print(f"❌ Models directory not found: {models_dir}")
        print("   Train models first: bash scripts/dev/retrain-clinical.sh")
        return 1
    
    print(f"Generating model hashes for: {models_dir}")
    print("=" * 60)
    
    hashes = generate_model_hashes(models_dir)
    
    with open(output_file, 'w') as f:
        json.dump(hashes, f, indent=2)
    
    print("=" * 60)
    print(f"✓ Saved hashes to: {output_file}")
    print(f"  Total files hashed: {len(hashes)}")
    
    return 0


if __name__ == "__main__":
    exit(main())
