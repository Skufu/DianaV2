# Chapter 3+4 Citation Audit

**Date checked:** 2026-05-18
**Primary draft checked:** `docs/07-research/thesis-drafts/ch3+4-final-academic-draft.md`
**Technical backup checked:** `docs/07-research/thesis-drafts/ch3+4.md`
**Companion wording file checked:** `docs/07-research/thesis-drafts/ch3+4-academic-wording-bank.md`

## Executive Finding

The final Chapter 3+4 academic draft is now citation-ready for the methodology claims checked in this audit. In-text citations and reference-list entries have been added for NHANES data handling, ADA diagnostic thresholds, postmenopausal cohort filtering, leakage-safe validation, model algorithms, threshold formulas, clustering/subtype terminology, SHAP explainability, calibration metrics, software quality evaluation, security/authentication mechanisms, SUS usability measurement, health-AI governance, and WCAG accessibility guidance.

**Advisor risk rating:** Low for missing methodology citations after the 2026-05-17 update. Residual risk remains for empirical placeholders that are not citation problems, such as pending UAT scores, expert-review ratings, accessibility audit results, screenshots, and production load-test results.

## Verified Citation Coverage Map

| Draft Location | Claim or Method Needing Support | Recommended Citation(s) | Status |
|---|---|---|---|
| 3.1 Research Design | Screening-support positioning and need for human/clinical oversight in health AI | WHO (2021) | Added |
| 3.2 Research Locale | NHANES public repository, repeated releases, pandemic disruption, 2021-2023 release caution | CDC/NCHS NHANES 2021-2023 documentation; CDC/NCHS analytic guidance | Added |
| Table 3.1 | Included NHANES releases and file suffixes | CDC/NCHS continuous NHANES documentation | Covered by adjacent section citation |
| 3.3 Population | RHQ031-based menstrual-period filter | CDC/NCHS RHQ_L codebook | Added |
| 3.4 Data Gathering | SEQN merge key and NHANES variable documentation | CDC/NCHS NHANES documentation and codebooks | Added |
| 3.5 Reference Labels | HbA1c >=6.5% diabetes and 5.7-6.4% prediabetes thresholds | American Diabetes Association Professional Practice Committee for Diabetes (2026) | Added |
| 3.6 Missing Data | Median imputation inside cross-validation and caution against leakage | Vabalas et al. (2019) | Added |
| 3.7 Leakage Prevention | Separation of model selection and evaluation; avoiding optimistic bias | Vabalas et al. (2019) | Added |
| 3.8 Candidate Models | Random Forest, LightGBM, and XGBoost algorithm foundations | Breiman (2001); Ke et al. (2017); Chen and Guestrin (2016) | Added |
| 3.8 Nested LOGO | Nested validation to reduce optimistic model-selection bias | Vabalas et al. (2019) | Added |
| 3.9 Threshold Optimization | Youden's J, G-Mean, F1, sensitivity, specificity, PPV, and screening-threshold logic | Youden (1950); Luque et al. (2019); Shreffler and Huecker (2023); Powers (2011); Van Calster et al. (2019) | Added |
| 3.9 Metabolic Syndrome Guardrail | TG >=150, low HDL, abdominal adiposity criteria | IDF (2006); Alberti et al. (2009) | Added |
| 3.10 K-Means | K-Means clustering and internal validation metrics | MacQueen (1967); Rousseeuw (1987); Davies and Bouldin (1979); Calinski and Harabasz (1974) | Added |
| 3.10 Ahlqvist-inspired labels | SIRD/SIDD/MOD/MARD subtype terminology and why DIANA uses "-like" proxy labels | Ahlqvist et al. (2018); Dennis et al. (2019) | Added |
| 3.11 SHAP | Feature-attribution explanation method | Lundberg and Lee (2017) | Added |
| 3.13 ISO/IEC quality evaluation | ISO/IEC 25010 product quality model | ISO/IEC 25010:2011 | Added |
| 3.13 JWT and bcrypt | JWT authentication and password hashing | Jones et al. (2015); Provos and Mazieres (1999) | Added |
| 4.1 Bootstrap confidence intervals | Bootstrap CI methodology | Efron and Tibshirani (1993) | Added |
| 4.4 Calibration | Brier score, calibration, and Hosmer-Lemeshow interpretation | Brier (1950); Van Calster et al. (2019); Hosmer and Lemeshow (1980) | Added |
| 4.5 Cluster metrics | Silhouette, Davies-Bouldin, and Calinski-Harabasz indices | Rousseeuw (1987); Davies and Bouldin (1979); Calinski and Harabasz (1974) | Added |
| 4.10 UAT | SUS instrument and usability benchmark target | Brooke (1996); Bangor et al. (2008) | Added |
| 4.11 Accessibility | Accessibility readiness and WCAG guidance | W3C (2023) | Added |

