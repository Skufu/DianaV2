"""
DIANA Thesis Output Generator
Single script to generate all thesis-required outputs.

Runs:
1. Feature Selection (Mutual Information + IG)
2. Model Training (Clinical Predictor)
3. Clustering Analysis (K=4 Ahlqvist)
4. Visualization generation
5. Best model report compilation

Usage: python scripts/generate_thesis_outputs.py
"""

import sys
from pathlib import Path
import json
import shutil

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

OUTPUT_SUMMARY = Path("models/thesis_outputs_summary.md")


def run_feature_selection():
    """Run feature selection analysis."""
    print("\n" + "=" * 60)
    print("STEP 1: FEATURE SELECTION")
    print("=" * 60)
    
    try:
        from scripts.feature_selection import main as fs_main
        results = fs_main()
        return True, "Feature selection completed successfully"
    except Exception as e:
        return False, f"Feature selection failed: {str(e)}"


def run_model_training():
    """Run model training."""
    print("\n" + "=" * 60)
    print("STEP 2: MODEL TRAINING")
    print("=" * 60)
    
    try:
        from ml.train import main as train_main
        results, best = train_main()
        if results is None:
            return False, "Training returned no results"
        return True, f"Best model: {best['name']} (AUC: {best['auc_roc']})"
    except Exception as e:
        return False, f"Model training failed: {str(e)}"


def run_clustering():
    """Run clustering analysis."""
    print("\n" + "=" * 60)
    print("STEP 3: CLUSTERING ANALYSIS")
    print("=" * 60)
    
    try:
        from ml.clustering import main as cluster_main
        results = cluster_main(k=4)
        return True, f"Clustering completed (K=4, silhouette={results['silhouette_score']})"
    except Exception as e:
        return False, f"Clustering failed: {str(e)}"


def collect_outputs():
    """Collect and organize all outputs."""
    print("\n" + "=" * 60)
    print("STEP 4: COLLECTING OUTPUTS")
    print("=" * 60)
    
    outputs = {
        'json_files': [],
        'csv_files': [],
        'visualizations': [],
        'models': []
    }
    
    # Check for expected outputs
    expected = [
        # Results
        ("models/results/information_gain_results.json", "json_files"),
        ("models/clinical/results/cluster_analysis.json", "json_files"),
        ("models/clinical/results/best_model_report.json", "json_files"),
        ("models/clinical/results/model_comparison.csv", "csv_files"),
        ("models/clinical/results/cluster_profiles.csv", "csv_files"),
        # Visualizations
        ("models/visualizations/information_gain_chart.png", "visualizations"),
        ("models/visualizations/feature_importance_comparison.png", "visualizations"),
        ("models/clinical/visualizations/roc_curve.png", "visualizations"),
        ("models/clinical/visualizations/confusion_matrix.png", "visualizations"),
        ("models/clinical/visualizations/cluster_heatmap.png", "visualizations"),
        ("models/clinical/visualizations/cluster_scatter.png", "visualizations"),
        ("models/clinical/visualizations/cluster_distribution.png", "visualizations"),
        ("models/clinical/visualizations/k_optimization.png", "visualizations"),
        # Models
        ("models/clinical/best_model.joblib", "models"),
        ("models/clinical/scaler.joblib", "models"),
        ("models/clinical/kmeans_model.joblib", "models"),
        ("models/clinical/cluster_labels.json", "json_files"),
    ]
    
    for path, category in expected:
        p = Path(path)
        if p.exists():
            outputs[category].append(str(p))
            print(f"   [✓] {path}")
        else:
            print(f"   [✗] {path} (not found)")
    
    return outputs


