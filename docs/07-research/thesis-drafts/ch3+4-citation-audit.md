# Chapter 3+4 Citation Audit

**Date checked:** 2026-05-14
**Primary draft checked:** `docs/07-research/thesis-drafts/ch3+4-final-academic-draft.md`
**Companion wording file checked:** `docs/07-research/thesis-drafts/ch3+4-academic-wording-bank.md`

## Executive Finding

The final Chapter 3+4 academic draft is methodologically coherent, but it is not yet citation-ready. It contains no formal in-text citations and no dedicated reference list. Before final submission, the draft needs citations for NHANES data handling, ADA diagnostic thresholds, postmenopausal cohort filtering, leakage-safe validation, model algorithms, clustering/subtype terminology, SHAP explainability, calibration metrics, software quality evaluation, and security/authentication mechanisms.

**Advisor risk rating:** High if submitted without citations; moderate after adding the citations listed below.

## Verified Citation Coverage Map

| Draft Location | Claim or Method Needing Support | Recommended Citation(s) | Status |
|---|---|---|---|
| 3.1 Research Design | Screening-support positioning and need for human/clinical oversight in health AI | WHO (2021) | Add citation |
| 3.2 Research Locale | NHANES public repository, repeated releases, pandemic disruption, 2021-2023 release caution | CDC/NCHS NHANES 2021-2023 documentation; CDC/NCHS analytic guidance | Add citation |
| Table 3.1 | Included NHANES releases and file suffixes | CDC/NCHS continuous NHANES documentation | Add citation in table note |
| 3.3 Population | RHQ031-based menstrual-period filter | CDC/NCHS RHQ_L codebook | Add citation |
| 3.4 Data Gathering | SEQN merge key and NHANES variable documentation | CDC/NCHS NHANES tutorials; CDC/NCHS variable codebooks | Add citation |
| 3.5 Reference Labels | HbA1c >=6.5% diabetes and 5.7-6.4% prediabetes thresholds | ADA Professional Practice Committee (2026) | Add citation |
| 3.6 Missing Data | Median imputation inside cross-validation and caution against leakage | Vabalas et al. (2019); Sullivan et al. (2023) | Add citation |
| 3.7 Leakage Prevention | Separation of model selection and evaluation; avoiding optimistic bias | Vabalas et al. (2019) | Add citation |
| 3.8 Candidate Models | Random Forest, LightGBM, and XGBoost algorithm foundations | Breiman (2001); Ke et al. (2017); Chen and Guestrin (2016) | Add citation |
| 3.8 Nested LOGO | Nested validation to reduce optimistic model-selection bias | Vabalas et al. (2019) | Add citation |
| 3.9 Threshold Optimization | Youden's J and screening-threshold logic | Youden (1950); Van Calster et al. (2019) | Add citation |
| 3.9 Metabolic Syndrome Guardrail | TG >=150, low HDL, abdominal adiposity criteria | IDF (2006); Alberti et al. (2009) | Add citation |
| 3.10 K-Means | K-Means clustering and internal validation metrics | MacQueen (1967); Rousseeuw (1987); Davies and Bouldin (1979); Calinski and Harabasz (1974) | Add citation |
| 3.10 Ahlqvist-inspired labels | SIRD/SIDD/MOD/MARD subtype terminology and why DIANA uses "-like" proxy labels | Ahlqvist et al. (2018); Dennis et al. (2020) | Add citation |
| 3.11 SHAP | Feature-attribution explanation method | Lundberg and Lee (2017) | Add citation |
| 3.13 ISO/IEC quality evaluation | ISO/IEC 25010 product quality model | ISO/IEC 25010:2023 | Add citation |
| 3.13 JWT and bcrypt | JWT authentication and password hashing | Jones et al. (2015); Provos and Mazieres (1999) | Add citation |
| 4.1 Bootstrap confidence intervals | Bootstrap CI methodology | Efron and Tibshirani (1993), or a statistics text already used by the thesis | Add citation |
| 4.4 Calibration | Brier score, calibration, and Hosmer-Lemeshow interpretation | Brier (1950); Van Calster et al. (2019); Hosmer and Lemeshow (1980) | Add citation |
| 4.5 Cluster metrics | Silhouette, Davies-Bouldin, and Calinski-Harabasz indices | Rousseeuw (1987); Davies and Bouldin (1979); Calinski and Harabasz (1974) | Add citation |

## Citation Errors and Stale Items Found

