#!/usr/bin/env python3
"""
Generate manifest.json — SHA-256 inventory of the raw NHANES lake.

Mirrors scripts/dev/generate-model-hashes.py. The manifest has two halves:
  1. `files`      — SHA-256 + size of every raw XPT file on disk
  2. `expected`   — the exact file list the downloader spec requires
                    (imported from download_nhanes_multi.py so the two
                    can never drift apart)

Run after downloading or adding raw files:
    PYTHONPATH= .venv/bin/python scripts/data/generate_nhanes_manifest.py
"""
import hashlib
import json
import sys
from pathlib import Path

# Import the downloader's canonical spec (keeps manifest and downloader in sync).
from download_nhanes_multi import CYCLES, expected_filenames, cycle_label

RAW_DIR = Path("data/nhanes/raw")
OUT_FILE = Path("data/nhanes/manifest.json")


def compute_file_hash(filepath: Path) -> str:
    """Compute SHA256 hash of a file (chunked, mirrors generate-model-hashes.py)."""
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


def main() -> int:
    if not RAW_DIR.exists():
        print(f"[X] Raw dir not found: {RAW_DIR}")
        return 1

    expected = sorted(expected_filenames())
    expected_set = set(expected)

    files = {}
    duplicates = []
    for path in sorted(RAW_DIR.rglob("*.XPT")):
        rel = path.relative_to(RAW_DIR).as_posix()
        if rel in files:
            duplicates.append(rel)
            continue
        files[rel] = {
            "sha256": compute_file_hash(path),
            "size": path.stat().st_size,
        }

    on_disk = set(files)
    missing_expected = sorted(expected_set - on_disk)
    unexpected = sorted(on_disk - expected_set)

    manifest = {
        "generated": __import__("datetime").datetime.now().isoformat(timespec="seconds"),
        "raw_dir": str(RAW_DIR),
        "files": files,
        "expected": {
            "spec_source": "scripts/data/download_nhanes_multi.py",
            "cycles": [{"suffix": s, "label": cycle_label(y, s)} for y, _, s in CYCLES],
            "filenames": expected,
        },
    }

    with open(OUT_FILE, "w") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")

    print(f"[+] Manifest written: {OUT_FILE}")
    print(f"    On-disk files hashed: {len(files)}")
    print(f"    Expected (spec):      {len(expected)}")
    print(f"    Missing from expected: {len(missing_expected)}")
    for name in missing_expected:
        print(f"      MISSING: {name}")
    print(f"    Unexpected on disk:   {len(unexpected)}")
    for name in unexpected:
        print(f"      EXTRA: {name}")
    if duplicates:
        print(f"    Duplicates skipped: {len(duplicates)}")
        for name in duplicates:
            print(f"      DUP: {name}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
