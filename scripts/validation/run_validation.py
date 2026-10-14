#!/usr/bin/env python3
"""
DIANA Clinical Model Validation Script

Usage:
    python scripts/validation/run_validation.py --input test_patients.csv --output results.csv
    python scripts/validation/run_validation.py --interactive

For doctor validation testing.
"""

import sys
import json
import csv
import argparse
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from Ian_ML.service.predict import ClinicalPredictor


def run_interactive():
    """Interactive mode for testing single patients."""
    print("\n" + "="*60)
    print("DIANA Clinical Model - Interactive Validation")
    print("="*60)
    print("\nThis model does NOT use HbA1c or FBS for predictions.")
    print("Enter patient biomarkers to get risk assessment.\n")
    
    try:
        predictor = ClinicalPredictor()
        print(f"✓ Model loaded: {predictor.models_dir}")
        print(f"✓ Features: {len(predictor.features)} total")
    except Exception as e:
        print(f"✗ Failed to load model: {e}")
        return
    
    while True:
        print("\n" + "-"*60)
        print("Enter patient data (or 'quit' to exit):")
        print("-"*60)
        
        try:
            # Required features
            bmi = float(input("BMI (kg/m²): ") or "25")
            triglycerides = float(input("Triglycerides (mg/dL): ") or "150")
            ldl = float(input("LDL Cholesterol (mg/dL): ") or "100")
            hdl = float(input("HDL Cholesterol (mg/dL): ") or "50")
            age = int(input("Age (years): ") or "55")
            systolic = int(input("Systolic BP (mmHg): ") or "120")
            diastolic = int(input("Diastolic BP (mmHg): ") or "80")
            
            # Optional features
            print("\nOptional (press Enter for defaults):")
            smoking = input("Smoking (Never/Former/Current) [Former]: ") or "Former"
            activity = input("Activity (Sedentary/Moderate/Active) [Moderate]: ") or "Moderate"
            alcohol = input("Alcohol (None/Light/Moderate/Heavy) [Light]: ") or "Light"
            
            patient_data = {
                "bmi": bmi,
                "triglycerides": triglycerides,
                "ldl": ldl,
                "hdl": hdl,
                "age": age,
                "systolic": systolic,
                "diastolic": diastolic,
                "smoking_status": smoking,
                "physical_activity": activity,
                "alcohol_use": alcohol
            }
            
            # Make prediction
            result = predictor.predict(patient_data)
            
            if result.get("success"):
                print("\n" + "="*60)
                print("PREDICTION RESULTS")
                print("="*60)
                print(f"Predicted Status: {result['predicted_status']}")
                print(f"Risk Score: {result['risk_score']}/100")
                print(f"Risk Cluster: {result['risk_cluster']}")
                print(f"Diabetes Probability: {result['probability']:.1%}")
                print(f"At-Risk Probability: {result['at_risk_probability']:.1%}")
                print(f"Model Confidence: {result['confidence']}")
                print("="*60)
                
                # Risk interpretation
                score = result['risk_score']
                if score < 30:
                    risk_level = "LOW - Routine screening"
                elif score < 70:
                    risk_level = "MODERATE - Consider lifestyle counseling"
                else:
                    risk_level = "HIGH - Recommend HbA1c testing"
                print(f"Clinical Interpretation: {risk_level}")
            else:
                print(f"\n✗ Prediction failed: {result.get('error')}")
                
        except ValueError as e:
            print(f"\n✗ Invalid input: {e}")
        except KeyboardInterrupt:
            print("\n\nExiting...")
            break
        except Exception as e:
            print(f"\n✗ Error: {e}")


