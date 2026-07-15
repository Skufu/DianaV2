# Research Documentation

This directory contains all research-related documentation for the DIANA (Diabetes Intelligence Analysis for At-risk Women) platform.

## Directory Structure

```
07-research/
├── README.md                          # This file
├── analysis/                          # Analytical documents and justifications
│   └── Literature-Backed Justification for DIANA's 0.4650 At-Risk Threshold and Feature Weight Rankings.md
├── external-sources/                  # External research sources and snapshots
│   └── perplexity-snapshot.md
├── thesis-drafts/                     # Thesis manuscript drafts and chapters
│   ├── ch3+4.md                       # Chapters 3 & 4 (Methodology sections)
│   ├── manuscript.md                  # Full manuscript
│   ├── METHODOLOGY.md                 # Complete methodology documentation
│   ├── local draft .docx files        # Large local-only Word draft assets (not committed)
│   ├── Manuscript_part1.md            # Split manuscript parts
│   ├── manuscript_part2.md
│   ├── manuscript_part3.md
│   ├── Transcript.md                  # Interview transcripts
│   └── local reference .pdf files     # Large local-only PDF assets (not committed)
├── data_pipeline.md                   # Data processing pipeline documentation
├── diabetes_subgroups.md              # Diabetes subgroup analysis
├── doctor-interview-quick.md          # Doctor interview summaries
├── doctor-interview-weights-validation.md
├── manuscript-updates.md              # Manuscript revision tracking
├── methodology-style-workflow.md      # Methodology writing workflow
├── metrics.md                         # ML performance metrics
├── ml_algorithms.md                   # ML algorithm documentation
├── ml-pipeline-presentation.html      # Interactive ML pipeline presentation
├── paper-requirements.md              # Publication requirements
└── ui_requirements.md                 # UI/UX research requirements

```

## Key Documents

### Thesis & Methodology
- **manuscript.md** - Complete thesis manuscript
- **METHODOLOGY.md** - Detailed methodology documentation
- **ch3+4.md** - Chapters covering research methodology

### Research Analysis
- **Literature-Backed Justification** - Evidence-based justification for ML thresholds and feature rankings
- **diabetes_subgroups.md** - Analysis of diabetes subgroups (SIDD, SIRD, MOD, MARD, AQR)

### External Sources
- **perplexity-snapshot.md** - Snapshot of external research queries and findings

### Clinical Validation
- **doctor-interview-*.md** - Clinical expert interviews and validation

## Research Topics

1. **Machine Learning** - Model architectures, training methodologies, validation
2. **Clinical Evidence** - Medical literature, doctor interviews, threshold justifications
3. **Data Pipeline** - NHANES data processing, feature engineering, imputation
4. **Methodology** - Research design, statistical methods, defensibility

## Citation Index

Key citations referenced across documents are maintained in `docs/03-ml/defense/diana-citations.md`

## Updating This Documentation

When adding new research documents:
1. Place in the appropriate subdirectory
2. Update this README
3. Link from relevant AGENTS.md files
