import json
import matplotlib
matplotlib.use('Agg')  # Headless backend
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path

def plot_calibration():
    cal_path = Path("models/binary_v2_no_bp/results/calibration_report.json")
    with open(cal_path, "r") as f:
        cal_data = json.load(f)

    prob_true = cal_data["calibration_curve"]["prob_true"]
    prob_pred = cal_data["calibration_curve"]["prob_pred"]

    fig, ax = plt.subplots(figsize=(6, 5), dpi=300)
    ax.plot([0, 1], [0, 1], linestyle="--", color="gray", label="Perfect Calibration")
    ax.plot(prob_pred, prob_true, marker="o", color="#1f77b4", linewidth=2, label="DIANA (Logistic Regression)")

    ax.set_xlabel("Mean Predicted Probability")
    ax.set_ylabel("Fraction of Positives")
    ax.set_xlim([-0.05, 1.05])
    ax.set_ylim([-0.05, 1.05])
    ax.grid(True, linestyle=":", alpha=0.6)
    ax.legend(loc="lower right")

    caveat_text = (
        "Apparent / In-Sample Audit (n=1,376)\n"
        "Brier Score: 0.2087\n"
        "ECE: 0.0563\n"
        "Hosmer-Lemeshow χ²: 24.75 (p=0.0017)\n\n"
        "CAUTION: Evaluated on training data.\n"
        "Apparent diagnostics are optimistic\n"
        "and reject exact fit (p < 0.05)."
    )
    ax.text(
        0.05, 0.95, caveat_text,
        transform=ax.transAxes,
        fontsize=8,
        verticalalignment="top",
        bbox=dict(boxstyle="round", facecolor="#FFF2F2", edgecolor="#CC0000", alpha=0.9)
    )

    ax.set_title("Apparent (In-Sample) Calibration Curve", fontsize=12, fontweight="bold", pad=15)
    plt.tight_layout()
    output_dir = Path("docs/07-research/minor-revision-evidence")
    output_dir.mkdir(parents=True, exist_ok=True)
    fig.savefig(output_dir / "calibration_curve.png", dpi=300)
    plt.close(fig)
    print("Generated calibration_curve.png")

def plot_benchmarks():
    bench_path = Path("models/binary_v2_no_bp/results/benchmark_comparison.json")
    with open(bench_path, "r") as f:
        bench_data = json.load(f)

    diana_auc = bench_data["diana"]["auc"]
    diana_ci_low = bench_data["diana"]["auc_ci_low"]
    diana_ci_high = bench_data["diana"]["auc_ci_high"]

    benchmarks = bench_data["benchmarks"]
    benchmark_dict = {b["tool"]: b for b in benchmarks}

    models = ["FINDRISC-like\n(Optimistic)", "DIANA\n(Nine-Feature)", "OmniRisk\n(Approximated)", "Simple Clinical", "ADA Risk Test"]
    aucs = [
        benchmark_dict["FINDRISC"]["auc_mean"],
        diana_auc,
        benchmark_dict["OmniRisk (Approximated)"]["auc_mean"],
        benchmark_dict["Simple Clinical Model"]["auc_mean"],
        benchmark_dict["ADA Risk Test"]["auc_mean"]
    ]

    fig, ax = plt.subplots(figsize=(7, 5), dpi=300)
    colors = ["#d62728", "#1f77b4", "#ff7f0e", "#2ca02c", "#9467bd"]
    bars = ax.bar(models, aucs, color=colors, alpha=0.85, edgecolor="gray", width=0.55)

    sd_findrisc = benchmark_dict["FINDRISC"]["auc_std"]
    sd_omni = benchmark_dict["OmniRisk (Approximated)"]["auc_std"]
    sd_simple = benchmark_dict["Simple Clinical Model"]["auc_std"]
    sd_ada = benchmark_dict["ADA Risk Test"]["auc_std"]
    ci_diana = (diana_ci_high - diana_ci_low) / 2

    errors = [sd_findrisc, ci_diana, sd_omni, sd_simple, sd_ada]
    ax.errorbar(
        range(len(models)), aucs, yerr=errors,
        fmt="none", ecolor="black", elinewidth=1.2, capsize=4
    )

    ax.set_ylabel("Area Under the ROC Curve (AUC-ROC)", fontsize=10)
    ax.set_ylim([0.45, 1.0])
    ax.grid(True, axis="y", linestyle=":", alpha=0.6)

    for bar, auc in zip(bars, aucs):
        height = bar.get_height()
        ax.text(
            bar.get_x() + bar.get_width()/2., height + 0.01,
            f"{auc:.3f}",
            ha="center", va="bottom", fontsize=9, fontweight="bold"
        )

    bench_caveat = (
        "METHODOLOGICAL LIMITATIONS:\n"
        "1. FINDRISC is an optimistic upper-bound using a glycemic proxy.\n"
        "2. All comparator thresholds were test-tuned on held-out cycles.\n"
        "3. DIANA's threshold was strictly locked on development data.\n"
        "4. Comparators are reconstructed/approximated internally."
    )
    ax.text(
        0.02, 0.05, bench_caveat,
        transform=ax.transAxes,
        fontsize=7.5,
        verticalalignment="bottom",
        bbox=dict(boxstyle="round", facecolor="#FFF9E6", edgecolor="#FFA500", alpha=0.9)
    )

    ax.set_title("Internal Benchmark Reconstruction Comparison (AUC-ROC)", fontsize=11, fontweight="bold", pad=15)
    plt.tight_layout()
    output_dir = Path("docs/07-research/minor-revision-evidence")
    fig.savefig(output_dir / "benchmark_comparison.png", dpi=300)
    plt.close(fig)
    print("Generated benchmark_comparison.png")

if __name__ == "__main__":
    plot_calibration()
    plot_benchmarks()