## Citation Errors and Stale Items Found

| Item | Finding | Action Taken or Needed |
|---|---|---|
| `docs/03-ml/defense/diana-citations-enhanced.md` | The original diabetes-subgroup framework was incorrectly labeled as "Ahn et al. (2018)." The foundational adult-onset diabetes subgroup paper is Ahlqvist et al. (2018). | Corrected in the citation index. |
| Ahlqvist subtype claims | DIANA does not have GAD antibody, C-peptide, HOMA2-B, or HOMA2-IR. Therefore the labels must remain "SIRD-like," "SIDD-like," "MOD-like," and "MARD-like." | Final draft already handles this correctly. Keep the caution. |
| MICE citations in older report | The older citation enhancement report supports MICE/IterativeImputer, but the current final Chapter 3+4 draft states leakage-safe median imputation. | Do not cite MICE as the final training method unless the method is restored. |
| 2021-2023 NHANES wording | The earlier draft used outdated wording for the 2021-2023 release. CDC describes August 2021-August 2023 as a post-pandemic release after field operations resumed, with caution when combining with earlier cycles. | Corrected in the final draft, `ch3+4.md`, and wording bank to "August 2021-August 2023 post-pandemic release." |
| Dennis diabetes-subgroup citation | The earlier audit suggested a different Dennis diabetes-subgroup paper, but the verified citation used for treatment-response caution is Dennis et al. (2019). | Corrected in both drafts and this audit. |
| ISO/IEC 25010 version | The draft uses the ISO/IEC 25010 quality-model framing commonly cited as ISO/IEC 25010:2011. | Resolved by citing ISO/IEC 25010:2011. If the manuscript switches to a newer ISO edition later, the quality-characteristic wording should be reviewed. |
| Technology stack citations | React, Gin, Flask, Redis, PostgreSQL, and Recharts are implementation choices. They do not need scholarly citations unless the school requires tool references. | Cite official docs only in an implementation appendix if needed. |
| Placeholder results | UAT, expert review, screenshots, accessibility audit, and load testing remain placeholders. | Do not attach citations to placeholders as if the studies were completed. |

## Suggested In-Text Citation Insertions

These citation groups have been inserted into the updated Chapter 3+4 drafts using APA-style author-date thesis citations:

- NHANES source and cycles: `(Centers for Disease Control and Prevention, National Center for Health Statistics [CDC/NCHS], 2024a, 2024b)`
- ADA reference labels: `(American Diabetes Association Professional Practice Committee for Diabetes, 2026)`
- RHQ031 menopausal filter: `(CDC/NCHS, 2024c)`
- Nested temporal validation: `(Vabalas et al., 2019)`
- Candidate models: `(Breiman, 2001; Ke et al., 2017; Chen & Guestrin, 2016)`
- Threshold selection and calibration: `(Youden, 1950; Van Calster et al., 2019)`
- Metabolic syndrome guardrail: `(International Diabetes Federation, 2006; Alberti et al., 2009)`
- K-Means and cluster validity: `(MacQueen, 1967; Rousseeuw, 1987; Davies & Bouldin, 1979; Calinski & Harabasz, 1974)`
- Ahlqvist-inspired subtype caution: `(Ahlqvist et al., 2018; Dennis et al., 2019)`
- SHAP explainability: `(Lundberg & Lee, 2017)`
- Software quality model: `(International Organization for Standardization, 2011)`
- JWT and bcrypt: `(Jones et al., 2015; Provos & Mazieres, 1999)`
- SUS instrument and benchmark: `(Brooke, 1996; Bangor et al., 2008)`
- Accessibility guidance: `(World Wide Web Consortium, 2023)`
- Health AI governance and oversight: `(World Health Organization, 2021)`

## Citation-Ready Reference Shortlist

