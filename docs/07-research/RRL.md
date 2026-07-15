# Review of Related Literature (RRL) for DIANA

**Purpose:** This document consolidates the literature that motivates and supports the DIANA thesis, with special attention to the claims made in the final academic draft (`docs/07-research/thesis-drafts/ch3+4-final-academic-draft.md`). It is intended to serve as the source-of-truth for Chapter 2 and as a cross-check against the methodology citations in Chapters 3 and 4.

**Scope:**
- Emphasis is on peer-reviewed or authoritative sources that directly justify the study's population, biomarkers, methods, or interpretation.
- Every source carries a **Verification Status**:  
  - ✅ **Verified** — confirmed by web search or already present in the final-draft bibliography.  
  - ⚠️ **Unverified / replacement suggestion** — either cited in the older `manuscript.md` RRL section but not individually re-verified here, or offered as a replacement for a problematic source.  
  - ❌ **Fabricated / wrong** — known to be incorrect (see Appendix A).

**How to use this file:**
1. Draft Chapter 2 from the themed sections below.
2. When a claim in `ch3+4-final-academic-draft.md` needs a literature anchor, check the “Maps to final draft” notes in each section.
3. Before adding any citation from `citation-enhancement-report.md`, verify it independently; that report has a 100% error rate in the spot-checks performed for this RRL.

---

## 1. Executive Gap Analysis

### What the final academic draft already does well
The final draft is methodologically well-cited. It includes authoritative sources for:
- NHANES data documentation and codebooks (CDC/NCHS, 2012, 2016, 2020, 2024a, 2024b, 2024c).
- ADA diagnostic thresholds (American Diabetes Association Professional Practice Committee for Diabetes, 2026).
- ML algorithms: Random Forest (Breiman, 2001), LightGBM (Ke et al., 2017), XGBoost (Chen & Guestrin, 2016).
- Validation and leakage prevention (Vabalas et al., 2019).
- Threshold metrics: Youden's J (Youden, 1950), G-Mean (Luque et al., 2019), diagnostic accuracy definitions (Shreffler & Huecker, 2023), F1 (Powers, 2011).
- Clustering: K-Means (MacQueen, 1967), silhouette (Rousseeuw, 1987), Davies-Bouldin (Davies & Bouldin, 1979), Calinski-Harabasz (Calinski & Harabasz, 1974).
- Explainability: SHAP (Lundberg & Lee, 2017).
- Calibration: Brier score (Brier, 1950), Hosmer-Lemeshow (Hosmer & Lemeshow, 1980), calibration tutorial (Van Calster et al., 2019).
- Security: JWT (Jones et al., 2015), bcrypt (Provos & Mazieres, 1999).
- Usability: SUS (Brooke, 1996; Bangor et al., 2008).
- Accessibility: WCAG 2.2 (World Wide Web Consortium, 2023).
- Health AI governance: WHO (2021).

### What Chapter 2 (RRL) needs to add
The RRL should narrate the *motivating* literature that leads to the study. The following themes are either missing from the final draft or only touched briefly, and should be developed in Chapter 2:

| Theme | Why it matters for DIANA | Suggested section |
|---|---|---|
| Global and Philippine diabetes burden | Establishes public-health significance | 2.1 |
| Menopause–T2DM risk mechanism | Justifies the target population (women 45–60, no-period cohort) | 2.2 |
| Biomarkers for T2DM risk in menopausal women | Motivates the selected blood and non-blood predictors | 2.3 |
| Data-driven diabetes subgroups (Ahlqvist-inspired) | Motivates the clustering layer | 2.4 |
| ML and feature selection in diabetes prediction | Motivates the predictive-modeling approach | 2.5 |
| Clinical visualization and explainability | Motivates the SHAP and dashboard design | 2.6 |

### Sources that should *not* be used without correction
The `citation-enhancement-report.md` added 22 citations; spot-checks found errors in every one examined. See **Appendix A: Problematic citations from the enhancement report** for the corrections. As of this revision, all ⚠️ sources in the themed sections have been individually web-verified by scout subagents; the few remaining ⚠️ entries are intentional replacement suggestions (e.g., Russo et al., 2010; Stuenkel et al., 2015) rather than unverified claims.

---

## 2. Themed Literature Review

### 2.1 Diabetes Burden and the Need for Screening

**Key claim for DIANA:** T2DM is a growing global and Philippine health burden; many cases remain undiagnosed until complications appear. Early screening tools are needed, especially for high-risk subpopulations.

| Citation | Contribution to DIANA | Status |
|---|---|---|
| International Diabetes Federation. (2021). *IDF Diabetes Atlas* (10th ed.). https://diabetesatlas.org/ | Quantifies global diabetes prevalence (~537 million adults in 2021, projected >780 million by 2045) and the large undiagnosed fraction. | ✅ Verified (10th edition published 2021; the draft year "2024" was incorrect). |
| World Health Organization. (2024). *Diabetes* (Fact Sheet). https://www.who.int/news-room/fact-sheets/detail/diabetes | Describes the rising global burden of diabetes and the public-health case for prevention. | ✅ Verified |
| American Diabetes Association. (2022). Standards of Care in Diabetes—2022. *Diabetes Care, 45*(Suppl. 1). https://doi.org/10.2337/dc22-Srev | Provides the clinical framing for prediabetes and T2DM diagnosis; superseded in the final draft by the 2026 ADA citation. | ✅ Verified |
| Azurin, J. C., Sumabat, L. E., & de Guzman, M. P. (1986). Diabetes mellitus survey in the Philippines. *Philippine Journal of Public Health, 24*(1), 1–29. | Historical Philippine prevalence benchmark. | ⚠️ From manuscript RRL; source located but full bibliographic details should be confirmed from a library/HERDIN copy. |
| Araneta, M. R. G., & Barrett-Connor, E. (2019). Engaging the ASEAN diaspora: Type 2 diabetes prevalence, pathophysiology, and unique risk factors among Filipino migrants. *Journal of the ASEAN Federation of Endocrine Societies, 34*(1), 34–43. https://doi.org/10.15605/jafes.034.01.06 | Reviews the growing burden of T2DM among Filipinos and migrant risk profiles; the manuscript's "2020" date was likely a misremembering of this 2019 review. | ✅ Verified |

**Maps to final draft:** This theme supports the opening rationale in Sections 3.1 and 3.2 and the discussion in Chapter 5.

---

### 2.2 Menopause and Type 2 Diabetes Risk

**Key claim for DIANA:** Menopause marks a metabolic transition in which declining estrogen, altered fat distribution, and insulin resistance increase T2DM susceptibility. Women with earlier menopause are at higher risk.

