#!/bin/bash
# NHANES Data Download Script
# Downloads required files for DIANA diabetes risk model training

set -e

DATA_DIR="data/nhanes/raw"
mkdir -p "$DATA_DIR"

BASE_URL="https://wwwn.cdc.gov/Nchs/Nhanes/2017-2018"

# Required NHANES 2017-2018 files
FILES=(
    "GHB_J"      # Glycohemoglobin (HbA1c)
    "GLU_J"      # Fasting Glucose
    "TCHOL_J"    # Total Cholesterol
    "HDL_J"      # HDL Cholesterol
    "TRIGLY_J"   # Triglycerides & LDL
    "BMX_J"      # Body Measures (BMI)
    "BPX_J"      # Blood Pressure
    "DEMO_J"     # Demographics
    "RHQ_J"      # Reproductive Health (menopause)
    "SMQ_J"      # Smoking
    "MCQ_J"      # Medical Conditions
    "DIQ_J"      # Diabetes
)

echo "📥 Downloading NHANES 2017-2018 data files..."
echo "================================================"

for file in "${FILES[@]}"; do
    url="${BASE_URL}/${file}.XPT"
    output="${DATA_DIR}/${file}.XPT"
    
    if [ -f "$output" ]; then
        echo "✓ ${file}.XPT already exists, skipping"
    else
        echo "⬇ Downloading ${file}.XPT..."
        curl -L -o "$output" "$url"
        echo "✓ ${file}.XPT downloaded"
    fi
done

echo ""
echo "================================================"
echo "✅ Download complete!"
echo "Files saved to: $DATA_DIR"
ls -lh "$DATA_DIR"/*.XPT 2>/dev/null | wc -l | xargs -I {} echo "Total files: {}"
