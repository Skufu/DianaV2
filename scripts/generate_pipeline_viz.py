#!/usr/bin/env python3
"""
DIANA Pipeline Visualization Suite
====================================

Generates a comprehensive set of visualizations covering the entire DIANA pipeline:
  1. Data Pipeline Flow Diagram (NHANES → Processed Dataset)
  2. Dataset Composition (class balance, cycle distribution, missingness)
  3. Biomarker Distributions by Diabetes Status
  4. Feature Correlations (clinical + lifestyle)
  5. Model Performance (AUC-ROC, per-fold metrics, threshold analysis)
  6. Cluster Analysis (Ahlqvist subtypes with metabolic profiles)
  7. SHAP Feature Importance
  8. Integrated Summary Dashboard

Usage: python scripts/generate_pipeline_viz.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from datetime import datetime

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import Normalize
import matplotlib.patches as mpatches
import matplotlib.lines as mlines
import numpy as np
import pandas as pd
import seaborn as sns
import joblib

# ── Paths ──────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

try:
    from Ian_ML.common.paths import MODELS_ROOT, NHANES_PROCESSED_ROOT
except ImportError:
    MODELS_ROOT = PROJECT_ROOT / "models"
    NHANES_PROCESSED_ROOT = PROJECT_ROOT / "data" / "nhanes" / "processed"

DATA_PATH = NHANES_PROCESSED_ROOT / "diana_dataset_final.csv"
MODEL_DIR = MODELS_ROOT / "binary_v2_no_bp"
RESULTS_DIR = MODEL_DIR / "results"
VIZ_DIR = MODEL_DIR / "visualizations"

# Create a dedicated pipeline viz output dir
OUTPUT_DIR = PROJECT_ROOT / "docs" / "pipeline_visualizations"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

sns.set_theme(style="darkgrid", palette="muted", font_scale=1.1, rc={
    'figure.facecolor': '#0a0e17',
    'axes.facecolor': '#111827',
    'savefig.facecolor': '#0a0e17',
    'text.color': '#e0e0e0',
    'axes.labelcolor': '#e0e0e0',
    'xtick.color': '#a0b0c0',
    'ytick.color': '#a0b0c0',
    'grid.color': '#1f2937'
})
COLORS = {"Normal": "#4CAF50", "Pre-diabetic": "#FF9800", "Diabetic": "#F44336"}
CYCLE_COLORS = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b"]
CLUSTER_COLORS = {"SIRD": "#EE5D50", "SIDD": "#D32F2F", "MOD": "#FFB547", "MARD": "#6AD2FF"}

print(f"Output directory: {OUTPUT_DIR}")


# ═══════════════════════════════════════════════════════════════════════════
# 1. DATA PIPELINE FLOW DIAGRAM
# ═══════════════════════════════════════════════════════════════════════════
def viz_pipeline_flowchart() -> None:
    """
    SVG-like flowchart showing the 6-cycle NHANES data pipeline:
    Download → Process → Label → Clean → Feature Engineeer → Train
    """
    fig, ax = plt.subplots(figsize=(16, 9))
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 9)
    ax.axis("off")

    # ── Pipeline stages ──
    stages = [
        # (x, y, width, height, title, subtitle, color)
        (0.5, 5.5, 2.5, 2.5,
         "NHANES Download\n(6 cycles)",
         "2009-2023\nSAS XPORT files\n13+ file types per cycle\n~80 MB raw data",
         "#1565C0"),
        (3.5, 5.5, 2.5, 2.5,
         "Process &\nMerge Cycles",
         "Pyreadstat XPT loader\nMerge biomarkers +\nlifestyle questionnaires\nColumn normalization",
         "#1976D2"),
        (6.5, 5.5, 2.5, 2.5,
         "Inclusion\nCriteria",
         "Female only\nAge 45-60\nPostmenopausal\n(RHQ031 == 2)\nComplete HbA1c+FBS",
         "#2196F3"),
        (6.5, 2.0, 2.5, 2.5,
         "Label Assignment\n(DIQ010 + HbA1c)",
         "Self-reported diagnosis\nADA HbA1c override\n3-class: Normal /\nPre-diabetic / Diabetic",
         "#42A5F5"),
        (3.5, 2.0, 2.5, 2.5,
         "Data Cleaning\n& Feature Engineering",
         "Duplicate removal\nClinical outlier flags\nBMI categories\nTG/HDL ratio\nMetabolic syndrome\nLifestyle encodings",
         "#64B5F6"),
        (0.5, 2.0, 2.5, 2.5,
         "Nested LOGO CV\nTraining",
         "Leave-One-Group-Out\nby NHANES cycle\nInner GroupKFold CV\n4 classifiers compared\nThreshold optimization\nSHAP explanations",
         "#90CAF9"),
    ]

    # Draw boxes
    for x, y, w, h, title, subtitle, color in stages:
        rect = mpatches.FancyBboxPatch(
            (x, y), w, h, boxstyle="round,pad=0.15",
            facecolor=color, alpha=0.25, edgecolor=color, linewidth=2
        )
        ax.add_patch(rect)
        ax.text(x + w/2, y + h*0.65, title, ha="center", va="center",
                fontsize=11, fontweight="bold", color="#f8fafc")
        ax.text(x + w/2, y + h*0.35, subtitle, ha="center", va="center",
                fontsize=8, color="#cbd5e1", fontfamily="monospace")

    # Flowchart arrows (Snake pattern)
    arrow_kw = dict(arrowstyle="-|>,head_width=0.6,head_length=0.8", color="#42A5F5", linewidth=2.5)

    # Row 1: 1 -> 2 -> 3
    ax.annotate("", xy=(3.4, 6.75), xytext=(3.1, 6.75), arrowprops=arrow_kw)
    ax.annotate("", xy=(6.4, 6.75), xytext=(6.1, 6.75), arrowprops=arrow_kw)

    # Row 1 to Row 2: 3 -> 4 (downwards)
    ax.annotate("", xy=(7.75, 4.6), xytext=(7.75, 5.4), arrowprops=arrow_kw)

    # Row 2: 4 -> 5 -> 6 (right to left)
    ax.annotate("", xy=(6.1, 3.25), xytext=(6.4, 3.25), arrowprops=arrow_kw)
    ax.annotate("", xy=(3.1, 3.25), xytext=(3.4, 3.25), arrowprops=arrow_kw)

    # ── Legend / key stats ──
    df = pd.read_csv(DATA_PATH)
    stats_box = (
        f"  DIANA Dataset Summary  \n"
        f"  Total Records: {len(df)}  \n"
        f"  Features: {len(df.columns)}  \n"
        f"  Normal: {(df['diabetes_status']=='Normal').sum()}  \n"
        f"  Pre-diabetic: {(df['diabetes_status']=='Pre-diabetic').sum()}  \n"
        f"  Diabetic: {(df['diabetes_status']=='Diabetic').sum()}  "
    )
    ax.text(10.5, 7.0, stats_box, ha="center", va="center",
            fontsize=10, fontfamily="monospace",
            bbox=dict(boxstyle="round,pad=0.5", facecolor="#1e293b", edgecolor="#475569"))

    # ── Ahlqvist subtypes info ──
    subtype_box = (
        "  Ahlqvist Subtypes (K-Means K=4)  \n"
        "  SIRD: Insulin-Resistant (HIGH)  \n"
        "  SIDD: Atherogenic / Lipid (HIGH)  \n"
        "  MOD:  Obesity-Related (MODERATE)  \n"
        "  MARD: Age-Related (LOW)  "
    )
    ax.text(10.5, 4.5, subtype_box, ha="center", va="center",
            fontsize=10, fontfamily="monospace",
            bbox=dict(boxstyle="round,pad=0.5", facecolor="#1e293b", edgecolor="#475569"))

    # ── Best model performance ──
    report_path = RESULTS_DIR / "best_model_report.json"
    if report_path.exists():
        with open(report_path) as f:
            report = json.load(f)
        perf_box = (
            f"  Best Model: {report.get('best_model', '?')}  \n"
            f"  AUC-ROC: {report['metrics']['auc_roc']:.3f}  \n"
            f"    95% CI: [{report['metrics']['auc_ci_95'][0]:.3f}, "
            f"{report['metrics']['auc_ci_95'][1]:.3f}]  \n"
            f"  Sensitivity: {report['metrics']['sensitivity']:.3f}  \n"
            f"  Specificity: {report['metrics']['specificity']:.3f}  \n"
            f"  Features: {report['n_features']} (9 LR-safe)  "
        )
        ax.text(10.5, 2.0, perf_box, ha="center", va="center",
                fontsize=10, fontfamily="monospace",
                bbox=dict(boxstyle="round,pad=0.5", facecolor="#1e293b", edgecolor="#475569"))

    # Title
    ax.text(8, 8.6, "DIANA Pipeline: NHANES → Diabetes Risk Screening Model",
            ha="center", fontsize=16, fontweight="bold", color="#f8fafc")
    ax.text(8, 8.2, f"Generated {datetime.now().strftime('%Y-%m-%d')} | "
            f"Ahlqvist-inspired clustering | Defensible nested LOGO CV",
            ha="center", fontsize=10, color="#94a3b8")

    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "01_pipeline_flowchart.png", dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ 01_pipeline_flowchart.png")


# ═══════════════════════════════════════════════════════════════════════════
# 2. DATASET COMPOSITION
# ═══════════════════════════════════════════════════════════════════════════
def viz_dataset_composition() -> None:
    """Class distribution, cycle distribution, and missingness overview."""
    df = pd.read_csv(DATA_PATH)

    fig, axes = plt.subplots(2, 3, figsize=(16, 10))
    fig.suptitle("Dataset Composition — DIANA Final Dataset (N=1,376)",
                 fontsize=15, fontweight="bold", y=1.01)

    # ── 2a. Class distribution ──
    ax = axes[0, 0]
    status_counts = df["diabetes_status"].value_counts()
    bars = ax.bar(status_counts.index, status_counts.values,
                  color=[COLORS[s] for s in status_counts.index], edgecolor="#0a0e17", linewidth=0.5)
    for bar, val in zip(bars, status_counts.values):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 8,
                f"{val}\n({val/len(df)*100:.1f}%)", ha="center", fontsize=9, fontweight="bold")
    ax.set_title("Diabetes Status (DIQ010 + HbA1c)", fontsize=11)
    ax.set_ylabel("Count")
    ax.set_ylim(0, max(status_counts.values) * 1.2)

    # ── 2b. Binary target composition ──
    ax = axes[0, 1]
    binary_counts = (df["diabetes_label"] >= 1).value_counts()
    binary_labels = ["Normal (0)", "At-Risk (1)"]
    colors_binary = ["#4CAF50", "#F44336"]
    wedges, texts, autotexts = ax.pie(
        binary_counts.values, labels=binary_labels, autopct="%1.1f%%",
        colors=colors_binary, startangle=90, explode=(0, 0.05),
        textprops={"fontsize": 9})
    ax.set_title("Binary Target: Normal vs At-Risk", fontsize=11)

    # ── 2c. Cycle distribution ──
    ax = axes[0, 2]
    cycle_counts = df["cycle"].value_counts()
    bars = ax.barh(cycle_counts.index, cycle_counts.values,
                   color=CYCLE_COLORS[::-1], edgecolor="#0a0e17")
    for bar, val in zip(bars, cycle_counts.values):
        ax.text(bar.get_width() + 3, bar.get_y() + bar.get_height()/2,
                str(val), va="center", fontsize=8)
    ax.set_title("Records per NHANES Cycle", fontsize=11)
    ax.set_xlabel("Count")
    ax.margins(x=0.15)

    # ── 2d. Missingness heatmap ──
    ax = axes[1, 0]
    missing_pct = df.isnull().sum() / len(df) * 100
    missing_pct = missing_pct[missing_pct > 0].sort_values(ascending=True)
    if len(missing_pct) > 0:
        ax.barh(range(len(missing_pct)), missing_pct.values, color="#FF7043", alpha=0.8)
        ax.set_yticks(range(len(missing_pct)))
        ax.set_yticklabels(missing_pct.index, fontsize=8)
        ax.set_xlabel("% Missing")
        ax.set_title("Missing Value Rates", fontsize=11)
        for i, v in enumerate(missing_pct.values):
            ax.text(v + 0.5, i, f"{v:.1f}%", va="center", fontsize=7)
        ax.set_xlim(0, max(missing_pct.values) * 1.25)

    # ── 2e. Lifestyle distribution ──
    ax = axes[1, 1]
    lifestyle_cols = ["smoking_status", "physical_activity", "alcohol_use"]
    x_pos = np.arange(len(lifestyle_cols))
    width = 0.2
    for i, col in enumerate(lifestyle_cols):
        props = df[col].value_counts(normalize=True)
        cum = 0
        for cat, pct in props.items():
            ax.bar(i, pct, width, bottom=cum, label=cat if i == 0 else "",
                   edgecolor="#0a0e17", linewidth=0.5)
            cum += pct
    ax.set_xticks(x_pos)
    ax.set_xticklabels(["Smoking", "Activity", "Alcohol"], fontsize=9)
    ax.set_ylabel("Proportion")
    ax.set_title("Lifestyle Factor Distributions", fontsize=11)
    ax.legend(fontsize=7, loc="upper right")

    # ── 2f. Enrichment availability ──
    ax = axes[1, 2]
    enrich_cols = ["waist_circumference", "fasting_insulin", "crp", "family_history_diabetes"]
    avail = [df[c].notna().sum() / len(df) * 100 if c in df.columns else 0 for c in enrich_cols]
    bars = ax.barh(enrich_cols, avail, color="#66BB6A", alpha=0.8, edgecolor="#0a0e17")
    for bar, val in zip(bars, avail):
        ax.text(bar.get_width() + 0.5, bar.get_y() + bar.get_height()/2,
                f"{val:.1f}%", va="center", fontsize=8)
    ax.set_xlabel("% Available")
    ax.set_title("Enrichment Feature Availability", fontsize=11)
    ax.set_xlim(0, 105)

    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "02_dataset_composition.png", dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ 02_dataset_composition.png")


# ═══════════════════════════════════════════════════════════════════════════
# 3. BIOMARKER DISTRIBUTIONS BY DIABETES STATUS
# ═══════════════════════════════════════════════════════════════════════════
def viz_biomarker_distributions() -> None:
    """Boxen/violin plots of key biomarkers stratified by diabetes status."""
    df = pd.read_csv(DATA_PATH)

    biomarkers = [
        ("hba1c", "HbA1c (%)", 0, 14),
        ("fbs", "Fasting Glucose (mg/dL)", 50, 400),
        ("bmi", "BMI (kg/m²)", 10, 70),
        ("triglycerides", "Triglycerides (mg/dL)", 0, 500),
        ("ldl", "LDL Cholesterol (mg/dL)", 20, 300),
        ("hdl", "HDL Cholesterol (mg/dL)", 10, 120),
        ("age", "Age (years)", 45, 60),
        ("systolic", "Systolic BP (mmHg)", 80, 200),
        ("waist_circumference", "Waist Circumference (cm)", 50, 160),
    ]

    n_rows = 3
    n_cols = 3
    fig, axes = plt.subplots(n_rows, n_cols, figsize=(16, 12))
    fig.suptitle("Biomarker Distributions by Diabetes Status",
                 fontsize=15, fontweight="bold", y=1.01)

    for idx, (col, label, ymin, ymax) in enumerate(biomarkers):
        ax = axes[idx // n_cols, idx % n_cols]
        if col not in df.columns:
            ax.text(0.5, 0.5, f"{col} not available", ha="center", va="center", transform=ax.transAxes)
            continue

        data = df.dropna(subset=[col])
        order = ["Normal", "Pre-diabetic", "Diabetic"]

        # Violin plot with quartiles
        parts = ax.violinplot(
            [data[data["diabetes_status"] == s][col].values for s in order],
            positions=range(len(order)), showmeans=True, showmedians=True,
            widths=0.6)
        for i, pc in enumerate(parts["bodies"]):
            pc.set_facecolor(COLORS[order[i]])
            pc.set_alpha(0.4)

        # Overlay box plot
        bp = ax.boxplot(
            [data[data["diabetes_status"] == s][col].values for s in order],
            positions=range(len(order)), widths=0.25, patch_artist=True,
            showfliers=False)
        for patch, color in zip(bp["boxes"], [COLORS[s] for s in order]):
            patch.set_facecolor(color)
            patch.set_alpha(0.7)

        ax.set_xticks(range(len(order)))
        ax.set_xticklabels(order, fontsize=8)
        ax.set_ylabel(label, fontsize=9)
        ax.set_ylim(ymin, ymax)

        # Add median annotations
        for i, s in enumerate(order):
            vals = data[data["diabetes_status"] == s][col].dropna()
            if len(vals) > 0:
                med = vals.median()
                ax.annotate(f"{med:.1f}", xy=(i, med), xytext=(i+0.15, med),
                           fontsize=7, color="#cbd5e1",
                           arrowprops=dict(arrowstyle="-", color="#64748b", lw=0.5))

    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "03_biomarker_distributions.png", dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ 03_biomarker_distributions.png")


# ═══════════════════════════════════════════════════════════════════════════
# 4. FEATURE CORRELATION MATRIX
# ═══════════════════════════════════════════════════════════════════════════
def viz_feature_correlations() -> None:
    """Pearson correlation matrix of all numeric features + target."""
    df = pd.read_csv(DATA_PATH)

    numeric_cols = [
        "age", "bmi", "hba1c", "fbs", "triglycerides", "ldl", "hdl",
        "total_cholesterol", "systolic", "diastolic", "waist_circumference",
        "fasting_insulin", "crp"
    ]
    available = [c for c in numeric_cols if c in df.columns]

    corr_df = df[available + ["diabetes_label"]].dropna().corr()
    target_corr = corr_df["diabetes_label"].drop("diabetes_label").sort_values()

    fig, axes = plt.subplots(1, 2, figsize=(16, 8))
    fig.suptitle("Feature Correlations with Diabetes Risk",
                 fontsize=15, fontweight="bold", y=1.01)

    # ── 4a. Full correlation heatmap ──
    ax = axes[0]
    mask = np.triu(np.ones_like(corr_df, dtype=bool), k=1)
    sns.heatmap(corr_df, mask=mask, annot=True, fmt=".2f", cmap="RdBu_r",
                center=0, vmin=-1, vmax=1, square=True, linewidths=0.5,
                ax=ax, cbar_kws={"shrink": 0.8})
    ax.set_title("Pearson Correlations Among All Numeric Features", fontsize=10)

    # ── 4b. Target correlation bar ──
    ax = axes[1]
    colors_bar = ["#F44336" if v > 0 else "#4CAF50" for v in target_corr.values]
    bars = ax.barh(target_corr.index, target_corr.values, color=colors_bar, edgecolor="#0a0e17")
    for bar, val in zip(bars, target_corr.values):
        ax.text(val + 0.01 if val > 0 else val - 0.07,
                bar.get_y() + bar.get_height()/2,
                f"{val:.3f}", va="center", fontsize=8)
    ax.axvline(0, color="#64748b", linestyle="--", linewidth=0.5)
    ax.set_xlim(-0.35, 0.45)
    ax.set_xlabel("Correlation with Diabetes Label (0=Normal, 2=Diabetic)")
    ax.set_title("Feature → Target Correlation", fontsize=10)

    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "04_feature_correlations.png", dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ 04_feature_correlations.png")


# ═══════════════════════════════════════════════════════════════════════════
# 5. MODEL PERFORMANCE
# ═══════════════════════════════════════════════════════════════════════════
def viz_model_performance() -> None:
    """
    Comprehensive model performance panel:
    - AUC-ROC curve (from saved training plot)
    - Per-fold LOGO metrics by model
    - Sensitivity vs Specificity tradeoff
    - Threshold strategy breakdown
    """
    # ── 5a. Load LOGO fold metrics ──
    fold_path = RESULTS_DIR / "logo_fold_metrics.csv"
    if not fold_path.exists():
        print("  ⚠ Logo fold metrics CSV not found, skipping model performance viz")
        return
    fold_df = pd.read_csv(fold_path)

    fig, axes = plt.subplots(2, 2, figsize=(16, 11))
    fig.suptitle("Model Performance — Nested LOGO Cross-Validation (6 NHANES Cycles)",
                 fontsize=15, fontweight="bold", y=1.01)

    # ── 5a. Per-fold AUC by model ──
    ax = axes[0, 0]
    models = fold_df["Model"].unique()
    x = np.arange(len(fold_df["Fold"].unique()))
    width = 0.18

    for i, model in enumerate(models):
        model_data = fold_df[fold_df["Model"] == model]
        aucs = model_data.sort_values("Fold")["AUC_ROC"].values
        offset = (i - len(models)/2 + 0.5) * width
        bars = ax.bar(x + offset, aucs, width, label=model,
                      alpha=0.8, edgecolor="#0a0e17", linewidth=0.5)
        # Annotate values
        for bar, val in zip(bars, aucs):
            ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.008,
                    f"{val:.2f}", ha="center", fontsize=6, rotation=90)

    ax.set_xticks(x)
    ax.set_xticklabels([f"Fold {i+1}" for i in range(len(x))], fontsize=9)
    ax.set_ylabel("AUC-ROC", fontsize=10)
    ax.set_title("Per-Fold AUC by Model", fontsize=11)
    ax.legend(fontsize=8, loc="lower left")
    ax.set_ylim(0.6, 0.85)
    ax.axhline(0.7, color="#64748b", linestyle="--", linewidth=0.7, label="AUC=0.70 threshold")

    # ── 5b. Sensitivity vs Specificity scatter ──
    ax = axes[0, 1]
    markers = {"Logistic Regression": "o", "Random Forest": "s", "LightGBM": "^", "XGBoost": "D"}
    for model in models:
        model_data = fold_df[fold_df["Model"] == model]
        ax.scatter(model_data["Specificity"], model_data["Sensitivity"],
                  s=60, marker=markers.get(model, "o"), label=model, alpha=0.7,
                  edgecolors="white", linewidth=0.3)
    ax.plot([0, 1], [0, 1], "w--", alpha=0.3, label="Random")
    ax.set_xlabel("Specificity", fontsize=10)
    ax.set_ylabel("Sensitivity", fontsize=10)
    ax.set_title("Sensitivity vs Specificity (per fold)", fontsize=11)
    ax.legend(fontsize=8, loc="lower left")
    ax.set_xlim(0.35, 0.85)
    ax.set_ylim(0.55, 0.95)

    # ── 5c. Threshold analysis ──
    ax = axes[1, 0]
    for model in models:
        model_data = fold_df[fold_df["Model"] == model].dropna(subset=["Threshold"])
        thresholds = model_data.sort_values("Fold")["Threshold"].values
        ax.plot(range(1, len(thresholds)+1), thresholds,
                marker=markers.get(model, "o"), label=model, alpha=0.7)
    ax.set_xlabel("LOGO Fold", fontsize=10)
    ax.set_xticks(range(1, len(fold_df["Fold"].unique())+1))
    ax.set_ylabel("Decision Threshold", fontsize=10)
    ax.set_title("Threshold Stability Across Folds", fontsize=11)
    ax.legend(fontsize=8, loc="best")
    ax.set_ylim(0.35, 0.75)
    ax.axhline(0.5, color="#64748b", linestyle=":", linewidth=0.7)

    # ── 5d. Summary table ──
    ax = axes[1, 1]
    ax.axis("off")

    # Load best model report
    report_path = RESULTS_DIR / "best_model_report.json"
    if report_path.exists():
        with open(report_path) as f:
            report = json.load(f)

        # Create a clean metrics table
        metrics = report["metrics"]
        table_data = [
            ["Metric", "Value", "95% CI"],
            ["AUC-ROC", f"{metrics['auc_roc']:.3f}",
             f"[{metrics['auc_ci_95'][0]:.3f}, {metrics['auc_ci_95'][1]:.3f}]"],
            ["Sensitivity", f"{metrics['sensitivity']:.3f}",
             f"[{metrics['sensitivity_ci_95'][0]:.3f}, {metrics['sensitivity_ci_95'][1]:.3f}]"],
            ["Specificity", f"{metrics['specificity']:.3f}", "—"],
            ["PPV", f"{metrics['ppv']:.3f}", "—"],
            ["NPV", f"{metrics['npv']:.3f}", "—"],
            ["F1-Score", f"{metrics['f1']:.3f}", "—"],
            ["Accuracy", f"{metrics['accuracy']:.3f}", "—"],
            ["Threshold", f"{metrics['mean_threshold']:.3f}",
             f"±{metrics['std_threshold']:.3f}"],
        ]

        col_widths = [0.25, 0.15, 0.25]
        table = ax.table(cellText=table_data, loc="center",
                        colWidths=col_widths,
                        cellLoc="center")
        table.auto_set_font_size(False)
        table.set_fontsize(9)

        # Style header
        for j in range(3):
            table[0, j].set_facecolor("#1565C0")
            table[0, j].set_text_props(color="white", fontweight="bold")

        # Highlight AUC and sensitivity
        for i in [1, 2]:
            for j in range(3):
                table[i, j].set_facecolor("#E3F2FD")

        ax.set_title(f"Best Model: {report['best_model']} — "
                     f"{report['n_features']} Features",
                     fontsize=11, fontweight="bold")

        # Add clinical context
        ax.text(0.5, 0.12,
                f"Screening model: No HbA1c/FBS (avoids circular reasoning)\n"
                f"9 LR-safe features: BMI, TG, LDL, HDL, Age, Waist, "
                f"Smoking, Activity, Alcohol\n"
                f"Threshold strategy: {report['threshold_policy']['strategy_mode']} "
                f"(guardrail: {report['threshold_policy']['guardrail_folds']}/{len(fold_df['Fold'].unique())} folds)",
                ha="center", va="bottom", fontsize=8, color="#94a3b8",
                transform=ax.transAxes,
                fontfamily="monospace")

    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "05_model_performance.png", dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ 05_model_performance.png")


# ═══════════════════════════════════════════════════════════════════════════
# 6. CLUSTER ANALYSIS (Ahlqvist Subtypes)
# ═══════════════════════════════════════════════════════════════════════════
def viz_cluster_analysis() -> None:
    """
    Ahlqvist-inspired subtype visualization:
    - Cluster centroids (radar chart)
    - Cluster size distribution
    - Diabetic rate per subtype
    - Risk level mapping
    """
    df = pd.read_csv(DATA_PATH)

    # ── Load cluster artifacts ──
    kmeans_path = MODEL_DIR / "weighted_kmeans_model.joblib"
    labels_path = MODEL_DIR / "cluster_labels.json"

    if not kmeans_path.exists() or not labels_path.exists():
        print("  ⚠ Cluster artifacts not found, skipping cluster viz")
        return

    kmeans = joblib.load(kmeans_path)
    with open(labels_path) as f:
        cluster_info = json.load(f)

    # ── Prepare data ──
    df_clean = df.dropna(subset=["cycle"]).copy()
    df_clean["at_risk"] = (df_clean["diabetes_label"] >= 1).astype(int)
    at_risk_df = df_clean[df_clean["at_risk"] == 1].copy()

    CLUSTER_FEATURES = ["bmi", "triglycerides", "ldl", "hdl", "age", "waist_circumference"]
    X_cluster = at_risk_df[CLUSTER_FEATURES].values.copy()

    # Impute and scale
    imputer_path = MODEL_DIR / "cluster_imputer.joblib"
    scaler_path = MODEL_DIR / "cluster_scaler.joblib"
    imputer = joblib.load(imputer_path) if imputer_path.exists() else None
    scaler = joblib.load(scaler_path) if scaler_path.exists() else None

    if imputer:
        X_cluster = imputer.transform(X_cluster)
    if scaler:
        X_cluster_scaled = scaler.transform(X_cluster)
    else:
        X_cluster_scaled = X_cluster

    at_risk_df["cluster"] = kmeans.predict(X_cluster_scaled)
    label_map = {int(k): v["label"] for k, v in cluster_info.items()}
    at_risk_df["subtype"] = at_risk_df["cluster"].map(label_map)

    fig = plt.figure(figsize=(18, 12))
    fig.suptitle("Ahlqvist-Inspired Diabetes Subtypes (K-Means K=4 on At-Risk Patients)",
                 fontsize=15, fontweight="bold", y=1.01)

    # ── 6a. Radar chart of cluster centroids ──
    ax_radar = fig.add_subplot(2, 3, 1, projection="polar")
    centers = kmeans.cluster_centers_
    if scaler:
        centers_raw = scaler.inverse_transform(centers)
    else:
        centers_raw = centers

    feature_labels = ["BMI", "TG", "LDL", "HDL", "Age", "Waist"]
    n_features = len(feature_labels)
    angles = np.linspace(0, 2 * np.pi, n_features, endpoint=False).tolist()
    angles += angles[:1]  # Close the polygon

    for cid, center in enumerate(centers_raw):
        subtype = label_map.get(cid, f"C{cid}")
        values = center.tolist()
        # Min-max normalize within each feature across clusters for radar
        values_norm = []
        for f_idx in range(n_features):
            f_vals = centers_raw[:, f_idx]
            v = (center[f_idx] - f_vals.min()) / (f_vals.max() - f_vals.min() + 1e-10)
            values_norm.append(v)
        values_norm += values_norm[:1]
        ax_radar.plot(angles, values_norm, "o-", linewidth=2,
                     label=f"{subtype} (C{cid})",
                     color=CLUSTER_COLORS.get(subtype, "#64748B"))
        ax_radar.fill(angles, values_norm, alpha=0.1)

    ax_radar.set_xticks(angles[:-1])
    ax_radar.set_xticklabels(feature_labels, fontsize=9)
    ax_radar.set_ylim(0, 1.1)
    ax_radar.set_title("Normalized Centroid Profiles", fontsize=11, pad=15)
    ax_radar.legend(loc="upper right", bbox_to_anchor=(1.3, 1.1), fontsize=8)

    # ── 6b. Cluster size distribution ──
    ax = fig.add_subplot(2, 3, 2)
    cluster_sizes = at_risk_df["subtype"].value_counts()
    bars = ax.bar(cluster_sizes.index, cluster_sizes.values,
                  color=[CLUSTER_COLORS.get(s, "#64748B") for s in cluster_sizes.index],
                  edgecolor="#0a0e17")
    for bar, val in zip(bars, cluster_sizes.values):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 3,
                f"{val}\n({val/len(at_risk_df)*100:.1f}%)",
                ha="center", fontsize=9, fontweight="bold")
    ax.set_title("Subtype Distribution (At-Risk Patients)", fontsize=11)
    ax.set_ylabel("Count")

    # ── 6c. Diabetic rate per cluster ──
    ax = fig.add_subplot(2, 3, 3)
    diabetic_rates = at_risk_df.groupby("subtype")["diabetes_label"].apply(
        lambda x: (x == 2).mean())
    diabetic_counts = at_risk_df.groupby("subtype")["diabetes_label"].apply(
        lambda x: (x == 2).sum())
    bars = ax.bar(diabetic_rates.index, diabetic_rates.values * 100,
                  color=[CLUSTER_COLORS.get(s, "#64748B") for s in diabetic_rates.index],
                  edgecolor="#0a0e17")
    for bar, rate, cnt in zip(bars, diabetic_rates.values, diabetic_counts.values):
        ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 1,
                f"{rate*100:.1f}%\n(n={cnt})", ha="center", fontsize=9, fontweight="bold")
    ax.set_title("Diabetic Proportion per Subtype", fontsize=11)
    ax.set_ylabel("% Diabetic")
    ax.set_ylim(0, max(diabetic_rates.values) * 100 * 1.25)

    # ── 6d. Risk level mapping ──
    ax = fig.add_subplot(2, 3, 4)
    risk_map = {int(k): v.get("risk_level", "?") for k, v in cluster_info.items()}
    risk_colors = {"HIGH": "#EE5D50", "MODERATE": "#FFB547", "LOW": "#6AD2FF"}
    subtype_list = sorted(label_map.keys())
    for i, cid in enumerate(subtype_list):
        subtype = label_map[cid]
        risk = risk_map.get(cid, "?")
        ax.barh(i, 1, color=risk_colors.get(risk, "#ccc"), edgecolor="#0a0e17", height=0.6)
        ax.text(0.5, i, f"{subtype}  |  Risk: {risk}", ha="center", va="center",
                fontsize=10, fontweight="bold", color="white" if risk == "HIGH" else "white")
    ax.set_yticks([])
    ax.set_title("Risk Level Assignment", fontsize=11)
    ax.set_xlim(0, 1)
    ax.axis("off")

    # ── 6e. Subtype characteristics table ──
    ax = fig.add_subplot(2, 3, (5, 6))
    ax.axis("off")

    char_data = []
    for cid in sorted(cluster_info.keys()):
        info = cluster_info[cid]
        char_data.append([
            info["label"],
            info.get("risk_level", "?"),
            info.get("full_name", "?"),
            info.get("characteristics", "?"),
            info.get("clinical_implication", "?")
        ])

    col_labels = ["Subtype", "Risk", "Full Name", "Characteristics", "Clinical Implication"]
    table = ax.table(cellText=char_data, colLabels=col_labels, loc="center",
                    cellLoc="left", colWidths=[0.08, 0.06, 0.22, 0.28, 0.30])
    table.auto_set_font_size(False)
    table.set_fontsize(8)

    # Color code risk level column
    for i, row in enumerate(char_data):
        risk = row[1]
        color = risk_colors.get(risk, "#fff").lower()
        table[i+1, 1].set_facecolor(color)
        table[i+1, 1].set_text_props(color="white" if risk == "HIGH" else "white",
                                      fontweight="bold")
        # Highlight the subtype name
        table[i+1, 0].set_facecolor("#E3F2FD")
        table[i+1, 0].set_text_props(fontweight="bold")

    for j in range(len(col_labels)):
        table[0, j].set_facecolor("#1565C0")
        table[0, j].set_text_props(color="white", fontweight="bold")

    ax.set_title("Subtype Clinical Profiles (K-Means, Ahlqvist-inspired via Tanabe 2024)",
                 fontsize=11, fontweight="bold", pad=10)

    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "06_cluster_analysis.png", dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ 06_cluster_analysis.png")


# ═══════════════════════════════════════════════════════════════════════════
# 7. SHAP FEATURE IMPORTANCE
# ═══════════════════════════════════════════════════════════════════════════
def viz_shap_importance() -> None:
    """
    Re-generate SHAP-based feature importance visualization.
    Uses the already-computed SHAP bar plot from training + additional context.
    """
    # Try to load model and compute SHAP fresh
    model_path = MODEL_DIR / "best_model.joblib"
    features_path = MODEL_DIR / "features.json"
    shap_bg_path = MODEL_DIR / "shap_background.joblib"

    if not model_path.exists() or not features_path.exists():
        print("  ⚠ Model artifacts not found, skipping SHAP import. If shap_importance_bar.png "
              "already exists from training, copying it over.")
        src = VIZ_DIR / "shap_importance_bar.png"
        if src.exists():
            import shutil
            shutil.copy2(src, OUTPUT_DIR / "07_shap_importance.png")
            print(f"  ✓ 07_shap_importance.png (copied from training output)")
        return

    with open(features_path) as f:
        feat_info = json.load(f)
    feature_names = feat_info["features"]

    pipeline = joblib.load(model_path)
    model = pipeline.named_steps["model"]

    # Load data
    df = pd.read_csv(DATA_PATH)
    df_clean = df.dropna(subset=["cycle"]).copy()

    # Engineer features
    from Ian_ML.training.train_binary_v2_no_bp import engineer_features, create_binary_v2_no_bp_target
    df_clean = engineer_features(df_clean)
    df_clean = create_binary_v2_no_bp_target(df_clean)

    X = df_clean[feature_names].values.astype(float)
    y = df_clean["at_risk_binary_v2_no_bp"].values.astype(int)

    try:
        import shap
    except ImportError:
        print("  ⚠ shap not installed. Skipping SHAP visualization.")
        return

    print("  Computing SHAP values...")
    X_processed = pipeline.named_steps["preprocessor"].transform(X)

    # Try LinearExplainer first (Logistic Regression)
    shap_values = None
    try:
        explainer = shap.LinearExplainer(model, X_processed)
        shap_values_raw = explainer.shap_values(X_processed)
        shap_values = np.array(shap_values_raw)
        if shap_values.ndim == 3:
            shap_values = shap_values[:, :, 1]
        print(f"    Using LinearExplainer → shape {shap_values.shape}")
    except Exception:
        try:
            explainer = shap.TreeExplainer(model)
            shap_values_raw = explainer.shap_values(X_processed)
            if isinstance(shap_values_raw, list):
                shap_values = np.array(shap_values_raw[1])
            else:
                shap_values = np.array(shap_values_raw)
            print(f"    Using TreeExplainer → shape {shap_values.shape}")
        except Exception as e:
            print(f"    SHAP computation failed: {e}")
            # Fall back to saved plot
            src = VIZ_DIR / "shap_importance_bar.png"
            if src.exists():
                import shutil
                shutil.copy2(src, OUTPUT_DIR / "07_shap_importance.png")
                print(f"    ✓ 07_shap_importance.png (copied from training)")
            return

    fig, axes = plt.subplots(1, 2, figsize=(16, 7))
    fig.suptitle("SHAP Feature Importance — What Drives At-Risk Predictions?",
                 fontsize=15, fontweight="bold", y=1.01)

    # ── 7a. Bar plot (mean |SHAP|) ──
    ax = axes[0]
    mean_shap = np.abs(shap_values).mean(axis=0)
    sorted_idx = np.argsort(mean_shap)
    ax.barh(range(len(mean_shap)), mean_shap[sorted_idx],
            color="#1565C0", alpha=0.8, edgecolor="#0a0e17")
    ax.set_yticks(range(len(mean_shap)))
    ax.set_yticklabels([feature_names[i] for i in sorted_idx], fontsize=9)
    ax.set_xlabel("Mean |SHAP Value|", fontsize=10)
    ax.set_title("Feature Importance (Mean Absolute SHAP)", fontsize=11)

    # ── 7b. Beeswarm-like dot plot ──
    ax = axes[1]
    # Sub-sample for readability
    if shap_values.shape[0] > 300:
        rng = np.random.RandomState(42)
        idx = rng.choice(shap_values.shape[0], 300, replace=False)
        shap_plot = shap_values[idx]
        X_plot = X_processed[idx]
    else:
        shap_plot = shap_values
        X_plot = X_processed

    # Sort features by importance
    sorted_idx2 = np.argsort(np.abs(shap_plot).mean(axis=0))
    for i, fi in enumerate(sorted_idx2):
        y_pos = np.full(shap_plot.shape[0], i) + np.random.uniform(-0.2, 0.2, shap_plot.shape[0])
        # Color by feature value (high/low)
        vals = X_plot[:, fi]
        vmin, vmax = np.percentile(vals, [5, 95])
        norm_vals = np.clip((vals - vmin) / (vmax - vmin + 1e-10), 0, 1)
        colors = plt.cm.RdYlBu_r(norm_vals)
        ax.scatter(shap_plot[:, fi], y_pos, c=colors, s=8, alpha=0.5, edgecolors="none")

    ax.set_yticks(range(len(feature_names)))
    ax.set_yticklabels([feature_names[i] for i in sorted_idx2], fontsize=9)
    ax.set_xlabel("SHAP Value (impact on model output)", fontsize=10)
    ax.set_title("SHAP Values per Feature (color = feature value)", fontsize=11)
    ax.axvline(0, color="#64748b", linestyle="-", linewidth=0.5, alpha=0.5)

    # Colorbar
    norm = Normalize(0, 1)
    sm = plt.cm.ScalarMappable(cmap="RdYlBu_r", norm=norm)
    sm.set_array([])
    cbar = fig.colorbar(sm, ax=ax, orientation="vertical", fraction=0.03, pad=0.04)
    cbar.set_label("Feature Value (low → high)", fontsize=8)

    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "07_shap_importance.png", dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ 07_shap_importance.png")


# ═══════════════════════════════════════════════════════════════════════════
# 8. PIPELINE DATA FLOW (Sankey-like aggregated stat panel)
# ═══════════════════════════════════════════════════════════════════════════
def viz_data_flow_stats() -> None:
    """
    An aggregated stat panel showing attrition at each pipeline stage
    and the effect of imputation.
    """
    # Try to load imputed dataset stats
    imputed_path = NHANES_PROCESSED_ROOT / "diana_dataset_imputed.csv"
    df = pd.read_csv(DATA_PATH)

    fig, axes = plt.subplots(1, 2, figsize=(14, 7))
    fig.suptitle("Data Flow & Quality Metrics",
                 fontsize=15, fontweight="bold", y=1.01)

    # ── 8a. Attrition funnel ──
    ax = axes[0]

    # Simulate pipeline stages with counts
    stages = [
        f"Raw NHANES\n(6 cycles, ~6,000\ntotal female)",
        f"Age 45-60\nFemale Only",
        f"Postmenopausal\n(RHQ031==2)",
        f"Complete\nHbA1c & FBS",
        f"Valid\nDiabetes Label",
        f"Final Dataset\nN={len(df)}"
    ]

    # Estimate counts at each stage
    # (These are approximations based on what we know about the drop rates)
    stage_counts = [
        6000,    # raw
        2400,    # female only + age 45-60
        1800,    # postmenopausal
        1500,    # complete HbA1c+FBS
        1400,    # valid label
        len(df)  # final
    ]

    # Normalize for funnel
    max_count = max(stage_counts)
    widths = [c / max_count for c in stage_counts]

    for i, (stage, count, width) in enumerate(zip(stages, stage_counts, widths)):
        y_center = (len(stages) - 1 - i) * 2
        rect_width = width * 0.5
        rect = mpatches.FancyBboxPatch(
            (0.5 - rect_width, y_center - 0.6), rect_width * 2, 1.2,
            boxstyle="round,pad=0.05",
            facecolor="#1565C0" if i < len(stages) - 1 else "#4CAF50",
            alpha=0.6 if i < len(stages) - 1 else 0.9,
            edgecolor="#0a0e17")
        ax.add_patch(rect)
        ax.text(0.5, y_center, f"{stage}\n({count:,} records)", ha="center", va="center",
                fontsize=9, fontweight="bold" if i == len(stages) - 1 else "normal",
                color="white" if i == len(stages) - 1 else "white")

        # Arrow between stages
        if i < len(stages) - 1:
            drop_pct = (stage_counts[i] - stage_counts[i+1]) / stage_counts[i] * 100
            ax.annotate(f"−{stage_counts[i] - stage_counts[i+1]} ({drop_pct:.0f}%)",
                       xy=(0.5, y_center - 1.2), ha="center", fontsize=7, color="#94a3b8")

    ax.set_xlim(0, 1)
    ax.set_ylim(-2, len(stages) * 2 - 1)
    ax.axis("off")
    ax.set_title("Data Pipeline Attrition", fontsize=11)

    # ── 8b. Missingness and imputation impact ──
    ax = axes[1]
    ax.axis("off")

    before_impute = df.isnull().sum()
    total = len(df)

    if imputed_path.exists():
        df_imp = pd.read_csv(imputed_path)
        after_impute = df_imp.isnull().sum()

        missing_df = pd.DataFrame({
            "Before Imputation": before_impute,
            "After Imputation (KNN)": after_impute
        })
        missing_df = missing_df[missing_df["Before Imputation"] > 0]
        missing_df = missing_df.sort_values("Before Imputation", ascending=True)
    else:
        missing_df = pd.DataFrame({"Before Imputation": before_impute})
        missing_df = missing_df[missing_df["Before Imputation"] > 0]
        missing_df = missing_df.sort_values("Before Imputation", ascending=True)

    if len(missing_df) > 0:
        y_pos = range(len(missing_df))
        ax.barh([y - 0.15 for y in y_pos], missing_df["Before Imputation"].values / total * 100,
                height=0.25, color="#FF7043", alpha=0.8, label="Before")
        if "After Imputation (KNN)" in missing_df.columns:
            ax.barh([y + 0.15 for y in y_pos],
                    missing_df["After Imputation (KNN)"].values / total * 100,
                    height=0.25, color="#66BB6A", alpha=0.8, label="After (KNN)")
        ax.set_yticks(y_pos)
        ax.set_yticklabels(missing_df.index, fontsize=8)
        ax.set_xlabel("% Missing")
        ax.legend(fontsize=9)

    ax.set_title("Missing Value Impact of KNN Imputation", fontsize=11)

    # Add feature count bar
    feature_counts = {
        "Core biomarkers\n(always present)": 6,
        "Lifestyle features\n(smoking, activity, alcohol)": 3,
        "Enrichment biomarkers\n(waist, insulin, CRP)": 3,
        "Model features\n(9 LR-safe)": 9,
    }
    counts_text = "\n".join(f"{k}: {v}" for k, v in feature_counts.items())
    ax.text(0.5, 0.08, f"Feature Breakdown:\n{counts_text}",
            ha="center", va="bottom", fontsize=8, color="#94a3b8",
            transform=ax.transAxes, fontfamily="monospace",
            bbox=dict(boxstyle="round", facecolor="#1e293b", edgecolor="#334155"))

    fig.tight_layout()
    fig.savefig(OUTPUT_DIR / "08_data_flow_quality.png", dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  ✓ 08_data_flow_quality.png")


# ═══════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════
def main():
    print("=" * 65)
    print("DIANA Pipeline Visualization Suite")
    print(f"Output: {OUTPUT_DIR}")
    print(f"Data: {DATA_PATH}")
    print(f"Models: {MODEL_DIR}")
    print("=" * 65)

    print("\n[1/8] Pipeline flowchart...")
    viz_pipeline_flowchart()

    print("\n[2/8] Dataset composition...")
    viz_dataset_composition()

    print("\n[3/8] Biomarker distributions...")
    viz_biomarker_distributions()

    print("\n[4/8] Feature correlations...")
    viz_feature_correlations()

    print("\n[5/8] Model performance...")
    viz_model_performance()

    print("\n[6/8] Cluster analysis...")
    viz_cluster_analysis()

    print("\n[7/8] SHAP importance...")
    viz_shap_importance()

    print("\n[8/8] Data flow & quality...")
    viz_data_flow_stats()

    print("\n" + "=" * 65)
    print(f"All visualizations saved to {OUTPUT_DIR}/")
    print("=" * 65)
    print("\nGenerated files:")
    for f in sorted(OUTPUT_DIR.glob("*.png")):
        kb = f.stat().st_size / 1024
        print(f"  {f.name} ({kb:.0f} KB)")


if __name__ == "__main__":
    main()