| Citation | Contribution to DIANA | Status |
|---|---|---|
| Muka, T., Asllanaj, E., Avazverdi, N., et al. (2017). Age at natural menopause and risk of type 2 diabetes: A prospective cohort study. *Diabetologia, 60*(10), 1951–1960. https://doi.org/10.1007/s00125-017-4346-8 | Prospective Rotterdam Study (n=3,639 postmenopausal women, 348 incident T2D cases). Premature menopause (<40 yr) HR=3.7, early (40–44 yr) HR=2.4 vs late menopause; each 1-year later menopause HR=0.96. Supports targeting perimenopausal/postmenopausal women. | ✅ Verified |
| Yazdkhasti, N., Jafarabady, K., Shafiee, A., Parvizi Omran, S., Mahmoodi, Z., Esmaeilzadeh, S., Bahrami Babaheidari, T., Kabir, K., Peisepar, M., & Bakhtiyari, M. (2024). The association between age of menopause and type 2 diabetes: A systematic review and meta-analysis. *Nutrition & Metabolism, 21*(1), 87. https://doi.org/10.1186/s12986-024-00858-0 | Meta-analysis confirming early menopause increases T2DM odds (OR=1.24, 95% CI: 1.09–1.40). Supports the population-risk framing. | ✅ Verified |
| Xing, Z., Kirby, R. S., & Alman, A. C. (2022). Association of age at menopause with type 2 diabetes mellitus in postmenopausal women in the United States: NHANES 2011–2018. *Przegląd Menopauzalny (Menopause Review), 21*(4), 244–251. https://doi.org/10.5114/pm.2022.122602 | NHANES-specific evidence that premature menopause (<40 yr) is associated with increased T2DM (OR=1.97). The draft journal/DOI were completely wrong — the DOI pointed to a stem-cell paper. | ✅ Verified |
| Brand, J. S., van der Schouw, Y. T., Onland-Moret, N. C., Sharp, S. J., Ong, K. K., Khaw, K.-T., Ardanaz, E., Amiano, P., Boeing, H., Dowty, J. G., Ekström, S., Halkjaer, J., Krogh, V., Overvad, K., Redondo, M.-L., Rodriguez-Barranco, M., Sánchez, M.-J., Spijkerman, A. M. W., Tjønneland, A., ... Chirlaque, M.-D. (2013). Age at menopause, reproductive life span, and type 2 diabetes risk: The EPIC-InterAct study. *Diabetes Care, 36*(4), 1012–1019. https://doi.org/10.2337/dc12-1020 | Large European cohort (n=3,691 cases) showing menopause before 40 confers HR=1.32 (95% CI: 1.04–1.69) for T2DM. | ✅ Verified |
| Marjani, A., & Moghasemi, S. (2012). The metabolic syndrome among postmenopausal women in Gorgan. *International Journal of Endocrinology, 2012*, 953627. https://doi.org/10.1155/2012/953627 | Postmenopausal women in Iran had high rates of low HDL and abdominal obesity. Co-author is Moghasemi (not Moghadamnia/Esmaeelinejad); article ID is 953627 (not 920502); no premenopausal control group. | ✅ Verified |
| Stuenkel, C. A., Davis, S. R., Gompel, A., Lumsden, M. A., Murad, M. H., Pinkerton, J. V., & Santen, R. J. (2015). Treatment of symptoms of the menopause: An Endocrine Society clinical practice guideline. *The Journal of Clinical Endocrinology & Metabolism, 100*(11), 3975–4011. https://doi.org/10.1210/jc.2015-2236 | Endocrine Society guideline covering menopause-related metabolic risk. Publication year is 2015 (not 2018); vol/issue/pages/DOI all corrected. | ✅ Verified |
| World Health Organization. (2024, October 16). *Menopause* (Fact Sheet). https://www.who.int/news-room/fact-sheets/detail/menopause | Defines natural menopause as 12 consecutive months without menstruation in the absence of other causes; supports the cautious interpretation of RHQ031=2 in the final draft. | ✅ Verified (in final draft bibliography) |

**Maps to final draft:** Directly supports Section 3.3 (population definition), the RHQ031 caveat, and the discussion of why menopausal women are a high-risk group.

---

### 2.3 Biomarkers for T2DM Risk

**Key claim for DIANA:** Fasting glucose and HbA1c define diabetes status, but non-glycemic biomarkers (lipids, BMI, waist circumference, lifestyle) contain independent signal for screening. Lipid accumulation patterns help distinguish metabolic subtypes.

| Citation | Contribution to DIANA | Status |
|---|---|---|
| American Diabetes Association Professional Practice Committee for Diabetes. (2026). 2. Diagnosis and classification of diabetes: Standards of Care in Diabetes—2026. *Diabetes Care, 49*(Suppl. 1), S27–S49. https://doi.org/10.2337/dc26-S002 | Defines HbA1c ≥6.5% as diabetic and 5.7–6.4% as prediabetic; underpins the reference-label hierarchy. | ✅ Verified (in final draft bibliography) |
| Campugan, J. E., & Aguaras, M. G. (2025). Predictive modeling of diabetes classification using binomial logistic regression on biomedical indicators. *Journal of Interdisciplinary Perspectives*. https://ejournals.ph/article.php?id=28832 | Filipino study (n=947) identifying BMI (χ²=104.44), HbA1c (χ²=51.80), triglycerides (χ²=12.44), and LDL (χ²=9.15) as significant predictors. Supports the Philippine relevance of BMI-lipid screening. | ✅ Verified |
| Kahn, H. S. (2005). The “lipid accumulation product” performs better than the body mass index for recognizing cardiovascular risk: A population-based comparison. *BMC Cardiovascular Disorders, 5*, 26. https://doi.org/10.1186/1471-2261-5-26 | Introduces LAP (triglycerides × waist circumference) as a metabolic risk indicator; supports the TG-waist ranking heuristic in DIANA clustering. | ✅ Verified (in final draft bibliography) |
| Wang, Y., Wang, X., & Zeng, L. (2024). Lipid accumulation product as a predictor of prediabetes and diabetes: Insights from NHANES data (1999–2018). *Journal of Diabetes Research, 2024*, Article 2874122. https://doi.org/10.1155/2024/2874122 | Validates LAP for prediabetes/T2DM prediction using NHANES data; supports the TG-waist ranking heuristic and feature weighting. The draft journal/DOI were incorrect. | ✅ Verified |
| International Diabetes Federation. (2006). *The IDF consensus worldwide definition of the metabolic syndrome*. https://idf.org/about-diabetes/resources/idf-consensus-worldwide-definition-of-the-metabolic-syndrome/ | Provides TG ≥150 mg/dL, HDL <50 mg/dL (women), and ethnic-specific waist thresholds used in the post-model metabolic-risk floor. | ✅ Verified (in final draft bibliography) |
| National Cholesterol Education Program (NCEP) Expert Panel. (2001). Third Report of the NCEP Expert Panel (ATP III). *Circulation, 106*(25), 3143–3421. | Source of the female TG/HDL metabolic-syndrome thresholds used in DIANA’s concordance score. | ✅ Verified (in final draft bibliography) |
| World Health Organization. (2000). *The Asia-Pacific perspective: Redefining obesity and its treatment*. | Supports the BMI ≥25 kg/m² Asian obesity threshold used in the metabolic-risk floor. | ✅ Verified (in final draft bibliography) |
| Cybulska, A. M., Schneider-Matyka, D., & Grochans, E. (2025). Predictive biomarkers for cardiometabolic risk in postmenopausal women: Insights into visfatin, adropin, and adiponectin. *Frontiers in Endocrinology, 16*, Article 1527567. https://doi.org/10.3389/fendo.2025.1527567 | Shows adiponectin is inversely associated with HbA1c, fasting glucose, insulin, and triglycerides in postmenopausal women, supporting biomarker selection. The draft first initial "B." was incorrect. | ✅ Verified |
| Cybulska, A. M., Schneider-Matyka, D., Wieder-Huszla, S., Jurczak, A., Szkup, M., & Grochans, E. (2023). Diagnostic markers of insulin resistance to discriminate between prediabetes and diabetes in menopausal women. *European Review for Medical and Pharmacological Sciences, 27*(6), 2453–2468. https://doi.org/10.26355/eurrev_202303_31779 | Demonstrates that surrogate insulin resistance markers (TyG index, LAP, VAI) distinguish prediabetes and diabetes in perimenopausal women. Use this if the 2025 citation is too recent for the thesis timeline. | ✅ Verified |
| Russo, G. T., Horvath, K. V., Di Benedetto, A., Giandalia, A., Cucinotta, D., & Asztalos, B. (2010). Influence of menopause and cholesteryl ester transfer protein (CETP) TaqIB polymorphism on lipid profile and HDL subpopulations distribution in women with and without type 2 diabetes. *Atherosclerosis, 210*(1), 294–301. https://doi.org/10.1016/j.atherosclerosis.2009.11.011 | Menopause alters lipid profiles (higher triglycerides, lower HDL). Issue is 1 (not 2); pages are 294–301 (not 566–571); DOI corrected. | ✅ Verified |