| Item | Finding | Action Taken or Needed |
|---|---|---|
| `docs/03-ml/defense/diana-citations-enhanced.md` | The original diabetes-subgroup framework was incorrectly labeled as "Ahn et al. (2018)." The foundational adult-onset diabetes subgroup paper is Ahlqvist et al. (2018). | Corrected in the citation index. |
| Ahlqvist subtype claims | DIANA does not have GAD antibody, C-peptide, HOMA2-B, or HOMA2-IR. Therefore the labels must remain "SIRD-like," "SIDD-like," "MOD-like," and "MARD-like." | Final draft already handles this correctly. Keep the caution. |
| MICE citations in older report | The older citation enhancement report supports MICE/IterativeImputer, but the current final Chapter 3+4 draft states leakage-safe median imputation. | Do not cite MICE as the final training method unless the method is restored. |
| 2021-2023 NHANES wording | The earlier draft called 2021-2023 a COVID-adapted three-year release. CDC describes August 2021-August 2023 as a two-year data collection period after pandemic disruption, with caution when combining with earlier cycles. | Corrected in the final draft and wording bank to "August 2021-August 2023 post-pandemic release." |
| ISO/IEC 25010 version | The draft says ISO/IEC 25010-informed. Current ISO source is ISO/IEC 25010:2023, while many theses cite ISO/IEC 25010:2011. | Decide whether the manuscript cites 2011 or 2023. If citing 2023, avoid saying it has only eight characteristics. |
| Technology stack citations | React, Gin, Flask, Redis, PostgreSQL, Recharts, and Plotly are implementation choices. They do not need scholarly citations unless the school requires tool references. | Cite official docs only in an implementation appendix if needed. |
| Placeholder results | UAT, expert review, screenshots, accessibility audit, and load testing remain placeholders. | Do not attach citations to placeholders as if the studies were completed. |

## Suggested In-Text Citation Insertions

Use the existing thesis style if the rest of the manuscript is APA-like. These are ready to paste after the relevant sentences:

- NHANES source and cycles: `(Centers for Disease Control and Prevention, National Center for Health Statistics [CDC/NCHS], 2024a, 2024b)`
- ADA reference labels: `(American Diabetes Association Professional Practice Committee, 2026)`
- RHQ031 menopausal filter: `(CDC/NCHS, 2023)`
- Nested temporal validation: `(Vabalas et al., 2019)`
- Candidate models: `(Breiman, 2001; Ke et al., 2017; Chen & Guestrin, 2016)`
- Threshold selection and calibration: `(Youden, 1950; Van Calster et al., 2019)`
- Metabolic syndrome guardrail: `(International Diabetes Federation, 2006; Alberti et al., 2009)`
- K-Means and cluster validity: `(MacQueen, 1967; Rousseeuw, 1987; Davies & Bouldin, 1979; Calinski & Harabasz, 1974)`
- Ahlqvist-inspired subtype caution: `(Ahlqvist et al., 2018; Dennis et al., 2020)`
- SHAP explainability: `(Lundberg & Lee, 2017)`
- Software quality model: `(International Organization for Standardization, 2023)`
- Health AI governance and oversight: `(World Health Organization, 2021)`

## Citation-Ready Reference Shortlist

American Diabetes Association Professional Practice Committee. (2026). 2. Diagnosis and classification of diabetes: Standards of Care in Diabetes--2026. *Diabetes Care*. https://pmc.ncbi.nlm.nih.gov/articles/PMC12690183/

Ahlqvist, E., Storm, P., Karajamaki, A., et al. (2018). Novel subgroups of adult-onset diabetes and their association with outcomes: A data-driven cluster analysis of six variables. *The Lancet Diabetes & Endocrinology, 6*(5), 361-369. https://doi.org/10.1016/S2213-8587(18)30051-2

Alberti, K. G. M. M., Eckel, R. H., Grundy, S. M., et al. (2009). Harmonizing the metabolic syndrome. *Circulation, 120*, 1640-1645. https://doi.org/10.1161/CIRCULATIONAHA.109.192644

Breiman, L. (2001). Random forests. *Machine Learning, 45*, 5-32. https://doi.org/10.1023/A:1010933404324

Brier, G. W. (1950). Verification of forecasts expressed in terms of probability. *Monthly Weather Review, 78*(1), 1-3. https://doi.org/10.1175/1520-0493(1950)078%3C0001:VOFEIT%3E2.0.CO;2

Calinski, T., & Harabasz, J. (1974). A dendrite method for cluster analysis. *Communications in Statistics - Theory and Methods, 3*(1), 1-27. https://doi.org/10.1080/03610927408827101

