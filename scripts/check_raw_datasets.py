import os
import pyreadstat
import pandas as pd
from collections import Counter
from pathlib import Path

def get_row_count(file_path):
    """Attempt to get row count from XPT file using various methods."""
    try:
        # Method 1: Metadata (fastest)
        _, metadata = pyreadstat.read_xport(str(file_path), metadataonly=True)
        if metadata.number_rows is not None:
            return metadata.number_rows
    except:
        pass

    # Method 2: Full read with latin1 (standard for many NHANES files)
    try:
        df, _ = pyreadstat.read_xport(str(file_path), encoding='latin1')
        return len(df)
    except:
        pass

    # Method 3: Default pandas read_sas
    try:
        df = pd.read_sas(str(file_path), format='xport')
        return len(df)
    except Exception as e:
        return f"Error: {str(e)}"

def check_datasets(data_dir):
    """Checks raw NHANES datasets and counts records in each."""
    raw_path = Path(data_dir)
    if not raw_path.exists():
        print(f"Error: Directory not found: {data_dir}")
        return

    files = sorted([f for f in os.listdir(data_dir) if f.endswith('.XPT')])
    
    if not files:
        print(f"No .XPT files found in {data_dir}")
        return

    print("\n" + "="*65)
    print(f"NHANES RAW DATASET RECORD COUNT REPORT")
    print(f"Directory: {data_dir}")
    print("="*65)
    print(f"{'Filename':<25} | {'Records':<15}")
    print("-" * 45)
    
    overall_total_records = 0
    category_counts = Counter()
    category_records = Counter()

    for filename in files:
        file_path = raw_path / filename
        category = filename.split('_')[0]
        
        count = get_row_count(file_path)
        
        if isinstance(count, int):
            print(f"{filename:<25} | {count:<15,}")
            category_counts[category] += 1
            category_records[category] += count
            overall_total_records += count
        else:
            print(f"{filename:<25} | {count}")
            category_counts[category] += 1 # Still count the file

    print("-" * 45)
    print(f"{'TOTAL FILES':<25} | {len(files):<15}")
    print(f"{'TOTAL RECORDS':<25} | {overall_total_records:<15,}")
    print("="*65 + "\n")

    print("SUMMARY BY CATEGORY")
    print("-" * 55)
    print(f"{'Category':<15} | {'Files':<5} | {'Total Records':<15}")
    print("-" * 55)
    for cat in sorted(category_counts.keys()):
        print(f"{cat:<15} | {category_counts[cat]:<5} | {category_records[cat]:<15,}")
    print("-" * 55 + "\n")

if __name__ == "__main__":
    RAW_DATA_DIR = r"c:\Users\ADRIAN\Github\skufu\DianaV2\data\nhanes\raw"
    check_datasets(RAW_DATA_DIR)