def generate_summary(outputs, step_results):
    """Generate summary markdown file."""
    print("\n" + "=" * 60)
    print("STEP 5: GENERATING SUMMARY")
    print("=" * 60)
    
    # Load metrics if available
    metrics = {}
    if Path("models/clinical/results/best_model_report.json").exists():
        with open("models/clinical/results/best_model_report.json") as f:
            metrics = json.load(f)
    
    cluster_info = {}
    if Path("models/clinical/results/cluster_analysis.json").exists():
        with open("models/clinical/results/cluster_analysis.json") as f:
            cluster_info = json.load(f)
    
    summary = f"""# DIANA Thesis Outputs Summary

Generated automatically by `generate_thesis_outputs.py`

## Pipeline Status

| Step | Status | Details |
|------|--------|---------|
| Feature Selection | {'✓' if step_results[0][0] else '✗'} | {step_results[0][1]} |
| Model Training | {'✓' if step_results[1][0] else '✗'} | {step_results[1][1]} |
| Clustering | {'✓' if step_results[2][0] else '✗'} | {step_results[2][1]} |

## Model Performance

| Metric | Value |
|--------|-------|
| Best Model | {metrics.get('best_model', 'N/A')} |
| AUC-ROC | {metrics.get('metrics', {}).get('auc_roc', 'N/A')} |
| F1-Score | {metrics.get('metrics', {}).get('f1_score', 'N/A')} |
| Recall | {metrics.get('metrics', {}).get('recall', 'N/A')} |
| CV Score | {metrics.get('metrics', {}).get('cv_score', 'N/A')} |

## Clustering Results

| Setting | Value |
|---------|-------|
| K Selected | {cluster_info.get('k_selected', 'N/A')} |
| Silhouette Score | {cluster_info.get('silhouette_score', 'N/A')} |
| K Optimal (by silhouette) | {cluster_info.get('k_optimal_by_silhouette', 'N/A')} |

## Generated Files

### JSON Reports
{chr(10).join(f'- `{f}`' for f in outputs['json_files'])}

### CSV Data
{chr(10).join(f'- `{f}`' for f in outputs['csv_files'])}

### Visualizations
{chr(10).join(f'- `{f}`' for f in outputs['visualizations'])}

### Model Artifacts
{chr(10).join(f'- `{f}`' for f in outputs['models'])}

## Notes

- **Clinical Model**: Excludes HbA1c and FBS to avoid circular reasoning
- **Clustering**: Uses K=4 per Ahlqvist et al. (2018) literature
- **Validation**: Leave-One-Cycle-Out temporal validation used
"""
    
    OUTPUT_SUMMARY.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_SUMMARY.write_text(summary)
    print(f"   Summary saved to {OUTPUT_SUMMARY}")
    
    return summary


def main():
    """Run complete thesis output generation pipeline."""
    print("=" * 60)
    print("DIANA THESIS OUTPUT GENERATOR")
    print("=" * 60)
    
    step_results = []
    
    # Step 1: Feature Selection
    result = run_feature_selection()
    step_results.append(result)
    
    # Step 2: Model Training
    result = run_model_training()
    step_results.append(result)
    
    # Step 3: Clustering
    result = run_clustering()
    step_results.append(result)
    
    # Step 4: Collect outputs
    outputs = collect_outputs()
    
    # Step 5: Generate summary
    summary = generate_summary(outputs, step_results)
    
    # Final status
    print("\n" + "=" * 60)
    print("COMPLETE")
    print("=" * 60)
    
    success_count = sum(1 for r in step_results if r[0])
    print(f"\n   Steps completed: {success_count}/{len(step_results)}")
    print(f"   JSON files: {len(outputs['json_files'])}")
    print(f"   CSV files: {len(outputs['csv_files'])}")
    print(f"   Visualizations: {len(outputs['visualizations'])}")
    print(f"   Model files: {len(outputs['models'])}")
    
    if success_count == len(step_results):
        print("\n   [SUCCESS] All thesis outputs generated!")
    else:
        print("\n   [WARNING] Some steps failed. Check logs above.")
    
    print(f"\n   Summary: {OUTPUT_SUMMARY}")
    
    return success_count == len(step_results)


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