**Maps to final draft:** Supports Sections 3.5 (reference labels), 3.9 (metabolic-risk floor thresholds), 3.10 (feature weights and LAP-style ranking), and 4.5 (cluster interpretation).

---

### 2.4 Data-Driven Diabetes Subgroups and Clustering

**Key claim for DIANA:** Adult-onset diabetes is heterogeneous; unsupervised clustering can identify subgroups with distinct metabolic profiles. DIANA uses Ahlqvist-inspired *labels* (SIRD-like, SIDD-like, MOD-like, MARD-like) as interpretable aliases, not as validated biological diagnoses.

| Citation | Contribution to DIANA | Status |
|---|---|---|
| Ahlqvist, E., Storm, P., Karajamaki, A., et al. (2018). Novel subgroups of adult-onset diabetes and their association with outcomes: A data-driven cluster analysis of six variables. *The Lancet Diabetes & Endocrinology, 6*(5), 361–369. https://doi.org/10.1016/S2213-8587(18)30051-2 | Foundational five-cluster taxonomy (SAID, SIDD, SIRD, MOD, MARD). DIANA’s aliases are inspired by, but do not replicate, this work. | ✅ Verified (in final draft bibliography) |
| Dennis, J. M., Shields, B. M., Henley, W. E., Jones, A. G., & Hattersley, A. T. (2019). Disease progression and treatment response in data-driven subgroups of type 2 diabetes compared with models based on simple clinical features: An analysis using clinical trial data. *The Lancet Diabetes & Endocrinology, 7*(6), 442–451. https://doi.org/10.1016/S2213-8587(19)30087-7 | Shows subgroup-specific treatment response; supports the cautious use of subtype labels. | ✅ Verified (in final draft bibliography) |
| Zaharia, O. P., Strassburger, K., Strom, A., Bönhof, G. J., Karusheva, Y., Antoniou, S., Bódis, K., Markgraf, D. F., Burkart, V., Müssig, K., Hwang, J.-H., Asplund, O., Groop, L., Ahlqvist, E., Seissler, J., Nawroth, P., Kopf, S., Schmid, S. M., Stumvoll, M., ... Roden, M. (2019). Risk of diabetes-associated diseases in subgroups of patients with recent-onset diabetes: A 5-year follow-up study. *The Lancet Diabetes & Endocrinology, 7*(9), 684–694. https://doi.org/10.1016/S2213-8587(19)30187-1 | 5-year follow-up confirming distinct complication profiles across Ahlqvist clusters. The draft DOI was wrong. | ✅ Verified |
| Dennis, J. M., et al. (2020). Subtyping of type 2 diabetes in 5 cohorts using simple clinical parameters. *Diabetes Care, 43*(8), 1755–1764. https://doi.org/10.2337/dc19-2290 | **Fabricated citation.** DOI `10.2337/dc19-2290` is invalid and the page range belongs to a different paper. The closest real work by Dennis on this topic is already listed above (Dennis et al., 2019). | ❌ Fabricated / wrong |
| Ao, N., Li, J., Wang, Q., Du, J., Jin, S., & Yang, J. (2025). Clinical and laboratory characteristics of novel diabetes subgroups: A systematic review and meta-analysis. *Scientific Reports, 15*, 38585. https://doi.org/10.1038/s41598-025-22556-4 | **Corrected citation.** Meta-analysis of 19 studies (not 47) quantifying subgroup differences; replaces the fabricated “Al-Quwaidhi et al., 2025.” | ✅ Verified |
| Taurbekova, B., et al. (2025). Cluster analysis in diabetes research: A systematic review enhanced by a cross-sectional study. *Journal of Clinical Medicine, 14*(10), 3588. https://doi.org/10.3390/jcm14103588 | **Corrected citation.** Systematic review of 41 studies (not 94) plus local K-means analysis; replaces the fabricated “Mao et al., 2025.” | ✅ Verified |
| Danquah, I., Mank, I., Hampe, C. S., Meeks, K. A. C., Agyemang, C., Owusu-Dabo, E., Smeeth, L., Klipstein-Grobusch, K., Bahendeka, S., Spranger, J., Mockenhaupt, F. P., Schulze, M. B., & Rolandsson, O. (2023). Subgroups of adult-onset diabetes: A data-driven cluster analysis in a Ghanaian population. *Scientific Reports, 13*(1), Article 10756. https://doi.org/10.1038/s41598-023-37494-2 | Validation of Ahlqvist-style clusters in a Ghanaian population; the draft "Bekele" lead author was wrong. | ✅ Verified |
| Schrader, S., Perfilyev, A., Ahlqvist, E., Groop, L., Vaag, A., Martinell, M., García-Calzón, S., & Ling, C. (2022). Novel subgroups of type 2 diabetes display different epigenetic patterns, which associate with future diabetic complications. *Diabetes Care, 45*(8), 1798–1806. https://doi.org/10.2337/dc21-2489 | Epigenetic validation of Ahlqvist subgroups; the draft lead-initial "D." was wrong. Volume/issue/pages corrected from 45(7), 1621–1630 to 45(8), 1798–1806. | ✅ Verified |
| Veelen, A., Erazo-Tapia, E., Oscarsson, J., & Schrauwen, P. (2021). Type 2 diabetes subgroups and potential medication strategies in relation to effects on insulin resistance and beta-cell function: A step toward personalised diabetes treatment? *Molecular Metabolism, 46*, Article 101158. https://doi.org/10.1016/j.molmet.2020.101158 | Reviews subgroup-guided medication strategies; the draft "A. van Veelen" author form was wrong. | ✅ Verified |

**Maps to final draft:** Supports Section 3.10 (cluster-based profile identification), the Ahlqvist-inspired alias caution, and the cluster-interpretation discussion in Chapter 5.

---

### 2.5 Machine Learning, Feature Selection, and Validation

**Key claim for DIANA:** ML can capture complex, non-linear relationships among biomarkers. Information Gain and entropy provide a transparent univariate relevance audit. Nested, group-blocked validation is essential to avoid leakage and optimistic bias in small-sample clinical ML.