def run_batch(input_file: str, output_file: str):
    """Batch processing mode for CSV files."""
    print(f"\nLoading model...")
    try:
        predictor = ClinicalPredictor()
        print(f"✓ Model loaded: {predictor.models_dir}")
    except Exception as e:
        print(f"✗ Failed to load model: {e}")
        return
    
    input_path = Path(input_file)
    if not input_path.exists():
        print(f"✗ Input file not found: {input_file}")
        return
    
    print(f"\nProcessing: {input_file}")
    
    results = []
    with open(input_path, 'r') as f:
        reader = csv.DictReader(f)
        total = 0
        success = 0
        
        for row in reader:
            total += 1
            try:
                patient_data = {
                    "bmi": float(row.get("bmi", 25)),
                    "triglycerides": float(row.get("triglycerides", 150)),
                    "ldl": float(row.get("ldl", 100)),
                    "hdl": float(row.get("hdl", 50)),
                    "age": int(float(row.get("age", 55))),
                    "systolic": int(float(row.get("systolic", 120))),
                    "diastolic": int(float(row.get("diastolic", 80))),
                    "smoking_status": row.get("smoking", "Former"),
                    "physical_activity": row.get("activity", "Moderate"),
                    "alcohol_use": row.get("alcohol", "Light")
                }
                
                result = predictor.predict(patient_data)
                
                if result.get("success"):
                    success += 1
                    results.append({
                        "patient_id": row.get("patient_id", f"patient_{total}"),
                        **patient_data,
                        "predicted_status": result["predicted_status"],
                        "risk_score": result["risk_score"],
                        "risk_cluster": result["risk_cluster"],
                        "diabetes_probability": result["probability"],
                        "at_risk_probability": result["at_risk_probability"],
                        "model_auc": result["model_info"]["auc_roc"]
                    })
                else:
                    print(f"  Warning: Failed to process row {total}: {result.get('error')}")
                    
            except Exception as e:
                print(f"  Warning: Error processing row {total}: {e}")
    
    # Write results
    if results:
        output_path = Path(output_file)
        with open(output_path, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=results[0].keys())
            writer.writeheader()
            writer.writerows(results)
        
        print(f"\n✓ Processed {success}/{total} patients successfully")
        print(f"✓ Results saved to: {output_file}")
        
        # Summary statistics
        high_risk = sum(1 for r in results if r["risk_score"] >= 70)
        moderate_risk = sum(1 for r in results if 30 <= r["risk_score"] < 70)
        low_risk = sum(1 for r in results if r["risk_score"] < 30)
        
        print(f"\nRisk Distribution:")
        print(f"  High Risk (≥70): {high_risk} ({high_risk/len(results)*100:.1f}%)")
        print(f"  Moderate Risk (30-69): {moderate_risk} ({moderate_risk/len(results)*100:.1f}%)")
        print(f"  Low Risk (<30): {low_risk} ({low_risk/len(results)*100:.1f}%)")
    else:
        print("\n✗ No successful predictions")


def create_sample_csv(filename: str):
    """Create a sample CSV file for testing."""
    sample_data = [
        {
            "patient_id": "TEST_001_LOW",
            "bmi": 22.0,
            "triglycerides": 90,
            "ldl": 95,
            "hdl": 65,
            "age": 50,
            "systolic": 115,
            "diastolic": 75,
            "smoking": "Never",
            "activity": "Active",
            "alcohol": "Light"
        },
        {
            "patient_id": "TEST_002_MODERATE",
            "bmi": 27.0,
            "triglycerides": 160,
            "ldl": 125,
            "hdl": 50,
            "age": 55,
            "systolic": 128,
            "diastolic": 82,
            "smoking": "Former",
            "activity": "Moderate",
            "alcohol": "Light"
        },
        {
            "patient_id": "TEST_003_HIGH",
            "bmi": 35.0,
            "triglycerides": 300,
            "ldl": 160,
            "hdl": 35,
            "age": 60,
            "systolic": 150,
            "diastolic": 95,
            "smoking": "Current",
            "activity": "Sedentary",
            "alcohol": "None"
        }
    ]
    
    with open(filename, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=sample_data[0].keys())
        writer.writeheader()
        writer.writerows(sample_data)
    
    print(f"✓ Created sample CSV: {filename}")
    print("  Contains 3 test cases: Low, Moderate, and High risk")


def main():
    parser = argparse.ArgumentParser(
        description="DIANA Clinical Model Validation Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Interactive mode (test single patients)
  python run_validation.py --interactive
  
  # Batch processing from CSV
  python run_validation.py --input patients.csv --output results.csv
  
  # Create sample CSV
  python run_validation.py --create-sample sample_patients.csv
        """
    )
    
    parser.add_argument("--interactive", "-i", action="store_true",
                        help="Run in interactive mode")
    parser.add_argument("--input", "-in", type=str,
                        help="Input CSV file with patient data")
    parser.add_argument("--output", "-out", type=str, default="validation_results.csv",
                        help="Output CSV file (default: validation_results.csv)")
    parser.add_argument("--create-sample", type=str, metavar="FILENAME",
                        help="Create a sample CSV file with test cases")
    
    args = parser.parse_args()
    
    if args.create_sample:
        create_sample_csv(args.create_sample)
    elif args.interactive:
        run_interactive()
    elif args.input:
        run_batch(args.input, args.output)
    else:
        parser.print_help()
        print("\n✗ Please specify --interactive, --input, or --create-sample")


if __name__ == "__main__":
    main()
