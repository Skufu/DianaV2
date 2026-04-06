# Subquery 4 — Weighted K-Means in Metabolic/Diabetes Clustering

**Query:** weighted K-Means clustering metabolic diabetes research feature weights expert elicited biomarker clustering  
**Provider:** Perplexity  
**Date:** 2026-04-04

## Key Findings

### 1) Are papers using weighted K-Means in metabolic/diabetes clustering?
- Yes, but in **diabetes phenotype literature**, explicit weighted K-Means is **less common** than standard (unweighted) K-Means on standardized variables.
- A frequent workflow is:
  1. choose clinically meaningful biomarkers,
  2. standardize (z-score or similar),
  3. reduce redundancy (drop highly correlated variables),
  4. cluster with standard K-Means,
  5. validate clinically and with internal indices.

### 2) How are feature weights determined when used?
Perplexity synthesis indicates four recurring approaches:
- **Domain/expert-driven weighting** (clinician-assigned importance)
- **Feature-selection-as-implicit-weighting** (keep/drop variables)
- **Correlation/redundancy control** (downweight or remove overlapping biomarkers)
- **Optimization-based weighting** (tune to internal objective/criterion; less common in clinical phenotype papers)

### 3) Is expert elicitation (formal Delphi/surveys) common?
- Reported as **uncommon** in diabetes clustering papers.
- Most studies justify feature handling through **clinical rationale + preprocessing choices**, not explicit elicited numeric weights.

### 4) Common weights for BMI, lipids, age?
- No broadly accepted fixed numeric weights were identified.
- Typical practice reported:
  - **BMI:** retained as a core adiposity feature; standardized
  - **Age / age at onset:** retained as major stratification feature; standardized
  - **Lipids:** included as a metabolic domain (often panel/reduced set); redundancy managed among TC/LDL-C/HDL-C/TG
- Bottom line: researchers usually treat these as **core inputs**, not with universal pre-set coefficients.

## Practical Takeaway for Methods Writing

For metabolic/diabetes clustering, a defensible statement is:

> “Rather than assigning ad hoc fixed feature weights, we selected clinically relevant biomarkers, standardized inputs, and reduced redundancy among correlated variables before clustering. If weighted K-Means is used, weight selection should be explicitly justified (expert/domain rationale or optimization criterion) and sensitivity-tested.”

## Cited Source Links (from Perplexity panel)

1. https://pmc.ncbi.nlm.nih.gov/articles/PMC12112067/
2. https://pmc.ncbi.nlm.nih.gov/articles/PMC6711566/
3. https://www.nature.com/articles/s41598-024-71126-7
4. https://pmc.ncbi.nlm.nih.gov/articles/PMC7766625/
5. https://onlinelibrary.wiley.com/doi/full/10.1111/jdi.14328
6. https://pubmed.ncbi.nlm.nih.gov/31692562/
7. https://www.sciencedirect.com/science/article/pii/S2772442522000521
8. https://www.sciencedirect.com/science/article/pii/S0301462226000347
9. https://pdfs.semanticscholar.org/50f1/abdc0c4518c68553d8afa67bcbd83925afb8.pdf
10. https://accentsjournals.org/PaperDirectory/Journal/IJACR/2021/11/1.pdf
11. https://www.nature.com/articles/s41591-025-04105-8
12. https://onlinelibrary.wiley.com/doi/10.1155/2022/3820360
13. https://www.nature.com/articles/s41598-025-28786-w
14. https://pmc.ncbi.nlm.nih.gov/articles/PMC12658501/
15. https://medinform.jmir.org/2025/1/e64479
16. https://www.sciencedirect.com/science/article/pii/S0010482525000708