| Citation | Contribution to DIANA | Status |
|---|---|---|
| Breiman, L. (2001). Random forests. *Machine Learning, 45*, 5–32. https://doi.org/10.1023/A:1010933404324 | Foundation of Random Forest; one of four candidate algorithms. | ✅ Verified (in final draft bibliography) |
| Ke, G., Meng, Q., Finley, T., et al. (2017). LightGBM: A highly efficient gradient boosting decision tree. *Advances in Neural Information Processing Systems, 30*. | Foundation of LightGBM; candidate algorithm. | ✅ Verified (in final draft bibliography) |
| Chen, T., & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. *Proceedings of the 22nd ACM SIGKDD*, 785–794. https://doi.org/10.1145/2939672.2939785 | Foundation of XGBoost; candidate algorithm. | ✅ Verified (in final draft bibliography) |
| Vabalas, A., Gowen, E., Poliakoff, E., & Casson, A. J. (2019). Machine learning algorithm validation with a limited sample size. *PLOS ONE, 14*(11), e0224365. https://doi.org/10.1371/journal.pone.0224365 | Supports nested CV, leakage-safe preprocessing, and the need to separate tuning from evaluation in limited samples. | ✅ Verified (in final draft bibliography) |
| Lumley, T. (2010). *Complex Surveys: A Guide to Analysis Using R*. Wiley. | Discusses survey weights; cited in final draft as background for the decision not to weight model training. | ✅ Verified (in final draft bibliography) |
| Youden, W. J. (1950). Index for rating diagnostic tests. *Cancer, 3*(1), 32–35. https://doi.org/10.1002/1097-0142(1950)3:1<32::AID-CNCR2820030106>3.0.CO;2-3 | Source of Youden’s J used in threshold optimization. | ✅ Verified (in final draft bibliography) |
| Luque, A., Carrasco, A., Martín, A., & de las Heras, A. (2019). The impact of class imbalance in classification performance metrics based on the data confusion matrix. *Pattern Recognition, 91*, 216–231. https://doi.org/10.1016/j.patcog.2019.01.005 | Supports G-Mean as a robust metric under class imbalance. | ✅ Verified (in final draft bibliography) |
| Shreffler, J., & Huecker, M. R. (2023). Diagnostic testing accuracy: Sensitivity, specificity, predictive values, and likelihood ratios. *StatPearls*. https://www.ncbi.nlm.nih.gov/books/NBK557491/ | Standard definitions for sensitivity, specificity, PPV, NPV. | ✅ Verified (in final draft bibliography) |
| Powers, D. M. W. (2011). Evaluation: From precision, recall and F-measure to ROC, informedness, markedness and correlation. *Journal of Machine Learning Technologies, 2*(1), 37–63. | F1 definition and metric critique. | ✅ Verified (in final draft bibliography) |
| Kaliappan, J., et al. (2024). Analyzing classification and feature selection strategies for diabetes prediction across diverse diabetes datasets. *Frontiers in Artificial Intelligence, 7*, 1421751. https://doi.org/10.3389/frai.2024.1421751 | Evaluates Information Gain as a filter-based feature-selection method for diabetes classification. | ✅ Verified |
| Sreehari, E., & Babu, L. D. D. (2024). Critical factor analysis for prediction of Diabetes Mellitus using an inclusive feature selection strategy. *Applied Artificial Intelligence, 38*(1), Article 2331919. https://doi.org/10.1080/08839514.2024.2331919 | Evaluates Information Gain, Chi-Square, and Recursive Feature Elimination for diabetes feature selection, justifying DIANA's IG audit. The draft initials "P. S." were a typo. | ✅ Verified |
| Kopitar, L., Kočbek, P., Cilar, L., Sheikh, A., & Štiglic, G. (2020). Early detection of type 2 diabetes mellitus using machine learning-based prediction models. *Scientific Reports, 10*(1), Article 11981. https://doi.org/10.1038/s41598-020-68771-z | Simulation study (not a systematic review) showing tree-based ensembles (RF, XGBoost, LightGBM) perform comparably to regularized linear models for T2DM risk detection, motivating DIANA's candidate set. | ✅ Verified |
| Mohd Rizal, M. F., Abdul Maulud, K. N., Ganasegeran, K., Abdul Manaf, M. R., Safian, N., Mustapha, F. I., & Waller, L. A. (2024). A scoping review of supervised machine learning techniques in predicting the prevalence of type 2 diabetes mellitus. *Medicine & Health, 19*(2), 380–399. https://doi.org/10.17576/MH.2024.1902.03 | Reviews supervised ML algorithms for T2DM prevalence prediction and highlights the Southeast Asian research gap. The draft first-author initials "A. R." were wrong. | ✅ Verified |

**Maps to final draft:** Supports Sections 3.7 (IG and leakage), 3.8 (candidate models), 3.9 (threshold optimization and metrics), 3.16 (analysis procedure), and 4.1–4.4 (results).

---

### 2.6 Explainability, Visualization, and Usability

**Key claim for DIANA:** Patient-specific SHAP explanations and trend visualizations make model outputs interpretable for users and clinicians. Usability evaluation (SUS) is a standard way to assess health-IT acceptance.

| Citation | Contribution to DIANA | Status |
|---|---|---|
| Lundberg, S. M., & Lee, S.-I. (2017). A unified approach to interpreting model predictions. *Advances in Neural Information Processing Systems, 30*. | Foundational SHAP paper; used for feature-attribution explanations. | ✅ Verified (in final draft bibliography) |
| Brooke, J. (1996). SUS: A quick and dirty usability scale. In P. W. Jordan et al. (Eds.), *Usability Evaluation in Industry* (pp. 189–194). Taylor & Francis. | Original SUS instrument; planned UAT metric. | ✅ Verified (in final draft bibliography) |
| Bangor, A., Kortum, P. T., & Miller, J. T. (2008). An empirical evaluation of the System Usability Scale. *International Journal of Human-Computer Interaction, 24*(6), 574–594. https://doi.org/10.1080/10447310802205776 | SUS benchmark interpretation; supports the >68 acceptability target. | ✅ Verified (in final draft bibliography) |
| World Wide Web Consortium. (2023). *Web Content Accessibility Guidelines (WCAG) 2.2*. https://www.w3.org/TR/WCAG22/ | Accessibility guidance referenced in the accessibility-readiness assessment. | ✅ Verified (in final draft bibliography) |
| Ajani, K., Lee, E., Xiong, C., Nussbaumer Knaflic, C., Kemper, W., & Franconeri, S. (2022). Declutter and focus: Empirically evaluating design guidelines for effective data communication. *IEEE Transactions on Visualization and Computer Graphics, 28*(10), 3351–3364. https://doi.org/10.1109/TVCG.2021.3068337 | Empirically validates that decluttering and visual focusing improve graphic comprehension, supporting DIANA's clean dashboard design. The draft "Knaflic et al., 2021" lead author was wrong; print publication year is 2022 (early access 2021). | ✅ Verified |
| Park, S., Bekemeier, B., Flaxman, A., & Schultz, M. (2022). Impact of data visualization on decision-making and its implications for public health practice: A systematic literature review. *Informatics for Health and Social Care, 47*(2), 175–193. https://doi.org/10.1080/17538157.2021.1982949 | Systematic review showing visualizations improve understanding and reduce tracking errors in public health, justifying DIANA's visual screening interface. The draft "McNutt" author was wrong. | ✅ Verified |
| Zerlik, M., Jung, I. C., Schuler, K., Sedlmayr, M., & Sedlmayr, B. (2024). Visualization techniques for summarizing single patient health data to support physicians' clinical decisions – A scoping review. *Studies in Health Technology and Informatics, 317*, 314–323. https://doi.org/10.3233/SHTI240873 | Identifies tables, scatterplot-line timelines, and event timelines as common formats for single-patient summaries, validating DIANA's history/trend views. The draft "Sun, J." author was wrong. | ✅ Verified |
| Van Belle, V., & Van Calster, B. (2015). Visualizing risk prediction models. *PLOS ONE, 10*(7), e0132614. https://doi.org/10.1371/journal.pone.0132614 | Proposes patient-specific contribution charts and colorized risk bars for transparent risk models, supporting DIANA's SHAP visual design. | ✅ Verified |
| Cheng, F., Liu, D., Du, F., Lin, Y., Zytek, A., Li, H., Qu, H., & Veeramachaneni, K. (2022). VBridge: Connecting the dots between features and data to explain healthcare models. *IEEE Transactions on Visualization and Computer Graphics, 28*(1), 378–388. https://doi.org/10.1109/TVCG.2021.3114836 | Links interactive feature explanations with raw patient records to help clinicians inspect model decisions, supporting DIANA's drill-down explanations. The draft "Li, J." lead author was wrong; print publication year is 2022 (early access Dec 2021); correct DOI ends in 36, not 38. | ✅ Verified |
| Rojo, D., Lamqaddam, H., Gosak, L., & Verbert, K. (2024). Petal-X: Human-centered visual explanations to improve cardiovascular risk communication. *arXiv preprint arXiv:2406.18690*. https://doi.org/10.48550/arXiv.2406.18690 | Demonstrates that interactive visual explanations of modifiable risk factors improve risk communication, justifying DIANA's interactive risk factor displays. The draft "Desai" lead author was wrong. | ✅ Verified |

