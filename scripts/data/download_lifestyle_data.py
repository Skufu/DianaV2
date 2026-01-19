#!/usr/bin/env python
"""
Download missing NHANES lifestyle questionnaire files.
Downloads SMQ (Smoking), PAQ (Physical Activity), ALQ (Alcohol) for all 5 cycles.

Usage: python scripts/download_lifestyle_data.py
"""

import urllib.request
import os
from pathlib import Path

RAW_DIR = Path("data/nhanes/raw")

# NHANES cycle suffixes and years
CYCLES = [
    ("F", "2009-2010"),
    ("G", "2011-2012"),
    ("H", "2013-2014"),
    ("I", "2015-2016"),
    ("J", "2017-2018"),
]

# Questionnaires to download
QUESTIONNAIRES = ["SMQ", "PAQ", "ALQ"]

def get_url(questionnaire: str, suffix: str, year: str) -> str:
    """Get NHANES download URL for a questionnaire."""
    return f"https://wwwn.cdc.gov/Nchs/Nhanes/{year}/{questionnaire}_{suffix}.XPT"

def download_file(url: str, dest: Path) -> bool:
    """Download a file if it doesn't exist."""
    if dest.exists():
        print(f"  [SKIP] {dest.name} already exists")
        return True
    
    try:
        print(f"  [DOWNLOAD] {dest.name}...")
        urllib.request.urlretrieve(url, dest)
        print(f"  [OK] Downloaded {dest.name}")
        return True
    except Exception as e:
        print(f"  [ERROR] Failed to download {dest.name}: {e}")
        return False

def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=" * 60)
    print("NHANES Lifestyle Data Downloader")
    print("=" * 60)
    
    success_count = 0
    fail_count = 0
    
    for suffix, year in CYCLES:
        print(f"\n[CYCLE] {year}")
        for q in QUESTIONNAIRES:
            url = get_url(q, suffix, year)
            dest = RAW_DIR / f"{q}_{suffix}.XPT"
            if download_file(url, dest):
                success_count += 1
            else:
                fail_count += 1
    
    print("\n" + "=" * 60)
    print(f"Complete: {success_count} downloaded, {fail_count} failed")
    print("=" * 60)

if __name__ == "__main__":
    main()
