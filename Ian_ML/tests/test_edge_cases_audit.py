import json
import numpy as np
from pathlib import Path
from ..service.predict import ClinicalPredictor

def run_audit():
    p = ClinicalPredictor(models_dir=Path('../models/binary_v2_no_bp'))
    
    print("="*60)
    print("DIANA ML PIPELINE EDGE-CASE AUDIT")
    print("="*60)
    
    # 1. Validation Layer Audit
    print("\n[1] VALIDATION LAYER AUDIT")
    extreme_cases = [
        ("Negative Age", {"age": -5, "bmi": 25, "triglycerides": 150, "ldl": 100, "hdl": 50}),
        ("Impossible Age", {"age": 200, "bmi": 25, "triglycerides": 150, "ldl": 100, "hdl": 50}),
        ("Zero BMI", {"age": 55, "bmi": 0, "triglycerides": 150, "ldl": 100, "hdl": 50}),
        ("Extreme TG", {"age": 55, "bmi": 25, "triglycerides": 5000, "ldl": 100, "hdl": 50}),
        ("Missing Required", {"age": 55, "bmi": 25}), # Missing lipids
    ]
    
    for name, data in extreme_cases:
        res = p.predict(data)
        if res["success"]:
            print(f"  ❌ FAIL: {name} was accepted! Prob: {res.get('at_risk_probability')}")
        else:
            print(f"  ✅ PASS: {name} correctly rejected: {res.get('error')[:50]}...")
            
    # 2. Complete Data Absence (what if all inputs are empty strings/None?)
    print("\n[2] COMPLETE DATA ABSENCE AUDIT")
    empty_data = {
        "age": None, "bmi": "", "triglycerides": None, "ldl": "", "hdl": None, 
        "waist_circumference": "", "smoking_status": "", "physical_activity": "", "alcohol_use": ""
    }
    res = p.predict(empty_data)
    if res["success"]:
        print("  ❌ FAIL: Empty payload was accepted!")
    else:
        print("  ✅ PASS: Empty payload correctly rejected.")

    # 3. MetS Boost Cap Audit
    print("\n[3] METS BOOST CAP AUDIT")
    # Base probability needs to be high (e.g. 0.85) + 2 MetS criteria
    # BMI=25 (1 crit), TG=150 (1 crit). HDL=60 (no crit), Waist=70 (no crit) -> exactly 2 criteria
    base = {"bmi": 25, "triglycerides": 150, "ldl": 190, "hdl": 60, "age": 75, "waist_circumference": 70}
    res = p.predict(base)
    mets = res.get("metabolic_syndrome", {})
    prob = res.get("at_risk_probability")
    print(f"  High-risk base: Prob={prob:.4f}, MetS={mets.get('criteria_met')} criteria")
    if mets.get('criteria_met') == 2 and prob == 0.95:
         print("  ✅ PASS: MetS boost correctly capped at 0.95")
    elif prob > 0.95:
         print(f"  ❌ FAIL: Probability exceeded 0.95 cap: {prob}")
         
    # 4. Clustering Extrapolation Audit
    print("\n[4] CLUSTERING EXTRAPOLATION AUDIT")
    # A patient who is At-Risk but has bizarrely extreme values far from any centroid
    weird = {"bmi": 65, "triglycerides": 1000, "ldl": 400, "hdl": 10, "age": 85, "waist_circumference": 160}
    res = p.predict(weird)
    if res["success"]:
        cluster = res.get("metabolic_subtype")
        print(f"  Extreme At-Risk Profile assigned to cluster: {cluster}")
        print("  ⚠️ NOTE: K-Means will always extrapolate, regardless of distance from centroid.")

    # 5. Contradictory Input Audit
    print("\n[5] CONTRADICTORY INPUT AUDIT")
    # Morbidly obese (BMI 45) but perfect lipids (TG 60, HDL 80)
    contra = {"bmi": 45, "triglycerides": 60, "ldl": 70, "hdl": 80, "age": 55, "waist_circumference": 120}
    res = p.predict(contra)
    if res["success"]:
        prob = res.get("at_risk_probability")
        status = res.get("predicted_status")
        mets = res.get("metabolic_syndrome")
        print(f"  Obese (BMI 45, Waist 120) with Perfect Lipids (TG 60, HDL 80):")
        print(f"    Prob={prob:.4f}, Status={status}, MetS Boost={mets.get('boost_applied')}")

run_audit()
