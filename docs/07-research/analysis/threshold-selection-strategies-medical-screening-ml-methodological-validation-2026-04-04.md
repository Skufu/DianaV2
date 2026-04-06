# Threshold Selection Strategies for Medical Screening ML — Methodological Validation (2026-04-04)

## Purpose

Validate methodological claims for threshold selection in clinical ML screening workflows, with explicit focus on:

1. Youden’s J index
2. G-Mean
3. Screening-optimized sensitivity-constrained thresholds
4. Out-of-fold (OOF) threshold tuning vs test-set tuning (leakage)
5. Clinical guideline and reporting expectations for screening vs diagnostic contexts

This synthesis is based on sources logged in:

- `docs/07-research/external-sources/threshold-selection-medical-ml-sources-2026-04-04.md`

---

## A. Youden’s J Index (Sensitivity + Specificity − 1)

### Is it the standard for optimal cutoff selection?

**Validated conclusion:** Youden’s J is a **widely used classical method** for ROC cut-point selection, but it is **not universally the best standard** across all clinical use cases.

### Why it is widely used

- It is simple, transparent, and prevalence-invariant at the metric definition level.
- It chooses the threshold that maximizes vertical distance from chance line on ROC space (equivalently maximizing Sens + Spec − 1).
- It appears repeatedly in diagnostic methodology reviews and applications.

Primary sources:

- Hassanzad & Hajian-Tilaki 2024 (ROC cut-point review): https://pmc.ncbi.nlm.nih.gov/articles/PMC11000303/
- Ruopp et al. 2008 (Youden estimation and inference): https://pmc.ncbi.nlm.nih.gov/articles/PMC2515362/

### Strengths

- Easy to compute and communicate.
- Provides one reproducible operating point.
- Useful default when false-positive and false-negative harms are considered roughly symmetric.

### Limitations (important for screening)

- Implicitly gives equal importance to sensitivity and specificity, which may be clinically inappropriate for screening.
- Does not explicitly encode downstream harm/benefit, resource constraints, or utility.
- Post hoc optimization can be optimistic if threshold chosen and evaluated on same data split.

Sources:

- Perkins & Schisterman 2006 (inconsistency and weighting implications): https://pmc.ncbi.nlm.nih.gov/articles/PMC1444894/
- Ewald 2006 (post hoc cut-point bias): https://pubmed.ncbi.nlm.nih.gov/16828672/

### Methodological recommendation

- Use Youden’s J as a **baseline candidate**, not as the sole or mandatory criterion.
- In screening contexts with high false-negative cost, evaluate utility-aware or sensitivity-constrained alternatives in parallel.

---

## B. G-Mean (sqrt(Sensitivity × Specificity))

### When is it preferred over Youden’s J?

**Validated conclusion:** G-Mean is often preferred when balanced performance across positive and negative classes is needed under class imbalance, especially to prevent trivial majority-class behavior.

### Mathematical/operational properties

- Multiplicative form penalizes collapse of either sensitivity or specificity more strongly than some additive criteria.
- Encourages balanced classifier behavior across both classes.
- Natural fit for imbalanced-learning settings where one class can dominate naive optimization.

Sources:

- imbalanced-learn metric definition: https://imbalanced-learn.org/stable/references/generated/imblearn.metrics.geometric_mean_score.html
- Luque et al. 2019 (class-imbalance effects on metrics): https://www.sciencedirect.com/science/article/pii/S0031320319300950

### Practical comparison to Youden’s J

- Both are threshold-dependent and prevalence-independent as score definitions.
- J is additive and historically common in clinical ROC reporting.
- G-Mean is often better aligned when class imbalance is a core modeling risk and the goal is non-collapse of either class performance.

### Methodological recommendation

- Include G-Mean among threshold selection candidates for imbalanced screening datasets.
- Report it alongside sensitivity, specificity, and (if clinically relevant) decision-analytic measures.

---

## C. Sensitivity-Constrained Screening Thresholds (e.g., Sens ≥ 0.80)

### Are custom screening-optimized thresholds recognized in clinical ML literature?

**Validated conclusion:** Yes. Sensitivity-constrained thresholding is consistent with screening practice, especially for rule-out/early detection workflows where missing cases is clinically costly.

Evidence/guidance pattern:

- Screening programs commonly prioritize high sensitivity and then confirm positives with follow-up tests.
- Decision-curve/net-benefit frameworks formalize threshold choice as utility tradeoff rather than fixed 0.5 rule.
- National/international guidance examples (TB pathways; high-sensitivity troponin pathways) reflect this principle: screening/rule-out thresholds are designed for safety (high sensitivity), not symmetric error costs.

