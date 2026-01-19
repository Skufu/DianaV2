"""
NHANES Multi-Cycle Data Download Script
Downloads data from multiple NHANES cycles for larger training dataset.

Usage: python scripts/download_nhanes_multi.py
"""

import urllib.request
import os
from pathlib import Path
import ssl

DATA_DIR = Path("data/nhanes/raw")

# NHANES cycles with their URL patterns and suffixes
# Format: (year_start, url_base, suffix)
# Using 2009-2023 data (6 cycles) for >1000 records with post-ADA HbA1c guidelines
# Note: 2021-2023 is a 3-year cycle due to COVID-19 disruption
CYCLES = [
    # Most recent available cycle (3-year cycle due to COVID)
    ("2021", "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2021/DataFiles", "L"),
    # Pre-pandemic cycles (standard 2-year cycles)
    ("2017", "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles", "J"),
    ("2015", "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2015/DataFiles", "I"),
    ("2013", "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2013/DataFiles", "H"),
    ("2011", "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2011/DataFiles", "G"),
    ("2009", "https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2009/DataFiles", "F"),
]

# Core files needed for DIANA
FILE_BASES = [
    "DEMO",    # Demographics
    "GHB",     # Glycohemoglobin (HbA1c)
    "GLU",     # Fasting Glucose
    "TCHOL",   # Total Cholesterol
    "HDL",     # HDL Cholesterol
    "TRIGLY",  # Triglycerides & LDL
    "BMX",     # Body Measures (BMI)
    "BPX",     # Blood Pressure
    "RHQ",     # Reproductive Health (menopause)
    "SMQ",     # Smoking questionnaire
    "PAQ",     # Physical activity questionnaire
    "ALQ",     # Alcohol use questionnaire
]


def download_file(url, dest):
    """Download a file with proper headers."""
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
            
            if content[:20].decode('latin-1', errors='ignore').strip().startswith('<!DOCTYPE'):
                return False, "HTML response"
            
            with open(dest, 'wb') as f:
                f.write(content)
            
            return True, f"{len(content) / 1024:.1f} KB"
    except Exception as e:
        return False, str(e)


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("NHANES Multi-Cycle Data Download")
    print("Cycles: 2009-2010 through 2021-2023 (6 cycles)")
    print("=" * 60)
    
    total_success = 0
    total_failed = 0
    
    for year, base_url, suffix in CYCLES:
        print(f"\n--- Cycle {year}-{int(year)+1} (suffix: _{suffix}) ---")
        
        for file_base in FILE_BASES:
            filename = f"{file_base}_{suffix}"
            url = f"{base_url}/{filename}.xpt"
            dest = DATA_DIR / f"{filename}.XPT"
            
            if dest.exists() and dest.stat().st_size > 50000:
                print(f"[SKIP] {filename}.XPT exists")
                total_success += 1
                continue
            
            print(f"[DOWN] {filename}.XPT ... ", end="", flush=True)
            ok, msg = download_file(url, dest)
            
            if ok:
                print(f"OK ({msg})")
                total_success += 1
            else:
                print(f"FAIL ({msg})")
                total_failed += 1
    
    print("\n" + "=" * 60)
    print(f"Complete: {total_success} downloaded, {total_failed} failed")
    print("=" * 60)


if __name__ == "__main__":
    main()