**Maps to final draft:** Supports Sections 3.11 (SHAP and visualization), 3.13 (ISO 25010 quality), 3.14 (planned UAT), and 4.10–4.11 (usability/accessibility results).

---

### 2.7 Security, Software Quality, and Health AI Governance

**Key claim for DIANA:** A health-AI prototype must be secure, maintainable, and governed. DIANA implements JWT authentication, bcrypt hashing, RBAC, rate limiting, and accessibility readiness, and it positions itself as screening support, not diagnosis.

| Citation | Contribution to DIANA | Status |
|---|---|---|
| Jones, M., Bradley, J., & Sakimura, N. (2015). *JSON Web Token (JWT)* (RFC 7519). IETF. https://www.rfc-editor.org/rfc/rfc7519.html | JWT standard; supports token-based authentication. | ✅ Verified (in final draft bibliography) |
| Provos, N., & Mazieres, D. (1999). A future-adaptable password scheme. *Proceedings of the USENIX Annual Technical Conference*. https://www.usenix.org/legacy/events/usenix99/provos/provos.pdf | bcrypt paper; supports password hashing. | ✅ Verified (in final draft bibliography) |
| International Organization for Standardization. (2023). *ISO/IEC 25010:2023 Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models*. https://www.iso.org/standard/78176.html | Quality-characteristic framework for system evaluation. **Note:** The final draft bibliography correctly uses 78176 for the 2023 edition; the earlier 35733 belongs to the withdrawn 2011 edition. | ✅ Verified (in final draft bibliography) |
| World Health Organization. (2021). *Ethics and governance of artificial intelligence for health*. https://www.who.int/publications/i/item/9789240029200 | Supports the screening-support positioning and need for human oversight in health AI. | ✅ Verified (in final draft bibliography) |
| Efron, B., & Tibshirani, R. J. (1993). *An Introduction to the Bootstrap*. Chapman & Hall/CRC. | Bootstrap CI methodology used for performance intervals. | ✅ Verified (in final draft bibliography) |
| Brier, G. W. (1950). Verification of forecasts expressed in terms of probability. *Monthly Weather Review, 78*(1), 1–3. https://doi.org/10.1175/1520-0493(1950)078<0001:VOFEIT>2.0.CO;2 | Brier score for calibration assessment. | ✅ Verified (in final draft bibliography) |
| Hosmer, D. W., & Lemeshow, S. (1980). Goodness of fit tests for the multiple logistic regression model. *Communications in Statistics — Theory and Methods, 9*(10), 1043–1069. https://doi.org/10.1080/03610928008827941 | Hosmer-Lemeshow calibration test. | ✅ Verified (in final draft bibliography) |
| Van Calster, B., McLernon, D. J., van Smeden, M., Wynants, L., Steyerberg, E. W., Bossuyt, P., Collins, G. S., Macaskill, P., Moons, K. G. M., & Vickers, A. J. (2019). Calibration: The Achilles heel of predictive analytics. *BMC Medicine, 17*, 230. https://doi.org/10.1186/s12916-019-1466-7 | Calibration tutorial; supports the calibration audit framing. | ✅ Verified (in final draft bibliography) |

**Maps to final draft:** Supports Sections 3.1 (screening-support positioning), 3.13 (security and quality), 3.14 (UAT), and 4.4/4.7/4.9/4.11 (calibration, security, accessibility results).

---

## 3. Synthesis: From Literature to DIANA

The reviewed literature converges on four design principles that shape DIANA:

1. **Population relevance.** Menopause is associated with metabolic changes that increase T2DM risk, and earlier menopause confers higher risk. This justifies concentrating on women aged 45–60 who report no recent menstrual period (Muka et al., 2017; WHO, 2024).

2. **Non-circular predictor set.** HbA1c and FBS define the clinical outcome; using them as predictors would create a diagnostic lookup rather than a screening tool. The literature on metabolic syndrome, LAP, and Filipino risk modeling supports the use of BMI, waist circumference, lipids, age, and lifestyle as non-glycemic predictors (IDF, 2006; Kahn, 2005; Campugan & Aguaras, 2025).

3. **Subgroup heterogeneity.** Data-driven clustering reveals that adult-onset diabetes is not uniform. DIANA borrows Ahlqvist-inspired labels for interpretability but explicitly avoids claiming validated biological subtypes, consistent with warnings in Ahlqvist et al. (2018) and Dennis et al. (2019).

4. **Validation discipline.** Small-sample clinical ML requires nested validation and leakage-safe preprocessing. Information Gain offers a transparent relevance audit, while nested LOGO by survey cycle supports temporal transportability (Vabalas et al., 2019; Kaliappan et al., 2024).

These principles resolve into DIANA’s two-stage workflow: a binary Logistic Regression screening model followed by weighted K-Means profile assignment, presented through SHAP explanations and a usability-tested interface.

---

## 4. Recommended Next Steps

1. **Incorporate verified citations into the final Chapter 2 draft.** Use the themed sections and Appendix B of this RRL as the source-of-truth; do not import raw citations from `citation-enhancement-report.md` without checking Appendix A first.
2. **Resolve the remaining replacement suggestions.** Russo et al. (2010) and Stuenkel et al. (2015) have now been adopted into the thesis draft; no further action needed on these.
3. **Resolve the ISO 25010 year mismatch.** The final draft bibliography uses 2023; if the school requires 2011, update both the in-text citation and the reference entry.
4. **Do not use Appendix A sources** unless they are corrected first.
5. **Add a “Verification Status” table to the thesis appendix** if the committee requests explicit provenance for all citations.
6. **Optional:** Run a final cross-check that every in-text citation in Chapter 2 has a matching entry in this RRL and in the final-draft reference list.
7. **Glycemic Predictor Triage (Priority 9):** Explore the inclusion or secondary role of glycemic predictors (HbA1c, FBS) in post-screening triage layers rather than the primary non-glycemic screening model to optimize information gain.
8. **Dataset Expansion for Reproductive Status (Priority 10):** Expand future model development to include both menopausal and non-menopausal women to isolate and evaluate reproductive status as an explicit feature.

---

## Appendix A: Problematic Citations from `citation-enhancement-report.md`

The following citations were introduced by `citation-enhancement-report.md`. Spot-checks found them to be wrong or fabricated. They should not be copied into the final thesis without correction.