Sources:

- WHO TB screening module (screening != definitive diagnosis): https://www.ncbi.nlm.nih.gov/books/NBK569339/
- NICE HTG552 recommendations (high-sensitivity rule-out logic): https://www.nice.org.uk/guidance/htg552/chapter/1-Recommendations
- BMJ net benefit: https://www.bmj.com/content/352/bmj.i6
- Decision curve interpretation: https://pmc.ncbi.nlm.nih.gov/articles/PMC6777022/

### Methodological recommendation

- For screening models, define a **pre-specified sensitivity floor** (e.g., ≥0.80, ≥0.90 depending on pathway risk tolerance), then select the highest-specificity threshold satisfying that floor.
- Document rationale as a clinical safety requirement.

---

## D. OOF Threshold Tuning in Inner CV vs Test-Set Tuning (Leakage)

### Is OOF/inner-CV threshold tuning correct to avoid threshold leakage?

**Validated conclusion:** Yes. Tuning thresholds on inner folds/OOF predictions and evaluating only once on untouched outer/test data is the correct anti-leakage pattern.

Why:

- If threshold is chosen on the same data used for final performance reporting, estimates are optimistically biased.
- Nested validation separates model/threshold selection from final evaluation.

Sources:

- Varma & Simon 2006 (selection bias and nested CV): https://pmc.ncbi.nlm.nih.gov/articles/PMC1397873/
- scikit-learn nested CV example: https://scikit-learn.org/stable/auto_examples/model_selection/plot_nested_cross_validation_iris.html
- scikit-learn threshold tuning guide: https://scikit-learn.org/stable/modules/classification_threshold.html
- Ewald 2006 (post hoc threshold bias): https://pubmed.ncbi.nlm.nih.gov/16828672/

### Methodological recommendation

- Use inner-CV OOF probabilities to tune threshold (Youden, G-Mean, sensitivity floor, or utility-based objective).
- Lock threshold before evaluating on outer holdout/test set.
- Report complete separation explicitly in methods.

---

## E. Clinical Guidelines/Standards: Screening vs Diagnostic Thresholds

### What do clinical ML/reporting guidelines emphasize?

**Validated conclusion:** Clinical guidance and reporting standards support context-specific thresholds and require transparent disclosure of how cutoffs were determined.

Key expectations:

1. **Screening thresholds** prioritize sensitivity and safety; positives often require confirmatory testing.
2. **Diagnostic thresholds** may emphasize higher specificity/PPV when intervention harms/costs are higher.
3. **Reporting standards** require explicit statement of cutoffs and whether they were pre-specified or exploratory.

Sources:

- STARD 2015 checklist/explanation:
  - https://www.bmj.com/content/351/bmj.h5527
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC5128957/
- WHO screening guidance context: https://www.ncbi.nlm.nih.gov/books/NBK569339/
- NICE rule-out threshold context: https://www.nice.org.uk/guidance/htg552/chapter/1-Recommendations

### Methodological recommendation

- In manuscripts and technical docs, always specify:
  - target use case (screening vs diagnosis)
  - threshold objective (J, G-Mean, sensitivity floor, net benefit)
  - data split where threshold was tuned
  - whether cutoff was pre-specified or data-driven exploratory

---

## Consolidated Validation of the 5 Required Claims

1. **Youden’s J as “standard”:**
   - **Partially true**: widely used default, but not universally optimal.
2. **G-Mean preference conditions:**
   - **True in imbalance-focused settings**: useful for balanced class performance under skew.
3. **Sensitivity-constrained screening thresholds:**
   - **Recognized and methodologically defensible** for screening/rule-out pathways.
4. **OOF/inner-CV thresholding vs test-set tuning:**
   - **Correct and recommended** to prevent threshold leakage/optimism bias.
5. **Guideline position on screening vs diagnostic thresholding:**
   - **Consistent with context-specific thresholds** and transparent reporting of cutoff derivation.

---

## Source Quality Notes

- Most cited items are peer-reviewed journals, national/international guidance, or official scikit-learn/imbalanced-learn documentation.
- Lower-priority/secondary theory source identified in source log (used cautiously):
  - O’Brien & Ishwaran 2019 PMCID mirror: https://pmc.ncbi.nlm.nih.gov/articles/PMC6370055/

---

## Suggested Next Integration Steps

1. Align `docs/03-ml/methodology.md` threshold section with this evidence synthesis.
2. Add explicit leakage-safe threshold tuning procedure (inner-CV OOF tuning + outer evaluation).
3. Add a reporting checklist snippet (STARD-oriented) for future manuscript updates.