Centers for Disease Control and Prevention, National Center for Health Statistics. (2024a). *NHANES questionnaires, datasets, and related documentation: August 2021-August 2023*. https://wwwn.cdc.gov/nchs/nhanes/continuousnhanes/default.aspx?Cycle=2021-2023

Centers for Disease Control and Prevention, National Center for Health Statistics. (2024b). *Brief overview of sample design, nonresponse bias assessment, and analytic guidelines for NHANES August 2021-August 2023*. https://wwwn.cdc.gov/nchs/nhanes/continuousnhanes/OverviewBrief.aspx?Cycle=2021-2023

Centers for Disease Control and Prevention, National Center for Health Statistics. (2023). *Reproductive Health Questionnaire codebook: RHQ_L*. https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2021/DataFiles/RHQ_L.htm

Chen, T., & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining*, 785-794. https://doi.org/10.1145/2939672.2939785

Davies, D. L., & Bouldin, D. W. (1979). A cluster separation measure. *IEEE Transactions on Pattern Analysis and Machine Intelligence, PAMI-1*(2), 224-227. https://doi.org/10.1109/TPAMI.1979.4766909

Dennis, J. M., Shields, B. M., Henley, W. E., Jones, A. G., & Hattersley, A. T. (2020). Subtyping type 2 diabetes in 5 cohorts using simple clinical parameters. *Diabetes Care, 43*(8), 1755-1764. https://pubmed.ncbi.nlm.nih.gov/32457208/

International Diabetes Federation. (2006). *The IDF consensus worldwide definition of the metabolic syndrome*. https://idf.org/about-diabetes/resources/idf-consensus-worldwide-definition-of-the-metabolic-syndrome/

International Organization for Standardization. (2023). *ISO/IEC 25010:2023 Systems and software engineering - Systems and software Quality Requirements and Evaluation (SQuaRE) - Product quality model*. https://www.iso.org/standard/78176.html

Jones, M., Bradley, J., & Sakimura, N. (2015). *JSON Web Token (JWT)*. RFC 7519. https://www.rfc-editor.org/rfc/rfc7519

Ke, G., Meng, Q., Finley, T., et al. (2017). LightGBM: A highly efficient gradient boosting decision tree. *Advances in Neural Information Processing Systems, 30*. https://papers.nips.cc/paper/6907-lightgbm-a-highly-efficient-gradient-boosting-decision-tree

Lundberg, S. M., & Lee, S.-I. (2017). A unified approach to interpreting model predictions. *Advances in Neural Information Processing Systems, 30*. https://papers.neurips.cc/paper/7062-a-unified-approach-to-interpreting-model-predictions

MacQueen, J. (1967). Some methods for classification and analysis of multivariate observations. *Proceedings of the Fifth Berkeley Symposium on Mathematical Statistics and Probability*, 281-297.

Provos, N., & Mazieres, D. (1999). A future-adaptable password scheme. *Proceedings of the USENIX Annual Technical Conference*. https://www.usenix.org/legacy/events/usenix99/provos/provos.pdf

Rousseeuw, P. J. (1987). Silhouettes: A graphical aid to the interpretation and validation of cluster analysis. *Journal of Computational and Applied Mathematics, 20*, 53-65. https://doi.org/10.1016/0377-0427(87)90125-7

Vabalas, A., Gowen, E., Poliakoff, E., & Casson, A. J. (2019). Machine learning algorithm validation with a limited sample size. *PLOS ONE, 14*(11), e0224365. https://doi.org/10.1371/journal.pone.0224365

Van Calster, B., McLernon, D. J., van Smeden, M., Wynants, L., & Steyerberg, E. W. (2019). Calibration: The Achilles heel of predictive analytics. *BMC Medicine, 17*, 230. https://doi.org/10.1186/s12916-019-1466-7

World Health Organization. (2021). *Ethics and governance of artificial intelligence for health*. https://www.who.int/publications/i/item/9789240029200

Youden, W. J. (1950). Index for rating diagnostic tests. *Cancer, 3*(1), 32-35. https://doi.org/10.1002/1097-0142(1950)3:1%3C32::AID-CNCR2820030106%3E3.0.CO;2-3

## Bottom Line

The draft has the right technical claims, but the final manuscript must add in-text citations and a reference list. The highest-priority fixes are NHANES/CDC, ADA diagnostic criteria, Ahlqvist subtype terminology, SHAP, nested validation, calibration metrics, metabolic syndrome guardrails, and ISO/IEC 25010.