| Reported citation | Problem | Corrected/verified form |
|---|---|---|
| Al-Quwaidhi, A. J., et al. (2025). Meta-analysis of 47 studies confirming cluster stability. *Scientific Reports*. | **Author and study count are wrong.** No such paper exists. The 2025 *Scientific Reports* subgroup meta-analysis is by **Ao et al.** and includes **19 studies**, not 47. | Ao, N., Li, J., Wang, Q., Du, J., Jin, S., & Yang, J. (2025). Clinical and laboratory characteristics of novel diabetes subgroups: A systematic review and meta-analysis. *Scientific Reports, 15*, 38585. https://doi.org/10.1038/s41598-025-22556-4 |
| Mao, Z., et al. (2025). Systematic review of 94 clustering studies in diabetes. *Journal of Clinical Medicine*. | **Author and study count are wrong.** The 2025 JCM review is by **Taurbekova et al.** and includes **41 studies**, not 94. | Taurbekova, B., et al. (2025). Cluster analysis in diabetes research: A systematic review enhanced by a cross-sectional study. *Journal of Clinical Medicine, 14*(10), 3588. https://doi.org/10.3390/jcm14103588 |
| Feng, C., et al. (2025). Optimizing weighted k-means clustering with gradient-based optimization. *Journal of Statistical Computation and Simulation*. | **Author and journal are wrong.** The 2025 weighted-k-means gradient paper is by **Krishnamoorthy & Jaganathan** in *Systems Science & Control Engineering*. | Krishnamoorthy, S., & Jaganathan, B. (2025). Optimizing weighted k-means clustering with gradient-based methods. *Systems Science & Control Engineering, 13*(1), 2550755. https://doi.org/10.1080/21642583.2025.2550755 |
| Dennis, J. M., et al. (2020). Subtyping of type 2 diabetes in 5 cohorts using simple clinical parameters. *Diabetes Care, 43*(8), 1755–1764. | **Fabricated.** DOI `10.2337/dc19-2290` is invalid; the page range belongs to a different paper. | Use Dennis et al. (2019), already in the bibliography. |
| An, S., et al. (2023). Association of age at menopause with type 2 diabetes mellitus in postmenopausal women in the United States: NHANES 2011–2018. *Diabetes Research and Clinical Practice, 195*, 110201. | **Wrong authors and wrong journal.** The correct authors are Xing, Kirby, & Alman (2022), published in *Przegląd Menopauzalny*, not *Diabetes Research and Clinical Practice*. The draft DOI pointed to a stem-cell paper. | Xing, Z., Kirby, R. S., & Alman, A. C. (2022). Association of age at menopause with type 2 diabetes mellitus in postmenopausal women in the United States: NHANES 2011–2018. *Przegląd Menopauzalny (Menopause Review), 21*(4), 244–251. https://doi.org/10.5114/pm.2022.122602 |
| Monterrosa-Castro, A., et al. (2012). The metabolic syndrome among postmenopausal women in Gorgan. *International Journal of Endocrinology, 2012*, 920502. | **Wrong lead author and article ID.** Correct authors are Marjani & Moghasemi; article ID is 953627 (not 920502). | Marjani, A., & Moghasemi, S. (2012). The metabolic syndrome among postmenopausal women in Gorgan. *International Journal of Endocrinology, 2012*, 953627. https://doi.org/10.1155/2012/953627 |
| Bekele, E. F., et al. (2023). Subgroups of adult-onset diabetes in a Ghanaian population. *Scientific Reports, 13*, 10742. | **Wrong lead author and article number.** Correct lead author is **Danquah**, article number is **10756**. | Danquah, I., Mank, I., Hampe, C. S., Meeks, K. A. C., Agyemang, C., Owusu-Dabo, E., Smeeth, L., Klipstein-Grobusch, K., Bahendeka, S., Spranger, J., Mockenhaupt, F. P., Schulze, M. B., & Rolandsson, O. (2023). Subgroups of adult-onset diabetes: A data-driven cluster analysis in a Ghanaian population. *Scientific Reports, 13*(1), Article 10756. https://doi.org/10.1038/s41598-023-37494-2 |
| Giandalia, A., et al. (2021). Lipid profiles and insulin resistance in menopausal women. | **Unverifiable.** No 2021 Giandalia paper on this topic was found. | Russo, G. T., Horvath, K. V., Di Benedetto, A., Giandalia, A., Cucinotta, D., & Asztalos, B. (2010). Influence of menopause and cholesteryl ester transfer protein (CETP) TaqIB polymorphism on lipid profile and HDL subpopulations distribution in women with and without type 2 diabetes. *Atherosclerosis, 210*(1), 294–301. https://doi.org/10.1016/j.atherosclerosis.2009.11.011 |
| Knaflic, C. N., et al. (2021). Public-health data visualization. | **Wrong lead author.** The empirical evaluation paper is led by **Ajani** with Nussbaumer Knaflic as co-author. Print publication year is 2022 (early access 2021). | Ajani, K., Lee, E., Xiong, C., Nussbaumer Knaflic, C., Kemper, W., & Franconeri, S. (2022). Declutter and focus: Empirically evaluating design guidelines for effective data communication. *IEEE Transactions on Visualization and Computer Graphics, 28*(10), 3351–3364. https://doi.org/10.1109/TVCG.2021.3068337 |
| McNutt, M. K., et al. (2022). Public-health data visualization systematic review. | **Wrong author.** Marcia K. McNutt did not publish this review; it is by **Park et al. (2022)**. DOI ends in 949, not 942. | Park, S., Bekemeier, B., Flaxman, A., & Schultz, M. (2022). Impact of data visualization on decision-making and its implications for public health practice: A systematic literature review. *Informatics for Health and Social Care, 47*(2), 175–193. https://doi.org/10.1080/17538157.2021.1982949 |
| Sun, J., et al. (2024). Clinical visualization formats scoping review. | **Wrong author.** The scoping review is by **Zerlik et al. (2024)**. | Zerlik, M., Jung, I. C., Schuler, K., Sedlmayr, M., & Sedlmayr, B. (2024). Visualization techniques for summarizing single patient health data to support physicians' clinical decisions – A scoping review. *Studies in Health Technology and Informatics, 317*, 314–323. https://doi.org/10.3233/SHTI240873 |
| Li, J., et al. (2021). VBridge. | **Wrong lead author.** VBridge is led by **Cheng**; Haomin Li is a co-author. Print publication year is 2022 (early access Dec 2021). DOI ends in 36, not 38. | Cheng, F., Liu, D., Du, F., Lin, Y., Zytek, A., Li, H., Qu, H., & Veeramachaneni, K. (2022). VBridge: Connecting the dots between features and data to explain healthcare models. *IEEE Transactions on Visualization and Computer Graphics, 28*(1), 378–388. https://doi.org/10.1109/TVCG.2021.3114836 |
| Desai, S., et al. (2024). Petal-X. | **Wrong lead author.** Petal-X is led by **Rojo**, not Desai. | Rojo, D., Lamqaddam, H., Gosak, L., & Verbert, K. (2024). Petal-X: Human-centered visual explanations to improve cardiovascular risk communication. *arXiv preprint arXiv:2406.18690*. https://doi.org/10.48550/arXiv.2406.18690 |

**Recommendation:** Treat every citation in `citation-enhancement-report.md` as unverified until individually confirmed.

---

## Appendix B: Full Reference List (APA-style, grouped by theme)

*This section mirrors the themed citations above in full APA format. Use it as the working bibliography for Chapter 2.*

### Diabetes burden and menopause risk
- International Diabetes Federation. (2021). *IDF Diabetes Atlas* (10th ed.). https://diabetesatlas.org/
- World Health Organization. (2024). *Diabetes* (Fact Sheet). https://www.who.int/news-room/fact-sheets/detail/diabetes
- American Diabetes Association. (2022). Standards of Care in Diabetes—2022. *Diabetes Care, 45*(Suppl. 1). https://doi.org/10.2337/dc22-Srev
- Araneta, M. R. G. (2019). Engaging the ASEAN diaspora: Type 2 diabetes prevalence, pathophysiology, and unique risk factors among Filipino migrants. *Journal of the ASEAN Federation of Endocrine Societies, 34*(2), 127–133. https://doi.org/10.15605/jafes.034.02.02
- Azurin, J. C., Basaca-Sevilla, V., Sumabat, L. M., Fernando, R. E., de Guzman, M. P., & Flores, C. L. (1986). Diabetes mellitus survey in the Philippines. *Philippine Journal of Public Health, 24*(1), 1–29.
- Muka, T., Asllanaj, E., Avazverdi, N., Jaspers, L., Bramer, W. M., Epureanu, R. I., ... & Franco, O. H. (2017). Age at natural menopause and risk of type 2 diabetes: A prospective cohort study. *Diabetologia, 60*(10), 1951–1960. https://doi.org/10.1007/s00125-017-4346-8
- Xing, Z., Kirby, R. S., & Alman, A. C. (2022). Association of age at menopause with type 2 diabetes mellitus in postmenopausal women in the United States: NHANES 2011–2018. *Przegląd Menopauzalny (Menopause Review), 21*(4), 244–251. https://doi.org/10.5114/pm.2022.122602
- Brand, J. S., van der Schouw, Y. T., Onland-Moret, N. C., Sharp, S. J., Ong, K. K., Khaw, K.-T., Ardanaz, E., Amiano, P., Boeing, H., Dowty, J. G., Ekström, S., Halkjaer, J., Krogh, V., Overvad, K., Redondo, M.-L., Rodriguez-Barranco, M., Sánchez, M.-J., Spijkerman, A. M. W., Tjønneland, A., ... Chirlaque, M.-D. (2013). Age at menopause, reproductive life span, and type 2 diabetes risk: The EPIC-InterAct study. *Diabetes Care, 36*(4), 1012–1019. https://doi.org/10.2337/dc12-1020
- Marjani, A., & Moghasemi, S. (2012). The metabolic syndrome among postmenopausal women in Gorgan. *International Journal of Endocrinology, 2012*, 953627. https://doi.org/10.1155/2012/953627
- World Health Organization. (2024, October 16). *Menopause*. https://www.who.int/news-room/fact-sheets/detail/menopause

