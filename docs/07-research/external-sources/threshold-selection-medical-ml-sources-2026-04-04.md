# Threshold Selection in Medical Screening ML — Source Log (2026-04-04)

## High-credibility sources used

1. **Hassanzad & Hajian-Tilaki (2024)** — update review of ROC cut-point methods in diagnostics (BMC Medical Research Methodology; peer-reviewed)
   - https://pmc.ncbi.nlm.nih.gov/articles/PMC11000303/

2. **Perkins & Schisterman (2006)** — inconsistency of “optimal” ROC cut-points and implications for misclassification (Am J Epidemiol; peer-reviewed)
   - https://pmc.ncbi.nlm.nih.gov/articles/PMC1444894/

3. **Ruopp et al. (2008)** — Youden Index estimation details and properties (Biometrical Journal; peer-reviewed)
   - https://pmc.ncbi.nlm.nih.gov/articles/PMC2515362/

4. **Ewald (2006)** — post hoc cut-point selection introduces optimistic bias (J Clin Epidemiol; peer-reviewed)
   - https://pubmed.ncbi.nlm.nih.gov/16828672/

5. **scikit-learn User Guide** — threshold tuning and leakage cautions (official library documentation)
   - https://scikit-learn.org/stable/modules/classification_threshold.html

6. **scikit-learn example** — nested vs non-nested CV and optimistic bias in non-nested tuning (official library documentation)
   - https://scikit-learn.org/stable/auto_examples/model_selection/plot_nested_cross_validation_iris.html

7. **Varma & Simon (2006)** — bias when CV is used both for tuning and error estimation; nested CV mitigates (BMC Bioinformatics; peer-reviewed)
   - https://pmc.ncbi.nlm.nih.gov/articles/PMC1397873/

8. **STARD 2015 checklist/explanation** — requires reporting and distinguishing prespecified vs exploratory test cut-offs (BMJ/BMJ Open; reporting guideline)
   - https://www.bmj.com/content/351/bmj.h5527
   - https://pmc.ncbi.nlm.nih.gov/articles/PMC5128957/

9. **WHO TB screening guideline module** — screening tools are not definitive diagnosis; emphasizes high sensitivity targets and confirmatory testing (WHO guideline via NCBI Bookshelf)
   - https://www.ncbi.nlm.nih.gov/books/NBK569339/

10. **NICE guidance (high-sensitivity troponin rule-out)** — threshold strategies for rule-out (LoD / 99th percentile) and serial testing with clinical judgment (national guideline)
    - https://www.nice.org.uk/guidance/htg552/chapter/1-Recommendations

11. **imbalanced-learn metric reference** — formal definition of G-Mean for binary classification as sqrt(sensitivity × specificity) (official library docs)
    - https://imbalanced-learn.org/stable/references/generated/imblearn.metrics.geometric_mean_score.html

12. **Luque et al. (2019)** — impact of class imbalance on confusion-matrix metrics; supports G-Mean robustness framing (Pattern Recognition; peer-reviewed)
    - https://www.sciencedirect.com/science/article/pii/S0031320319300950

13. **Vickers et al. (2016 BMJ) + Vickers et al. (2019 DPR)** — net benefit / decision curve framing for clinically meaningful threshold preferences (peer-reviewed)
    - https://pmc.ncbi.nlm.nih.gov/articles/PMC4724785/
    - https://pmc.ncbi.nlm.nih.gov/articles/PMC6777022/

## Lower-priority/secondary source (used cautiously)

- O’Brien & Ishwaran (2019, Pattern Recognition; PMCID mirror) — q*-classification and class-imbalance thresholding theory.
  Useful mathematically, but not a clinical guideline; treated as secondary support only.
  - https://pmc.ncbi.nlm.nih.gov/articles/PMC6370055/
