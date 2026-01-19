"""
NHANES Data Download Script (Python version)
Downloads required NHANES 2017-2018 .xpt files for DIANA model training.

Usage: python scripts/download_nhanes_py.py
"""

import urllib.request
import os
from pathlib import Path
import ssl

DATA_DIR = Path("data/nhanes/raw")
# Correct URL structure as of 2024 - note lowercase .xpt
BASE_URL = "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles"

FILES = [
    "DEMO_J",   # Demographics
    "GHB_J",    # Glycohemoglobin (HbA1c)
    "GLU_J",    # Fasting Glucose
    "TCHOL_J",  # Total Cholesterol
    "HDL_J",    # HDL Cholesterol
    "TRIGLY_J", # Triglycerides & LDL
    "BMX_J",    # Body Measures (BMI)
    "BPX_J",    # Blood Pressure
    "RHQ_J",    # Reproductive Health (menopause)
    "SMQ_J",    # Smoking
    "MCQ_J",    # Medical Conditions
    "DIQ_J",    # Diabetes
]


def download_file(url, dest):
    """Download a file with proper headers."""
    print(f"[DOWNLOAD] {url}")
    
    # Create SSL context that's more permissive
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    )
    
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=60) as response:
            content = response.read()
            
            # Check if we got HTML instead of binary
            if content[:20].decode('latin-1', errors='ignore').strip().startswith('<!DOCTYPE'):
                print(f"  [ERROR] Got HTML instead of XPT file")
                return False
            
            with open(dest, 'wb') as f:
                f.write(content)
            
            size_kb = len(content) / 1024
            print(f"  [OK] Saved {size_kb:.1f} KB")
            return True
    except Exception as e:
        print(f"  [ERROR] {e}")
        return False


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("NHANES 2017-2018 Data Download")
    print("=" * 60)
    
    success = 0
    failed = []
    
    for name in FILES:
        url = f"{BASE_URL}/{name}.xpt"  # lowercase .xpt
        dest = DATA_DIR / f"{name}.XPT"
        
        if dest.exists() and dest.stat().st_size > 100000:  # > 100KB means likely valid
            print(f"[SKIP] {name}.XPT already exists ({dest.stat().st_size / 1024:.1f} KB)")
            success += 1
            continue
        
        if download_file(url, dest):
            success += 1
        else:
            failed.append(name)
    
    print("=" * 60)
    print(f"Downloaded: {success}/{len(FILES)}")
    if failed:
        print(f"Failed: {failed}")
    print("=" * 60)


if __name__ == "__main__":
    main()