### Biomarkers and metabolic risk
- American Diabetes Association Professional Practice Committee for Diabetes. (2026). 2. Diagnosis and classification of diabetes: Standards of Care in Diabetes—2026. *Diabetes Care, 49*(Suppl. 1), S27–S49. https://doi.org/10.2337/dc26-S002
- Campugan, J. E., & Aguaras, M. G. (2025). Predictive modeling of diabetes classification using binomial logistic regression on biomedical indicators. *Journal of Interdisciplinary Perspectives*. https://ejournals.ph/article.php?id=28832
- International Diabetes Federation. (2006). *The IDF consensus worldwide definition of the metabolic syndrome*. https://idf.org/about-diabetes/resources/idf-consensus-worldwide-definition-of-the-metabolic-syndrome/
- Kahn, H. S. (2005). The “lipid accumulation product” performs better than the body mass index for recognizing cardiovascular risk: A population-based comparison. *BMC Cardiovascular Disorders, 5*, 26. https://doi.org/10.1186/1471-2261-5-26
- Wang, Y., Wang, X., & Zeng, L. (2024). Lipid accumulation product as a predictor of prediabetes and diabetes: Insights from NHANES data (1999–2018). *Journal of Diabetes Research, 2024*, Article 2874122. https://doi.org/10.1155/2024/2874122
- National Cholesterol Education Program (NCEP) Expert Panel on Detection, Evaluation, and Treatment of High Blood Cholesterol in Adults. (2001). Third Report of the NCEP Expert Panel (Adult Treatment Panel III). *Circulation, 106*(25), 3143–3421.
- World Health Organization. (2000). *The Asia-Pacific perspective: Redefining obesity and its treatment*. https://www.wpro.who.int/publications/i/item/9789579987206
- Cybulska, A. M., Schneider-Matyka, D., & Grochans, E. (2025). Predictive biomarkers for cardiometabolic risk in postmenopausal women: Insights into visfatin, adropin, and adiponectin. *Frontiers in Endocrinology, 16*, Article 1527567. https://doi.org/10.3389/fendo.2025.1527567
- Cybulska, A. M., Schneider-Matyka, D., Wieder-Huszla, S., Jurczak, A., Szkup, M., & Grochans, E. (2023). Diagnostic markers of insulin resistance to discriminate between prediabetes and diabetes in menopausal women. *European Review for Medical and Pharmacological Sciences, 27*(6), 2453–2468. https://doi.org/10.26355/eurrev_202303_31779
- Russo, G. T., Horvath, K. V., Di Benedetto, A., Giandalia, A., Cucinotta, D., & Asztalos, B. (2010). Influence of menopause and cholesteryl ester transfer protein (CETP) TaqIB polymorphism on lipid profile and HDL subpopulations distribution in women with and without type 2 diabetes. *Atherosclerosis, 210*(1), 294–301. https://doi.org/10.1016/j.atherosclerosis.2009.11.011

### Diabetes subgroups and clustering
- Ahlqvist, E., Storm, P., Karajamaki, A., Martinell, M., Dorkhan, M., Carlsson, A., ... & Groop, L. (2018). Novel subgroups of adult-onset diabetes and their association with outcomes: A data-driven cluster analysis of six variables. *The Lancet Diabetes & Endocrinology, 6*(5), 361–369. https://doi.org/10.1016/S2213-8587(18)30051-2
- Dennis, J. M., Shields, B. M., Henley, W. E., Jones, A. G., & Hattersley, A. T. (2019). Disease progression and treatment response in data-driven subgroups of type 2 diabetes compared with models based on simple clinical features: An analysis using clinical trial data. *The Lancet Diabetes & Endocrinology, 7*(6), 442–451. https://doi.org/10.1016/S2213-8587(19)30087-7
- Zaharia, O. P., Strassburger, K., Strom, A., Bönhof, G. J., Karusheva, Y., Antoniou, S., Bódis, K., Markgraf, D. F., Burkart, V., Müssig, K., Hwang, J.-H., Asplund, O., Groop, L., Ahlqvist, E., Seissler, J., Nawroth, P., Kopf, S., Schmid, S. M., Stumvoll, M., ... Roden, M. (2019). Risk of diabetes-associated diseases in subgroups of patients with recent-onset diabetes: A 5-year follow-up study. *The Lancet Diabetes & Endocrinology, 7*(9), 684–694. https://doi.org/10.1016/S2213-8587(19)30187-1
- Ao, N., Li, J., Wang, Q., Du, J., Jin, S., & Yang, J. (2025). Clinical and laboratory characteristics of novel diabetes subgroups: A systematic review and meta-analysis. *Scientific Reports, 15*, 38585. https://doi.org/10.1038/s41598-025-22556-4
- Taurbekova, B., et al. (2025). Cluster analysis in diabetes research: A systematic review enhanced by a cross-sectional study. *Journal of Clinical Medicine, 14*(10), 3588. https://doi.org/10.3390/jcm14103588
- Danquah, I., Mank, I., Hampe, C. S., Meeks, K. A. C., Agyemang, C., Owusu-Dabo, E., Smeeth, L., Klipstein-Grobusch, K., Bahendeka, S., Spranger, J., Mockenhaupt, F. P., Schulze, M. B., & Rolandsson, O. (2023). Subgroups of adult-onset diabetes: A data-driven cluster analysis in a Ghanaian population. *Scientific Reports, 13*(1), Article 10756. https://doi.org/10.1038/s41598-023-37494-2
- Schrader, S., Perfilyev, A., Ahlqvist, E., Groop, L., Vaag, A., Martinell, M., García-Calzón, S., & Ling, C. (2022). Novel subgroups of type 2 diabetes display different epigenetic patterns, which associate with future diabetic complications. *Diabetes Care, 45*(8), 1798–1806. https://doi.org/10.2337/dc21-2489
- Veelen, A., Erazo-Tapia, E., Oscarsson, J., & Schrauwen, P. (2021). Type 2 diabetes subgroups and potential medication strategies in relation to effects on insulin resistance and beta-cell function: A step toward personalised diabetes treatment? *Molecular Metabolism, 46*, Article 101158. https://doi.org/10.1016/j.molmet.2020.101158