American Diabetes Association Professional Practice Committee for Diabetes. (2026). 2. Diagnosis and classification of diabetes: Standards of Care in Diabetes--2026. *Diabetes Care, 49*(Supplement 1), S27-S49. https://doi.org/10.2337/dc26-S002

Ahlqvist, E., Storm, P., Karajamaki, A., et al. (2018). Novel subgroups of adult-onset diabetes and their association with outcomes: A data-driven cluster analysis of six variables. *The Lancet Diabetes & Endocrinology, 6*(5), 361-369. https://doi.org/10.1016/S2213-8587(18)30051-2

Alberti, K. G. M. M., Eckel, R. H., Grundy, S. M., et al. (2009). Harmonizing the metabolic syndrome. *Circulation, 120*, 1640-1645. https://doi.org/10.1161/CIRCULATIONAHA.109.192644

Bangor, A., Kortum, P. T., & Miller, J. T. (2008). An empirical evaluation of the System Usability Scale. *International Journal of Human-Computer Interaction, 24*(6), 574-594. https://doi.org/10.1080/10447310802205776

Breiman, L. (2001). Random forests. *Machine Learning, 45*, 5-32. https://doi.org/10.1023/A:1010933404324

Brier, G. W. (1950). Verification of forecasts expressed in terms of probability. *Monthly Weather Review, 78*(1), 1-3. https://doi.org/10.1175/1520-0493(1950)078%3C0001:VOFEIT%3E2.0.CO;2

Brooke, J. (1996). SUS: A quick and dirty usability scale. In P. W. Jordan, B. Thomas, B. A. Weerdmeester, & I. L. McClelland (Eds.), *Usability Evaluation in Industry* (pp. 189-194). Taylor & Francis.

Calinski, T., & Harabasz, J. (1974). A dendrite method for cluster analysis. *Communications in Statistics - Theory and Methods, 3*(1), 1-27. https://doi.org/10.1080/03610927408827101

Centers for Disease Control and Prevention, National Center for Health Statistics. (2024a). *NHANES questionnaires, datasets, and related documentation: August 2021-August 2023*. https://wwwn.cdc.gov/nchs/nhanes/continuousnhanes/default.aspx?Cycle=2021-2023

Centers for Disease Control and Prevention, National Center for Health Statistics. (2024b). *Brief overview of sample design, nonresponse bias assessment, and analytic guidelines for NHANES August 2021-August 2023*. https://wwwn.cdc.gov/nchs/nhanes/continuousnhanes/OverviewBrief.aspx?Cycle=2021-2023

Centers for Disease Control and Prevention, National Center for Health Statistics. (2024c). *Reproductive Health Questionnaire: Data documentation, codebook, and frequencies: RHQ_L, NHANES August 2021-August 2023*. https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2021/DataFiles/RHQ_L.htm

Chen, T., & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining*, 785-794. https://doi.org/10.1145/2939672.2939785

Davies, D. L., & Bouldin, D. W. (1979). A cluster separation measure. *IEEE Transactions on Pattern Analysis and Machine Intelligence, PAMI-1*(2), 224-227. https://doi.org/10.1109/TPAMI.1979.4766909

Dennis, J. M., Shields, B. M., Henley, W. E., Jones, A. G., & Hattersley, A. T. (2019). Disease progression and treatment response in data-driven subgroups of type 2 diabetes compared with models based on simple clinical features: An analysis using clinical trial data. *The Lancet Diabetes & Endocrinology, 7*(6), 442-451. https://doi.org/10.1016/S2213-8587(19)30087-7

International Diabetes Federation. (2006). *The IDF consensus worldwide definition of the metabolic syndrome*. https://idf.org/about-diabetes/resources/idf-consensus-worldwide-definition-of-the-metabolic-syndrome/

International Organization for Standardization. (2011). *ISO/IEC 25010:2011 Systems and software engineering - Systems and software Quality Requirements and Evaluation (SQuaRE) - System and software quality models*. https://www.iso.org/standard/35733.html

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

World Wide Web Consortium. (2023). *Web Content Accessibility Guidelines (WCAG) 2.2*. https://www.w3.org/TR/WCAG22/

## Bottom Line

The highest-priority citation gaps have been closed in `ch3+4.md` and `ch3+4-final-academic-draft.md`. Remaining manuscript gaps are evidence gaps rather than citation gaps: UAT, expert review, accessibility testing, screenshots, and load testing should remain marked as pending until actually executed.
