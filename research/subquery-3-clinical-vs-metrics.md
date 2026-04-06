# Subquery 3 — Clinical interpretability vs internal validation metrics

- **Query:** clinical interpretability vs internal validation metrics trade-off phenotype clustering diabetes subtypes domain knowledge  
- **Provider:** Perplexity  
- **Date:** 2026-04-04

## Key finding

Across diabetes phenotype-clustering papers, researchers generally treat internal validation metrics (e.g., silhouette, Davies–Bouldin, Calinski–Harabasz) as **screening tools to narrow candidate K**, not as final decision rules. Final K is often chosen using a combined criterion: **clinical interpretability + reproducibility/stability + external outcome relevance**, even when another K is marginally better on one internal index.

## How researchers justify choosing clinically meaningful K

Common justification pattern in the literature:

1. Compute internal metrics across candidate K values (silhouette/DBI/CHI/gap/elbow).
2. Keep a small plausible K range (often neighboring values with similar scores).
3. Select K that produces clinically coherent phenotypes (recognizable subgroup profiles).
4. Support choice with external evidence: replication across cohorts, separation in complications/prognosis/treatment response, and biological plausibility.

In practice, papers justify this as a **trade-off**: a mathematically “best” K may be less useful if clusters are unstable or not clinically actionable.

## Evidence and examples

1. **Ahlqvist et al., 2018 (adult-onset diabetes subtypes)**  
   Widely cited as the template case: K selection is data-driven, then validated through clinically distinct subgroups and downstream complication differences, with replication in external cohorts.  
   - https://pubmed.ncbi.nlm.nih.gov/29503172/  
   - https://www.thelancet.com/article/S2213-8587(18)30051-2/fulltext

2. **Systematic review of diabetes subtype clustering approaches**  
   Highlights that subtype solutions are evaluated not only by statistical metrics, but also by clinical meaning and reproducibility across populations.  
   - https://pmc.ncbi.nlm.nih.gov/articles/PMC7766625/

3. **Prediabetes phenotype clustering (DPP-related work)**  
   Reports scenarios where nearby K values have similarly modest internal metrics; authors choose K that gives clearer clinical profile delineation and better downstream interpretability.  
   - https://www.biorxiv.org/content/10.1101/2024.12.02.626435v1.full-text  
   - https://academic.oup.com/jcem/article/110/11/e3665/8069812

4. **Outcome-guided diabetes risk phenotype studies**  
   Emphasize that cluster utility is judged by outcome separation and clinical usability, not internal index maxima alone.  
   - https://pmc.ncbi.nlm.nih.gov/articles/PMC10593014/  
   - https://pmc.ncbi.nlm.nih.gov/articles/PMC12103260/

5. **Broader clinical clustering context (supporting rationale)**  
   Clinical/EHR data heterogeneity and overlap often make internal metrics disagree or stay modest; studies therefore combine metric-based selection with domain review and stability checks.  
   - https://pmc.ncbi.nlm.nih.gov/articles/PMC9035269/  
   - https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0304036

## Practical takeaway for writeups

Defensible language used in this literature is:

> “Internal validity indices were used to identify plausible cluster counts, but final K was selected based on the best balance of compactness, stability, and clinical interpretability, with external validation by clinically meaningful outcome differences.”

## Source note

Findings were extracted from the Perplexity response and linked source list (18 sources) for this subquery.
