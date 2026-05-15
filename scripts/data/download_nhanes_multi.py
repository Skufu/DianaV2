# pyright: reportGeneralTypeIssues=false, reportArgumentType=false, reportCallIssue=false, reportOperatorIssue=false
"""
NHANES Multi-Cycle Data Download Script.

Downloads the raw SAS XPORT files used by the DIANA processing pipeline.
The manifest is cycle-specific because several NHANES files/variables changed
after the 2017-2020 pre-pandemic cycle.

Usage: python scripts/data/download_nhanes_multi.py
"""

import ssl
import urllib.request
from pathlib import Path

try:
    import pyreadstat
except ImportError:  # pragma: no cover - downloader can still do header checks
    pyreadstat = None

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

# Files present in every active cycle used by DIANA.
COMMON_FILE_BASES = [
    "DEMO",    # Demographics (includes RIDRETH1/RIDRETH3 race/ethnicity)
    "GHB",     # Glycohemoglobin (HbA1c)
    "GLU",     # Fasting Glucose
    "TCHOL",   # Total Cholesterol
    "HDL",     # HDL Cholesterol
    "TRIGLY",  # Triglycerides & LDL
    "BMX",     # Body Measures (BMI, waist circumference BMXWAIST)
    "RHQ",     # Reproductive Health (menopause)
    "SMQ",     # Smoking questionnaire
    "PAQ",     # Physical activity questionnaire
    "ALQ",     # Alcohol use questionnaire
    "DIQ",     # Diabetes questionnaire (self-reported diagnosis)
    "MCQ",     # Medical Conditions (family history diabetes MCQ300C)
]

BP_FILE_BY_SUFFIX = {
    # 2021-2023 uses oscillometric blood pressure, published as BPXO_L.
    "L": "BPXO",
}

OPTIONAL_FILE_BASES_BY_SUFFIX = {
    # INS was not available in the active 2009-2012 cycles used here.
    # HSCRP was available starting in 2015-2016 for this manifest.
    "F": [],
    "G": [],
    "H": ["INS"],
    "I": ["INS", "HSCRP"],
    "J": ["INS", "HSCRP"],
    "L": ["INS", "HSCRP"],
}


def file_bases_for_suffix(suffix: str) -> list[str]:
    """Return the exact CDC file bases expected for one NHANES cycle."""
    bases = list(COMMON_FILE_BASES)
    bases.append(BP_FILE_BY_SUFFIX.get(suffix, "BPX"))
    bases.extend(OPTIONAL_FILE_BASES_BY_SUFFIX.get(suffix, []))
    return bases


def expected_filenames() -> list[str]:
    """Return all active raw XPT files used by the processor."""
    names: list[str] = []
    for _, _, suffix in CYCLES:
        names.extend(f"{file_base}_{suffix}.XPT" for file_base in file_bases_for_suffix(suffix))
    return names


def cycle_label(year: str, suffix: str) -> str:
    if suffix == "L":
        return "2021-2023"
    return f"{year}-{int(year)+1}"


def _looks_like_html(content: bytes) -> bool:
    prefix = content[:256].decode("latin-1", errors="ignore").lstrip().lower()
    return prefix.startswith("<!doctype") or prefix.startswith("<html")


def _looks_like_xpt(content: bytes) -> bool:
    return content.startswith(b"HEADER RECORD")


def validate_xpt_file(path: Path) -> tuple[bool, str]:
    """Validate an on-disk SAS XPORT file enough to catch corrupt downloads."""
    if not path.exists():
        return False, "missing"
    if path.stat().st_size <= 50_000:
        return False, f"too small ({path.stat().st_size} bytes)"

    with open(path, "rb") as f:
        head = f.read(256)
    if _looks_like_html(head):
        return False, "HTML response saved as XPT"
    if not _looks_like_xpt(head):
        return False, "missing SAS XPORT header"

    if pyreadstat is not None:
        try:
            pyreadstat.read_xport(str(path), metadataonly=True, encoding="latin1")
        except Exception as exc:
            return False, f"pyreadstat metadata read failed: {exc}"

    return True, "valid XPT"


def download_file(url: str, dest: Path) -> tuple[bool, str]:
    """Download and validate a CDC XPT file."""
    ctx = ssl.create_default_context()

    # CDC serves these files with a valid certificate. Keep verification on so
    # local raw data provenance is not silently weakened.
    ctx.check_hostname = True
    ctx.verify_mode = ssl.CERT_REQUIRED
    
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    )
    
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=60) as response:
            content = response.read()

            if _looks_like_html(content):
                return False, "HTML response"
            if not _looks_like_xpt(content):
                return False, "missing SAS XPORT header"

            with open(dest, 'wb') as f:
                f.write(content)

            valid, msg = validate_xpt_file(dest)
            if not valid:
                return False, msg

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
        print(f"\n--- Cycle {cycle_label(year, suffix)} (suffix: _{suffix}) ---")
        
        for file_base in file_bases_for_suffix(suffix):
            filename = f"{file_base}_{suffix}"
            url = f"{base_url}/{filename}.xpt"
            dest = DATA_DIR / f"{filename}.XPT"

            valid, validation_msg = validate_xpt_file(dest)
            if valid:
                print(f"[SKIP] {filename}.XPT exists ({validation_msg})")
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
    print(f"Expected manifest files: {len(expected_filenames())}")
    print(f"Complete: {total_success} available, {total_failed} failed")
    print("=" * 60)


if __name__ == "__main__":
    main()
