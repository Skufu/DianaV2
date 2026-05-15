from pathlib import Path

import pandas as pd
import pytest

from scripts.data import download_nhanes_multi as download
from scripts.data import process_nhanes_multi as process


ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "data" / "nhanes" / "raw"


def require_raw_data():
    if not RAW_DIR.exists():
        pytest.skip("raw NHANES data directory is not present")


def test_downloader_manifest_matches_active_pipeline_cycles():
    names = set(download.expected_filenames())

    assert len(names) == 91
    assert "BPXO_L.XPT" in names
    assert "BPX_L.XPT" not in names
    assert "INS_H.XPT" in names
    assert "INS_G.XPT" not in names
    assert "HSCRP_I.XPT" in names
    assert "HSCRP_H.XPT" not in names


def test_active_manifest_files_are_present_and_valid():
    require_raw_data()

    expected = set(download.expected_filenames())
    actual = {path.name for path in RAW_DIR.glob("*.XPT")}

    assert expected <= actual

    invalid = []
    for filename in sorted(expected):
        valid, message = download.validate_xpt_file(RAW_DIR / filename)
        if not valid:
            invalid.append(f"{filename}: {message}")

    assert not invalid


def test_newer_paq_frequency_columns_are_classified():
    df = pd.DataFrame(
        [
            # Vigorous LTPA present.
            {"PAD810Q": 2, "PAD810U": "W", "PAD820": 30, "PAD790Q": 0, "PAD790U": "", "PAD800": None},
            # Moderate LTPA present, no vigorous LTPA.
            {"PAD810Q": 0, "PAD810U": "", "PAD820": None, "PAD790Q": 3, "PAD790U": "W", "PAD800": 45},
            # Explicit no moderate/vigorous LTPA.
            {"PAD810Q": 0, "PAD810U": "", "PAD820": None, "PAD790Q": 0, "PAD790U": "", "PAD800": None},
            # Refused/don't know codes are unknown, not sedentary.
            {"PAD810Q": 9999, "PAD810U": "", "PAD820": None, "PAD790Q": 7777, "PAD790U": "", "PAD800": None},
        ]
    )

    assert process.derive_physical_activity(df).tolist() == [
        "Active",
        "Moderate",
        "Sedentary",
        "Unknown",
    ]


def test_newer_alq_frequency_columns_are_classified():
    df = pd.DataFrame(
        [
            {"ALQ111": 2, "ALQ121": None, "ALQ130": None},
            {"ALQ111": 1, "ALQ121": 0, "ALQ130": None},
            {"ALQ111": 1, "ALQ121": 10, "ALQ130": 1},
            {"ALQ111": 1, "ALQ121": 3, "ALQ130": 1},
            {"ALQ111": 1, "ALQ121": 1, "ALQ130": 2},
            {"ALQ111": 9, "ALQ121": None, "ALQ130": None},
        ]
    )

    assert process.derive_alcohol_use(df).tolist() == [
        "Never",
        "Never",
        "Light",
        "Moderate",
        "Heavy",
        "Unknown",
    ]


def test_2021_cycle_alias_columns_are_extracted_from_local_xpt():
    require_raw_data()

    df = process.process_cycle("L", "2021-2023")

    assert "BPXSY1" in df.columns
    assert "BPXDI1" in df.columns
    assert "LBXTR" in df.columns
    assert "LBXCRP" in df.columns
    assert df["BPXSY1"].notna().sum() > 0
    assert df["LBXTR"].notna().sum() > 0
    assert df["LBXCRP"].notna().sum() > 0