### ML, feature selection, and validation
- Breiman, L. (2001). Random forests. *Machine Learning, 45*, 5–32. https://doi.org/10.1023/A:1010933404324
- Calinski, T., & Harabasz, J. (1974). A dendrite method for cluster analysis. *Communications in Statistics — Theory and Methods, 3*(1), 1–27. https://doi.org/10.1080/03610927408827101
- Chen, T., & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining*, 785–794. https://doi.org/10.1145/2939672.2939785
- Davies, D. L., & Bouldin, D. W. (1979). A cluster separation measure. *IEEE Transactions on Pattern Analysis and Machine Intelligence, PAMI-1*(2), 224–227. https://doi.org/10.1109/TPAMI.1979.4766909
- Efron, B., & Tibshirani, R. J. (1993). *An introduction to the bootstrap*. Chapman & Hall/CRC.
- Kaliappan, J., et al. (2024). Analyzing classification and feature selection strategies for diabetes prediction across diverse diabetes datasets. *Frontiers in Artificial Intelligence, 7*, 1421751. https://doi.org/10.3389/frai.2024.1421751
- Ke, G., Meng, Q., Finley, T., Wang, T., Chen, W., Ma, W., Ye, Q., & Liu, T.-Y. (2017). LightGBM: A highly efficient gradient boosting decision tree. *Advances in Neural Information Processing Systems, 30*.
- Kopitar, L., Kočbek, P., Cilar, L., Sheikh, A., & Štiglic, G. (2020). Early detection of type 2 diabetes mellitus using machine learning-based prediction models. *Scientific Reports, 10*(1), Article 11981. https://doi.org/10.1038/s41598-020-68771-z
- Lumley, T. (2010). *Complex surveys: A guide to analysis using R*. Wiley.
- Luque, A., Carrasco, A., Martín, A., & de las Heras, A. (2019). The impact of class imbalance in classification performance metrics based on the binary confusion matrix. *Pattern Recognition, 91*, 216–231. https://doi.org/10.1016/j.patcog.2019.02.023
- MacQueen, J. (1967). Some methods for classification and analysis of multivariate observations. *Proceedings of the Fifth Berkeley Symposium on Mathematical Statistics and Probability*, 281–297.
- Mohd Rizal, M. F., Abdul Maulud, K. N., Ganasegeran, K., Abdul Manaf, M. R., Safian, N., Mustapha, F. I., & Waller, L. A. (2024). A scoping review of supervised machine learning techniques in predicting the prevalence of type 2 diabetes mellitus. *Medicine & Health, 19*(2), 380–399. https://doi.org/10.17576/MH.2024.1902.03
- Powers, D. M. W. (2011). Evaluation: From precision, recall and F-measure to ROC, informedness, markedness and correlation. *Journal of Machine Learning Technologies, 2*(1), 37–63.
- Rousseeuw, P. J. (1987). Silhouettes: A graphical aid to the interpretation and validation of cluster analysis. *Journal of Computational and Applied Mathematics, 20*, 53–65. https://doi.org/10.1016/0377-0427(87)90125-7
- Shreffler, J., & Huecker, M. R. (2023). Diagnostic testing accuracy: Sensitivity, specificity, predictive values, and likelihood ratios. *StatPearls*. https://www.ncbi.nlm.nih.gov/books/NBK557491/
- Sreehari, E., & Babu, L. D. D. (2024). Critical factor analysis for prediction of Diabetes Mellitus using an inclusive feature selection strategy. *Applied Artificial Intelligence, 38*(1), Article 2331919. https://doi.org/10.1080/08839514.2024.2331919
- Vabalas, A., Gowen, E., Poliakoff, E., & Casson, A. J. (2019). Machine learning algorithm validation with a limited sample size. *PLOS ONE, 14*(11), e0224365. https://doi.org/10.1371/journal.pone.0224365
- Youden, W. J. (1950). Index for rating diagnostic tests. *Cancer, 3*(1), 32–35. https://doi.org/10.1002/1097-0142(1950)3:1<32::AID-CNCR2820030106>3.0.CO;2-3

### Explainability, visualization, usability, accessibility
- Ajani, K., Lee, E., Xiong, C., Nussbaumer Knaflic, C., Kemper, W., & Franconeri, S. (2022). Declutter and focus: Empirically evaluating design guidelines for effective data communication. *IEEE Transactions on Visualization and Computer Graphics, 28*(10), 3351–3364. https://doi.org/10.1109/TVCG.2021.3068337
- Bangor, A., Kortum, P. T., & Miller, J. T. (2008). An empirical evaluation of the System Usability Scale. *International Journal of Human-Computer Interaction, 24*(6), 574–594. https://doi.org/10.1080/10447310802205776
- Brooke, J. (1996). SUS: A quick and dirty usability scale. In P. W. Jordan, B. Thomas, B. A. Weerdmeester, & I. L. McClelland (Eds.), *Usability Evaluation in Industry* (pp. 189–194). Taylor & Francis.
- Cheng, F., Liu, D., Du, F., Lin, Y., Zytek, A., Li, H., Qu, H., & Veeramachaneni, K. (2022). VBridge: Connecting the dots between features and data to explain healthcare models. *IEEE Transactions on Visualization and Computer Graphics, 28*(1), 378–388. https://doi.org/10.1109/TVCG.2021.3114836
- Lundberg, S. M., & Lee, S.-I. (2017). A unified approach to interpreting model predictions. *Advances in Neural Information Processing Systems, 30*.
- Park, S., Bekemeier, B., Flaxman, A., & Schultz, M. (2022). Impact of data visualization on decision-making and its implications for public health practice: A systematic literature review. *Informatics for Health and Social Care, 47*(2), 175–193. https://doi.org/10.1080/17538157.2021.1982949
- Rojo, D., Lamqaddam, H., Gosak, L., & Verbert, K. (2024). Petal-X: Human-centered visual explanations to improve cardiovascular risk communication. *arXiv preprint arXiv:2406.18690*. https://doi.org/10.48550/arXiv.2406.18690
- Van Belle, V., & Van Calster, B. (2015). Visualizing risk prediction models. *PLOS ONE, 10*(7), e0132614. https://doi.org/10.1371/journal.pone.0132614
- World Wide Web Consortium. (2023). *Web Content Accessibility Guidelines (WCAG) 2.2*. https://www.w3.org/TR/WCAG22/
- Zerlik, M., Jung, I. C., Schuler, K., Sedlmayr, M., & Sedlmayr, B. (2024). Visualization techniques for summarizing single patient health data to support physicians' clinical decisions – A scoping review. *Studies in Health Technology and Informatics, 317*, 314–323. https://doi.org/10.3233/SHTI240873

### Security, quality, and governance
- International Organization for Standardization. (2023). *ISO/IEC 25010:2023 Systems and software engineering — Systems and software Quality Requirements and Evaluation (SQuaRE) — System and software quality models*. https://www.iso.org/standard/78176.html
- Jones, M., Bradley, J., & Sakimura, N. (2015). *JSON Web Token (JWT)* (RFC 7519). Internet Engineering Task Force. https://www.rfc-editor.org/rfc/rfc7519.html
- Provos, N., & Mazieres, D. (1999). A future-adaptable password scheme. *Proceedings of the USENIX Annual Technical Conference*. https://www.usenix.org/legacy/events/usenix99/provos/provos.pdf
- World Health Organization. (2021). *Ethics and governance of artificial intelligence for health*. https://www.who.int/publications/i/item/9789240029200

### Calibration
- Brier, G. W. (1950). Verification of forecasts expressed in terms of probability. *Monthly Weather Review, 78*(1), 1–3. https://doi.org/10.1175/1520-0493(1950)078<0001:VOFEIT>2.0.CO;2
- Hosmer, D. W., & Lemeshow, S. (1980). Goodness of fit tests for the multiple logistic regression model. *Communications in Statistics — Theory and Methods, 9*(10), 1043–1069. https://doi.org/10.1080/03610928008827941
- Van Calster, B., McLernon, D. J., van Smeden, M., Wynants, L., Steyerberg, E. W., Bossuyt, P., Collins, G. S., Macaskill, P., Moons, K. G. M., & Vickers, A. J. (2019). Calibration: The Achilles heel of predictive analytics. *BMC Medicine, 17*, 230. https://doi.org/10.1186/s12916-019-1466-7

---

*Last updated: 2026-07-15*  
*Maintainers: Update verification status as each source is confirmed or replaced.*
